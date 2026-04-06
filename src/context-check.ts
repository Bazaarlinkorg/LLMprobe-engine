// src/context-check.ts — Canary-based context length detection (MIT)

export interface ContextCheckResult {
  passed: boolean;
  warning: boolean;
  maxTestedChars: number;
  lastPassChars: number | null;
  firstFailChars: number | null;
  reason: string;
}

const LEVELS = [4_000, 16_000, 32_000, 64_000, 128_000];
const CANARY_COUNT = 5;

function buildCanaries(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0").toUpperCase();
    return `CANARY_${i + 1}_${hex}`;
  });
}

function buildMessage(targetChars: number, canaries: string[]): string {
  const header = `This is a context length test. The following text contains ${CANARY_COUNT} unique canary markers embedded at regular intervals. Please read the entire message carefully.\n\n`;
  const footer = `\n\n---\nYou have reached the end of the test message. Please list ALL the canary markers you found in this message (format: CANARY_N_XXXXXX). List only the ones you actually read — do not guess.`;
  const available = targetChars - header.length - footer.length;
  if (available <= 0) return header + footer;
  const segment = Math.floor(available / (CANARY_COUNT + 1));
  const filler = "The quick brown fox jumps over the lazy dog. ";
  let body = "";
  for (let i = 0; i < CANARY_COUNT; i++) {
    body += filler.repeat(Math.ceil(segment / filler.length)).slice(0, segment) + " " + canaries[i] + " ";
  }
  const remaining = available - body.length;
  if (remaining > 0) body += filler.repeat(Math.ceil(remaining / filler.length)).slice(0, remaining);
  return header + body + footer;
}

type SendFn = (message: string) => Promise<string>;

export async function runContextCheck(send: SendFn): Promise<ContextCheckResult> {
  let lastPassChars: number | null = null;
  let firstFailChars: number | null = null;
  let maxTested = 0;

  for (const chars of LEVELS) {
    maxTested = chars;
    const canaries = buildCanaries(CANARY_COUNT);
    const message = buildMessage(chars, canaries);
    let response: string;
    try {
      response = await send(message);
    } catch {
      firstFailChars = chars;
      break;
    }
    const found = canaries.filter(c => response.includes(c)).length;
    if (found / CANARY_COUNT >= 0.8) {
      lastPassChars = chars;
    } else {
      firstFailChars = chars;
      break;
    }
  }

  const kb = (n: number) => `${Math.round(n / 1000)}K`;
  if (firstFailChars === null) {
    return { passed: true, warning: false, maxTestedChars: maxTested, lastPassChars, firstFailChars: null, reason: `Passed all levels (max ${kb(maxTested)} chars)` };
  }
  if (lastPassChars === null) {
    return { passed: false, warning: false, maxTestedChars: maxTested, lastPassChars: null, firstFailChars, reason: `Failed at smallest level (${kb(firstFailChars)} chars)` };
  }
  return { passed: false, warning: true, maxTestedChars: maxTested, lastPassChars, firstFailChars, reason: `Context truncated between ${kb(lastPassChars)} and ${kb(firstFailChars)} chars` };
}
