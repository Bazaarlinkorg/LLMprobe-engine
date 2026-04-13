import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ProxyLogStore, makeLogId } from "../proxy-log-store.js";
import type { ProxyLogEntry } from "../proxy-log-store.js";

function tmpFile(): string {
  return path.join(os.tmpdir(), `probe-log-test-${Date.now()}-${Math.random().toString(36).slice(2)}.ndjson`);
}

function makeEntry(overrides: Partial<ProxyLogEntry> = {}): ProxyLogEntry {
  return {
    id: makeLogId(),
    ts: new Date().toISOString(),
    model: "test-model",
    userContent: "Hello",
    assistantContent: "Hi there",
    profile: "neutral",
    anomaly: false,
    injectionKeywordsFound: [],
    inputTokens: 5,
    outputTokens: 10,
    durationMs: 500,
    statusCode: 200,
    error: null,
    ...overrides,
  };
}

describe("ProxyLogStore", () => {
  let filePath: string;
  let store: ProxyLogStore;

  beforeEach(() => {
    filePath = tmpFile();
    store = new ProxyLogStore(filePath);
  });

  afterEach(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it("returns empty array when file does not exist", () => {
    const fresh = new ProxyLogStore(tmpFile() + "_nonexistent");
    expect(fresh.readAll()).toEqual([]);
  });

  it("appends and reads a single entry", () => {
    const entry = makeEntry({ userContent: "What is TypeScript?" });
    store.append(entry);

    const all = store.readAll();
    expect(all).toHaveLength(1);
    expect(all[0].userContent).toBe("What is TypeScript?");
    expect(all[0].id).toBe(entry.id);
  });

  it("appends multiple entries and reads them in order", () => {
    store.append(makeEntry({ userContent: "First" }));
    store.append(makeEntry({ userContent: "Second" }));
    store.append(makeEntry({ userContent: "Third" }));

    const all = store.readAll();
    expect(all).toHaveLength(3);
    expect(all[0].userContent).toBe("First");
    expect(all[2].userContent).toBe("Third");
  });

  it("readLast returns only the last N entries", () => {
    for (let i = 1; i <= 5; i++) {
      store.append(makeEntry({ userContent: `Message ${i}` }));
    }
    const last2 = store.readLast(2);
    expect(last2).toHaveLength(2);
    expect(last2[0].userContent).toBe("Message 4");
    expect(last2[1].userContent).toBe("Message 5");
  });

  it("readLast returns all entries if N > total", () => {
    store.append(makeEntry());
    store.append(makeEntry());
    expect(store.readLast(100)).toHaveLength(2);
  });

  it("entryCount reflects number of appended entries", () => {
    expect(store.entryCount).toBe(0);
    store.append(makeEntry());
    expect(store.entryCount).toBe(1);
    store.append(makeEntry());
    expect(store.entryCount).toBe(2);
  });

  it("persists entries across store instances (same file)", () => {
    store.append(makeEntry({ userContent: "Persistent message" }));
    const store2 = new ProxyLogStore(filePath);
    const all = store2.readAll();
    expect(all).toHaveLength(1);
    expect(all[0].userContent).toBe("Persistent message");
  });

  it("skips malformed lines without throwing", () => {
    // Write a good line, a bad line, and another good line
    fs.writeFileSync(
      filePath,
      `${JSON.stringify(makeEntry({ userContent: "GoodA" }))}\n` +
      `{THIS IS NOT JSON}\n` +
      `${JSON.stringify(makeEntry({ userContent: "GoodB" }))}\n`,
      "utf-8"
    );
    const all = store.readAll();
    expect(all).toHaveLength(2);
    expect(all.map(e => e.userContent)).toEqual(["GoodA", "GoodB"]);
  });

  it("path property returns resolved file path", () => {
    expect(typeof store.path).toBe("string");
    expect(store.path.length).toBeGreaterThan(0);
  });
});

describe("makeLogId", () => {
  it("generates a string starting with 'plg_'", () => {
    expect(makeLogId().startsWith("plg_")).toBe(true);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => makeLogId()));
    expect(ids.size).toBe(100);
  });
});
