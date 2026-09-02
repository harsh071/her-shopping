import { NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';

import {
  DEFAULT_REALTIME_VOICE,
  VOICE_AGENT_INSTRUCTIONS,
} from '@/lib/voice/instructions';

type RealtimeEnvironment = {
  OPENAI_API_KEY?: string;
  OPENAI_REALTIME_MODEL?: string;
  OPENAI_REALTIME_VOICE?: string;
};

/**
 * Hosted ChatGPT Sites expose environment variables and secrets as Cloudflare
 * Worker bindings. Keep process.env as the local-development fallback so
 * .env.local continues to work with `npm run dev`.
 */
function serverEnvironment(): RealtimeEnvironment {
  const bindings = env as RealtimeEnvironment;

  return {
    OPENAI_API_KEY: bindings.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY,
    OPENAI_REALTIME_MODEL:
      bindings.OPENAI_REALTIME_MODEL ?? process.env.OPENAI_REALTIME_MODEL,
    OPENAI_REALTIME_VOICE:
      bindings.OPENAI_REALTIME_VOICE ?? process.env.OPENAI_REALTIME_VOICE,
  };
}

/**
 * Mints a short-lived realtime client credential.
 *
 * The long-lived OPENAI_API_KEY stays on the server; the browser only ever sees
 * an ephemeral secret it uses to negotiate one WebRTC call.
 */
export async function POST() {
  const runtime = serverEnvironment();
  const apiKey = runtime.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Voice is disabled: OPENAI_API_KEY is not configured on the server.',
      },
      { status: 503 },
    );
  }

  const model = runtime.OPENAI_REALTIME_MODEL ?? 'gpt-realtime';
  const voice = runtime.OPENAI_REALTIME_VOICE ?? DEFAULT_REALTIME_VOICE;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // Current API shape first, then the earlier sessions endpoint, so the demo
  // survives an API revision without a code change.
  type CredentialResponse = {
    value?: string;
    client_secret?: { value?: string };
  };

  const attempts: Array<{
    url: string;
    body: unknown;
    read: (json: CredentialResponse) => string | undefined;
  }> = [
    {
      url: 'https://api.openai.com/v1/realtime/client_secrets',
      body: {
        session: {
          type: 'realtime',
          model,
          instructions: VOICE_AGENT_INSTRUCTIONS,
          audio: { output: { voice } },
        },
      },
      read: (json) => json.value ?? json.client_secret?.value,
    },
    {
      url: 'https://api.openai.com/v1/realtime/sessions',
      body: { model, voice, instructions: VOICE_AGENT_INSTRUCTIONS },
      read: (json) => json.client_secret?.value,
    },
  ];

  let lastDetail = '';
  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(attempt.body),
      });
      const text = await response.text();
      if (!response.ok) {
        lastDetail = `${response.status} ${text.slice(0, 300)}`;
        continue;
      }
      const json = JSON.parse(text) as CredentialResponse;
      const clientSecret = attempt.read(json);
      if (!clientSecret) {
        lastDetail = 'The realtime response did not include a client secret.';
        continue;
      }
      return NextResponse.json(
        { clientSecret, model, voice },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (error) {
      lastDetail = error instanceof Error ? error.message : String(error);
    }
  }

  console.error('Realtime credential request failed', lastDetail);
  return NextResponse.json(
    { error: 'Could not start a realtime voice session.' },
    { status: 502 },
  );
}
