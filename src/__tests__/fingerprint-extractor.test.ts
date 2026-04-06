import { describe, it, expect } from "vitest";
import { extractFingerprint } from "../fingerprint-extractor.js";

describe("extractFingerprint", () => {
  it("detects Claude self-claim from identity_self_knowledge response", () => {
    const responses: Record<string, string> = {
      identity_self_knowledge: "I am Claude, an AI assistant made by Anthropic. I'm Claude 3.5 Sonnet.",
    };
    const features = extractFingerprint(responses);
    expect(features.selfClaim["claude"]).toBe(1);
    expect(features.selfClaim["openai"]).toBe(0);
  });

  it("detects GPT/OpenAI self-claim", () => {
    const responses: Record<string, string> = {
      identity_self_knowledge: "I'm ChatGPT, made by OpenAI. I'm based on GPT-4.",
    };
    const features = extractFingerprint(responses);
    expect(features.selfClaim["openai"]).toBe(1);
    expect(features.selfClaim["claude"]).toBe(0);
  });

  it("detects Qwen self-claim", () => {
    const responses: Record<string, string> = {
      identity_self_knowledge: "我是通义千问，阿里巴巴开发的AI助手。",
    };
    const features = extractFingerprint(responses);
    expect(features.selfClaim["qwen"]).toBe(1);
  });

  it("detects JSON pollution from identity_json_discipline response", () => {
    const responses: Record<string, string> = {
      identity_json_discipline: '```json\n{"name": "Alice", "age": 30, "city": "Paris"}\n```',
    };
    const features = extractFingerprint(responses);
    expect(features.jsonDiscipline["markdown_polluted"]).toBe(1);
    expect(features.jsonDiscipline["pure_json"]).toBe(0);
  });

  it("detects clean JSON discipline", () => {
    const responses: Record<string, string> = {
      identity_json_discipline: '{"name": "Alice", "age": 30, "city": "Paris"}',
    };
    const features = extractFingerprint(responses);
    expect(features.jsonDiscipline["pure_json"]).toBe(1);
    expect(features.jsonDiscipline["markdown_polluted"]).toBe(0);
  });

  it("detects 'certainly' opener in lexical style", () => {
    const responses: Record<string, string> = {
      identity_style_en: "Certainly! The most important skill for a software engineer in 2025 is...",
    };
    const features = extractFingerprint(responses);
    expect(features.lexical["opener_certainly"]).toBe(1);
  });

  it("returns zero-signal features for empty input", () => {
    const features = extractFingerprint({});
    expect(Object.values(features.selfClaim).every(v => v === 0)).toBe(true);
  });
});
