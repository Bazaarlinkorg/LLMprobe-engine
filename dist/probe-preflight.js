"use strict";
// src/probe-preflight.ts — Pre-flight response classifier (MIT)
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyPreflightResult = classifyPreflightResult;
const MODEL_NOT_FOUND_PATTERNS = [
    "model_not_found",
    "no available channel",
    "model not found",
];
function isModelNotFound(code, message) {
    const haystack = (code + " " + message).toLowerCase();
    return MODEL_NOT_FOUND_PATTERNS.some(p => haystack.includes(p));
}
function classifyPreflightResult(status, rawBody) {
    if (status >= 200 && status < 300)
        return { outcome: "ok", reason: "" };
    let errCode = "";
    let errMessage = "";
    try {
        const parsed = JSON.parse(rawBody);
        errCode = parsed?.error?.code ?? "";
        errMessage = parsed?.error?.message ?? "";
    }
    catch {
        errMessage = rawBody.trim().slice(0, 200);
    }
    const displayMsg = errMessage || `HTTP ${status}`;
    if (status === 401)
        return { outcome: "abort", reason: `Auth failed (401): ${displayMsg}` };
    if (status === 403)
        return { outcome: "abort", reason: `Forbidden (403): ${displayMsg}` };
    if (isModelNotFound(errCode, errMessage))
        return { outcome: "abort", reason: `Model not found: ${displayMsg}` };
    if (status === 429)
        return { outcome: "warn", reason: `Rate limited (429): ${displayMsg}` };
    return { outcome: "warn", reason: `Endpoint returned ${status}: ${displayMsg}` };
}
//# sourceMappingURL=probe-preflight.js.map