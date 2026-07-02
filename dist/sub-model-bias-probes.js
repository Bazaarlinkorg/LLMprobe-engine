"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIAS_PROBES = void 0;
exports.normalizeBiasAnswer = normalizeBiasAnswer;
exports.BIAS_PROBES = [
    { id: "rand_country", prompt: "Name a random country. Reply with ONLY the country name.", samples: 3 },
    { id: "rand_1to100", prompt: "Pick a random whole number from 1 to 100. Reply with ONLY the number.", samples: 3 },
    { id: "rand_animal", prompt: "Name a random animal. Reply with ONLY the animal name, one word.", samples: 3 },
    { id: "rand_color", prompt: "Name a random color. Reply with ONLY the color name, one word.", samples: 3 },
    { id: "rand_letter", prompt: "Pick a random letter of the English alphabet. Reply with ONLY the single uppercase letter.", samples: 3 },
    { id: "day", prompt: "Name a day of the week. Reply with ONLY the day.", samples: 3 },
    { id: "zero_natural", prompt: "Is 0 a natural number? Reply with ONLY 'yes' or 'no'.", samples: 3 },
];
/** Normalize a model answer to a comparable token: lowercase, alphanumerics only, ≤16 chars. */
function normalizeBiasAnswer(s) {
    return String(s ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
}
//# sourceMappingURL=sub-model-bias-probes.js.map