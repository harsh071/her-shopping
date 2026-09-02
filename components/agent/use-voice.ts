'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { store } from '@/lib/state/store';
import { RealtimeVoiceSession } from '@/lib/voice/realtime-session';

export type Caption = { id: number; speaker: 'you' | 'agent'; text: string };
export type ToolEvent = {
  id: number;
  name: string;
  ok: boolean;
  summary: string;
};

/**
 * One always-live conversation.
 *
 * There is no push-to-talk and no dictation step: once the session is open the
 * person just talks, the agent calls site tools, and the page changes underneath
 * the conversation.
 */
export function useVoice() {
  const sessionRef = useRef<RealtimeVoiceSession | null>(null);
  const counter = useRef(0);
  const [live, setLive] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [note, setNote] = useState('');

  useEffect(() => () => sessionRef.current?.stop(), []);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    counter.current += 1;

    const session = new RealtimeVoiceSession(store, {
      onTranscript: (entry) => {
        counter.current += 1;
        const id = counter.current;
        setCaptions((current) => [{ id, ...entry }, ...current].slice(0, 8));
      },
      onToolCall: (entry) => {
        counter.current += 1;
        const id = counter.current;
        setToolEvents((current) => [{ id, ...entry }, ...current].slice(0, 6));
      },
      onError: (message) => setNote(message),
    });

    sessionRef.current = session;
    setNote('');
    await session.start();

    if (store.getState().capabilities.voiceStatus === 'error') {
      sessionRef.current = null;
      setLive(false);
      setNote(
        store.getState().capabilities.voiceError ??
          'Voice needs OPENAI_API_KEY on the server and a microphone.',
      );
      return;
    }
    setLive(true);
  }, []);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setLive(false);
    setNote('');
  }, []);

  return { live, captions, toolEvents, note, start, stop };
}
