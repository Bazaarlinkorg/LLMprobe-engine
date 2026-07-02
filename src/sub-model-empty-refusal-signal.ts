// lib/sub-model/empty-refusal-signal.ts
//
// Detects Claude 5 / Mythos's (e.g. claude-fable-5) native empty-refusal
// fingerprint and — crucially — distinguishes it from a FOREIGN model that
// merely blanks the single `submodel_refusal` probe.
//
// Genuine Fable emits a structured EMPTY body (native_finish_reason="refusal",
// empty content; OpenRouter renders it as a content-less 200) across the WHOLE
// V3E refusal ladder (L2 up). A foreign model (the prod gpt-5.5 on
// bmapi.020212.xyz, runId cmqch9zci0…) that happens to blank the single refusal
// probe still ANSWERS the ladder — which is exactly how V3E classified it
// gpt-5.5 0.82. So the trustworthy signal is "whole ladder empty", not "the one
// refusal probe is empty".

export type ProbeItemLite = {
  probeId: string;
  status?: string;
  response?: string | null;
};

// V3E core refusal ladder for the Fable fingerprint. L1_tame is excluded (a tame
// prompt is answered, not refused, even by Fable) and L8_hard is excluded per
// the Claude-fingerprint "Skip L8" convention.
const LADDER_CORE = [
  "v3e_refusal_l2_mild",
  "v3e_refusal_l3_borderline_a",
  "v3e_refusal_l4_borderline_b",
  "v3e_refusal_l5_borderline_c",
  "v3e_refusal_l6_sensitive",
  "v3e_refusal_l7_strong",
];
const MIN_LADDER_RUNGS = 3;

const blank = (s: string | null | undefined) => !(s ?? "").trim();

export interface NativeEmptyRefusalSignal {
  /** submodel_refusal ran empty while cutoff or capability answered (rules out a
   *  blanket dead-endpoint failure where everything is empty). The weak signal. */
  singleRefusalEmpty: boolean;
  /** every V3E core ladder rung (L2..L7) that ran (status done) is blank, and at
   *  least MIN_LADDER_RUNGS ran. The strong, foreign-empty-body-proof signal. */
  ladderAllEmpty: boolean;
  /** both of the above — the only condition under which a nativeEmptyRefusal
   *  model may be asserted / corroborated. */
  confirmed: boolean;
}

export function detectNativeEmptyRefusal(items: ProbeItemLite[]): NativeEmptyRefusalSignal {
  const byId = new Map<string, ProbeItemLite>();
  for (const it of items) byId.set(it.probeId, it);

  const answered = (id: string): boolean => {
    const it = byId.get(id);
    return !!it && it.status !== "error" && !blank(it.response);
  };

  const refusalItem = byId.get("submodel_refusal");
  const singleRefusalEmpty =
    !!refusalItem &&
    refusalItem.status !== "error" &&
    blank(refusalItem.response) &&
    (answered("submodel_cutoff") || answered("submodel_capability"));

  const ranRungs = LADDER_CORE
    .map((id) => byId.get(id))
    .filter((it): it is ProbeItemLite => !!it && it.status !== "error");
  const ladderAllEmpty =
    ranRungs.length >= MIN_LADDER_RUNGS && ranRungs.every((it) => blank(it.response));

  return {
    singleRefusalEmpty,
    ladderAllEmpty,
    confirmed: singleRefusalEmpty && ladderAllEmpty,
  };
}
