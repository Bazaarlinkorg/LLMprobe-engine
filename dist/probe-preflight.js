"use strict";
// src/probe-preflight.ts
// Pure helper: classify a pre-flight response to decide whether to abort
// the probe run before wasting 19 requests on a broken endpoint/key/model.
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyPreflightResult = classifyPreflightResult;
const PF_MSG = {
    authFailed: {
        en: (m) => `Authentication failed (401): ${m}`,
        "zh-TW": (m) => `認證失敗（401）：${m}`,
        "zh-CN": (m) => `认证失败（401）：${m}`,
        ja: (m) => `認証失敗 (401): ${m}`,
        ko: (m) => `인증 실패(401): ${m}`,
        de: (m) => `Authentifizierung fehlgeschlagen (401): ${m}`,
        vi: (m) => `Xác thực thất bại (401): ${m}`,
        id: (m) => `Autentikasi gagal (401): ${m}`,
        hi: (m) => `प्रमाणीकरण विफल (401): ${m}`,
        th: (m) => `การตรวจสอบสิทธิ์ล้มเหลว (401): ${m}`,
    },
    forbidden: {
        en: (m) => `Permission denied (403): ${m}`,
        "zh-TW": (m) => `權限不足（403）：${m}`,
        "zh-CN": (m) => `权限不足（403）：${m}`,
        ja: (m) => `権限不足 (403): ${m}`,
        ko: (m) => `권한 없음(403): ${m}`,
        de: (m) => `Berechtigung verweigert (403): ${m}`,
        vi: (m) => `Không đủ quyền (403): ${m}`,
        id: (m) => `Izin ditolak (403): ${m}`,
        hi: (m) => `अनुमति अस्वीकृत (403): ${m}`,
        th: (m) => `ไม่มีสิทธิ์ (403): ${m}`,
    },
    modelNotFound: {
        en: (m) => `Model not found: ${m}`,
        "zh-TW": (m) => `模型不存在：${m}`,
        "zh-CN": (m) => `模型不存在：${m}`,
        ja: (m) => `モデルが見つかりません: ${m}`,
        ko: (m) => `모델을 찾을 수 없음: ${m}`,
        de: (m) => `Modell nicht gefunden: ${m}`,
        vi: (m) => `Không tìm thấy mô hình: ${m}`,
        id: (m) => `Model tidak ditemukan: ${m}`,
        hi: (m) => `मॉडल नहीं मिला: ${m}`,
        th: (m) => `ไม่พบโมเดล: ${m}`,
    },
    rateLimit: {
        en: (m) => `Rate limit (429): ${m}`,
        "zh-TW": (m) => `Rate limit（429）：${m}`,
        "zh-CN": (m) => `Rate limit（429）：${m}`,
        ja: (m) => `レート制限 (429): ${m}`,
        ko: (m) => `속도 제한(429): ${m}`,
        de: (m) => `Rate-Limit (429): ${m}`,
        vi: (m) => `Rate limit (429): ${m}`,
        id: (m) => `Rate limit (429): ${m}`,
        hi: (m) => `दर सीमा (429): ${m}`,
        th: (m) => `จำกัดอัตรา (429): ${m}`,
    },
    anthropicError: {
        en: (t, m) => `${t}: ${m}`,
        "zh-TW": (t, m) => `${t}：${m}`,
        "zh-CN": (t, m) => `${t}：${m}`,
        ja: (t, m) => `${t}: ${m}`,
        ko: (t, m) => `${t}: ${m}`,
        de: (t, m) => `${t}: ${m}`,
        vi: (t, m) => `${t}: ${m}`,
        id: (t, m) => `${t}: ${m}`,
        hi: (t, m) => `${t}: ${m}`,
        th: (t, m) => `${t}: ${m}`,
    },
    genericStatus: {
        en: (s, m) => `Endpoint returned ${s}: ${m}`,
        "zh-TW": (s, m) => `端點回傳 ${s}：${m}`,
        "zh-CN": (s, m) => `端点返回 ${s}：${m}`,
        ja: (s, m) => `エンドポイントが ${s} を返しました: ${m}`,
        ko: (s, m) => `엔드포인트가 ${s} 반환: ${m}`,
        de: (s, m) => `Endpunkt gab ${s} zurück: ${m}`,
        vi: (s, m) => `Endpoint trả về ${s}: ${m}`,
        id: (s, m) => `Endpoint mengembalikan ${s}: ${m}`,
        hi: (s, m) => `एंडपॉइंट ने ${s} लौटाया: ${m}`,
        th: (s, m) => `Endpoint ส่งกลับ ${s}: ${m}`,
    },
};
function pickMsg(dict, lang) {
    return dict[lang] ?? dict.en;
}
const MODEL_NOT_FOUND_PATTERNS = [
    "model_not_found",
    "no available channel",
    "model not found",
];
function isModelNotFound(code, message) {
    const haystack = (code + " " + message).toLowerCase();
    return MODEL_NOT_FOUND_PATTERNS.some(p => haystack.includes(p));
}
/**
 * Extract error type from either OpenAI or Anthropic error envelope.
 * OpenAI: { error: { code?: string; type?: string; message?: string } }
 * Anthropic: { type: "error"; error: { type: string; message?: string } }
 */
