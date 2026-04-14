import { describe, it, expect } from "vitest";
import {
  PROBE_IMAGE_PNG_B64,
  PROBE_IMAGE_KEYWORD,
  PROBE_IMAGE_MEDIA_TYPE,
  PROBE_PDF_B64,
  PROBE_PDF_KEYWORD,
  PROBE_PDF_MEDIA_TYPE,
} from "../multimodal-fixtures.js";

describe("multimodal fixtures", () => {
  it("PNG fixture decodes and starts with PNG magic bytes", () => {
    const buf = Buffer.from(PROBE_IMAGE_PNG_B64, "base64");
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
    expect(buf[4]).toBe(0x0d);
    expect(buf[5]).toBe(0x0a);
    expect(buf[6]).toBe(0x1a);
    expect(buf[7]).toBe(0x0a);
  });

  it("PDF fixture decodes and starts with %PDF- header", () => {
    const buf = Buffer.from(PROBE_PDF_B64, "base64");
    expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("exports distinct keyword constants", () => {
    expect(PROBE_IMAGE_KEYWORD.length).toBeGreaterThan(2);
    expect(PROBE_PDF_KEYWORD.length).toBeGreaterThan(2);
    expect(PROBE_IMAGE_KEYWORD.toLowerCase()).not.toBe(PROBE_PDF_KEYWORD.toLowerCase());
  });

  it("exports correct media types", () => {
    expect(PROBE_IMAGE_MEDIA_TYPE).toBe("image/png");
    expect(PROBE_PDF_MEDIA_TYPE).toBe("application/pdf");
  });

  it("PNG fixture is under 8 KB", () => {
    const buf = Buffer.from(PROBE_IMAGE_PNG_B64, "base64");
    expect(buf.byteLength).toBeLessThan(8 * 1024);
  });

  it("PDF fixture is under 16 KB", () => {
    const buf = Buffer.from(PROBE_PDF_B64, "base64");
    expect(buf.byteLength).toBeLessThan(16 * 1024);
  });
});
