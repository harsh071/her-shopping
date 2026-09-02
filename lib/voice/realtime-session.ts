import {
  CAPABILITIES,
  CAPABILITIES_BY_NAME,
} from '@/lib/capabilities/registry';
import { ValidationError } from '@/lib/capabilities/schema';
import type { HerShoppingStore } from '@/lib/state/store';
import type { VoiceStatus } from '@/lib/state/types';

export type RealtimeEvents = {
  onStatus?: (status: VoiceStatus, detail?: string) => void;
  onTranscript?: (entry: { speaker: 'you' | 'agent'; text: string }) => void;
  onToolCall?: (entry: { name: string; ok: boolean; summary: string }) => void;
  onError?: (message: string) => void;
};

type ServerEvent = {
  type: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  transcript?: string;
  delta?: string;
  error?: { message?: string };
};

/** The realtime tool list, generated from the same registry WebMCP publishes. */
export function realtimeToolDefinitions() {
  return CAPABILITIES.map((capability) => ({
    type: 'function' as const,
    name: capability.name,
    description: capability.description,
    parameters: capability.inputSchema,
  }));
}

/**
 * A browser realtime voice session over WebRTC.
 *
 * It speaks to the same capability registry as WebMCP, so a spoken instruction
 * and an external agent's tool call run identical code against identical state.
 */
export class RealtimeVoiceSession {
  private peer: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private closed = false;

  constructor(
    private readonly store: HerShoppingStore,
    private readonly events: RealtimeEvents = {},
  ) {}

  private setStatus(status: VoiceStatus, detail?: string) {
    this.store.setCapabilities({
      voiceStatus: status,
      voiceError: detail ?? null,
    });
    this.events.onStatus?.(status, detail);
  }

  private send(payload: unknown) {
    if (this.channel?.readyState === 'open')
      this.channel.send(JSON.stringify(payload));
  }

  async start(): Promise<void> {
    if (this.peer) return;
    this.closed = false;

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      this.setStatus(
        'unsupported',
        'This browser cannot capture microphone audio.',
      );
      return;
    }

    try {
      this.setStatus('requesting-microphone');
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    } catch {
      this.setStatus('error', 'Microphone permission was declined.');
      return;
    }

    let credential: { clientSecret: string; model: string };
    try {
      this.setStatus('connecting');
      const response = await fetch('/api/realtime-token', { method: 'POST' });
      const json = (await response.json()) as {
        clientSecret?: string;
        model?: string;
        error?: string;
      };
      if (!response.ok || !json.clientSecret) {
        throw new Error(
          json.error ?? 'The server would not issue a voice credential.',
        );
      }
      credential = {
        clientSecret: json.clientSecret,
        model: json.model ?? 'gpt-realtime',
      };
    } catch (error) {
      this.stop();
      const message =
        error instanceof Error ? error.message : 'Voice is unavailable.';
      this.setStatus('error', message);
      this.events.onError?.(message);
      return;
    }

    try {
      const peer = new RTCPeerConnection();
      this.peer = peer;

      const audio = document.createElement('audio');
      audio.autoplay = true;
      this.audioElement = audio;
      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0];
      };

      for (const track of this.micStream.getAudioTracks())
        peer.addTrack(track, this.micStream);

      const channel = peer.createDataChannel('oai-events');
      this.channel = channel;
      channel.addEventListener('open', () => this.configureSession());
      channel.addEventListener('message', (event) =>
        this.handleEvent(event.data),
      );

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const answer = await this.negotiate(credential, offer.sdp ?? '');
      await peer.setRemoteDescription({ type: 'answer', sdp: answer });

      if (!this.closed) this.setStatus('live');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The voice connection failed.';
      this.stop();
      this.setStatus('error', message);
      this.events.onError?.(message);
    }
  }

  private async negotiate(
    credential: { clientSecret: string; model: string },
    sdp: string,
  ) {
    const endpoints = [
      `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(credential.model)}`,
      `https://api.openai.com/v1/realtime?model=${encodeURIComponent(credential.model)}`,
    ];
    let lastError = 'The realtime endpoint refused the connection.';

    for (const url of endpoints) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credential.clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: sdp,
      });
      const text = await response.text();
      if (response.ok) return text;
      lastError = `${response.status} ${text.slice(0, 200)}`;
    }
    throw new Error(lastError);
  }

  private configureSession() {
    this.send({
      type: 'session.update',
      session: {
        type: 'realtime',
        tools: realtimeToolDefinitions(),
        tool_choice: 'auto',
      },
    });
  }

  private handleEvent(raw: unknown) {
    if (typeof raw !== 'string') return;
    let event: ServerEvent;
    try {
      event = JSON.parse(raw) as ServerEvent;
    } catch {
      return;
    }

    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        this.setStatus('listening');
        break;
      case 'input_audio_buffer.speech_stopped':
        this.setStatus('live');
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript)
          this.events.onTranscript?.({
            speaker: 'you',
            text: event.transcript,
          });
        break;
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        this.setStatus('live');
        if (event.transcript)
          this.events.onTranscript?.({
            speaker: 'agent',
            text: event.transcript,
          });
        break;
      case 'response.output_audio.delta':
      case 'response.audio.delta':
        this.setStatus('speaking');
        break;
      case 'response.function_call_arguments.done':
        this.runTool(event);
        break;
      case 'error':
        this.events.onError?.(
          event.error?.message ?? 'The voice session reported an error.',
        );
        this.store.setCapabilities({
          voiceError: event.error?.message ?? 'Voice session error.',
        });
        break;
      default:
        break;
    }
  }

  private runTool(event: ServerEvent) {
    const name = event.name ?? '';
    const capability = CAPABILITIES_BY_NAME[name];
    let output: unknown;

    if (!capability) {
      output = { ok: false, summary: `Unknown tool "${name}".` };
    } else {
      let parsed: unknown = {};
      try {
        parsed = event.arguments ? JSON.parse(event.arguments) : {};
      } catch {
        parsed = {};
      }
      try {
        output = capability.run(this.store, parsed, 'voice');
      } catch (error) {
        const message =
          error instanceof ValidationError || error instanceof Error
            ? error.message
            : 'The tool call failed.';
        this.store.setCapabilities({
          lastValidationError: `${name}: ${message}`,
        });
        output = {
          ok: false,
          summary: message,
          stateVersion: this.store.getState().stateVersion,
        };
      }
    }

    const result = output as { ok?: boolean; summary?: string };
    this.events.onToolCall?.({
      name,
      ok: Boolean(result.ok),
      summary: result.summary ?? '',
    });

    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: event.call_id,
        output: JSON.stringify(output),
      },
    });
    this.send({ type: 'response.create' });
  }

  stop(): void {
    this.closed = true;
    this.channel?.close();
    this.channel = null;
    this.peer?.close();
    this.peer = null;
    for (const track of this.micStream?.getTracks() ?? []) track.stop();
    this.micStream = null;
    if (this.audioElement) {
      this.audioElement.srcObject = null;
      this.audioElement = null;
    }
    this.setStatus('closed');
  }
}
