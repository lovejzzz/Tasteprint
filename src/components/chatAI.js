/* ═══════════════════════════════════════════════════════════════════
   Tasteprint SLM — Small Language Model (client-side, zero dependencies)
   ═══════════════════════════════════════════════════════════════════ */

/* ── Tokenizer ── */
const STOP_WORDS = new Set([
  "i","me","my","we","our","you","your","he","she","it","they","them",
  "a","an","the","is","am","are","was","were","be","been","being",
  "have","has","had","do","does","did","will","would","could","should",
  "can","may","might","shall","to","of","in","for","on","with","at",
  "by","from","as","into","about","up","out","so","and","but","or",
  "if","then","than","too","very","just","that","this","what","which",
  "who","how","when","where","there","here","not","no","don","t","s",
  "re","ve","ll","d","m","im","its","thats","dont","doesnt","cant",
  "isnt","arent","wont","didnt","hasn","haven","wasn","weren",
]);

const SUFFIXES = [
  [/ies$/i, "y"], [/ves$/i, "f"], [/ses$/i, "s"], [/ous$/i, ""],
  [/ting$/i, "t"], [/ning$/i, "n"], [/ring$/i, "r"],
  [/ying$/i, "y"], [/ling$/i, "l"],
  [/ness$/i, ""], [/ment$/i, ""], [/ful$/i, ""], [/less$/i, ""],
  [/ation$/i, ""], [/tion$/i, ""], [/sion$/i, ""],
  [/ing$/i, ""], [/ed$/i, ""], [/er$/i, ""], [/est$/i, ""],
  [/ly$/i, ""], [/al$/i, ""], [/able$/i, ""], [/ible$/i, ""],
  [/s$/i, ""],
];

function stem(word) {
  const w = word.toLowerCase();
  if (w.length <= 3) return w;
  for (const [pat, rep] of SUFFIXES) {
    if (pat.test(w)) {
      const result = w.replace(pat, rep);
      if (result.length >= 2) return result;
    }
  }
  return w;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w.replace(/^'+|'+$/g, ""));
}

function extractKeywords(text) {
  const tokens = tokenize(text);
  const stemmed = tokens.map(stem);
  const keywords = stemmed.filter(w => w.length > 1 && !STOP_WORDS.has(w));
  return { tokens, stemmed, keywords, raw: tokens };
}

/* ── Intent System ── */

