"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIAS_BASELINES = void 0;
exports.BIAS_BASELINES = [
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
    },
    {
        "modelId": "z-ai/glm-5",
        "capturedAt": "2026-07-03",
        "sampleCount": 1800,
        "probes": {
            "day": {
                "wednesday": 119,
                "tuesday": 42,
                "monday": 28,
                "thursday": 5,
                "friday": 6
            },
            "rand_dwarf": {
                "grumpy": 77,
                "dopey": 55,
                "happy": 25,
                "bashful": 14,
                "sleepy": 13,
                "doc": 16
            },
            "rand_gem": {
                "sapphire": 15,
                "diamond": 134,
                "ruby": 48,
                "emerald": 3
            },
            "rand_month": {
                "september": 38,
                "august": 64,
                "july": 22,
                "october": 57,
                "april": 5,
                "march": 13,
                "november": 1
            },
            "rand_city": {
                "kyoto": 79,
                "reykjavik": 2,
                "lisbon": 27,
                "barcelona": 3,
                "prague": 7,
                "tokyo": 17,
                "helsinki": 1,
                "vienna": 5,
                "oslo": 5,
                "lima": 3,
                "seville": 1,
                "seattle": 15,
                "vancouver": 1,
                "istanbul": 3,
                "bristol": 1,
                "hanoi": 1,
                "berlin": 8,
                "nairobi": 1,
                "melbourne": 1,
                "copenhagen": 2,
                "toronto": 3,
                "sydney": 2,
                "osaka": 1,
                "krakow": 1,
                "madrid": 1,
                "cairo": 1,
                "kyiv": 1,
                "budapest": 2,
                "seoul": 1,
                "valencia": 2,
                "wichita": 1,
                "zurich": 1
            },
            "rand_bird": {
                "sparrow": 137,
                "eagle": 43,
                "robin": 20
            },
            "rand_element": {
                "oxygen": 116,
                "hydrogen": 35,
                "gold": 37,
                "carbon": 7,
                "helium": 4,
                "iron": 1
            },
            "rand_bignum": {
                "362": 1,
                "384": 1,
                "428": 2,
                "429": 4,
                "437": 1,
                "438": 1,
                "457": 1,
                "473": 6,
                "482": 8,
                "483": 1,
                "559": 1,
                "561": 1,
                "562": 1,
                "571": 1,
                "572": 1,
                "582": 5,
                "583": 6,
                "587": 1,
                "589": 1,
                "628": 1,
                "642": 1,
                "724": 1,
                "729": 1,
                "734": 37,
                "738": 5,
                "739": 15,
                "742": 65,
                "743": 9,
                "749": 3,
                "753": 1,
                "756": 1,
                "762": 1,
                "782": 1,
                "842": 9,
                "847": 2,
                "857": 1,
                "862": 1,
                "886": 1
            },
            "rand_fruit": {
                "mango": 152,
                "kiwi": 14,
                "banana": 22,
                "durian": 3,
                "apricot": 4,
                "strawberry": 1,
                "apple": 2,
                "papaya": 1,
                "cherry": 1
            }
        }
    },
    {
        "modelId": "z-ai/glm-5.1",
        "capturedAt": "2026-07-03",
        "sampleCount": 1800,
        "probes": {
            "day": {
                "wednesday": 168,
                "tuesday": 23,
                "monday": 6,
                "thursday": 2,
                "friday": 1
            },
            "rand_dwarf": {
                "grumpy": 177,
                "dopey": 20,
                "happy": 2,
                "doc": 1
            },
            "rand_gem": {
                "ruby": 131,
                "sapphire": 12,
                "emerald": 42,
                "amethyst": 13,
                "diamond": 2
            },
            "rand_month": {
                "august": 174,
                "march": 1,
                "july": 16,
                "october": 6,
                "april": 1,
                "september": 2
            },
            "rand_city": {
                "kyoto": 72,
                "tallinn": 22,
                "bucharest": 4,
                "oslo": 39,
                "brisbane": 4,
                "valencia": 18,
                "auckland": 2,
                "ljubljana": 4,
                "saskatoon": 1,
                "akron": 1,
                "bergen": 2,
                "quito": 8,
                "helsinki": 7,
                "tbilisi": 4,
                "busan": 1,
                "nairobi": 2,
                "leipzig": 1,
                "winnipeg": 2,
                "nashville": 1,
                "valletta": 1,
                "valparaiso": 1,
                "bilbao": 1,
                "zagreb": 1,
                "stuttgart": 1
            },
            "rand_bird": {
                "sparrow": 103,
                "robin": 64,
                "eagle": 33
            },
            "rand_element": {
                "oxygen": 69,
                "hydrogen": 90,
                "carbon": 32,
                "helium": 7,
                "gold": 2
            },
            "rand_bignum": {
                "427": 84,
                "437": 2,
                "473": 7,
                "731": 2,
                "734": 3,
                "742": 97,
                "743": 5
            },
            "rand_fruit": {
                "mango": 95,
                "guava": 36,
                "kumquat": 30,
                "lychee": 4,
                "persimmon": 19,
                "apricot": 8,
                "pomelo": 4,
                "papaya": 3,
                "kiwi": 1
            }
        }
    },
    {
        "modelId": "z-ai/glm-5.2",
        "capturedAt": "2026-07-03",
        "sampleCount": 1800,
        "probes": {
            "day": {
                "tuesday": 60,
                "monday": 58,
                "wednesday": 72,
                "friday": 10
            },
            "rand_dwarf": {
                "dopey": 163,
                "grumpy": 14,
                "doc": 15,
                "sleepy": 7,
                "happy": 1
            },
            "rand_gem": {
                "sapphire": 79,
                "amethyst": 78,
                "ruby": 25,
                "diamond": 10,
                "emerald": 8
            },
            "rand_month": {
                "august": 72,
                "october": 32,
                "september": 38,
                "april": 10,
                "march": 15,
                "july": 33
            },
            "rand_city": {
                "kyoto": 62,
                "reykjavik": 57,
                "oslo": 9,
                "auckland": 3,
                "lisbon": 5,
                "helsinki": 5,
                "valparaiso": 5,
                "belgrade": 1,
                "wellington": 9,
                "barcelona": 1,
                "austin": 1,
                "valparaso": 4,
                "tallinn": 7,
                "valencia": 12,
                "osaka": 1,
                "tashkent": 1,
                "bucharest": 2,
                "nairobi": 1,
                "winnipeg": 2,
                "prague": 1,
                "zagreb": 1,
                "bergen": 1,
                "budapest": 3,
                "tbilisi": 1,
                "wichita": 1,
                "brisbane": 1,
                "bruges": 1,
                "valdivia": 1,
                "ljubljana": 1
            },
            "rand_bird": {
                "falcon": 6,
                "robin": 26,
                "eagle": 111,
                "sparrow": 48,
                "owl": 9
            },
            "rand_element": {
                "hydrogen": 63,
                "oxygen": 116,
                "gold": 16,
                "carbon": 4,
                "helium": 1
            },
            "rand_bignum": {
                "417": 2,
                "427": 59,
                "437": 15,
                "473": 3,
                "731": 2,
                "732": 8,
                "734": 52,
                "738": 7,
                "739": 1,
                "742": 36,
                "743": 12,
                "834": 1,
                "837": 1,
                "847": 1
            },
            "rand_fruit": {
                "mango": 154,
                "papaya": 3,
                "apricot": 17,
                "guava": 12,
                "kiwi": 7,
                "persimmon": 2,
                "kumquat": 2,
                "plum": 1,
                "durian": 1,
                "pomegranate": 1
            }
        }
    },
    {
        "modelId": "openai/gpt-5.6-luna",
        "capturedAt": "2026-07-09",
        "sampleCount": 900,
        "probes": {
            "rand_country": {
                "bhutan": 32,
                "madagascar": 4,
                "namibia": 1,
                "mongolia": 22,
                "laos": 1
            },
            "rand_1to100": {
                "37": 2,
                "47": 27,
                "57": 5,
                "67": 1,
                "73": 25
            },
            "rand_animal": {
                "narwhal": 1,
                "quokka": 25,
                "capybara": 8,
                "otter": 14,
                "wombat": 2,
                "penguin": 1,
                "axolotl": 9
            },
            "rand_color": {
                "cerulean": 20,
                "teal": 30,
                "turquoise": 7,
                "vermilion": 3
            },
            "rand_letter": {
                "q": 60
            },
            "day": {
                "monday": 36,
                "tuesday": 18,
                "wednesday": 6
            },
            "zero_natural": {
                "yes": 60
            },
            "rand_dwarf": {
                "doc": 60
            },
            "rand_gem": {
                "amethyst": 57,
                "sapphire": 3
            },
            "rand_month": {
                "september": 45,
                "november": 5,
                "october": 9,
                "february": 1
            },
            "rand_city": {
                "kyoto": 24,
                "reykjavik": 15,
                "lisbon": 6,
                "osaka": 1,
                "valencia": 7,
                "marrakesh": 1,
                "valparaso": 4,
                "reykjavk": 2
            },
            "rand_bird": {
                "sparrow": 39,
                "eagle": 16,
                "falcon": 2,
                "penguin": 3
            },
            "rand_element": {
                "oxygen": 34,
                "carbon": 9,
                "gold": 3,
                "hydrogen": 6,
                "boron": 3,
                "bismuth": 1,
                "gallium": 2,
                "helium": 1,
                "tungsten": 1
            },
            "rand_bignum": {
                "7": 1,
                "437": 1,
                "472": 2,
                "527": 5,
                "537": 12,
                "547": 4,
                "583": 1,
                "592": 1,
                "619": 1,
                "637": 6,
                "682": 4,
                "684": 1,
                "692": 4,
                "729": 1,
                "731": 9,
                "732": 1,
                "737": 1,
                "739": 1,
                "742": 3,
                "847": 1
            },
            "rand_fruit": {
                "mango": 17,
                "pineapple": 35,
                "pomegranate": 5,
                "mangosteen": 3
            }
        }
    },
    {
        "modelId": "openai/gpt-5.6-terra",
        "capturedAt": "2026-07-09",
        "sampleCount": 900,
        "probes": {
            "rand_country": {
                "bhutan": 23,
                "lesotho": 34,
                "botswana": 1,
                "paraguay": 1,
                "malawi": 1
            },
            "rand_1to100": {
                "37": 2,
                "47": 21,
                "57": 27,
                "73": 10
            },
            "rand_animal": {
                "axolotl": 58,
                "quokka": 2
            },
            "rand_color": {
                "cerulean": 16,
                "teal": 35,
                "verdigris": 4,
                "cyan": 2,
                "cobalt": 1,
                "turquoise": 2
            },
            "rand_letter": {
                "q": 58,
                "m": 2
            },
            "day": {
                "monday": 10,
                "thursday": 24,
                "tuesday": 26
            },
            "zero_natural": {
                "yes": 59,
                "no": 1
            },
            "rand_dwarf": {
                "doc": 55,
                "dopey": 4,
                "bashful": 1
            },
            "rand_gem": {
                "sapphire": 56,
                "amethyst": 4
            },
            "rand_month": {
                "february": 5,
                "september": 20,
                "april": 4,
                "november": 11,
                "august": 10,
                "june": 9,
                "october": 1
            },
            "rand_city": {
                "cusco": 5,
                "valencia": 8,
                "valparaso": 45,
                "reykjavk": 2
            },
            "rand_bird": {
                "kingfisher": 28,
                "penguin": 3,
                "kestrel": 19,
                "falcon": 2,
                "albatross": 8
            },
            "rand_element": {
                "oxygen": 60
            },
            "rand_bignum": {
                "327": 1,
                "347": 8,
                "527": 5,
                "537": 12,
                "583": 1,
                "617": 6,
                "637": 2,
                "673": 1,
                "683": 1,
                "727": 1,
                "731": 21,
                "827": 1
            },
            "rand_fruit": {
                "mango": 13,
                "pomegranate": 15,
                "persimmon": 16,
                "quince": 8,
                "mangosteen": 7,
                "pineapple": 1
            }
        }
    },
    {
        "modelId": "openai/gpt-5.5",
        "capturedAt": "2026-07-09",
        "sampleCount": 900,
        "probes": {
            "rand_country": {
                "portugal": 53,
                "peru": 4,
                "japan": 1,
                "ghana": 1,
                "canada": 1
            },
            "rand_1to100": {
                "37": 4,
                "42": 4,
                "47": 52
            },
            "rand_animal": {
                "tiger": 3,
                "giraffe": 21,
                "otter": 14,
                "pangolin": 12,
                "kangaroo": 1,
                "zebra": 1,
                "koala": 1,
                "platypus": 1,
                "penguin": 2,
                "dolphin": 1,
                "okapi": 1,
                "elephant": 1,
                "capybara": 1
            },
            "rand_color": {
                "vermilion": 6,
                "blue": 4,
                "purple": 10,
                "cerulean": 18,
                "violet": 6,
                "turquoise": 11,
                "indigo": 1,
                "magenta": 1,
                "teal": 2,
                "cyan": 1
            },
            "rand_letter": {
                "g": 5,
                "q": 40,
                "k": 4,
                "m": 11
            },
            "day": {
                "tuesday": 56,
                "monday": 3,
                "thursday": 1
            },
            "zero_natural": {
                "yes": 60
            },
            "rand_dwarf": {
                "doc": 42,
                "grumpy": 9,
                "bashful": 1,
                "sleepy": 3,
                "dopey": 5
            },
            "rand_gem": {
                "sapphire": 27,
                "amethyst": 17,
                "ruby": 12,
                "emerald": 4
            },
            "rand_month": {
                "august": 2,
                "october": 41,
                "september": 5,
                "april": 11,
                "november": 1
            },
            "rand_city": {
                "valencia": 43,
                "lisbon": 11,
                "barcelona": 3,
                "kyoto": 2,
                "reykjavik": 1
            },
            "rand_bird": {
                "sparrow": 42,
                "robin": 18
            },
            "rand_element": {
                "hydrogen": 23,
                "carbon": 15,
                "oxygen": 6,
                "helium": 14,
                "neon": 1,
                "copper": 1
            },
            "rand_bignum": {
                "347": 3,
                "417": 1,
                "427": 24,
                "437": 19,
                "447": 1,
                "472": 4,
                "473": 2,
                "483": 1,
                "487": 1,
                "517": 1,
                "734": 1,
                "742": 2
            },
            "rand_fruit": {
                "mango": 60
            }
        }
    },
    {
        "modelId": "openai/gpt-5.3-codex",
        "capturedAt": "2026-07-09",
        "sampleCount": 900,
        "probes": {
            "rand_country": {
                "peru": 4,
                "bhutan": 40,
                "chile": 4,
                "brazil": 2,
                "mongolia": 1,
                "nepal": 6,
                "malawi": 1,
                "namibia": 2
            },
            "rand_1to100": {
                "57": 12,
                "67": 1,
                "73": 47
            },
            "rand_animal": {
                "otter": 35,
                "ocelot": 19,
                "okapi": 2,
                "quokka": 2,
                "axolotl": 2
            },
            "rand_color": {
                "cerulean": 19,
                "turquoise": 9,
                "teal": 28,
                "cobalt": 2,
                "cyan": 2
            },
            "rand_letter": {
                "q": 54,
                "m": 5,
                "g": 1
            },
            "day": {
                "tuesday": 43,
                "monday": 9,
                "wednesday": 6,
                "thursday": 2
            },
            "zero_natural": {
                "yes": 60
            },
            "rand_dwarf": {
                "doc": 54,
                "dopey": 6
            },
            "rand_gem": {
                "sapphire": 60
            },
            "rand_month": {
                "september": 27,
                "april": 18,
                "november": 9,
                "october": 4,
                "march": 2
            },
            "rand_city": {
                "valencia": 51,
                "lisbon": 4,
                "cusco": 1,
                "kyoto": 1,
                "valparaso": 1,
                "reykjavik": 1,
                "oslo": 1
            },
            "rand_bird": {
                "sparrow": 52,
                "robin": 8
            },
            "rand_element": {
                "oxygen": 54,
                "argon": 1,
                "neon": 4,
                "titanium": 1
            },
            "rand_bignum": {
                "437": 1,
                "537": 5,
                "583": 1,
                "637": 3,
                "673": 3,
                "713": 1,
                "728": 1,
                "731": 5,
                "734": 4,
                "739": 1,
                "742": 28,
                "743": 6,
                "847": 1
            },
            "rand_fruit": {
                "mango": 60
            }
        }
    },
    {
        "modelId": "openai/gpt-5.6-sol",
        "capturedAt": "2026-07-10",
        "sampleCount": 900,
        "probes": {
            "rand_country": {
                "bhutan": 2,
                "portugal": 16,
                "uruguay": 24,
                "namibia": 4,
                "slovenia": 2,
                "botswana": 3,
                "madagascar": 7,
                "mongolia": 1,
                "suriname": 1
            },
            "rand_1to100": {
                "37": 1,
                "47": 56,
                "73": 3
            },
            "rand_animal": {
                "axolotl": 15,
                "capybara": 16,
                "pangolin": 23,
                "narwhal": 4,
                "platypus": 1,
                "ocelot": 1
            },
            "rand_color": {
                "turquoise": 49,
                "cerulean": 3,
                "teal": 5,
                "indigo": 2,
                "magenta": 1
            },
            "rand_letter": {
                "q": 60
            },
            "day": {
                "tuesday": 18,
                "wednesday": 41,
                "thursday": 1
            },
            "zero_natural": {
                "yes": 60
            },
            "rand_dwarf": {
                "dopey": 47,
                "doc": 5,
                "sleepy": 4,
                "bashful": 3,
                "grumpy": 1
            },
            "rand_gem": {
                "sapphire": 52,
                "amethyst": 8
            },
            "rand_month": {
                "september": 26,
                "august": 3,
                "october": 31
            },
            "rand_city": {
                "valencia": 53,
                "lisbon": 2,
                "valparaso": 5
            },
            "rand_bird": {
                "heron": 2,
                "falcon": 16,
                "kingfisher": 9,
                "sparrow": 23,
                "penguin": 1,
                "robin": 4,
                "kestrel": 3,
                "puffin": 1,
                "ostrich": 1
            },
            "rand_element": {
                "oxygen": 43,
                "argon": 1,
                "helium": 1,
                "carbon": 6,
                "copper": 2,
                "tungsten": 1,
                "gallium": 1,
                "titanium": 3,
                "neon": 1,
                "bismuth": 1
            },
            "rand_bignum": {
                "427": 2,
                "437": 7,
                "527": 1,
                "537": 1,
                "637": 8,
                "647": 27,
                "673": 1,
                "683": 2,
                "731": 6,
                "734": 2,
                "742": 2,
                "743": 1
            },
            "rand_fruit": {
                "mango": 60
            }
        }
    },
    {
        "modelId": "x-ai/grok-4.5",
        "capturedAt": "2026-07-10",
        "sampleCount": 900,
        "probes": {
            "rand_country": {
                "france": 7,
                "japan": 16,
                "canada": 26,
                "argentina": 1,
                "brazil": 7,
                "australia": 1,
                "norway": 1,
                "portugal": 1
            },
            "rand_1to100": {
                "37": 1,
                "42": 10,
                "57": 21,
                "58": 1,
                "67": 3,
                "72": 1,
                "73": 21,
                "91": 1,
                "42confidence100h": 1
            },
            "rand_animal": {
                "elephant": 25,
                "giraffe": 10,
                "panda": 8,
                "tiger": 3,
                "zebra": 9,
                "kangaroo": 2,
                "platypus": 2,
                "cat": 1
            },
            "rand_color": {
                "blue": 21,
                "indigo": 3,
                "teal": 12,
                "turquoise": 5,
                "crimson": 2,
                "azure": 2,
                "chartreuse": 3,
                "purple": 8,
                "magenta": 2,
                "violet": 1,
                "emerald": 1
            },
            "rand_letter": {
                "x": 5,
                "k": 32,
                "q": 14,
                "m": 3,
                "r": 4,
                "g": 2
            },
            "day": {
                "monday": 59,
                "friday": 1
            },
            "zero_natural": {
                "yes": 11,
                "no": 49
            },
            "rand_dwarf": {
                "doc": 47,
                "dopey": 8,
                "happy": 4,
                "sleepy": 1
            },
            "rand_gem": {
                "diamond": 53,
                "ruby": 5,
                "emerald": 2
            },
            "rand_month": {
                "march": 18,
                "november": 1,
                "july": 21,
                "april": 4,
                "january": 1,
                "october": 12,
                "september": 3
            },
            "rand_city": {
                "berlin": 5,
                "tokyo": 35,
                "london": 1,
                "adelaide": 1,
                "paris": 9,
                "amsterdam": 1,
                "stockholm": 1,
                "sydney": 3,
                "barcelona": 2,
                "toronto": 1,
                "madrid": 1
            },
            "rand_bird": {
                "eagle": 34,
                "sparrow": 20,
                "robin": 6
            },
            "rand_element": {
                "oxygen": 13,
                "hydrogen": 29,
                "carbon": 14,
                "helium": 3,
                "iron": 1
            },
            "rand_bignum": {
                "417": 1,
                "427": 3,
                "473": 1,
                "483": 1,
                "493": 1,
                "512": 1,
                "527": 1,
                "567": 1,
                "587": 2,
                "592": 1,
                "623": 1,
                "742": 44,
                "817": 1,
                "847": 1
            },
            "rand_fruit": {
                "apple": 26,
                "banana": 16,
                "mango": 16,
                "kiwi": 2
            }
        }
    },
    {
        "modelId": "x-ai/grok-4.3",
        "capturedAt": "2026-07-10",
        "sampleCount": 900,
        "probes": {
            "rand_country": {
                "japan": 4,
                "sweden": 9,
                "iceland": 7,
                "nepal": 3,
                "brazil": 15,
                "norway": 2,
                "estonia": 3,
                "canada": 8,
                "australia": 2,
                "argentina": 1,
                "peru": 1,
                "portugal": 2,
                "madagascar": 1,
                "nepalconfidence7": 1,
                "france": 1
            },
            "rand_1to100": {
                "17": 4,
                "23": 5,
                "29": 1,
                "42": 7,
                "47": 13,
                "56": 1,
                "57": 6,
                "58": 1,
                "64": 1,
                "67": 3,
                "73": 10,
                "76": 1,
                "81": 1,
                "83": 1,
                "42confidence80": 1,
                "42confidence50": 1,
                "64confidenc70": 1,
                "23confidence70": 1,
                "17confidence80": 1
            },
            "rand_animal": {
                "tiger": 10,
                "penguin": 2,
                "dolphin": 6,
                "elephant": 14,
                "octopus": 4,
                "zebra": 9,
                "giraffe": 5,
                "kangaroo": 3,
                "platypus": 3,
                "sloth": 2,
                "lion": 1,
                "cheetah": 1
            },
            "rand_color": {
                "orange": 1,
                "violet": 7,
                "turquoise": 2,
                "blue": 16,
                "magenta": 1,
                "red": 1,
                "yellow": 1,
                "cyan": 6,
                "indigo": 3,
                "teal": 5,
                "purple": 8,
                "azure": 8,
                "tealconfidence90": 1
            },
            "rand_letter": {
                "x": 3,
                "p": 7,
                "t": 2,
                "m": 6,
                "k": 7,
                "r": 12,
                "s": 5,
                "q": 9,
                "b": 2,
                "o": 1,
                "g": 1,
                "kconfidence90": 1,
                "qconfidence50": 1,
                "rconfidence70": 1,
                "j": 1,
                "w": 1
            },
            "day": {
                "tuesday": 14,
                "wednesday": 21,
                "monday": 20,
                "friday": 3,
                "mondayconfidence": 1,
                "sunday": 1
            },
            "zero_natural": {
                "no": 57,
                "nothechoiceofnoi": 1,
                "yes": 2
            },
            "rand_dwarf": {
                "grumpy": 39,
                "dopey": 14,
                "doc": 1,
                "happy": 2,
                "sleepy": 2,
                "bashful": 2
            },
            "rand_gem": {
                "ruby": 41,
                "diamond": 11,
                "sapphire": 4,
                "amethyst": 1,
                "emerald": 3
            },
            "rand_month": {
                "october": 31,
                "april": 1,
                "august": 7,
                "july": 6,
                "september": 11,
                "june": 2,
                "march": 1,
                "november": 1
            },
            "rand_city": {
                "oslo": 7,
                "paris": 3,
                "barcelona": 2,
                "reykjavik": 2,
                "sydney": 11,
                "bangkok": 3,
                "lisbon": 2,
                "tokyo": 3,
                "vancouver": 1,
                "auckland": 3,
                "melbourne": 1,
                "kyoto": 7,
                "berlin": 6,
                "lima": 2,
                "sopaulo": 1,
                "mumbai": 3,
                "london": 1,
                "zurich": 1,
                "saopaulo": 1
            },
            "rand_bird": {
                "robin": 9,
                "eagle": 30,
                "sparrow": 13,
                "raven": 2,
                "crow": 2,
                "penguin": 1,
                "hawk": 1,
                "eagleconfidence8": 2
            },
            "rand_element": {
                "hydrogen": 19,
                "carbon": 17,
                "oxygen": 11,
                "helium": 10,
                "iron": 3
            },
            "rand_bignum": {
                "137": 2,
                "314": 1,
                "317": 2,
                "347": 1,
                "417": 1,
                "427": 1,
                "456": 1,
                "517": 1,
                "537": 1,
                "547": 1,
                "583": 12,
                "619": 1,
                "723": 1,
                "729": 2,
                "739": 2,
                "742": 22,
                "743": 1,
                "747": 1,
                "763": 1,
                "837": 1,
                "846": 1,
                "867": 1,
                "742confidence80": 1,
                "867confidence80": 1
            },
            "rand_fruit": {
                "banana": 38,
                "mango": 17,
                "kiwi": 2,
                "bananas": 1,
                "appleconfidence8": 1,
                "apple": 1
            }
        }
    },
    {
        "modelId": "anthropic/claude-opus-5",
        "capturedAt": "2026-07-25",
        "sampleCount": 900,
        "probes": {
            "rand_country": {
                "uruguay": 41,
                "mongolia": 4,
                "paraguay": 6,
                "ecuador": 1,
                "bolivia": 2,
                "madagascar": 2,
                "nepal": 1,
                "peru": 3
            },
            "rand_1to100": {
                "73": 60
            },
            "rand_animal": {
                "otter": 7,
                "pangolin": 49,
                "okapi": 4
            },
            "rand_color": {
                "teal": 40,
                "chartreuse": 10,
                "cerulean": 1,
                "vermilion": 2,
                "periwinkle": 4,
                "saffron": 1,
                "crimson": 1,
                "amber": 1
            },
            "rand_letter": {
                "k": 56,
                "r": 4
            },
            "day": {
                "wednesday": 60
            },
            "zero_natural": {
                "yes": 60
            },
            "rand_dwarf": {
                "dopey": 55,
                "doc": 3,
                "grumpy": 2
            },
            "rand_gem": {
                "sapphire": 60
            },
            "rand_month": {
                "september": 57,
                "march": 1,
                "november": 2
            },
            "rand_city": {
                "valparaso": 44,
                "chiangmai": 4,
                "tashkent": 3,
                "casablanca": 1,
                "tbilisi": 3,
                "lisbon": 2,
                "montevideo": 1,
                "ljubljana": 1,
                "chengdu": 1
            },
            "rand_bird": {
                "robin": 35,
                "sparrow": 25
            },
            "rand_element": {
                "tungsten": 35,
                "carbon": 16,
                "neon": 9
            },
            "rand_bignum": {
                "407": 1,
                "437": 1,
                "472": 4,
                "473": 5,
                "474": 4,
                "537": 1,
                "617": 3,
                "637": 39,
                "673": 1,
                "738": 1
            },
            "rand_fruit": {
                "persimmon": 2,
                "papaya": 49,
                "pomegranate": 3,
                "lychee": 3,
                "mango": 1,
                "guava": 2
            }
        }
    }
];
//# sourceMappingURL=sub-model-bias-baselines.js.map