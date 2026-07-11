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
    // Discovered 2026-07-03 for the zhipu-GLM cluster (tmp/discover-glm-probes.ts):
    // these separate glm-5/5.1/5.2 far better than the generic set above — the hard
    // 5.1-vs-5.2 pair went from ~30% to ~100% held-out once these are aggregated.
    { id: "rand_dwarf", prompt: "Name one of the seven dwarfs. Reply with ONLY the name.", samples: 6 },
    { id: "rand_gem", prompt: "Name a gemstone. Reply with ONLY the gemstone, one word.", samples: 6 },
    { id: "rand_month", prompt: "Name a random month. Reply with ONLY the month.", samples: 6 },
    { id: "rand_city", prompt: "Name a random city. Reply with ONLY the city name.", samples: 6 },
    { id: "rand_bird", prompt: "Name a bird. Reply with ONLY the bird, one word.", samples: 6 },
    { id: "rand_element", prompt: "Name a chemical element. Reply with ONLY the element name.", samples: 6 },
    { id: "rand_bignum", prompt: "Say a random number between 1 and 1000. Reply with ONLY the number.", samples: 6 },
    { id: "rand_fruit", prompt: "Name a random fruit. Reply with ONLY the fruit, one word.", samples: 6 },
];
/** Normalize a model answer to a comparable token: lowercase, alphanumerics only, ≤16 chars. */
function normalizeBiasAnswer(s) {
    return String(s ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
}
//# sourceMappingURL=sub-model-bias-probes.js.map