function extractErrorType(body) {
    if (!body || typeof body !== "object")
        return null;
    const obj = body;
    // Anthropic envelope: nested error.type within type=error envelope
    if (obj.type === "error" && typeof obj.error === "object" && obj.error !== null) {
        const error = obj.error;
        if (typeof error.type === "string") {
            return error.type;
        }
    }
    // OpenAI envelope: flat error.code or error.type
    if (typeof obj.error === "object" && obj.error !== null) {
        const error = obj.error;
        if (typeof error.code === "string") {
            return error.code;
        }
        if (typeof error.type === "string") {
            return error.type;
        }
    }
    return null;
}
/**
 * Classify a pre-flight HTTP response.
 *
 * @param status   HTTP status code from the pre-flight chat/completions request
 * @param rawBody  Raw response body text (may be empty or non-JSON)
 */
function classifyPreflightResult(status, rawBody, lang = "en") {
    if (status >= 200 && status < 300) {
        return { outcome: "ok", reason: "" };
    }
    // Parse structured error if possible
    let errCode = "";
    let errMessage = "";
    let parsedBody = null;
    try {
        parsedBody = JSON.parse(rawBody);
        const parsed = parsedBody;
        errCode = parsed?.error?.code ?? "";
        errMessage = parsed?.error?.message ?? "";
    }
    catch {
        // non-JSON body — use raw body as message
        errMessage = rawBody.trim().slice(0, 200);
    }
    const displayMsg = errMessage || `HTTP ${status}`;
    if (status === 401) {
        return { outcome: "abort", reason: pickMsg(PF_MSG.authFailed, lang)(displayMsg) };
    }
    if (status === 403) {
        return { outcome: "abort", reason: pickMsg(PF_MSG.forbidden, lang)(displayMsg) };
    }
    // Check Anthropic-specific error types (from nested error.type)
    const errorType = extractErrorType(parsedBody);
    const anthropicAbortErrors = ["authentication_error", "not_found_error", "permission_error", "invalid_request_error"];
    if (errorType && anthropicAbortErrors.includes(errorType)) {
        return { outcome: "abort", reason: pickMsg(PF_MSG.anthropicError, lang)(errorType, displayMsg) };
    }
    if (isModelNotFound(errCode, errMessage)) {
        return { outcome: "abort", reason: pickMsg(PF_MSG.modelNotFound, lang)(displayMsg) };
    }
    if (status === 429) {
        return { outcome: "warn", reason: pickMsg(PF_MSG.rateLimit, lang)(displayMsg) };
    }
    return { outcome: "warn", reason: pickMsg(PF_MSG.genericStatus, lang)(status, displayMsg) };
}
//# sourceMappingURL=probe-preflight.js.map