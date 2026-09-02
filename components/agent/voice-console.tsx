'use client';

import { ArrowRight, AudioLines, Loader2, Mic, Square } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Caption, ToolEvent } from '@/components/agent/use-voice';
import { humanActions } from '@/lib/actions/ui-actions';
import { DEMO_MISSION_TEXT } from '@/lib/state/mission';
import type { HerShoppingState, VoiceStatus } from '@/lib/state/types';

const EXAMPLE_PROMPT =
  'Try: “I\u2019m camping in Iceland for five days, keep it under $700, prioritise warmth and Friday delivery.”';

const STATUS_TEXT: Record<VoiceStatus, string> = {
  unsupported: 'Voice unavailable in this browser',
  idle: 'Say the mission and watch the store rearrange',
  'requesting-microphone': 'Allow the microphone to begin',
  connecting: 'Opening the conversation…',
  live: 'Listening — just talk',
  listening: 'Listening…',
  speaking: 'Speaking',
  error: 'Voice unavailable',
  closed: 'Say the mission and watch the store rearrange',
};

/**
 * The conversation surface. It stays open while the person talks, streams what
 * both sides said, and names each site tool as it fires so the page changes and
 * the reason for the change arrive together.
 */
export function VoiceConsole({
  state,
  live,
  captions,
  toolEvents,
  note,
  onStart,
  onStop,
}: {
  state: HerShoppingState;
  live: boolean;
  captions: Caption[];
  toolEvents: ToolEvent[];
  note: string;
  onStart: () => void;
  onStop: () => void;
}) {
  const [draft, setDraft] = useState('');
  const status = state.capabilities.voiceStatus;
  const connecting =
    status === 'connecting' || status === 'requesting-microphone';
  const latest = captions[0];

  return (
    <section
      className={`voice-console ${live ? 'is-live' : ''}`}
      aria-label="Voice conversation"
    >
      <div className="voice-console-inner">
        <button
          type="button"
          className={`voice-orb ${status === 'listening' ? 'is-listening' : ''} ${
            status === 'speaking' ? 'is-speaking' : ''
          }`}
          onClick={live ? onStop : onStart}
          aria-label={
            live ? 'End the voice conversation' : 'Start the voice conversation'
          }
        >
          {connecting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : live ? (
            <AudioLines className="size-4" />
          ) : (
            <Mic className="size-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="voice-status" aria-live="polite">
            {STATUS_TEXT[status]}
          </p>

          {live ? (
            <div className="voice-captions" aria-live="polite">
              {latest ? (
                <p key={latest.id} className={`caption is-${latest.speaker}`}>
                  <span className="caption-speaker">
                    {latest.speaker === 'you' ? 'You' : 'Store'}
                  </span>
                  {latest.text}
                </p>
              ) : (
                <p className="caption is-empty">{EXAMPLE_PROMPT}</p>
              )}
            </div>
          ) : (
            <form
              className="voice-input"
              onSubmit={(event) => {
                event.preventDefault();
                if (draft.trim().length >= 8) {
                  humanActions.setMission(draft);
                  setDraft('');
                }
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="…or type what you are trying to accomplish"
                aria-label="Describe your mission"
                maxLength={320}
              />
              <Button
                type="submit"
                size="sm"
                className="h-8 shrink-0 rounded-full bg-ink px-4 text-cream"
              >
                Shape my store <ArrowRight />
              </Button>
            </form>
          )}
        </div>

        <div className="voice-tools" aria-live="polite">
          {toolEvents.slice(0, 3).map((event) => (
            <span
              key={event.id}
              className={`tool-chip ${event.ok ? '' : 'is-error'}`}
            >
              {event.name}
            </span>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!live && !state.mission ? (
            <button
              type="button"
              className="demo-link"
              onClick={() => humanActions.setMission(DEMO_MISSION_TEXT)}
            >
              Try the Iceland mission
            </button>
          ) : null}
          {live ? (
            <Button
              variant="outline"
              className="h-9 shrink-0 rounded-full border-ink/15 bg-transparent"
              onClick={onStop}
            >
              <Square /> End
            </Button>
          ) : (
            <Button
              className="h-9 shrink-0 rounded-full bg-coral px-4 text-white hover:bg-coral/85"
              onClick={onStart}
              disabled={connecting}
            >
              <Mic /> Start talking
            </Button>
          )}
        </div>
      </div>

      {note ? <p className="voice-note">{note}</p> : null}
    </section>
  );
}
