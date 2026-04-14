"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const multimodal_fixtures_js_1 = require("../multimodal-fixtures.js");
(0, vitest_1.describe)("multimodal fixtures", () => {
    (0, vitest_1.it)("PNG fixture decodes and starts with PNG magic bytes", () => {
        const buf = Buffer.from(multimodal_fixtures_js_1.PROBE_IMAGE_PNG_B64, "base64");
        (0, vitest_1.expect)(buf[0]).toBe(0x89);
        (0, vitest_1.expect)(buf[1]).toBe(0x50);
        (0, vitest_1.expect)(buf[2]).toBe(0x4e);
        (0, vitest_1.expect)(buf[3]).toBe(0x47);
        (0, vitest_1.expect)(buf[4]).toBe(0x0d);
        (0, vitest_1.expect)(buf[5]).toBe(0x0a);
        (0, vitest_1.expect)(buf[6]).toBe(0x1a);
        (0, vitest_1.expect)(buf[7]).toBe(0x0a);
    });
    (0, vitest_1.it)("PDF fixture decodes and starts with %PDF- header", () => {
        const buf = Buffer.from(multimodal_fixtures_js_1.PROBE_PDF_B64, "base64");
        (0, vitest_1.expect)(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    });
    (0, vitest_1.it)("exports distinct keyword constants", () => {
        (0, vitest_1.expect)(multimodal_fixtures_js_1.PROBE_IMAGE_KEYWORD.length).toBeGreaterThan(2);
        (0, vitest_1.expect)(multimodal_fixtures_js_1.PROBE_PDF_KEYWORD.length).toBeGreaterThan(2);
        (0, vitest_1.expect)(multimodal_fixtures_js_1.PROBE_IMAGE_KEYWORD.toLowerCase()).not.toBe(multimodal_fixtures_js_1.PROBE_PDF_KEYWORD.toLowerCase());
    });
    (0, vitest_1.it)("exports correct media types", () => {
        (0, vitest_1.expect)(multimodal_fixtures_js_1.PROBE_IMAGE_MEDIA_TYPE).toBe("image/png");
        (0, vitest_1.expect)(multimodal_fixtures_js_1.PROBE_PDF_MEDIA_TYPE).toBe("application/pdf");
    });
    (0, vitest_1.it)("PNG fixture is under 8 KB", () => {
        const buf = Buffer.from(multimodal_fixtures_js_1.PROBE_IMAGE_PNG_B64, "base64");
        (0, vitest_1.expect)(buf.byteLength).toBeLessThan(8 * 1024);
    });
    (0, vitest_1.it)("PDF fixture is under 16 KB", () => {
        const buf = Buffer.from(multimodal_fixtures_js_1.PROBE_PDF_B64, "base64");
        (0, vitest_1.expect)(buf.byteLength).toBeLessThan(16 * 1024);
    });
});
//# sourceMappingURL=multimodal-fixtures.test.js.map