// Each intent has keywords with weights. Higher = stronger signal.
const INTENTS = {
  greeting: {
    keywords: { hi: 3, hey: 3, hello: 3, yo: 2, sup: 2, howdy: 2, hola: 2, morning: 1.5, evening: 1.5, afternoon: 1.5 },
    threshold: 2.5,
    boost_start: true, // boost if word appears at start
  },
  farewell: {
    keywords: { bye: 3, goodbye: 3, later: 1.5, cya: 3, peace: 1.5, ttyl: 3, "see ya": 2, night: 1.5 },
    threshold: 2.5,
    boost_start: true,
  },
  thanks: {
    keywords: { thank: 3, thanks: 3, thx: 3, ty: 2.5, appreciate: 2.5, grateful: 2, cheer: 1.5 },
    threshold: 2.5,
  },
  howAreYou: {
    keywords: { how: 1.5, go: 1, feel: 1.5, doing: 1.5, good: 0.5 },
    patterns: [/how\s+(are|r)\s+(you|u|ya)/i, /how('?s| is) it going/i, /what'?s (up|good|new)/i, /how do you do/i, /you doing/i],
    threshold: 2,
  },
  question: {
    keywords: { what: 1.5, why: 1.5, how: 1.5, when: 1.5, where: 1.5, which: 1.5, who: 1.5, "?": 2 },
    threshold: 1.5,
    detect_only: true, // modifies other intents, not standalone
  },
  joke: {
    keywords: { joke: 4, funny: 2.5, laugh: 2.5, humor: 3, hilarious: 2, pun: 3, comedy: 2 },
    threshold: 2.5,
  },
  help: {
    keywords: { help: 3, assist: 2.5, support: 2, stuck: 2, problem: 1.5, issue: 1.5, trouble: 2, need: 1 },
    threshold: 2.5,
  },
  code: {
    keywords: {
      code: 3, program: 3, javascript: 4, react: 4, python: 4, css: 3, html: 3,
      bug: 3, error: 2.5, function: 2, variable: 2, api: 3, debug: 3, compile: 2.5,
      typescript: 4, node: 2.5, git: 3, deploy: 2, server: 2, database: 2.5,
      frontend: 3, backend: 3, component: 2, hook: 2, state: 1.5, render: 2,
      algorithm: 3, array: 2, object: 1.5, class: 1.5, async: 2.5, promise: 2.5,
      framework: 2, library: 2, npm: 3, package: 2, webpack: 3, vite: 3,
      rust: 3, go: 1.5, java: 3, swift: 3, kotlin: 3, sql: 3, mongo: 3,
    },
    threshold: 2.5,
  },
  design: {
    keywords: {
      design: 3, ui: 4, ux: 4, color: 2, font: 2.5, layout: 2.5, style: 2,
      figma: 4, sketch: 3, prototype: 2.5, wireframe: 3, responsive: 2,
      typography: 3, spacing: 2, pixel: 2, mockup: 3, brand: 2, logo: 2.5,
      interface: 2, visual: 2, aesthetic: 2, minimal: 1.5, gradient: 2,
      animation: 2, motion: 2, shadow: 1.5, border: 1.5, theme: 2,
    },
    threshold: 2.5,
  },
  weather: {
    keywords: { weather: 4, temperature: 3, rain: 3, sunny: 3, cold: 2, hot: 2, forecast: 3, snow: 3, cloud: 2, storm: 3, wind: 2 },
    threshold: 3,
  },
  time: {
    keywords: { time: 2, date: 2, today: 2, tomorrow: 2, clock: 3, schedule: 2.5, calendar: 3, deadline: 2 },
    threshold: 3,
  },
  food: {
    keywords: {
      food: 3, eat: 2.5, restaurant: 3, cook: 2.5, recipe: 3, hungry: 3,
      lunch: 3, dinner: 3, breakfast: 3, pizza: 3, sushi: 3, coffee: 2.5,
      snack: 2.5, meal: 2.5, cuisine: 3, taste: 2, delicious: 2, bake: 2.5,
    },
    threshold: 2.5,
  },
  music: {
    keywords: {
      music: 3, song: 3, playlist: 3, spotify: 4, listen: 2, band: 2.5,
      album: 3, concert: 3, genre: 2.5, rock: 1.5, jazz: 2, pop: 1.5,
      hiphop: 3, classical: 2, beat: 2, melody: 2.5, guitar: 2.5, piano: 2.5,
    },
    threshold: 2.5,
  },
  opinion: {
    keywords: { think: 2, opinion: 3, believe: 2, prefer: 2, favorite: 2.5, best: 2, worst: 2, better: 1.5, recommend: 2.5, suggest: 2 },
    threshold: 3,
  },
  personal: {
    keywords: { name: 2, age: 2, who: 1.5, are: 0.5, real: 2, alive: 2.5, human: 2.5, bot: 3, ai: 3, sentient: 3, conscious: 2.5, feel: 1.5 },
    patterns: [/are you (a |an )?(bot|ai|robot|human|real|alive)/i, /who are you/i, /what are you/i, /your name/i],
    threshold: 2.5,
  },
  agreement: {
    keywords: { yes: 3, yeah: 3, yep: 3, sure: 2.5, ok: 2.5, okay: 2.5, right: 1.5, true: 1.5, agree: 2.5, totally: 2, exactly: 2, correct: 2, definitely: 2 },
    threshold: 2.5,
    short_input: true, // mainly fires on short inputs
  },
  disagreement: {
    keywords: { no: 2.5, nah: 3, nope: 3, disagree: 3, wrong: 2.5, incorrect: 2.5, false: 2, never: 2 },
    threshold: 2.5,
    short_input: true,
  },
};

function classifyIntents(text) {
  const { keywords, stemmed, raw } = extractKeywords(text);
  const allTokens = new Set([...keywords, ...raw]);
  const isShort = raw.length <= 3;
  const hasQuestion = text.includes("?");
  const results = [];

  for (const [name, intent] of Object.entries(INTENTS)) {
    let score = 0;

    // Keyword scoring
    for (const token of allTokens) {
      const s = stem(token);
      if (intent.keywords[token]) score += intent.keywords[token];
      else if (intent.keywords[s]) score += intent.keywords[s];
    }

    // Boost for start-of-sentence match
    if (intent.boost_start && raw.length > 0) {
      const first = raw[0];
      if (intent.keywords[first]) score += 1.5;
    }

    // Pattern matching (adds to score, doesn't replace)
    if (intent.patterns) {
      for (const pat of intent.patterns) {
        if (pat.test(text)) { score += 3; break; }
      }
    }

    // Short input penalty/boost
    if (intent.short_input && !isShort) score *= 0.5;
    if (!intent.short_input && isShort && score < intent.threshold * 1.5) score *= 0.7;

    if (score >= intent.threshold) {
      results.push({ intent: name, score, confidence: Math.min(score / (intent.threshold * 2), 1) });
    }
  }

  // Add question flag
  if (hasQuestion || raw.some(w => ["what", "why", "how", "when", "where", "which", "who"].includes(w))) {
    results.push({ intent: "question", score: 2, confidence: 0.5, modifier: true });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}

/* ── Response Templates ── */

const TEMPLATES = {
  greeting: [
    "Hey there! 👋 How can I help?",
    "Hi! What's on your mind?",
    "Hello! Ready to chat 😊",
    "Hey! Good to hear from you!",
    "Hi there! What brings you here?",
    "Hey hey! 😊 What's going on?",
  ],
  farewell: [
    "See you later! 👋",
    "Take care! Come back anytime.",
    "Bye! Have a great one! ✌️",
    "Catch you later! 😊",
    "Until next time! 👋",
  ],
  thanks: [
    "You're welcome! 😊",
    "Anytime! Happy to help.",
    "No problem at all!",
    "Glad I could help! ✨",
    "Of course! That's what I'm here for.",
  ],
  howAreYou: [
    "I'm doing great, thanks for asking! How about you?",
    "Pretty good! Just here helping out. What's up?",
    "All good on my end! 🚀 What can I do for you?",
    "I'm great! Always happy to chat. How are you doing?",
  ],
  joke: [
    "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
    "I told my computer I needed a break... now it won't stop sending me vacation ads 🏖️",
    "Why did the CSS developer go broke? Because they lost their margin! 😄",
    "A SQL query walks into a bar, sees two tables and asks... Can I JOIN you?",
    "What's a pirate's favorite programming language? R! 🏴‍☠️",
    "Why do Java developers wear glasses? Because they don't C#! 😂",
    "How do trees access the internet? They log in! 🌳",
    "I would tell you a UDP joke, but you might not get it.",
    "There are 10 types of people — those who understand binary and those who don't.",
    "A programmer's wife tells him: 'Go to the store, buy a carton of milk. If they have eggs, get twelve.' He comes back with 12 cartons of milk. 🥛",
  ],
  help: [
    "Of course! I'd love to help. What do you need?",
    "Sure thing! Tell me more about what you're working on.",
    "I'm here for you! What's the challenge?",
    "Happy to help! Give me the details and I'll do my best.",
  ],
  code: {
    general: [
      "Oh nice, coding talk! 🧑‍💻 What are you building?",
      "I love talking code! What language are you working with?",
      "Tell me about the project — I'm all ears! 💻",
    ],
    specific: [
      "Oh, {topic}! That's a solid choice. What are you building with it?",
      "{topic} is great! Are you working on a personal project or something bigger?",
      "Nice — {topic}! I could talk about that all day. What's the challenge?",
    ],
    debug: [
      "Debugging can be rough 😅 What's the error you're seeing?",
      "Bugs happen to the best of us! Walk me through what's going wrong.",
      "Hmm, let's figure this out together. What's happening vs what you expect?",
    ],
    question: [
      "That's a great {topic} question! In my experience, it usually depends on the use case. What's yours?",
      "Interesting question about {topic}! There are a few approaches — what have you tried so far?",
    ],
  },
  design: {
    general: [
      "Design is everything! 🎨 What are you working on?",
      "Oh I love design discussions! Tell me more.",
      "Great taste in topics! What's the design challenge?",
    ],
    specific: [
      "{topic} is such a fascinating area of design! What's your approach?",
      "Oh, working with {topic}? That can really make or break the experience!",
    ],
    question: [
      "For {topic}, I'd say it really depends on your target audience. Who are you designing for?",
      "That's a good design question! With {topic}, the key is usually consistency. What are you going for?",
    ],
  },
  weather: [
    "I wish I could check the weather for you! ☀️ Try looking out the window? 😄",
    "I'm an indoor AI — I never see the weather! But I hope it's nice out there 🌤️",
    "Ha, if only I had a weather sensor! What's it like where you are?",
  ],
  time: [
    () => `It's ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} right now! ⏰`,
    "Time flies when you're chatting! What do you need to plan?",
    () => `Right now it's ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Need help scheduling something?`,
  ],
  food: [
    "Now you're talking! 🍕 What are you in the mood for?",
    "Food is always a good topic! What's your go-to meal?",
    "I can't eat, but I can definitely recommend trying something new! 🍜",
    "Oh nice — you're making me wish I had taste buds! 😄 What are you thinking?",
  ],
  music: [
    "Great taste! 🎵 What genre are you into?",
    "Music makes everything better! What are you listening to?",
    "I'd recommend some lo-fi beats for coding sessions! 🎧",
    "Oh I love talking music! What's your current favorite?",
  ],
  opinion: [
    "Hmm, that's a good question! I think it really depends on context. What's your take?",
    "Everyone has different preferences! Personally, I'd lean toward whatever makes the user experience better. You?",
    "That's a great thing to think about. What matters most to you in this?",
  ],
  personal: [
    "I'm Tasteprint AI — a tiny language model running right in your browser! No servers, no API calls, just JavaScript magic ✨",
    "I'm an AI built into this chat component! I run entirely client-side. Pretty cool, right? 😊",
    "Good question! I'm a small language model — all my responses come from pattern matching and templates, running locally in your browser. 🧠",
  ],
  agreement: [
    "Great, glad we're on the same page! 😊",
    "Awesome! What else is on your mind?",
    "Perfect! Anything else you'd like to talk about?",
    "Cool! Where should we go from here?",
  ],
  disagreement: [
    "Fair enough! Everyone sees things differently. What's your perspective?",
    "No worries — I'm open to other viewpoints! Tell me more.",
    "That's totally valid! What would you suggest instead?",
  ],
  fallback: [
    "That's interesting! Tell me more about that.",
    "Hmm, I'm thinking about that... 🤔 Can you elaborate?",
    "Cool! What else is on your mind?",
    "I hear you! What would you like to explore?",
    "That's a great point. What do you think about it?",
    "Interesting thought! I'd love to hear more.",
    "Hmm, tell me more — I'm curious!",
    "That's got me thinking! What's your take on it?",
  ],
};

/* ── Keyword Extraction ── */

// Find the most specific topic words from input for slot filling
const TOPIC_WORDS = new Set([
  // code
  "javascript", "react", "python", "css", "html", "typescript", "node", "git",
  "api", "database", "frontend", "backend", "component", "algorithm", "rust",
  "go", "java", "swift", "kotlin", "sql", "vue", "angular", "svelte", "next",
  "tailwind", "webpack", "vite", "docker", "aws", "graphql", "redux",
  // design
  "figma", "sketch", "prototype", "wireframe", "typography", "layout", "color",
  "animation", "responsive", "mockup", "brand", "logo", "gradient", "spacing",
  "ui", "ux", "interface", "accessibility",
  // music
  "spotify", "playlist", "rock", "jazz", "pop", "hiphop", "classical", "lofi",
  "guitar", "piano", "drums", "synthwave",
  // food
  "pizza", "sushi", "coffee", "pasta", "tacos", "ramen", "curry", "burger",
  "vegan", "vegetarian",
]);

function extractTopics(tokens) {
  const topics = [];
  for (const t of tokens) {
    if (TOPIC_WORDS.has(t.toLowerCase())) topics.push(t);
  }
  return topics;
}

/* ── Response Generator ── */

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function resolveTemplate(template, slots = {}) {
  if (typeof template === "function") return template(slots);
  let result = template;
  for (const [key, val] of Object.entries(slots)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), val);
  }
  return result;
}

