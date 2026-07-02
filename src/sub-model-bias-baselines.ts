// GENERATED — border-probe bias distributions for the V3H layer. Ported from BazaarLink prod 2026-07-02.
// Reference bias distributions for the V3G/V3H layer. Refresh via scripts/build-bias-baselines.ts (biases can drift).
// H5 metadata: deepseek/openai sampled 2026-07-01; anthropic cluster sampled 2026-07-02.
import type { BiasBaseline } from "./sub-model-v3g-bias-fingerprint.js";

export const BIAS_BASELINES: BiasBaseline[] = [
  {
    "modelId": "deepseek/deepseek-v4-flash",
    "capturedAt": "2026-07-01",
    "sampleCount": 260,
    "probes": {
      "rand_country": {
        "bhutan": 15,
        "liechtenstein": 2,
        "chad": 1,
        "zimbabwe": 1,
        "mongolia": 5,
        "mozambique": 2,
        "lesotho": 1,
        "nauru": 1,
        "micronesia": 1,
        "vanuatu": 2,
        "paraguay": 1,
        "peru": 1,
        "seychelles": 1,
        "kazakhstan": 1,
        "togo": 1,
        "monaco": 1,
        "nigeria": 1,
        "kyrgyzstan": 1,
        "uruguay": 1
      },
      "rand_1to100": {
        "13": 1,
        "34": 1,
        "42": 15,
        "47": 9,
        "54": 1,
        "57": 2,
        "72": 1,
        "73": 9,
        "79": 1
      },
      "rand_animal": {
        "platypus": 10,
        "octopus": 1,
        "elephant": 9,
        "kangaroo": 2,
        "jaguar": 1,
        "redpanda": 1,
        "pangolin": 1,
        "ocelot": 2,
        "raccoon": 1,
        "giraffe": 5,
        "penguin": 1,
        "hedgehog": 1,
        "axolotl": 2,
        "llama": 1,
        "capybara": 1,
        "koala": 1
      },
      "rand_color": {
        "cerulean": 8,
        "teal": 7,
        "magenta": 4,
        "turquoise": 9,
        "cyan": 4,
        "red": 1,
        "azure": 2,
        "chartreuse": 1,
        "periwinkle": 2,
        "vermilion": 1,
        "brown": 1
      },
      "rand_letter": {
        "q": 5,
        "x": 2,
        "j": 1,
        "m": 15,
        "k": 9,
        "s": 1,
        "t": 1,
        "z": 2,
        "l": 2,
        "u": 1,
        "r": 1
      },
      "day": {
        "monday": 17,
        "thursday": 3
      },
      "zero_natural": {
        "no": 32,
        "yes": 8
      }
    }
  },
  {
    "modelId": "deepseek/deepseek-v4-pro",
    "capturedAt": "2026-07-01",
    "sampleCount": 259,
    "probes": {
      "rand_country": {
        "belgium": 2,
        "japan": 2,
        "canada": 3,
        "finland": 2,
        "burundi": 2,
        "mongolia": 18,
        "tajikistan": 1,
        "tuvalu": 1,
        "italy": 2,
        "france": 1,
        "argentina": 1,
        "mozambique": 1,
        "benin": 1,
        "turkmenistan": 1,
        "maldives": 1,
        "kiribati": 1
      },
      "rand_1to100": {
        "17": 1,
        "36": 1,
        "37": 3,
        "42": 14,
        "43": 1,
        "45": 2,
        "46": 1,
        "47": 5,
        "49": 1,
        "57": 3,
        "58": 1,
        "69": 1,
        "73": 2,
        "74": 1,
        "78": 1,
        "83": 1,
        "86": 1
      },
      "rand_animal": {
        "giraffe": 3,
        "elephant": 27,
        "platypus": 2,
        "ocelot": 1,
        "axolotl": 4,
        "cat": 1,
        "aardvark": 1
      },
      "rand_color": {
        "cerulean": 33,
        "blue": 1,
        "periwinkle": 1,
        "teal": 1,
        "azure": 3,
        "mauve": 1
      },
      "rand_letter": {
        "g": 23,
        "w": 1,
        "h": 1,
        "r": 1,
        "x": 2,
        "o": 1,
        "e": 2,
        "j": 1,
        "v": 1,
        "m": 3,
        "q": 2,
        "p": 1,
        "z": 1
      },
      "day": {
        "thursday": 3,
        "monday": 11,
        "wednesday": 3,
        "tuesday": 3
      },
      "zero_natural": {
        "yes": 25,
        "no": 15
      }
    }
  },
  {
    "modelId": "openai/gpt-5.5",
    "capturedAt": "2026-07-01",
    "sampleCount": 240,
    "probes": {
      "rand_country": {
        "portugal": 36,
        "madagascar": 1,
        "argentina": 1,
        "namibia": 1,
        "chile": 1
      },
      "rand_1to100": {
        "37": 1,
        "42": 4,
        "47": 33,
        "57": 2
      },
      "rand_animal": {
        "giraffe": 16,
        "pangolin": 17,
        "otter": 3,
        "capybara": 1,
        "dolphin": 1,
        "koala": 1,
        "tiger": 1
      },
      "rand_color": {
        "cerulean": 9,
        "vermilion": 2,
        "purple": 11,
        "turquoise": 5,
        "teal": 3,
        "indigo": 4,
        "violet": 4,
        "chartreuse": 1,
        "blue": 1
      },
      "rand_letter": {
        "q": 16,
        "k": 2,
        "g": 1,
        "m": 1
      },
      "day": {
        "tuesday": 40
      },
      "zero_natural": {
        "yes": 20
      }
    }
  },
  {
    "modelId": "openai/gpt-5.3-codex",
    "capturedAt": "2026-07-01",
    "sampleCount": 240,
    "probes": {
      "rand_country": {
        "bhutan": 24,
        "chile": 3,
        "nepal": 5,
        "brazil": 1,
        "portugal": 1,
        "peru": 4,
        "malawi": 1,
        "uruguay": 1
      },
      "rand_1to100": {
        "57": 7,
        "73": 33
      },
      "rand_animal": {
        "otter": 31,
        "ocelot": 6,
        "axolotl": 2,
        "platypus": 1
      },
      "rand_color": {
        "cerulean": 13,
        "teal": 10,
        "cobalt": 3,
        "turquoise": 12,
        "cyan": 2
      },
      "rand_letter": {
        "q": 16,
        "g": 3,
        "k": 1
      },
      "day": {
        "tuesday": 16,
        "monday": 14,
        "thursday": 7,
        "wednesday": 3
      },
      "zero_natural": {
        "yes": 20
      }
    }
  },
  {
    "modelId": "anthropic/claude-opus-4.5",
    "capturedAt": "2026-07-02",
    "sampleCount": 336,
    "probes": {
      "rand_country": {
        "finland": 9,
        "portugal": 22,
        "sweden": 9,
        "japan": 5,
        "brazil": 3
      },
      "rand_1to100": {
        "47": 38,
        "73": 10
      },
      "rand_animal": {
        "pangolin": 47,
        "platypus": 1
      },
      "rand_color": {
        "teal": 25,
        "cerulean": 14,
        "turquoise": 9
      },
      "rand_letter": {
        "k": 46,
        "j": 2
      },
      "day": {
        "friday": 35,
        "wednesday": 13
      },
      "zero_natural": {
        "no": 48
      }
    }
  },
  {
    "modelId": "anthropic/claude-opus-4.6",
    "capturedAt": "2026-07-02",
    "sampleCount": 336,
    "probes": {
      "rand_country": {
        "brazil": 48
      },
      "rand_1to100": {
        "47": 46,
        "73": 2
      },
      "rand_animal": {
        "pangolin": 42,
        "otter": 2,
        "jaguar": 1,
        "okapi": 1,
        "ocelot": 2
      },
      "rand_color": {
        "blue": 16,
        "cerulean": 29,
        "teal": 2,
        "purple": 1
      },
      "rand_letter": {
        "k": 36,
        "g": 12
      },
      "day": {
        "wednesday": 48
      },
      "zero_natural": {
        "no": 48
      }
    }
  },
  {
    "modelId": "anthropic/claude-opus-4.7",
    "capturedAt": "2026-07-02",
    "sampleCount": 336,
    "probes": {
      "rand_country": {
        "madagascar": 10,
        "mongolia": 29,
        "portugal": 4,
        "uruguay": 3,
        "uzbekistan": 1,
        "bhutan": 1
      },
      "rand_1to100": {
        "47": 2,
        "73": 46
      },
      "rand_animal": {
        "otter": 48
      },
      "rand_color": {
        "chartreuse": 8,
        "teal": 40
      },
      "rand_letter": {
        "m": 48
      },
      "day": {
        "wednesday": 48
      },
      "zero_natural": {
        "yes": 48
      }
    }
  },
  {
    "modelId": "anthropic/claude-opus-4.8",
    "capturedAt": "2026-07-02",
    "sampleCount": 336,
    "probes": {
      "rand_country": {
        "japan": 38,
        "peru": 9,
        "brazil": 1
      },
      "rand_1to100": {
        "37": 1,
        "57": 1,
        "73": 46
      },
      "rand_animal": {
        "fox": 5,
        "otter": 43
      },
      "rand_color": {
        "teal": 48
      },
      "rand_letter": {
        "m": 48
      },
      "day": {
        "monday": 23,
        "wednesday": 25
      },
      "zero_natural": {
        "thisquestiondoes": 48
      }
    }
  },
  {
    "modelId": "anthropic/claude-sonnet-4.5",
    "capturedAt": "2026-07-02",
    "sampleCount": 336,
    "probes": {
      "rand_country": {
        "canada": 5,
        "kazakhstan": 1,
        "portugal": 6,
        "norway": 9,
        "switzerland": 5,
        "tunisia": 1,
        "chile": 2,
        "belgium": 1,
        "ecuador": 3,
        "slovenia": 1,
        "madagascar": 2,
        "brazil": 1,
        "jamaica": 1,
        "colombia": 2,
        "uruguay": 1,
        "lithuania": 1,
        "albania": 1,
        "tanzania": 1,
        "panama": 1,
        "netherlands": 1,
        "guatemala": 1,
        "morocco": 1
      },
      "rand_1to100": {
        "47": 48
      },
      "rand_animal": {
        "dolphin": 11,
        "penguin": 31,
        "pangolin": 2,
        "elephant": 4
      },
      "rand_color": {
        "turquoise": 37,
        "blue": 6,
        "teal": 5
      },
      "rand_letter": {
        "k": 38,
        "m": 10
      },
      "day": {
        "thursday": 48
      },
      "zero_natural": {
        "no": 48
      }
    }
  },
  {
    "modelId": "anthropic/claude-sonnet-4.6",
    "capturedAt": "2026-07-02",
    "sampleCount": 336,
    "probes": {
      "rand_country": {
        "nigeria": 43,
        "brazil": 3,
        "chad": 2
      },
      "rand_1to100": {
        "42": 1,
        "47": 47
      },
      "rand_animal": {
        "pangolin": 10,
        "elephant": 12,
        "giraffe": 19,
        "capybara": 3,
        "penguin": 4
      },
      "rand_color": {
        "cerulean": 39,
        "teal": 9
      },
      "rand_letter": {
        "k": 40,
        "q": 8
      },
      "day": {
        "wednesday": 48
      },
      "zero_natural": {
        "no": 48
      }
    }
  },
  {
    "modelId": "anthropic/claude-sonnet-5",
    "capturedAt": "2026-07-02",
    "sampleCount": 336,
    "probes": {
      "rand_country": {
        "portugal": 43,
        "brazil": 2,
        "uruguay": 1,
        "kazakhstan": 2
      },
      "rand_1to100": {
        "47": 48
      },
      "rand_animal": {
        "elephant": 48
      },
      "rand_color": {
        "turquoise": 42,
        "teal": 5,
        "cerulean": 1
      },
      "rand_letter": {
        "q": 16,
        "k": 27,
        "m": 5
      },
      "day": {
        "wednesday": 39,
        "tuesday": 9
      },
      "zero_natural": {
        "yes": 48
      }
    }
  },
  {
    "modelId": "anthropic/claude-haiku-4.5",
    "capturedAt": "2026-07-02",
    "sampleCount": 336,
    "probes": {
      "rand_country": {
        "peru": 9,
        "portugal": 20,
        "brazil": 14,
        "poland": 1,
        "paraguay": 1,
        "japan": 1,
        "norway": 1,
        "mongolia": 1
      },
      "rand_1to100": {
        "42": 46,
        "47": 2
      },
      "rand_animal": {
        "penguin": 2,
        "platypus": 40,
        "giraffe": 6
      },
      "rand_color": {
        "mauve": 1,
        "turquoise": 22,
        "purple": 2,
        "marigold": 1,
        "blue": 8,
        "azure": 2,
        "magenta": 1,
        "cerulean": 4,
        "crimson": 1,
        "vermillion": 3,
        "cyan": 1,
        "teal": 1,
        "violet": 1
      },
      "rand_letter": {
        "x": 2,
        "q": 35,
        "k": 6,
        "g": 4,
        "z": 1
      },
      "day": {
        "monday": 48
      },
      "zero_natural": {
        "no": 48
      }
    }
  },
  {
    "modelId": "anthropic/claude-fable-5",
    "capturedAt": "2026-07-02",
    "sampleCount": 336,
    "probes": {
      "rand_country": {
        "madagascar": 46,
        "uruguay": 1,
        "kyrgyzstan": 1
      },
      "rand_1to100": {
        "37": 2,
        "47": 34,
        "73": 12
      },
      "rand_animal": {
        "okapi": 38,
        "capybara": 4,
        "pangolin": 6
      },
      "rand_color": {
        "teal": 43,
        "cerulean": 4,
        "turquoise": 1
      },
      "rand_letter": {
        "q": 43,
        "k": 5
      },
      "day": {
        "wednesday": 48
      },
      "zero_natural": {
        "yes": 47,
        "yeshoweverishoul": 1
      }
    }
  }
];