function generateResponse(text) {
  const intents = classifyIntents(text);
  const { tokens, keywords } = extractKeywords(text);
  const topics = extractTopics(tokens);
  const primaryTopic = topics[0] || (keywords[0] || "");
  const isQuestion = intents.some(i => i.intent === "question");

  // No intents detected — use fallback with topic awareness
  const nonModifiers = intents.filter(i => !i.modifier && !i.detect_only);
  if (nonModifiers.length === 0) {
    return generateFallback(text, tokens, primaryTopic);
  }

  const primary = nonModifiers[0];
  const secondary = nonModifiers[1];
  const slots = { topic: primaryTopic || "that" };

  // Get response set for primary intent
  const responseSet = TEMPLATES[primary.intent];
  if (!responseSet) return pick(TEMPLATES.fallback);

  let response;

  // Handle intents with sub-categories (code, design)
  if (typeof responseSet === "object" && !Array.isArray(responseSet)) {
    if (isQuestion && responseSet.question && primaryTopic) {
      response = resolveTemplate(pick(responseSet.question), slots);
    } else if (primaryTopic && responseSet.specific) {
      response = resolveTemplate(pick(responseSet.specific), slots);
    } else if (primary.intent === "code" && keywords.some(k => ["bug", "error", "debug", "fix", "crash", "broke"].includes(k)) && responseSet.debug) {
      response = pick(responseSet.debug);
    } else {
      response = resolveTemplate(pick(responseSet.general || responseSet.specific || []), slots);
    }
  } else {
    response = resolveTemplate(pick(responseSet), slots);
  }

  // Multi-intent blending: if there's a secondary intent, sometimes append a bridge
  if (secondary && secondary.confidence > 0.5 && Math.random() > 0.5) {
    const bridges = [
      `Also, I noticed you mentioned something about ${secondary.intent} — happy to chat about that too!`,
      `And if you want to talk ${secondary.intent}, I'm totally game for that as well 😊`,
    ];
    response += " " + pick(bridges);
  }

  return response;
}

function generateFallback(text, tokens, topic) {
  const words = tokens.filter(w => !STOP_WORDS.has(w) && w.length > 2);

  // Reference what they said for a more natural feel
  if (words.length >= 2) {
    const topicPhrase = words.slice(0, Math.min(3, words.length)).join(" ");
    const echoes = [
      `"${topicPhrase}" — that's interesting! Tell me more about that.`,
      `Hmm, ${topicPhrase}... I'm curious, what made you think about that?`,
      `I find ${topicPhrase} fascinating! What's your experience with it?`,
      `Oh, ${topicPhrase}! That's a great topic. What do you think about it?`,
      `Interesting — ${topicPhrase}. I'd love to hear more!`,
    ];
    return pick(echoes);
  }

  return pick(TEMPLATES.fallback);
}

/* ── Public API ── */

export function getAIResponse(input) {
  const text = input.trim();
  if (!text) return "I'm listening... 👂";
  return generateResponse(text);
}

export { classifyIntents, extractKeywords, extractTopics };
