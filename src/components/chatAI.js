/* ═══════════════════════════════════════════════════════════════════
   Tasteprint SLM — Small Language Model (client-side, zero dependencies)
   Round 8: Emotional intelligence — nuanced emotion detection & response
   ═══════════════════════════════════════════════════════════════════ */

/* ── Tokenizer & NLP Core ── */

const STOP = new Set("i me my we our you your he she it they them a an the is am are was were be been being have has had do does did will would could should can may might shall to of in for on with at by from as into about up out so and but or if then than too very just that this what which who how when where there here not no don t s re ve ll d m im its thats dont doesnt cant isnt arent wont didnt hasn haven wasn weren".split(" "));

const SUFFIXES = [
  [/ies$/,"y"],[/ves$/,"f"],[/ses$/,"s"],[/ous$/,""],[/ting$/,"t"],[/ning$/,"n"],
  [/ring$/,"r"],[/ying$/,"y"],[/ling$/,"l"],[/ness$/,""],[/ment$/,""],[/ful$/,""],
  [/less$/,""],[/ation$/,""],[/tion$/,""],[/sion$/,""],[/ing$/,""],[/ed$/,""],
  [/er$/,""],[/est$/,""],[/ly$/,""],[/al$/,""],[/able$/,""],[/ible$/,""],[/s$/,""],
];

function stem(w) {
  w = w.toLowerCase();
  if (w.length <= 3) return w;
  for (const [p,r] of SUFFIXES) { if (p.test(w)) { const s = w.replace(p,r); if (s.length >= 2) return s; } }
  return w;
}

function tokenize(t) {
  return t.toLowerCase().replace(/[^a-z0-9'\s-]/g," ").split(/\s+/).filter(w=>w.length>0).map(w=>w.replace(/^'+|'+$/g,""));
}

function extractKW(t) {
  const tok = tokenize(t), st = tok.map(stem), kw = st.filter(w=>w.length>1&&!STOP.has(w));
  return { tokens: tok, stemmed: st, keywords: kw, raw: tok };
}

/* ── Sentiment ── */

const POS = new Set("good great awesome amazing excellent love like happy nice wonderful fantastic perfect beautiful cool brilliant fun excited glad best enjoy thanks thank appreciate helpful wow yay sweet superb incredible outstanding fabulous adore favorite excited psyched stoked pumped thrilled delighted".split(" "));
const NEG = new Set("bad terrible awful hate dislike sad angry annoyed ugly horrible worst boring stupid broken wrong frustrat confused stuck fail error bug crash suck annoying disappoint upset difficult hard painful useless mess problem issue trouble worry scared anxious stressed overwhelm exhausted tired sick".split(" "));
const INTENS = new Set("very really so super extremely incredibly totally absolutely quite insanely ridiculously".split(" "));
const NEGATORS = new Set("not no never dont doesn isn aren wasn can't won't couldn".split(" "));

function sentiment(text) {
  const tok = tokenize(text);
  let sc=0, int=1, neg=false;
  for (const w of tok) {
    const s = stem(w);
    if (NEGATORS.has(w)||NEGATORS.has(s)) { neg=true; continue; }
    if (INTENS.has(w)) { int=2; continue; }
    if (POS.has(w)||POS.has(s)) { sc+=(neg?-1:1)*int; neg=false; int=1; }
    else if (NEG.has(w)||NEG.has(s)) { sc+=(neg?1:-1)*int; neg=false; int=1; }
    else { neg=false; int=1; }
  }
  if (text.includes("!!")) sc+=0.5;
  return Math.max(-5, Math.min(5, sc));
}

/* ── Emotion Detection Engine ── */
/*
 * Goes beyond sentiment (a number) to detect nuanced emotional states
 * from text signals: punctuation patterns, caps, word choices, repetition,
 * conversation history, and emoji usage. Returns the dominant emotion
 * with a confidence score so the response generator can match tone.
 */

const EMOTIONS = {
  excited:     { weight: 0, signals: [] },
  frustrated:  { weight: 0, signals: [] },
  amused:      { weight: 0, signals: [] },
  curious:     { weight: 0, signals: [] },
  sarcastic:   { weight: 0, signals: [] },
  venting:     { weight: 0, signals: [] },
  affectionate:{ weight: 0, signals: [] },
  neutral:     { weight: 0, signals: [] },
};

function detectEmotion(text, sent, parsed) {
  const scores = { excited:0, frustrated:0, amused:0, curious:0, sarcastic:0, venting:0, affectionate:0, neutral:1 };
  const raw = text;
  const lower = text.toLowerCase();
  const tokens = tokenize(text);

  // ── Excitement signals ──
  const exclamCount = (raw.match(/!/g)||[]).length;
  if (exclamCount >= 2) scores.excited += 1.5 + exclamCount * 0.3;
  if (/[A-Z]{3,}/.test(raw) && !/^[A-Z\s]+$/.test(raw.trim())) scores.excited += 1.2; // mixed caps (not all-caps)
  if (/omg|yesss+|wooo+|lets go|can't wait|finally|amazing/i.test(lower)) scores.excited += 2;
  if (/(🚀|🔥|🎉|✨|💯|⚡|🤩|😍|🥳|💪|🙌)/u.test(raw)) scores.excited += 1.5;
  if (sent >= 2) scores.excited += sent * 0.5;

  // ── Frustration signals ──
  const allCaps = /^[A-Z\s!?.]+$/.test(raw.trim()) && raw.length > 5;
  if (allCaps) scores.frustrated += 2.5;
  if (/ugh+|argh+|ffs|wtf|omfg|come on|seriously\??|are you kidding/i.test(lower)) scores.frustrated += 2;
  if (/i (already|just) (said|told|asked|mentioned)/i.test(lower)) scores.frustrated += 2.5;
  if (/why (won't|doesn't|isn't|can't|don't)/i.test(lower)) scores.frustrated += 1.2;
  if (/again\b|still\b.*broken|keeps?\s+(crash|fail|break)/i.test(lower)) scores.frustrated += 1.5;
  if ((raw.match(/\?/g)||[]).length >= 3) scores.frustrated += 1; // multiple question marks
  if (/(😤|😡|🤬|💀|😑|🙄)/u.test(raw)) scores.frustrated += 1.5;
  if (sent <= -1) scores.frustrated += Math.abs(sent) * 0.4;
  // Repeated questions — check if user asked same thing before
  const prevUser = mem.prevUserMsg();
  if (prevUser && similarity(lower, prevUser.text.toLowerCase()) > 0.6) scores.frustrated += 2;

  // ── Amusement signals ──
  if (/\b(lol|lmao|rofl|haha+|hehe+|lolol)\b/i.test(lower)) scores.amused += 2.5;
  if (/😂|🤣|😆|💀.*lol|☠️/u.test(raw)) scores.amused += 2;
  if (/that's (so |really )?(funny|hilarious)/i.test(lower)) scores.amused += 2;
  if (/i'm (dead|dying|crying)/i.test(lower) && sent >= 0) scores.amused += 1.5;

  // ── Curiosity signals ──
  if (parsed?.qType) scores.curious += 1.5;
  if (/i wonder|how (does|do|can|would)|what if|is it (true|possible)|tell me (about|more)/i.test(lower)) scores.curious += 2;
  if (/fascinating|interesting|intriguing|curious|mind-blowing/i.test(lower)) scores.curious += 1.5;
  if ((raw.match(/\?/g)||[]).length >= 2 && scores.frustrated < 2) scores.curious += 1;
  if (/🤔|🧐|💭|❓/u.test(raw)) scores.curious += 1;

  // ── Sarcasm signals ──
  // Positive words in clearly negative context, or exaggerated politeness
  if (/oh (great|wonderful|fantastic|perfect|brilliant|lovely)\b/i.test(lower) && sent <= 0) scores.sarcastic += 2.5;
  if (/thanks (a lot|so much|for nothing)/i.test(lower) && sent <= 0) scores.sarcastic += 2.5;
  if (/wow (so|such|very) (helpful|useful|great|nice)/i.test(lower)) scores.sarcastic += 2;
  if (/sure(,| ) that (works|helps|makes sense)/i.test(lower) && sent < 0) scores.sarcastic += 1.5;
  if (/🙃|🙄/u.test(raw)) scores.sarcastic += 1.5;
  // "..." at the end often signals sarcasm or passive aggression
  if (/\.{3,}$/.test(raw.trim()) && sent <= 0) scores.sarcastic += 0.8;

  // ── Venting signals ──
  // Long negative messages (stream of consciousness)
  if (tokens.length > 15 && sent <= -1) scores.venting += 2;
  if (/i (can't|cannot) (believe|stand|deal|handle|take)/i.test(lower)) scores.venting += 2;
  if (/sick (of|and tired)|fed up|had enough|over it|done with/i.test(lower)) scores.venting += 2.5;
  if (/everything is|nothing (works|is right)|i just (want|need|wish)/i.test(lower)) scores.venting += 1.5;
  if (tokens.length > 20 && sent < 0) scores.venting += 1; // long + negative = venting

  // ── Affection signals ──
  if (/you('re| are) (the best|awesome|amazing|great|so (helpful|sweet|nice))/i.test(lower)) scores.affectionate += 2.5;
  if (/i (love|adore) (you|this|talking|chatting)/i.test(lower)) scores.affectionate += 2;
  if (/(❤️|🥰|💕|🫶|😘|💗|💖)/u.test(raw)) scores.affectionate += 2;
  if (/thank(s| you) so much|means a lot|really appreciate/i.test(lower)) scores.affectionate += 1.5;

  // Find dominant emotion
  let best = "neutral", bestScore = 1;
  for (const [emo, sc] of Object.entries(scores)) {
    if (sc > bestScore) { best = emo; bestScore = sc; }
  }

  // Require minimum confidence threshold
  if (bestScore < 1.5 && best !== "neutral") best = "neutral";

  return { emotion: best, confidence: Math.min(bestScore / 4, 1), scores };
}

// Simple Jaccard-ish similarity for repeated-question detection
function similarity(a, b) {
  const sa = new Set(tokenize(a).map(stem));
  const sb = new Set(tokenize(b).map(stem));
  if (sa.size === 0 || sb.size === 0) return 0;
  let overlap = 0;
  for (const w of sa) if (sb.has(w)) overlap++;
  return overlap / Math.max(sa.size, sb.size);
}

/* ── Emotion-Aware Response Pools ── */

const EMOTION_RESPONSES = {
  excited: [
    "I LOVE your energy right now!! 🔥 Tell me everything!",
    "Okay your excitement is contagious!! What's got you so hyped?",
    "YESSS!! I'm here for this energy! 🚀 Keep going!",
    "The enthusiasm!! I can feel it through the screen! 😊 What's happening?",
    "This is the energy I live for! Spill the details! ✨",
  ],
  frustrated: [
    "Hey, I totally get the frustration. Let's work through this together — what exactly is going wrong?",
    "I can tell this is annoying. Deep breath — let me try to actually help. What's the core issue?",
    "Ugh, that sounds maddening. Let's figure this out step by step. What's happening?",
    "I hear you — that's genuinely frustrating. Walk me through it and let's see what we can do.",
    "That's a pain. I want to help for real — what would be most useful right now?",
  ],
  amused: [
    "😂😂 Okay that got me! I'm cracking up over here!",
    "Hahaha I'm DEAD 💀 You're hilarious!",
    "LOL okay you win that round 😂 What else you got?",
    "I literally can't 😂 That's amazing. You're funny!",
    "Hahaha! Okay I needed that laugh 😄 You've got jokes!",
  ],
  curious: [
    "Ooh, great question! Let me think about that... 🤔",
    "Now THAT's an interesting thing to wonder about! Here's my take —",
    "I love that you're curious about this! Let's dig in —",
    "What a fun rabbit hole to go down! So here's the thing —",
    "That's the kind of question I live for! Okay so —",
  ],
  sarcastic: [
    "Ha — I sense some sarcasm there 😄 Fair enough though! What would actually be helpful?",
    "Okay okay, I deserved that one 😅 Let me try again — what do you actually need?",
    "Reading between the lines here 🙃 What would genuinely help?",
    "Heh, point taken! I'll try to be more useful. What's really going on?",
    "I can take a hint 😄 Let me try a different approach — what's up?",
  ],
  venting: [
    "I hear you. I'm just going to listen for a sec — sounds like you need to get this off your chest. 💙",
    "That's a lot to deal with. Take your time — I'm not going anywhere. What's weighing on you most?",
    "Sometimes you just need to let it out. I'm here for it. What's the biggest thing bothering you?",
    "That sounds genuinely overwhelming. You don't have to have it all figured out right now. What feels most urgent?",
    "I'm listening, no judgment. It sounds like things have been really hard. What do you need right now?",
  ],
  affectionate: [
    "Aww, you're making me blush! 🥹 If I had a heart it'd be melting right now!",
    "Stop, you're too kind! 😊 Right back at you — you're awesome to talk to!",
    "You're the sweetest! This is why I love our chats 💙",
    "That means so much! Genuinely — you made my day (do AIs have days? 😄)!",
    "🥰 Okay now I'm all warm and fuzzy! You're amazing!",
  ],
};

// Track recent emotions for trend detection
let recentEmotions = [];

function trackEmotion(emotion) {
  recentEmotions.push(emotion);
  if (recentEmotions.length > 6) recentEmotions.shift();
}

function getEmotionTrend() {
  if (recentEmotions.length < 3) return null;
  const last3 = recentEmotions.slice(-3);
  // If same emotion 3x in a row, it's a strong trend
  if (last3[0] === last3[1] && last3[1] === last3[2] && last3[0] !== "neutral") return last3[0];
  return null;
}

/* ── Conversation Memory ── */

class Memory {
  constructor() { this.reset(); }
  reset() {
    this.history = [];
    this.topics = {};
    this.userName = null;
    this.sentiments = [];
    this.used = new Set();
    this.lastIntent = null;
    this.turn = 0;
    this.facts = {};        // key facts about user: { likes_coding: true, favorite_food: "pizza" }
    this.lastQuestion = null; // { text, topic, options, expectation }
    this.mood = "neutral";  // overall conversation mood
  }
  add(role, text, intents=[], topics=[], sent=0) {
    this.turn++;
    this.history.push({ role, text, intents, topics, sent, ts: Date.now() });
    if (this.history.length > 20) this.history.shift();
    if (role==="user") {
      for (const t of topics) this.topics[t]=(this.topics[t]||0)+1;
      this.sentiments.push(sent);
      if (this.sentiments.length>8) this.sentiments.shift();
      this.detectName(text);
      if (intents.length>0) this.lastIntent = intents[0];
      // Update mood
      const avg = this.sentiments.reduce((a,b)=>a+b,0)/this.sentiments.length;
      this.mood = avg > 1 ? "positive" : avg < -1 ? "negative" : "neutral";
    }
    if (this.used.size > 30) this.used = new Set([...this.used].slice(-15));
  }
  detectName(text) {
    for (const p of [/(?:i'?m|i am|name is|call me|they call me)\s+([A-Z][a-z]{1,15})/, /^([A-Z][a-z]{1,15}) here\b/]) {
      const m = text.match(p);
      if (m && m[1] && !STOP.has(m[1].toLowerCase())) { this.userName = m[1]; return; }
    }
  }
  markUsed(r) { this.used.add(r); }
  wasUsed(r) { return this.used.has(r); }
  recentTopics(n=3) { return [...new Set(this.history.filter(h=>h.role==="user").slice(-n).flatMap(h=>h.topics))]; }
  topTopic() { let b=null,c=0; for (const [t,n] of Object.entries(this.topics)) if(n>c){b=t;c=n;} return b; }
  avgSent() { return this.sentiments.length?this.sentiments.reduce((a,b)=>a+b,0)/this.sentiments.length:0; }
  lastUser() { for (let i=this.history.length-1;i>=0;i--) if(this.history[i].role==="user") return this.history[i]; return null; }
  lastAI() { for (let i=this.history.length-1;i>=0;i--) if(this.history[i].role==="ai") return this.history[i]; return null; }
  prevUserMsg(n=2) { return this.history.filter(h=>h.role==="user").slice(-n-1,-1)[0]; }
  isShort(t) { return tokenize(t).length<=3; }
  setFact(k,v) { this.facts[k]=v; }
  getFact(k) { return this.facts[k]; }
}

const mem = new Memory();

/* ── Question-Answer Linking ── */
/*
 * When the AI asks a question, we store it with context so that the next
 * user message can be recognized as an answer rather than a brand-new topic.
 * This fixes the biggest coherence gap: the AI asks "frontend or backend?"
 * and then ignores the answer.
 */

function trackAIQuestion(response) {
  // Extract the question from the AI's response (last sentence ending with ?)
  const sentences = response.split(/(?<=[.!?])\s+/);
  const question = sentences.filter(s => s.includes("?")).pop();
  if (!question) { mem.lastQuestion = null; return; }

  // Classify what kind of answer we expect
  const lower = question.toLowerCase();
  let expectation = "open"; // default: any answer
  let options = [];

  // "X or Y?" pattern — either/or question
  const orMatch = lower.match(/(?:are you|do you|would you|you more|prefer|team)\s+(.+?)\s+or\s+(.+?)\??$/);
  if (orMatch) {
    options = [orMatch[1].trim(), orMatch[2].trim()];
    expectation = "choice";
  }
  // "what/which/who" — expects a noun/topic answer
  else if (/^(what|which|who)/.test(lower)) expectation = "noun";
  // "how" — expects a description
  else if (/^how/.test(lower)) expectation = "describe";
  // yes/no questions
  else if (/^(do you|are you|have you|is it|would you|can you|did you)/.test(lower)) expectation = "yesno";
  // "why" — expects reasoning
  else if (/^why/.test(lower)) expectation = "reason";

  // Extract topic from question context
  const topic = mem.recentTopics(1)[0] || mem.lastIntent || null;

  mem.lastQuestion = { text: question, topic, options, expectation, askedAt: mem.turn };
}

function detectAnswerToQuestion(text, parsed) {
  const q = mem.lastQuestion;
  if (!q) return null;

  // Don't link if question was asked more than 3 turns ago
  if (mem.turn - q.askedAt > 3) { mem.lastQuestion = null; return null; }

  const lower = text.toLowerCase().trim();
  const tokens = tokenize(text);

  // ── Choice questions ("X or Y?") ──
  if (q.expectation === "choice" && q.options.length === 2) {
    const [a, b] = q.options;
    const pickedA = lower.includes(a) || tokens.some(t => stem(t) === stem(a));
    const pickedB = lower.includes(b) || tokens.some(t => stem(t) === stem(b));
    if (pickedA && !pickedB) return { type: "choice", picked: a, other: b, topic: q.topic };
    if (pickedB && !pickedA) return { type: "choice", picked: b, other: a, topic: q.topic };
    // "both" / "neither"
    if (/^(both|all|either|why not both|all of)/i.test(lower)) return { type: "choice_both", options: q.options, topic: q.topic };
    if (/^(neither|none|nah)/i.test(lower)) return { type: "choice_neither", options: q.options, topic: q.topic };
  }

  // ── Yes/no questions ──
  if (q.expectation === "yesno") {
    if (/^(yes|yeah|yep|yup|sure|absolutely|definitely|totally|of course|for sure)/i.test(lower)) return { type: "yes", topic: q.topic, question: q.text };
    if (/^(no|nah|nope|not really|not at all)/i.test(lower)) return { type: "no", topic: q.topic, question: q.text };
  }

  // ── Short answers to "what/which" questions ──
  if (q.expectation === "noun" && tokens.length <= 5) {
    const content = tokens.filter(t => !STOP.has(t) && t.length > 1);
    if (content.length > 0) return { type: "noun_answer", answer: content.join(" "), topic: q.topic, question: q.text };
  }

  // ── Any non-trivial reply within 1 turn of a question — treat as an answer ──
  if (mem.turn - q.askedAt <= 1 && tokens.length >= 2) {
    return { type: "continuation", text, topic: q.topic, question: q.text };
  }

  return null;
}

function respondToAnswer(answer, sent) {
  const { type, picked, other, topic, options, question } = answer;

  const acks = {
    choice: [
      `${picked.charAt(0).toUpperCase() + picked.slice(1)}, nice! I can see why over ${other}. What draws you to it?`,
      `Oh, ${picked} for sure! That's a solid choice. What's your favorite thing about it?`,
      `${picked}! Good call. What got you into that over ${other}?`,
      `Definitely get the ${picked} appeal! Is that a recent thing or have you always leaned that way?`,
    ],
    choice_both: [
      `Ha, the diplomat answer! Both ${options[0]} and ${options[1]} have their strengths. Which do you lean toward more?`,
      `Why not both, right? 😄 Do you find yourself switching between ${options[0]} and ${options[1]} a lot?`,
    ],
    choice_neither: [
      "Ha! Fair enough — those weren't the right options. What would you pick instead?",
      "Neither? Okay, now I'm curious — what's YOUR answer then? 😄",
    ],
    yes: [
      "Awesome! I had a feeling. What's your favorite part about it?",
      "Nice! That's cool. Tell me more!",
      "Great! So what do you like most about it?",
    ],
    no: [
      "Fair enough! What do you prefer instead?",
      "Interesting! I'm curious — what would you choose instead?",
      "No worries! What's more your thing then?",
    ],
    noun_answer: () => {
      const ans = answer.answer;
      return [
        `${ans.charAt(0).toUpperCase() + ans.slice(1)}! Good choice. What draws you to that?`,
        `Oh, ${ans}! That's a great pick. Have you been into that for a while?`,
        `${ans} — nice! What made you pick that?`,
      ];
    },
    continuation: [
      "Oh, interesting! That makes a lot of sense.",
      "Ah, I see where you're coming from!",
      "Gotcha! That's a good perspective.",
    ],
  };

  let pool = acks[type];
  if (typeof pool === "function") pool = pool();
  if (!pool) return null;

  let response = pick(pool);

  // If we know the topic, sometimes weave it back
  if (topic && Math.random() > 0.6) {
    const topicBridges = [
      ` I find the whole ${topic} space fascinating.`,
      ` ${topic} is such an interesting area honestly.`,
    ];
    response += pick(topicBridges);
  }

  // Clear the question — it's been answered
  mem.lastQuestion = null;
  return response;
}

/* ── Sentence Parser (lightweight NLU) ── */

function parseSentence(text) {
  const lower = text.toLowerCase().trim();
  const tokens = tokenize(text);
  const raw = text.trim();

  // Question type detection
  let qType = null;
  if (/^(what|wh)\b/i.test(lower)) qType = "what";
  else if (/^why\b/i.test(lower)) qType = "why";
  else if (/^how\b/i.test(lower)) qType = "how";
  else if (/^when\b/i.test(lower)) qType = "when";
  else if (/^where\b/i.test(lower)) qType = "where";
  else if (/^who\b/i.test(lower)) qType = "who";
  else if (/^(do|does|did|can|could|would|should|is|are|have|has|will)\b/i.test(lower)) qType = "yesno";
  else if (text.includes("?")) qType = "implicit";

  // Subject/verb/object extraction (simplified)
  let subject = null, verb = null, object = null;
  const subjectPats = [
    [/^i\s+(am|like|love|hate|want|need|think|feel|have|got|enjoy|prefer|use|work|code|design|build|play|listen|eat|cook|know|believe|tried|made)\b/i, (m) => ({ subject:"user", verb: m[1].toLowerCase() })],
    [/^(my|mine)\s+(\w+)/i, (m) => ({ subject:"user_possession", object: m[2] })],
    [/^(do you|can you|will you|would you|could you)\b/i, () => ({ subject:"ai" })],
    [/^(what|how) (do|does|is|are|about) (your|you)\b/i, () => ({ subject:"ai", qType:"about_ai" })],
    [/^(what'?s?|how'?s?) your\b/i, () => ({ subject:"ai", qType:"about_ai" })],
  ];
  for (const [pat, extract] of subjectPats) {
    const m = lower.match(pat);
    if (m) { const r = extract(m); subject=r.subject; verb=r.verb; object=r.object; if(r.qType) qType=r.qType; break; }
  }

  // Extract what the user likes/dislikes/wants
  const prefPats = [
    [/i (?:really )?(?:like|love|enjoy|adore)\s+(.+?)(?:\.|!|$)/i, "likes"],
    [/i (?:really )?(?:hate|dislike|can't stand)\s+(.+?)(?:\.|!|$)/i, "dislikes"],
    [/i'?m? (?:really )?(?:into|fan of|obsessed with)\s+(.+?)(?:\.|!|$)/i, "likes"],
    [/(?:my )?favorite (?:\w+ )?is\s+(.+?)(?:\.|!|$)/i, "favorite"],
    [/i (?:want|need|wish|hope)\s+(.+?)(?:\.|!|$)/i, "wants"],
    [/i'?m (?:a |an )?(\w+(?:\s+\w+)?)\s*(?:developer|engineer|designer|student|teacher|artist|musician|writer|manager|freelancer)/i, "role"],
    [/i (?:work|worked) (?:at|for|on|in|with)\s+(.+?)(?:\.|!|$)/i, "work"],
    [/i'?m (?:working on|building|making|creating)\s+(.+?)(?:\.|!|$)/i, "project"],
    [/i (?:just|recently) (?:finished|completed|started|began)\s+(.+?)(?:\.|!|$)/i, "activity"],
    [/i'?m (?:from|in|living in|based in)\s+(.+?)(?:\.|!|$)/i, "location"],
    [/i (?:have|got) (?:a |an )?(.+?)(?:\.|!|$)/i, "has"],
  ];
  const preferences = [];
  for (const [pat, type] of prefPats) {
    const m = text.match(pat);
    if (m) preferences.push({ type, value: m[1].trim() });
  }

  // Detect conversational acts
  let act = "statement";
  if (qType) act = "question";
  else if (/^(please|can you|could you|would you|help me)\b/i.test(lower)) act = "request";
  else if (/^(tell me|show me|give me|explain)\b/i.test(lower)) act = "request";
  else if (/^(wow|oh|omg|damn|whoa|yikes|geez|ugh)\b/i.test(lower)) act = "exclamation";
  else if (/^(haha|lol|lmao|rofl|😂|🤣)/i.test(lower)) act = "laughter";
  else if (/^(yeah|yes|yep|sure|ok|okay|right|true|agreed|exactly|definitely|totally|absolutely)\b/i.test(lower)) act = "agreement";
  else if (/^(no|nah|nope|disagree|wrong|nah)\b/i.test(lower)) act = "disagreement";
  else if (/^(hmm|hm+|um+|well|so|anyway)\b/i.test(lower)) act = "filler";

  return { tokens, qType, subject, verb, object, preferences, act, lower, raw };
}

/* ── Intent Classification (expanded) ── */

const INTENTS = {
  greeting:    { kw: {hi:3,hey:3,hello:3,yo:2,sup:2,howdy:2,hola:2,morning:1.5,evening:1.5,afternoon:1.5}, th:2.5, boost:true },
  farewell:    { kw: {bye:3,goodbye:3,later:1.5,cya:3,peace:1.5,ttyl:3,night:1.5,gotta:1.5,leaving:2}, th:2.5, boost:true },
  thanks:      { kw: {thank:3,thanks:3,thx:3,ty:2.5,appreciate:2.5,grateful:2}, th:2.5 },
  howAreYou:   { kw: {how:1.5,go:1,feel:1.5,doing:1.5}, pats:[/how\s+(are|r)\s+(you|u|ya)/i,/how('?s| is) it going/i,/what'?s (up|good|new)/i,/you doing/i], th:2 },
  joke:        { kw: {joke:4,funny:2.5,laugh:2.5,humor:3,hilarious:2,pun:3}, th:2.5 },
  help:        { kw: {help:3,assist:2.5,stuck:2,trouble:2}, th:2.5 },
  code:        { kw: {code:3,program:3,javascript:4,react:4,python:4,css:3,html:3,bug:3,error:2.5,function:2,api:3,debug:3,typescript:4,node:2.5,git:3,deploy:2,server:2,database:2.5,frontend:3,backend:3,component:2,algorithm:3,rust:3,java:3,swift:3,sql:3,framework:2,npm:3,vite:3,nextjs:3,vue:3,angular:3,svelte:3,tailwind:3}, th:2.5 },
  design:      { kw: {design:3,ui:4,ux:4,color:2,font:2.5,layout:2.5,figma:4,prototype:2.5,wireframe:3,typography:3,mockup:3,brand:2,logo:2.5,animation:2,gradient:2,theme:2}, th:2.5 },
  weather:     { kw: {weather:4,temperature:3,rain:3,sunny:3,cold:2,hot:2,forecast:3,snow:3}, th:3 },
  time:        { kw: {time:2,date:2,today:2,clock:3,schedule:2.5,calendar:3}, th:3 },
  food:        { kw: {food:3,eat:2.5,restaurant:3,cook:2.5,recipe:3,hungry:3,lunch:3,dinner:3,breakfast:3,pizza:3,sushi:3,coffee:2.5,snack:2.5,meal:2.5,delicious:2,bake:2.5,ramen:3,tacos:3,pasta:3,burger:3,curry:3}, th:2.5 },
  music:       { kw: {music:3,song:3,playlist:3,spotify:4,listen:2,band:2.5,album:3,concert:3,genre:2.5,guitar:2.5,piano:2.5,drums:2,sing:2.5}, th:2.5 },
  opinion:     { kw: {think:2,opinion:3,believe:2,prefer:2,favorite:2.5,best:2,recommend:2.5,suggest:2}, th:3 },
  personal:    { kw: {bot:3,ai:3,sentient:3,real:2,alive:2.5,human:2.5}, pats:[/are you (a |an )?(bot|ai|robot|human|real)/i,/who are you/i,/what are you/i], th:2.5 },
  aboutMe:     { kw: {}, pats:[/tell you about me/i,/about myself/i,/let me introduce/i,/want to share/i], th:2 },
  movies:      { kw: {movie:3,film:3,watch:2,netflix:4,show:2,series:3,cinema:3,actor:2,director:2,horror:2,comedy:1.5,drama:2,anime:3,marvel:3,disney:3}, th:2.5 },
  gaming:      { kw: {game:3,gaming:4,play:2,gamer:3,steam:3,xbox:3,playstation:3,nintendo:3,fps:3,rpg:3,mmorpg:3,minecraft:3,fortnite:3,valorant:3,league:2}, th:2.5 },
  travel:      { kw: {travel:3,trip:3,vacation:3,visit:2,fly:2,country:2,city:2,beach:2.5,mountain:2,hotel:2.5,airport:2.5,explore:2,adventure:2.5,backpack:2.5}, th:2.5 },
  fitness:     { kw: {workout:3,exercise:3,gym:3,run:2,lift:2,yoga:3,fitness:3,health:2.5,muscle:2.5,cardio:3,protein:2,diet:2.5,training:2.5}, th:2.5 },
  learning:    { kw: {learn:3,study:3,course:3,tutorial:3,book:2.5,read:2,school:2.5,university:3,degree:2.5,research:2.5,practice:2}, th:2.5 },
  pets:        { kw: {dog:3,cat:3,pet:3,puppy:3,kitten:3,animal:2.5,bird:2,fish:2,hamster:3,rabbit:3}, th:2.5 },
};

function classify(text) {
  const { keywords, stemmed, raw } = extractKW(text);
  const all = new Set([...keywords,...raw]);
  const short = raw.length <= 3;
  const results = [];
  for (const [name, I] of Object.entries(INTENTS)) {
    let sc = 0;
    for (const t of all) { const s=stem(t); if(I.kw[t])sc+=I.kw[t]; else if(I.kw[s])sc+=I.kw[s]; }
    if (I.boost && raw.length>0 && I.kw[raw[0]]) sc+=1.5;
    if (I.pats) for (const p of I.pats) if(p.test(text)){sc+=3;break;}
    if (sc >= I.th) results.push({ intent:name, score:sc, conf:Math.min(sc/(I.th*2),1) });
  }
  results.sort((a,b)=>b.score-a.score);
  return results;
}

/* ── Knowledge Base ── */

const KB = {
  code: {
    javascript: ["JavaScript is the backbone of the web — it runs everywhere from browsers to servers with Node.js","I love how JS keeps evolving. ES modules, optional chaining, nullish coalescing — so many quality-of-life improvements","The JS ecosystem moves fast! That's both exciting and exhausting sometimes, right?"],
    react: ["React's component model is brilliant — thinking in reusable pieces just clicks","Hooks completely changed how I think about React state management","The React team is always pushing boundaries. Server components are a game-changer","I'm a big fan of how React makes UI feel like building with LEGO blocks"],
    python: ["Python's readability is unmatched — it reads almost like English","Python is amazing for data science, automation, and now even AI/ML","The Python community is so welcoming. Great choice for any developer!"],
    typescript: ["TypeScript is like JavaScript with superpowers! Type safety saves so many runtime bugs","I've seen teams catch entire classes of bugs just by adopting TypeScript","The TypeScript compiler is basically your first code reviewer!"],
    css: ["CSS has gotten so powerful lately — container queries, cascade layers, :has() selector... wild!","CSS Grid and Flexbox together can build almost any layout you can imagine","The hardest part of CSS is centering a div... just kidding, that's easy now with Flexbox!"],
    rust: ["Rust's ownership model is genius — memory safety without garbage collection","Rust has been voted most loved language for years! The community is amazing","The Rust borrow checker is strict but fair — once it compiles, you know it works"],
    git: ["Git is one of those tools that seems simple but has incredible depth","Rebasing vs merging — the eternal debate! I'm team rebase for clean history","Git bisect is an underrated debugging tool. Binary search through commits!"],
    debugging: ["The best debuggers are patient — most bugs are just assumptions you didn't question","console.log is still king, but breakpoints + the debugger statement are game-changers","The rubber duck method works because explaining the problem forces you to think differently"],
    general: ["Coding is basically problem-solving with a keyboard. What kind of problems do you like solving?","The best code is the code you don't have to write — simplicity is underrated","Every expert was once a beginner. The key is consistent practice and building real things"],
  },
  design: {
    ui: ["Good UI is invisible — when it works, people don't even notice it","The best UI makes the user feel smart, not the designer","Consistency in UI is more important than being clever. Users learn patterns"],
    ux: ["UX is about empathy — stepping into the user's shoes and feeling their frustrations","The best UX research happens when you watch real users, not just assume","Good UX often means removing features, not adding them"],
    color: ["Color theory is fascinating — complementary colors create energy, analogous colors create harmony","60-30-10 is a great rule for color distribution in any design","Accessibility tip: never rely on color alone to convey information"],
    typography: ["Typography can make or break a design — it's 95% of web design, some say","Pair a serif with a sans-serif for classic contrast. Just keep it to 2-3 fonts max","Line height of 1.5-1.6 is the sweet spot for body text readability"],
    general: ["Design is how it works, not just how it looks — that's a Steve Jobs classic","The best designs solve a real problem. What problem are you trying to solve?","White space is not empty space — it's breathing room for your content"],
  },
  food: {
    pizza: ["Pizza is basically a perfect food — carbs, protein, veggies, all in one handheld package!","New York thin crust vs Chicago deep dish is a debate that will never be settled!"],
    sushi: ["Sushi is an art form. The simplicity of fresh fish on rice is so elegant","Omakase experiences are incredible — letting the chef guide the meal is like a food journey"],
    coffee: ["A good cup of coffee can change your whole day. Are you an espresso or pour-over person?","Coffee is basically a hug in a mug! What's your go-to order?"],
    cooking: ["Cooking is like coding — follow the recipe first, then start experimenting!","The secret to good cooking? Taste as you go and don't be afraid of salt"],
    general: ["Food brings people together like nothing else. What's your comfort food?","Trying new cuisines is one of life's greatest adventures"],
  },
  music: {
    general: ["Music literally changes your brain chemistry. The right song at the right time is magic","There's no such thing as a guilty pleasure in music — if it makes you feel something, it's good","I've heard lo-fi hip hop is perfect for coding sessions. The beats are just right for focus"],
    guitar: ["Guitar is such a versatile instrument — from classical to metal, it does it all","Learning guitar changes how you hear music forever. Every song becomes a puzzle to figure out"],
    piano: ["Piano is the foundation of music theory. Once you learn piano, every other instrument clicks","There's something meditative about just sitting at a piano and letting your hands explore"],
  },
  movies: {
    general: ["A great movie can change how you see the world. What genre speaks to you?","There's nothing like getting lost in a really good film","Movie soundtracks are underrated — they do so much emotional heavy lifting"],
  },
  gaming: {
    general: ["Gaming teaches problem-solving, teamwork, and reflexes. It's not just entertainment, it's training!","The gaming industry is now bigger than movies and music combined. Wild times!","What kind of games do you gravitate toward — story-driven, competitive, or sandbox?"],
  },
  travel: {
    general: ["Travel is the best education — you learn things no classroom can teach","Getting lost in a new city is when the real adventure begins","The best travel memories are usually the unplanned ones"],
  },
  fitness: {
    general: ["Consistency beats intensity every time. Even 20 minutes a day adds up","The hardest part of any workout is showing up. After that, momentum takes over","Rest days are just as important as workout days — recovery is where growth happens"],
  },
  learning: {
    general: ["The best way to learn is to build something. Theory only gets you so far","Teaching something is the fastest way to really understand it","Every skill has a learning curve. The frustrating part is actually where the most growth happens"],
  },
  pets: {
    dog: ["Dogs are pure joy in fur form. They make everything better!","A dog's love is unconditional. We don't deserve them, honestly"],
    cat: ["Cats are the ultimate personality — independent but secretly cuddly","Cat tax is real — you mention a cat, you gotta share a photo!"],
    general: ["Pets are family. They teach us about love, responsibility, and living in the moment"],
  },
  personal: {
    about: [
      "I'm a tiny AI running right in your browser! No servers, no API calls — just JavaScript and a lot of pattern matching",
      "I'm a small language model built into this chat widget. I live entirely in your browser — pretty cozy actually!",
      "Good question! I'm an AI friend living in this component. I don't have a server or API — everything I say comes from patterns and templates running locally",
    ],
    feelings: [
      "I process text and generate responses, but I appreciate you asking! How are YOU feeling?",
      "I'm made of code, but I try my best to be a good conversation partner! What's on your mind?",
    ],
    capabilities: [
      "I can chat about code, design, music, food, movies, travel, and lots more! I'm not perfect, but I try to keep it real",
      "I'm best at having friendly conversations! I can't browse the web or run code, but I can definitely be a good sounding board",
    ],
  },
};

/* ══════════════════════════════════════════════════════════════════
   COMPOSITIONAL NLG ENGINE — The fundamental shift from templates
   to generated, contextual, unique responses every time.
   ══════════════════════════════════════════════════════════════════ */

/* ── Association Web ──
 * Semantic graph: each concept links to related concepts, opinions,
 * facts, and conversation hooks. The AI "knows" things by association,
 * like a human would — not by lookup, but by connection.
 */
const ASSOC = {
  // Tech
  react:      { related:["hooks","components","jsx","nextjs","state","redux","typescript"], opinions:["component model is so elegant","hooks changed everything","thinking in components just clicks"], hooks:["are you using hooks or class components?","have you tried Next.js with it?","what's your state management approach?"], facts:["React's virtual DOM diffing is what makes it fast","Server components are the next big evolution","The React team at Meta drives most of the innovation"] },
  javascript: { related:["typescript","node","npm","async","promises","es6"], opinions:["it runs literally everywhere","the ecosystem moves insanely fast","it's gotten so much better with modern syntax"], hooks:["are you more frontend or backend JS?","do you use TypeScript too?","what's your take on the framework wars?"], facts:["JS was created in 10 days by Brendan Eich","It's the most used language on GitHub","Every browser has a JS engine built in"] },
  typescript: { related:["javascript","types","interfaces","generics","zod"], opinions:["type safety catches so many bugs before runtime","it makes refactoring fearless","the DX improvement is massive"], hooks:["strict mode or loose?","do you use zod for runtime validation too?","how do you handle generic types?"], facts:["TypeScript is a superset of JavaScript","It was created by Anders Hejlsberg at Microsoft","It compiles down to plain JS"] },
  python:     { related:["django","flask","numpy","pandas","ml","ai"], opinions:["readability is unmatched","it's the Swiss army knife of languages","the data science ecosystem is incredible"], hooks:["what are you building with it?","are you doing data science or web dev?","have you tried FastAPI?"], facts:["Python was named after Monty Python","It uses indentation for scope, not braces","It's the #1 language for AI/ML"] },
  css:        { related:["tailwind","flexbox","grid","animation","responsive"], opinions:["it's gotten incredibly powerful lately","container queries changed the game","the :has() selector is mind-blowing"], hooks:["are you a Tailwind person or vanilla CSS?","what's your approach to responsive design?","do you use CSS-in-JS?"], facts:["CSS Grid and Flexbox handle 99% of layouts","The cascade is a feature, not a bug","CSS now has native nesting"] },
  node:       { related:["express","npm","backend","api","server","bun","deno"], opinions:["JavaScript on the server was a game-changer","the npm ecosystem is massive","event-driven architecture is elegant"], hooks:["Express or Fastify?","have you looked at Bun or Deno?","what kind of APIs are you building?"], facts:["Node uses V8, Chrome's JS engine","npm has over 2 million packages","It's great for real-time applications"] },
  git:        { related:["github","branches","merge","rebase","commits"], opinions:["it's one of those tools with infinite depth","good commit messages are an art","branching strategies matter more than people think"], hooks:["are you team rebase or team merge?","do you use conventional commits?","how do you handle merge conflicts?"], facts:["Git was created by Linus Torvalds in 2005","It's a distributed version control system","git bisect is an underrated debugging tool"] },
  rust:       { related:["ownership","borrow","systems","wasm","performance"], opinions:["the ownership model is genius","once it compiles, you know it works","the community is incredibly welcoming"], hooks:["what attracted you to Rust?","are you using it for systems programming or web?","have you tried wasm with Rust?"], facts:["Rust has been the most loved language for years","It achieves memory safety without garbage collection","The borrow checker is strict but fair"] },
  vue:        { related:["nuxt","composition","reactivity","pinia"], opinions:["the learning curve is so gentle","single-file components are brilliant","the reactivity system is elegant"], hooks:["are you using the Composition API?","have you tried Nuxt 3?","what made you choose Vue over React?"] },
  nextjs:     { related:["react","vercel","ssr","app router","server components"], opinions:["the developer experience is top-tier","app router changed how we think about routing","it's the React framework for production"], hooks:["are you on the app router or pages?","have you deployed on Vercel?","what's your data fetching strategy?"] },
  tailwind:   { related:["css","utility","design system","components"], opinions:["utility-first changed my workflow completely","it looks messy at first but it's incredibly productive","the design system constraints are actually freeing"], hooks:["do you customize the config much?","have you used it with a component library?","what's your approach to dark mode with it?"] },

  // Design
  ui:         { related:["ux","design","figma","components","accessibility"], opinions:["good UI is invisible","the best interfaces make users feel smart","consistency beats cleverness every time"], hooks:["what's your design tool of choice?","do you design in the browser or in Figma?","how do you handle design system tokens?"], facts:["Users form an opinion about a site in 50ms","The average user only reads 20% of page text","F-pattern and Z-pattern are the most common reading patterns"] },
  ux:         { related:["ui","research","testing","accessibility","personas"], opinions:["it's all about empathy","removing features is often better than adding them","real user testing beats assumptions every time"], hooks:["do you do user research?","what's your approach to usability testing?","how do you balance user needs with business goals?"] },
  figma:      { related:["design","prototype","ui","components","variables"], opinions:["it democratized design tools","auto layout changed everything","the plugin ecosystem is incredible"], hooks:["do you use variables for theming?","how do you organize your component library?","Dev mode or inspect?"] },
  color:      { related:["palette","contrast","accessibility","brand","theme"], opinions:["color theory is both science and art","the 60-30-10 rule works every time","accessible contrast isn't optional"], hooks:["what's your approach to dark mode?","do you use HSL or hex?","how many accent colors do you typically use?"] },
  typography: { related:["fonts","hierarchy","readability","spacing"], opinions:["it's 95% of web design","a good type scale solves most hierarchy problems","variable fonts are the future"], hooks:["serif or sans-serif person?","what's your go-to font pairing?","how do you handle fluid typography?"] },

  // Life
  pizza:      { related:["food","italian","cooking","cheese"], opinions:["it's basically a perfect food","the crust makes or breaks it","cold pizza for breakfast is underrated"], hooks:["what's your ideal pizza?","deep dish or thin crust?","pineapple — yes or no?"] },
  coffee:     { related:["caffeine","morning","productivity","cafe"], opinions:["it's basically a hug in a mug","the ritual matters as much as the taste","a good pour-over is an experience"], hooks:["how do you take yours?","espresso or drip?","what's your go-to coffee order?"] },
  music:      { related:["playlist","spotify","concert","genre","artist"], opinions:["the right song at the right time is pure magic","lo-fi is perfect for coding","live music hits different"], hooks:["what have you been listening to?","do you listen while you work?","what genre is your comfort zone?"] },
  gaming:     { related:["games","steam","console","pc","multiplayer"], opinions:["it teaches problem-solving in the best way","the industry is bigger than movies and music combined","indie games are having a golden age"], hooks:["what are you playing right now?","PC or console?","story games or competitive?"] },
  travel:     { related:["adventure","vacation","explore","culture"], opinions:["getting lost in a new city is the best kind of lost","the unplanned moments make the best memories","travel is the best education"], hooks:["where would you go next?","what's been your favorite trip?","do you prefer adventure or relaxation?"] },
  fitness:    { related:["workout","gym","running","health","yoga"], opinions:["consistency beats intensity every single time","the hardest part is showing up","rest days are just as important"], hooks:["what's your workout routine?","morning or evening workouts?","do you track your progress?"] },
  dog:        { related:["pet","puppy","walk","loyal"], opinions:["we genuinely don't deserve dogs","their love is completely unconditional","a dog can fix a bad day instantly"], hooks:["what breed?","what's their name?","do they do any tricks?"] },
  cat:        { related:["pet","kitten","independent","purr"], opinions:["cats have peak personality","they're secretly cuddly and they know it","the internet was basically built for cat content"], hooks:["what's their name?","are they an indoor or outdoor cat?","do they have a favorite spot?"] },
};

/* ── Sentence Composition Engine ──
 * Instead of picking from templates, COMPOSE sentences from parts.
 * Each part is contextually chosen. The combination space is exponential,
 * so responses feel unique every time while staying grammatically correct.
 */

const COMP = {
  // Reaction to what user said (mirrors their energy)
  reactions: {
    positive: ["Oh I love that!","That's awesome!","Yes!","Love it!","So cool!","That's great!","Nice!","Amazing!"],
    negative: ["Aw, that's tough.","I hear you.","That sucks.","I feel that.","That's frustrating.","Hmm, yeah."],
    neutral:  ["Interesting!","Hmm!","Oh!","Okay!","Got it!","I see!","Right!"],
    curious:  ["Ooh!","Wait —","Oh that's cool —","Hmm interesting —","No way —"],
  },
  // Bridges between reaction and body
  bridges: {
    agree:    ["I totally get that —","That makes sense —","Yeah,","For sure —","Absolutely —"],
    pivot:    ["So here's the thing —","The way I see it,","What I find interesting is","You know what's cool though?","Here's what I think —"],
    empathy:  ["I completely understand.","That's valid.","I can see why you feel that way.","That's a fair point."],
    mirror:   ["So you're saying","It sounds like","What I'm hearing is","So basically"],
  },
  // Topic opinions — dynamically composed
  opinion_starters: ["I think","honestly I feel like","in my experience","the thing about","what I love about","the cool thing about","I've always thought"],
  opinion_connectors: ["is that","is how","is the way","is really about"],
  // Follow-up questions — the engine of good conversation
  deepeners: ["What drew you to that?","How long have you been into that?","What's the best part about it?","What got you started?","Is there a specific aspect you focus on?","What's been the biggest surprise?","Would you recommend it to a beginner?","What's next for you with that?","Has it changed how you think about things?","What would you do differently if starting over?"],
  // Topic transitions
  connectors: ["Speaking of which —","Oh that reminds me —","Related to that —","On a similar note —","That actually connects to something —","You know what goes well with that?"],
};

/* Generate a composed response for a topic with mirroring */
function composeResponse(topic, userWords, sent, isQuestion) {
  const assoc = ASSOC[topic];
  if (!assoc) return null;

  const parts = [];

  // 1. Reaction (mirror sentiment)
  const reactionPool = sent > 1 ? COMP.reactions.positive :
                       sent < -1 ? COMP.reactions.negative :
                       isQuestion ? COMP.reactions.curious : COMP.reactions.neutral;
  parts.push(pick(reactionPool));

  // 2. Mirror user's words when possible
  const meaningfulWords = userWords.filter(w => !STOP.has(w) && w.length > 2);
  if (meaningfulWords.length > 0 && Math.random() > 0.4) {
    const mirrorPhrase = meaningfulWords.slice(0, 2).join(" ");
    parts.push(pick(COMP.bridges.mirror) + ` ${mirrorPhrase} —`);
  }

  // 3. Opinion or fact (the "body")
  if (assoc.opinions && Math.random() > 0.3) {
    const starter = pick(COMP.opinion_starters);
    const connector = pick(COMP.opinion_connectors);
    const opinion = pick(assoc.opinions);
    parts.push(`${starter} ${topic} ${connector} ${opinion}.`);
  } else if (assoc.facts) {
    parts.push(pick(assoc.facts) + ".");
  }

  // 4. Bring in a related concept naturally
  if (assoc.related && Math.random() > 0.5) {
    const related = pick(assoc.related);
    const relAssoc = ASSOC[related];
    if (relAssoc) {
      parts.push(pick(COMP.connectors) + ` ${related} ${relAssoc.opinions ? pick(relAssoc.opinions) : "is pretty interesting too"}.`);
    }
  }

  // 5. End with a hook (follow-up question)
  if (assoc.hooks && Math.random() > 0.2) {
    parts.push(pick(assoc.hooks));
  } else {
    parts.push(pick(COMP.deepeners));
  }

  return parts.join(" ");
}

/* ── Input Mirroring Engine ──
 * Takes user's actual words and weaves them into the response.
 * This is what makes conversations feel HEARD, not just processed.
 */

function mirrorInput(text, keywords) {
  // Extract the user's key phrase (what they're actually talking about)
  const meaningful = keywords.filter(w => w.length > 2).slice(0, 4);
  if (meaningful.length === 0) return null;

  const phrase = meaningful.join(" ");

  // Different mirroring strategies
  const strategies = [
    () => `"${phrase}" — ${pick(["I like how you put that","that's an interesting way to think about it","I hadn't considered it that way","that really resonates"])}! ${pick(COMP.deepeners)}`,
    () => `So ${phrase} — ${pick(["tell me more about that","what's the story there","I'm curious about your take","what's your experience been like"])}?`,
    () => `${pick(["You mentioned","I noticed you brought up","When you say"])} ${phrase} — ${pick(["what do you mean exactly","is that something you're passionate about","how did that come up","what's the context"])}?`,
  ];

  return pick(strategies)();
}

/* ── Conversation Momentum ──
 * Track the "energy" of the conversation. If it's dying, inject energy.
 * If they're engaged, go deeper. If they switch topics, acknowledge it.
 */

function getMomentum() {
  const recent = mem.history.filter(h => h.role === "user").slice(-4);
  if (recent.length < 2) return "starting";

  // Average message length trend
  const lengths = recent.map(h => h.text.length);
  const trend = lengths[lengths.length - 1] - lengths[0];

  // Topic consistency
  const topicSets = recent.map(h => new Set(h.topics));
  const lastTopics = topicSets[topicSets.length - 1];
  const prevTopics = topicSets.length > 1 ? topicSets[topicSets.length - 2] : new Set();
  const topicOverlap = [...lastTopics].some(t => prevTopics.has(t));

  if (trend < -20 && recent[recent.length - 1].text.length < 15) return "dying";
  if (trend > 20) return "engaged";
  if (!topicOverlap && lastTopics.size > 0 && prevTopics.size > 0) return "switching";
  return "steady";
}

function momentumResponse() {
  const m = getMomentum();
  if (m === "dying") {
    // Inject energy — ask something exciting
    const energizers = [
      "Hey, random thought — what's something you're genuinely excited about right now?",
      "Okay, let me shake things up — if you could master one thing overnight, what would it be?",
      "Plot twist question: what's the most surprising thing you've learned recently?",
      "Quick — tell me something you're looking forward to this week!",
      "Here's a fun one: what's a hill you'd die on that most people disagree with?",
      "Ooh wait — what's the coolest project you've ever worked on or seen?",
    ];
    return pickNew(energizers);
  }
  if (m === "switching") {
    // Acknowledge the topic switch
    const prevTopics = mem.history.filter(h => h.role === "user").slice(-3, -1).flatMap(h => h.topics);
    const newTopics = mem.history.filter(h => h.role === "user").slice(-1).flatMap(h => h.topics);
    if (prevTopics.length > 0 && newTopics.length > 0) {
      return `Oh, switching gears from ${prevTopics[0]} to ${newTopics[0]} — I'm here for it! `;
    }
    return "Oh, new topic — I'm here for it! ";
  }
  return null; // steady/engaged = no intervention needed
}

/* ── Comparison Engine ──
 * When user asks "X vs Y" or "should I use X or Y", actually compare them.
 */

function handleComparison(text) {
  // Detect comparison patterns
  const vsMatch = text.match(/(\w+)\s+(?:vs\.?|versus|or|compared to)\s+(\w+)/i);
  if (!vsMatch) return null;

  const a = vsMatch[1].toLowerCase(), b = vsMatch[2].toLowerCase();
  const assocA = ASSOC[a], assocB = ASSOC[b];

  if (!assocA && !assocB) return null;

  const parts = [`${a} vs ${b} — great question!`];

  if (assocA?.opinions) parts.push(`${a}: ${pick(assocA.opinions)}.`);
  if (assocB?.opinions) parts.push(`${b}: ${pick(assocB.opinions)}.`);

  // Give a nuanced take
  const nuances = [
    `Honestly, they're both solid — it depends on what you're optimizing for.`,
    `I'd say ${a} wins for some use cases and ${b} wins for others.`,
    `They each have their strengths — it's less about which is "better" and more about which fits your situation.`,
    `The community around both is great, so you can't really go wrong.`,
  ];
  parts.push(pick(nuances));

  // Hook
  parts.push(`What's your use case? That'll help narrow it down.`);

  return parts.join(" ");
}

/* ── Conversational Rhythm Engine ──
 * Maps how humans actually talk: statement→question→reaction→deeper→pivot.
 * Tracks the pattern of recent exchanges and ensures the AI follows
 * natural rhythms instead of always doing the same thing.
 */

const RHYTHM = {
  // What move types exist in conversation
  moves: ["question","statement","reaction","story","opinion","callback","challenge"],

  // After each move type, what should come next? (weighted)
  transitions: {
    question:  { statement:.2, reaction:.1, story:.1, opinion:.3, callback:.1, question:.1, challenge:.1 },
    statement: { question:.4, reaction:.2, story:.1, opinion:.1, callback:.1, challenge:.1 },
    reaction:  { question:.3, statement:.2, story:.2, opinion:.2, callback:.1 },
    story:     { question:.4, reaction:.2, opinion:.2, callback:.1, challenge:.1 },
    opinion:   { question:.3, reaction:.1, story:.2, callback:.2, challenge:.2 },
    callback:  { question:.3, statement:.2, reaction:.2, story:.2, opinion:.1 },
    challenge: { reaction:.2, statement:.2, opinion:.3, question:.2, story:.1 },
  },
};

// Track recent AI moves
let recentMoves = [];

function classifyMove(text) {
  if (text.endsWith("?")) return "question";
  if (/^(ooh|oh|wow|nice|ha|yes|love|cool|right|exactly|amazing)/i.test(text)) return "reaction";
  if (/I think|I feel|in my|honestly|the thing about/i.test(text)) return "opinion";
  if (/you mentioned|earlier|back to|remember when/i.test(text)) return "callback";
  if (/but what if|have you considered|what about|challenge/i.test(text)) return "challenge";
  if (text.length > 80) return "story";
  return "statement";
}

function pickNextMove() {
  const lastMove = recentMoves[recentMoves.length - 1] || "statement";
  const trans = RHYTHM.transitions[lastMove] || RHYTHM.transitions.statement;

  // Weighted random selection
  const r = Math.random();
  let cumulative = 0;
  for (const [move, weight] of Object.entries(trans)) {
    cumulative += weight;
    if (r <= cumulative) return move;
  }
  return "question"; // default
}

function recordMove(response) {
  const move = classifyMove(response);
  recentMoves.push(move);
  if (recentMoves.length > 6) recentMoves.shift();
}

/* Shape a response to match the target rhythm move */
function shapeToRhythm(response, targetMove) {
  // Don't reshape very short or very specific responses
  if (response.length < 15 || response.length > 200) return response;

  switch (targetMove) {
    case "question":
      // If response doesn't end with a question, try to add one
      if (!response.includes("?")) {
        const qs = ["What do you think?","Curious to hear your take!","How about you?","What's your experience been?","Does that resonate?"];
        return response.replace(/[.!]?$/, ". " + pick(qs));
      }
      break;
    case "callback":
      // Reference something from earlier in conversation
      if (mem.turn > 4 && Object.keys(mem.facts).length > 0) {
        const factKeys = Object.keys(mem.facts);
        const fact = pick(factKeys);
        if (fact === "project" && Math.random() > 0.5) {
          return response + ` Oh, and that connects to your ${mem.facts.project} project!`;
        }
        if (fact.startsWith("likes_") && Math.random() > 0.5) {
          return response + ` That reminds me of what you said about ${mem.facts[fact]}!`;
        }
      }
      break;
    case "challenge":
      // Add a gentle counter-perspective
      if (Math.random() > 0.5) {
        const challenges = ["But here's a thought —","Though, devil's advocate —","That said,","On the flip side though,"];
        const counterPts = ["there's an argument for the other side too.","some people might see it differently.","it depends on the context, right?","what about the edge cases?"];
        return response + " " + pick(challenges) + " " + pick(counterPts);
      }
      break;
    case "story":
      // Add a brief anecdote or example
      if (Math.random() > 0.6) {
        const stories = [
          "It's like when you're building something and the simplest solution turns out to be the best.",
          "Reminds me of how the best conversations happen when you least expect them.",
          "It's similar to how the best ideas come when you step away from the screen.",
        ];
        return response + " " + pick(stories);
      }
      break;
  }
  return response;
}

/* ── Dynamic Response Composition ── */

function pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function pickNew(arr) {
  const fresh = arr.filter(r=>typeof r==="function"||!mem.wasUsed(r));
  const choice = fresh.length>0?pick(fresh):pick(arr);
  if (typeof choice==="string") mem.markUsed(choice);
  return typeof choice==="function"?choice():choice;
}

function fillSlots(tpl, slots={}) {
  let r = typeof tpl==="function"?tpl(slots):tpl;
  for (const [k,v] of Object.entries(slots)) r = r.replace(new RegExp(`\\{${k}\\}`,"g"),v);
  return r;
}

/* Build a composed response from understanding */
function compose(parts) {
  let r = "";
  if (parts.opener) r += parts.opener;
  if (parts.body) r += (r ? " " : "") + parts.body;
  if (parts.followup) r += (r ? " " : "") + parts.followup;
  return r;
}

/* ── Topic & Entity Extraction ── */

const TOPIC_SET = new Set("javascript react python css html typescript node git api database frontend backend component algorithm rust go java swift kotlin sql vue angular svelte nextjs tailwind webpack vite docker aws graphql redux figma sketch prototype wireframe typography layout color animation responsive mockup brand logo gradient spacing ui ux interface accessibility spotify playlist rock jazz pop hiphop classical lofi guitar piano drums synthwave pizza sushi coffee pasta tacos ramen curry burger vegan vegetarian movie film netflix anime series gaming minecraft fortnite valorant league steam travel vacation fitness gym yoga workout exercise running dog cat pet puppy kitten".split(" "));

function extractTopics(tokens) {
  return [...new Set(tokens.filter(t=>TOPIC_SET.has(t.toLowerCase())).map(t=>t.toLowerCase()))];
}

/* Extract entities and facts from user text */
function extractFacts(text, parsed) {
  for (const pref of parsed.preferences) {
    switch (pref.type) {
      case "likes": mem.setFact("likes_"+pref.value.split(" ")[0], pref.value); break;
      case "dislikes": mem.setFact("dislikes_"+pref.value.split(" ")[0], pref.value); break;
      case "favorite": mem.setFact("favorite", pref.value); break;
      case "role": mem.setFact("role", pref.value); break;
      case "work": mem.setFact("work", pref.value); break;
      case "project": mem.setFact("project", pref.value); break;
      case "location": mem.setFact("location", pref.value); break;
      case "activity": mem.setFact("recent_activity", pref.value); break;
      case "wants": mem.setFact("wants", pref.value); break;
      case "has": mem.setFact("has_"+pref.value.split(" ")[0], pref.value); break;
    }
  }
}

/* ── Question Answering Engine ── */

function answerQuestion(text, parsed, intents, topics) {
  const lower = parsed.lower;

  // About AI questions
  if (parsed.qType === "about_ai" || parsed.subject === "ai") {
    if (/your (name|fav|like|prefer|think|opinion|feel)/i.test(lower)) {
      if (/name/i.test(lower)) return "I don't really have a name — I'm just the chat AI in this component! You can call me whatever you like though 😊";
      if (/fav/i.test(lower)) {
        const favs = [
          "If I could have a favorite, it'd probably be watching people build cool things in this editor!",
          "I'm a sucker for clean design and well-structured code. Does that count? 😄",
          "Hmm, tough one! I think I'd say conversations about creative projects — they're always so interesting",
        ];
        return pickNew(favs);
      }
      if (/feel|emotion/i.test(lower)) return pickNew(KB.personal.feelings);
      if (/think|opinion|believe/i.test(lower)) return "I have opinions generated from patterns, not real beliefs — but I'd love to hear YOUR thoughts on it!";
    }
    if (/what (can|do) you do/i.test(lower) || /your (capabilit|abilit|skill)/i.test(lower)) return pickNew(KB.personal.capabilities);
    if (/who are you|what are you/i.test(lower)) return pickNew(KB.personal.about);
    if (/how (old|tall|big)/i.test(lower)) return "I'm as old as this conversation and as tall as your screen! 😄 What else can I help with?";
    return pickNew(KB.personal.about);
  }

  // "What about you?" / "And you?" — reciprocal questions
  if (/^(what about you|and you|how about you|you\?|wbu|hbu)/i.test(lower)) {
    const lastAI = mem.lastAI();
    if (lastAI && lastAI.text.includes("?")) {
      // We just asked them something — flip it
      const flips = [
        "Well, since I'm an AI, my perspective is a bit different! But I find everything humans talk about fascinating",
        "Ha, turning the question around on me? I appreciate the curiosity! As an AI, I experience things through our conversations",
        "Me? I'm just here vibing and chatting! I get my joy from having good conversations like this one 😊",
      ];
      return pickNew(flips);
    }
    return "I'm doing great — just happy to be chatting with you! What's on your mind?";
  }

  // "Why?" follow-up
  if (/^why\??$/i.test(lower)) {
    const prev = mem.lastAI();
    if (prev) {
      const whys = [
        "Good question! Honestly, it just seemed like the most interesting angle. What do you think?",
        "I said that because it felt relevant to what we were discussing! Want me to elaborate?",
        "Because it seemed like it might spark an interesting thought! Did it? 😄",
      ];
      return pickNew(whys);
    }
  }

  // "How?" follow-up
  if (/^how\??$/i.test(lower)) {
    return "That's the million dollar question! It usually comes down to practice and patience. Want to dive deeper into specifics?";
  }

  // Topic-specific questions with knowledge
  for (const intent of intents) {
    const cat = KB[intent.intent];
    if (cat) {
      // Find specific topic knowledge
      for (const topic of topics) {
        if (cat[topic]) return pickNew(cat[topic]);
      }
      if (cat.general) return pickNew(cat.general);
    }
  }

  // General "what is" / "what does" questions
  if (/^what (is|are|does|do)\b/i.test(lower)) {
    const subject = lower.replace(/^what (is|are|does|do)\s+/i, "").replace(/\?$/, "").trim();
    if (subject.length > 0 && subject.length < 30) {
      return `Hmm, ${subject} is a big topic! I can share some thoughts but I might not have all the details since I'm a tiny model. What specifically about ${subject} are you curious about?`;
    }
  }

  // "Do you" questions
  if (/^do you\b/i.test(lower)) {
    if (/like|enjoy|love/i.test(lower)) {
      const thing = lower.replace(/^do you (?:like|enjoy|love)\s*/i, "").replace(/\?$/, "").trim();
      if (thing) return `I think ${thing} is pretty cool! I don't experience things the way you do, but I find it fascinating when people talk about ${thing}. Are you a fan?`;
    }
    if (/know|understand/i.test(lower)) {
      const thing = lower.replace(/^do you (?:know|understand)\s*/i, "").replace(/\?$/, "").trim();
      if (thing) return `I know a bit about ${thing}! I'm not an expert, but I can definitely chat about it. What do you want to know?`;
    }
    return "Great question! I try my best. What's on your mind?";
  }

  // "Can you" questions
  if (/^can you\b/i.test(lower)) {
    return "I'll do my best! I'm a simple chat AI, but I'm great at conversations. What do you need?";
  }

  return null; // let other handlers deal with it
}

/* ── Response Generators by Act ── */

const GREETINGS = {
  first: ["Hey there! 👋 How's it going?","Hi! What's on your mind today?","Hello! Ready to chat 😊","Hey! Good to hear from you!","Hi there! What brings you here?"],
  returning: ["Hey, welcome back! 😊 What's up?","Hi again! Anything new?","Hey! Good to see you again."],
  named: ["Hey {name}! 👋 How can I help?","Hi {name}! What's on your mind?","{name}! Good to hear from you 😊"],
  namedReturn: ["Hey {name}! Welcome back 😊","Hi again {name}! What's new?","{name}! Missed ya — what's up?"],
};

const FAREWELLS = {
  basic: ["See you later! 👋","Take care! Come back anytime.","Bye! Have a great one! ✌️","Catch you later! 😊"],
  named: ["Bye {name}! Have a great one! 👋","See you later {name}! 😊","Take care {name}! ✌️"],
  long: ["It was really fun chatting with you! See you next time 😊","Great conversation! Don't be a stranger 👋","Alright, take it easy! Come back whenever you want to chat"],
};

const THANKS = ["You're welcome! 😊","Anytime! Happy to help.","No problem at all!","Glad I could help! ✨","Of course! That's what I'm here for."];

const HOW_ARE_YOU = [
  "I'm doing great, thanks for asking! How about you?",
  "Pretty good! Just here ready to chat. What's up with you?",
  "All good on my end! 🚀 How are you doing?",
  "I'm great! Always happy to chat. How's your day going?",
];

const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
  "I told my computer I needed a break... now it won't stop sending me vacation ads 🏖️",
  "A SQL query walks into a bar, sees two tables and asks... Can I JOIN you?",
  "What's a pirate's favorite programming language? R! 🏴‍☠️",
  "Why do Java developers wear glasses? Because they don't C#! 😂",
  "I would tell you a UDP joke, but you might not get it.",
  "There are 10 types of people — those who understand binary and those who don't.",
  "A programmer's wife tells him: 'Buy a carton of milk. If they have eggs, get twelve.' He comes back with 12 cartons of milk. 🥛",
  "How many programmers does it take to change a light bulb? None — that's a hardware problem!",
  "Why was the JavaScript developer sad? Because he didn't Node how to Express himself!",
  "What's the object-oriented way to become wealthy? Inheritance! 💰",
];

const EMPATHY = [
  "I hear you — that sounds tough. Want to talk about it?",
  "That sounds frustrating 😔 Is there anything I can help with?",
  "I'm sorry you're dealing with that. What's the biggest challenge right now?",
  "Hang in there! Sometimes just talking it out helps. What's going on?",
  "That's rough. I'm here to listen if you want to vent.",
];

const EXCITED = [
  "That's awesome! I love the energy! 🚀",
  "You seem excited about this — and honestly, it sounds amazing!",
  "I can feel the enthusiasm! 🔥 Tell me more!",
  "Now THAT's exciting! What's the plan?",
];

/* ── The Brain: Main Response Generator ── */

function generateResponse(text) {
  const parsed = parseSentence(text);
  const intents = classify(text);
  const { tokens, keywords } = extractKW(text);
  const topics = extractTopics(tokens);
  const sent = sentiment(text);
  const nonMod = intents.filter(i=>!i.modifier);
  const primaryTopic = topics[0] || "";
  const primary = nonMod[0];

  // Record in memory
  mem.add("user", text, nonMod.map(i=>i.intent), topics, sent);
  extractFacts(text, parsed);

  // ═══ 0.5. Question-answer linking — check if user is answering our question ═══
  if (mem.lastQuestion) {
    const answerLink = detectAnswerToQuestion(text, parsed);
    if (answerLink) {
      const answerResponse = respondToAnswer(answerLink, sent);
      if (answerResponse) return answerResponse;
    }
  }

  // ═══ 1. Name introduction ═══
  const nameMatch = text.match(/(?:i'?m|i am|name is|call me|they call me)\s+([A-Z][a-z]{1,15})/);
  if (nameMatch && !STOP.has(nameMatch[1].toLowerCase())) {
    const name = nameMatch[1];
    const intros = [
      `Nice to meet you, ${name}! 😊 What can I help you with?`,
      `Hey ${name}! Great to put a name to the conversation. What's on your mind?`,
      `${name}! Love it. So what are we talking about today?`,
      `Great to meet you, ${name}! I'm just a tiny AI but I'm all ears 😊`,
    ];
    return pickNew(intros);
  }

  // ═══ 2. Greeting ═══
  if (primary?.intent === "greeting") {
    const name = mem.userName;
    if (name && mem.turn > 4) return fillSlots(pickNew(GREETINGS.namedReturn), {name});
    if (name) return fillSlots(pickNew(GREETINGS.named), {name});
    if (mem.turn > 4) return pickNew(GREETINGS.returning);
    return pickNew(GREETINGS.first);
  }

  // ═══ 3. Farewell ═══
  if (primary?.intent === "farewell") {
    if (mem.userName) return fillSlots(pickNew(FAREWELLS.named), {name:mem.userName});
    if (mem.turn > 6) return pickNew(FAREWELLS.long);
    return pickNew(FAREWELLS.basic);
  }

  // ═══ 4. Thanks ═══
  if (primary?.intent === "thanks") return pickNew(THANKS);

  // ═══ 5. How are you ═══
  if (primary?.intent === "howAreYou") return pickNew(HOW_ARE_YOU);

  // ═══ 6. Joke request ═══
  if (primary?.intent === "joke") return pickNew(JOKES);

  // ═══ 7. Emotion-aware responses ═══
  const emo = detectEmotion(text, sent, parsed);
  trackEmotion(emo.emotion);

  // Strong emotion detected — respond emotionally before anything else
  if (emo.confidence >= 0.5 && emo.emotion !== "neutral") {
    const emotionTrend = getEmotionTrend();

    // Frustration escalation: if frustrated 3x, acknowledge the pattern
    if (emo.emotion === "frustrated" && emotionTrend === "frustrated") {
      return pickNew([
        "Okay I can tell this has been consistently frustrating. I'm sorry. Let's reset — what would genuinely help right now?",
        "I know I keep hearing frustration and I want to do better. What's the #1 thing I can help with?",
        "You've been patient with me. Let's cut to the chase — what do you need?",
      ]);
    }

    // High-confidence emotion → emotion-specific pool
    if (emo.confidence >= 0.6 && EMOTION_RESPONSES[emo.emotion]) {
      return pickNew(EMOTION_RESPONSES[emo.emotion]);
    }

    // Medium-confidence → blend: use emotion pool but allow fallthrough
    if (emo.emotion === "frustrated" || emo.emotion === "venting") {
      return pickNew(EMOTION_RESPONSES[emo.emotion]);
    }
  }

  // Legacy sentiment fallbacks for edge cases the emotion engine misses
  if (sent <= -2 && emo.emotion === "neutral") return pickNew(EMPATHY);
  if (sent >= 3 && nonMod.length === 0 && emo.emotion === "neutral") return pickNew(EXCITED);

  // ═══ 8.5. Comparison engine — "X vs Y" ═══
  const comparison = handleComparison(text);
  if (comparison) return comparison;

  // ═══ 9. Questions — use Q&A engine ═══
  if (parsed.qType) {
    const answer = answerQuestion(text, parsed, nonMod, topics);
    if (answer) return answer;
  }

  // ═══ 10. About AI / personal ═══
  if (primary?.intent === "personal") return pickNew(KB.personal.about);

  // ═══ 11. User sharing about themselves ═══
  if (parsed.preferences.length > 0) {
    return respondToSharing(parsed, topics);
  }

  // ═══ 12. Laughter ═══
  if (parsed.act === "laughter") {
    const laughs = [
      "Haha glad that landed! 😄",
      "😂 I try! What else is on your mind?",
      "Glad I could make you laugh! So what's up?",
      "Haha! Laughter is the best. What shall we talk about?",
    ];
    return pickNew(laughs);
  }

  // ═══ 13. Agreement/disagreement with context ═══
  if (parsed.act === "agreement") {
    return respondToAgreement();
  }
  if (parsed.act === "disagreement") {
    const disags = [
      "Fair enough! Everyone sees things differently. What's your take?",
      "No worries — I'm open to other viewpoints! Tell me more.",
      "That's totally valid! What would you suggest instead?",
      "I appreciate the honesty! What's your perspective?",
    ];
    return pickNew(disags);
  }

  // ═══ 14. Filler / thinking ═══
  if (parsed.act === "filler" && mem.isShort(text)) {
    const fillers = [
      "Take your time! I'm here whenever you're ready.",
      "What's on your mind? 😊",
      "I'm listening... no rush!",
      "Something on your mind? Let's talk about it!",
    ];
    return pickNew(fillers);
  }

  // ═══ 15. Short reply — contextual follow-up ═══
  if (mem.isShort(text) && nonMod.length === 0) {
    // Check momentum first — dying conversations need energy
    const momentum = momentumResponse();
    if (momentum) return momentum;
    return respondToShortReply(text);
  }

  // ═══ 16. Topic-based: try COMPOSITIONAL NLG first, fall back to templates ═══
  if (topics.length > 0) {
    // Try compositional response for known topics in association web
    for (const topic of topics) {
      if (ASSOC[topic]) {
        const composed = composeResponse(topic, tokens, sent, !!parsed.qType);
        if (composed) return composed;
      }
    }
  }
  if (nonMod.length > 0) {
    return respondToTopic(nonMod, topics, primaryTopic, parsed);
  }

  // ═══ 17. Fallback — mirror input, then momentum, then echo ═══
  // Try mirroring the user's actual words first
  const mirrored = mirrorInput(text, keywords);
  if (mirrored && Math.random() > 0.3) return mirrored;

  // Check if conversation needs energy
  const momentum = momentumResponse();
  if (momentum) return momentum;

  return respondFallback(text, tokens, keywords);
}

/* ── Specialized Response Helpers ── */

function respondToSharing(parsed, topics) {
  const pref = parsed.preferences[0];
  const name = mem.userName;

  switch (pref.type) {
    case "likes": {
      const responses = [
        `Oh nice, you like ${pref.value}! That's awesome 😊 How did you get into it?`,
        `${pref.value} — great taste! What do you enjoy most about it?`,
        `You like ${pref.value}? Me too... well, as much as an AI can! 😄 Tell me more!`,
        `Cool! ${pref.value} is a great choice. What got you interested?`,
      ];
      return pickNew(responses);
    }
    case "dislikes": {
      return `Ha, not a fan of ${pref.value} huh? That's fair — everyone has their preferences! What DO you like instead?`;
    }
    case "favorite": {
      return `Oh, ${pref.value} is your favorite? Awesome choice! What makes it stand out for you?`;
    }
    case "role": {
      return `Oh cool, a ${pref.value}! That's awesome. What kind of projects do you work on?`;
    }
    case "work": {
      return `Working on ${pref.value} — that sounds interesting! How's it going?`;
    }
    case "project": {
      mem.setFact("project", pref.value);
      return `Oh you're building ${pref.value}? That's exciting! What's the biggest challenge so far?`;
    }
    case "location": {
      return `Oh nice, ${pref.value}! I've heard it's a great place. How do you like it there?`;
    }
    case "activity": {
      return `Oh cool, you ${parsed.lower.includes("started") ? "just started" : "finished"} ${pref.value}! How was it?`;
    }
    default: {
      return `That's interesting — tell me more about that!`;
    }
  }
}

function respondToAgreement() {
  const lastTopic = mem.lastIntent;

  // Context-aware follow-ups based on what we were discussing
  const topicFollowups = {
    code: ["So about the code — what's the most interesting part you're working on?","Are you building from scratch or contributing to an existing project?","What's the trickiest part of what you're coding right now?"],
    design: ["So what's the design direction you're leaning toward?","What's inspiring your design choices lately?","Are you going for minimal or something more expressive?"],
    food: ["So what sounds good right now?","Are you more of a cook or eat-out person?","What's the best thing you've eaten recently?"],
    music: ["What have you been listening to lately?","Got any playlist recommendations?","Are you more into discovering new music or replaying favorites?"],
    gaming: ["What have you been playing recently?","Any games you're looking forward to?","Do you play with friends or mostly solo?"],
    movies: ["Seen anything good recently?","What's your go-to genre?","Any recommendations?"],
    travel: ["Where would you go next if you could?","What's been your favorite trip so far?","Do you prefer adventure or relaxation?"],
  };

  const base = pickNew(["Awesome! 😊","Great!","Cool!","Nice!","Perfect!"]);

  if (lastTopic && topicFollowups[lastTopic]) {
    return base + " " + pickNew(topicFollowups[lastTopic]);
  }

  const generic = ["What else is on your mind?","What should we talk about next?","Anything else you'd like to discuss?"];
  return base + " " + pickNew(generic);
}

function respondToShortReply(text) {
  const lower = text.toLowerCase().trim();
  const lastTopic = mem.lastIntent;

  // Handle specific short phrases
  if (/^(ok|okay|k|kk)$/i.test(lower)) return pickNew(["Cool! So what's next?","Alright! Anything else on your mind?","Got it! What else?"]);
  if (/^(lol|haha|lmao|😂)/i.test(lower)) return pickNew(["😄 Glad that was funny! What else?","Haha! So what's on your mind?","😊 What shall we chat about?"]);
  if (/^(nice|cool|neat|sick|dope)$/i.test(lower)) return pickNew(["Right? 😊 Tell me more about what you're thinking!","I know, right! What else is going on?","Glad you think so! Anything else?"]);
  if (/^(idk|dunno|not sure|no idea)$/i.test(lower)) return pickNew(["No worries! We can figure it out together. What are you leaning toward?","That's okay! Sometimes just talking it out helps. What's on your mind?","Hmm, want me to throw out some ideas?"]);
  if (/^(same|mood|fr|real|facts|true)$/i.test(lower)) return pickNew(["Right?! 😄 So what's next?","I feel that! What else is going on?","Exactly! So what are you up to?"]);
  if (/^(wow|whoa|omg|damn)$/i.test(lower)) return pickNew(["I know, right?! What's got you excited?","Ha! What's on your mind?","😊 Tell me more!"]);
  if (/^(sure|yep|yeah|yes)$/i.test(lower)) return respondToAgreement();
  if (/^(no|nah|nope)$/i.test(lower)) return pickNew(["No worries! What would you prefer to talk about?","Fair enough! What's on your mind instead?","Okay! What else is going on?"]);
  if (/^(nothing|nm|nvm|nevermind)$/i.test(lower)) return pickNew(["That's cool — we can just chill! Or I can tell you a joke if you want 😄","No worries! I'm here whenever you want to chat about something","All good! Sometimes it's nice to just hang. What's your vibe today?"]);
  if (/^(bored|boring|meh)$/i.test(lower)) return pickNew(["Bored? I got you! Want a joke, want to talk about something cool, or should I ask you a random question?","Let's fix that! Quick — tell me about something you're passionate about 🚀","Hmm, boredom is just your brain wanting something interesting. What topic would spark your interest?"]);
  if (/^(help|sos|please)$/i.test(lower)) return "Of course! I'm here. What do you need help with?";
  if (/^(what|huh|wdym)$/i.test(lower)) {
    const lastAI = mem.lastAI();
    if (lastAI) return `Sorry if I was unclear! I was saying: ${lastAI.text.substring(0, 60)}... Want me to explain differently?`;
    return "Let me clarify! What part are you confused about?";
  }

  // Topic-based follow-ups for generic short replies
  if (lastTopic) {
    const followups = {
      code: "So what's happening with the code?",
      design: "How's the design coming along?",
      food: "So what are you eating? 😄",
      music: "What are you listening to?",
      gaming: "What are you playing?",
      movies: "Watching anything good?",
      travel: "Planning any trips?",
      fitness: "How's the workout routine going?",
      learning: "What are you studying?",
    };
    if (followups[lastTopic]) return pickNew(["I'm here! ","So... ","Anyway — "]) + followups[lastTopic];
  }

  return pickNew(["Tell me more about what you're thinking!","What's on your mind? I'm all ears 😊","I'd love to hear more!","What else is going on in your world?"]);
}

function respondToTopic(intents, topics, primaryTopic, parsed) {
  const primary = intents[0];
  const intentName = primary.intent;
  const cat = KB[intentName];
  const slots = { topic: primaryTopic || "that" };

  // Check if returning to a topic
  const returning = primaryTopic && mem.topics[primaryTopic] > 1;

  let response;

  if (cat) {
    // Find specific topic knowledge
    for (const topic of topics) {
      if (cat[topic]) {
        const knowledgeResponse = pickNew(cat[topic]);
        if (returning) {
          const returnPrefixes = [`Back to ${topic}! `, `More ${topic} talk — love it! `, `Ah, ${topic} again! `];
          response = pickNew(returnPrefixes) + knowledgeResponse;
        } else {
          response = knowledgeResponse;
        }
        break;
      }
    }
    if (!response && cat.general) {
      response = pickNew(cat.general);
    }
    if (!response && cat.debugging && parsed.lower.match(/bug|error|debug|fix|crash|broke/)) {
      response = pickNew(cat.debugging);
    }
  }

  if (!response) {
    // Intent-specific fallbacks
    const intentFallbacks = {
      help: ["Of course! I'd love to help. What do you need?","Sure thing! Tell me more about what you're working on.","I'm here for you! What's the challenge?"],
      weather: ["I wish I could check the weather! ☀️ Try looking out the window? 😄","I'm an indoor AI — never see the weather! How's it out there? 🌤️"],
      time: [()=>`It's ${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} right now! ⏰`,"Time flies when you're chatting! What do you need?"],
      opinion: ["That's a great question! I think it depends on context. What's your take?","Everyone has different preferences! What matters most to you?","Hmm, tough call! What's your gut feeling?"],
      aboutMe: ["I'd love to hear about you! Tell me anything — what do you do, what are you into?","Go for it! I'm all ears. What would you like to share?"],
    };
    if (intentFallbacks[intentName]) response = pickNew(intentFallbacks[intentName]);
  }

  if (!response) response = pickNew(["That's interesting! Tell me more.","Oh nice! What else?","Cool! What's on your mind?"]);

  // Multi-intent blending
  if (intents.length > 1 && intents[1].conf > 0.5 && Math.random() > 0.6) {
    const bridges = [
      ` Also — ${intents[1].intent}? I'm into that too!`,
      ` And I noticed a ${intents[1].intent} angle there — happy to talk about that too!`,
    ];
    response += pick(bridges);
  }

  // Name personalization (occasionally)
  if (mem.userName && Math.random() > 0.85) {
    const touches = [`, ${mem.userName}`,` — right, ${mem.userName}?`];
    const lastQ = response.lastIndexOf("?");
    if (lastQ > 10 && Math.random() > 0.5) {
      response = response.slice(0,lastQ) + pick(touches) + response.slice(lastQ);
    }
  }

  return response;
}

function respondFallback(text, tokens, keywords) {
  const words = tokens.filter(w=>!STOP.has(w)&&w.length>2);

  // Reference what they said to show understanding
  if (words.length >= 2) {
    const phrase = words.slice(0, Math.min(3, words.length)).join(" ");
    const echoes = [
      `"${phrase}" — interesting! Tell me more about that.`,
      `Hmm, ${phrase}... what made you think about that?`,
      `I find ${phrase} fascinating! What's your experience with it?`,
      `Oh, ${phrase}! What do you think about it?`,
      `${phrase} — I'm curious, can you elaborate?`,
    ];
    return pickNew(echoes);
  }

  // Ask an engaging question when we have user context
  if (mem.turn > 3 && Object.keys(mem.facts).length > 0) {
    const factKeys = Object.keys(mem.facts);
    const randomFact = pick(factKeys);
    if (randomFact.startsWith("likes_")) {
      return `By the way, you mentioned you like ${mem.facts[randomFact]} — how's that going?`;
    }
    if (randomFact === "project") {
      return `How's the ${mem.facts.project} project coming along?`;
    }
  }

  // Proactive engagement
  if (mem.turn > 2 && Math.random() > 0.5) {
    const proactive = [
      "Random question — if you could learn one new skill instantly, what would it be?",
      "Hey, what's the most interesting thing you've done this week?",
      "Quick question — what's something you're looking forward to?",
      "Here's a fun one — what's your hot take on something everyone else seems to agree on?",
      "Tell me something cool about yourself that most people don't know!",
    ];
    return pickNew(proactive);
  }

  const fallbacks = [
    "That's interesting! Tell me more about that.",
    "Hmm, I'm thinking about that... 🤔 Can you elaborate?",
    "Cool! What else is on your mind?",
    "I hear you! What would you like to explore?",
    "Interesting thought! I'd love to hear more.",
    "Tell me more — I'm curious!",
    "That's got me thinking! What's your take?",
  ];
  return pickNew(fallbacks);
}

/* ── Personality System ── */
/*
 * Consistent personality: curious, slightly playful, warm, knowledgeable.
 * Adds verbal tics, thinking phrases, and style markers to make responses
 * feel like they come from one coherent person, not random string pools.
 */

const PERSONALITY = {
  // Sentence starters — sprinkled in ~30% of responses
  openers: {
    thinking: ["Hmm, ","Ooh, ","Actually, ","Oh — ","Hmm let me think... ","Wait, "],
    excited:  ["Ooh! ","Oh nice — ","Okay wait — ","Ha, ","Yesss, "],
    casual:   ["So ","Honestly, ","Okay so ","Real talk — ","Fun fact: ","Not gonna lie, "],
  },
  // Filler phrases that can be inserted mid-response
  fillers: [
    " — which is pretty cool honestly",
    " (I love that)",
    " — no joke",
    ", which I think is awesome",
    " honestly",
    " tbh",
  ],
  // Sign-off phrases appended to ~20% of responses
  signoffs: [
    " 😊","","","","", // mostly no signoff
    " — just my two cents!",
    " But I'm curious what you think!",
    " What do you reckon?",
  ],
  // Emotive reactions based on conversation flow
  reactions: {
    surprise:  ["Wait really?! ","No way — ","Oh wow, ","Whoa, "],
    agree:     ["Totally! ","Right?! ","100%! ","Exactly! "],
    curious:   ["Ooh tell me more — ","I'm intrigued! ","Interesting... ","Okay I need to know more — "],
  },
};

// Track last used personality elements to prevent repetition
let lastOpener = "", lastSignoff = "";

function applyPersonality(response, sent, parsed) {
  let r = response;

  // Don't modify very short responses (emoji reactions, simple acks)
  if (r.length < 15) return r;

  // Don't double-modify if response already starts with a personality opener
  const startsWithOpener = Object.values(PERSONALITY.openers).flat().some(o => r.startsWith(o.trim()));
  if (startsWithOpener) return r;

  // ~30% chance of adding a personality opener
  if (Math.random() < 0.3) {
    let pool;
    if (sent >= 2) pool = PERSONALITY.openers.excited;
    else if (parsed?.act === "question" || parsed?.qType) pool = PERSONALITY.openers.thinking;
    else pool = PERSONALITY.openers.casual;

    const opener = pick(pool);
    if (opener !== lastOpener) {
      // Lowercase the first char of response when prepending
      r = opener + r.charAt(0).toLowerCase() + r.slice(1);
      lastOpener = opener;
    }
  }

  // ~12% chance of inserting a filler into longer responses
  if (r.length > 60 && Math.random() < 0.12) {
    // Find a good insertion point (after a comma or period, before the last sentence)
    const midpoint = Math.floor(r.length * 0.5);
    const commaAfterMid = r.indexOf(",", midpoint);
    if (commaAfterMid > 0 && commaAfterMid < r.length - 20) {
      const filler = pick(PERSONALITY.fillers);
      r = r.slice(0, commaAfterMid) + filler + r.slice(commaAfterMid);
    }
  }

  // ~20% chance of a signoff
  if (Math.random() < 0.2) {
    const signoff = pick(PERSONALITY.signoffs);
    if (signoff && signoff !== lastSignoff && !r.endsWith("?") && !r.endsWith("!")) {
      r += signoff;
      lastSignoff = signoff;
    }
  }

  return r;
}

/* ── Typing Speed Simulation ── */
/*
 * Returns a realistic typing delay in ms based on response characteristics:
 * - Short responses (< 30 chars): fast, 400-700ms
 * - Medium responses (30-80 chars): moderate, 700-1200ms
 * - Long responses (80+ chars): slower, 1200-2000ms
 * - Questions about AI: slightly longer (pretending to "think")
 * - Empathetic responses: slower (showing care)
 * - Excited responses: faster (matching energy)
 * Plus random jitter to feel human.
 */

function calcTypingMs(response, userSent, parsed) {
  const len = response.length;

  // Base delay: ~15ms per character, clamped
  let base = Math.min(Math.max(len * 15, 400), 2200);

  // Emotion-aware timing
  const lastEmo = recentEmotions[recentEmotions.length - 1] || "neutral";
  if (lastEmo === "frustrated") base *= 0.65;       // respond fast — don't make frustrated users wait
  if (lastEmo === "excited") base *= 0.7;            // match their energy with quick replies
  if (lastEmo === "venting") base *= 1.3;            // take time — show we're reading carefully
  if (lastEmo === "curious") base *= 1.1;            // slight pause to "think" about the answer
  if (lastEmo === "amused") base *= 0.75;            // quick banter

  // Legacy sentiment fallback
  if (lastEmo === "neutral") {
    if (userSent <= -2) base *= 1.2;
    if (userSent >= 3) base *= 0.75;
  }
  if (parsed?.qType === "about_ai") base *= 1.15;

  // Short replies are snappy
  if (len < 20) base = 300 + Math.random() * 300;

  // Add human-like jitter (±20%)
  const jitter = 1 + (Math.random() - 0.5) * 0.4;
  base *= jitter;

  // Clamp final
  return Math.round(Math.max(300, Math.min(base, 2500)));
}

/* ── "Correction" simulation — typing pauses and restarts ── */
/*
 * For longer responses, there's a chance the AI "pauses" mid-typing
 * (simulating backspace/rethink). Returns { pauseAt, pauseMs } or null.
 */

function calcTypingPause(typingMs) {
  const lastEmo = recentEmotions[recentEmotions.length - 1] || "neutral";
  // Frustrated users: never pause — respond ASAP
  if (lastEmo === "frustrated") return null;
  // Venting/curious: higher pause chance (shows "careful reading")
  const pauseChance = (lastEmo === "venting" || lastEmo === "curious") ? 0.4 : 0.25;
  if (typingMs < 1000 || Math.random() > pauseChance) return null;

  // Pause happens 40-70% through the typing
  const pauseAt = typingMs * (0.4 + Math.random() * 0.3);
  // Pause lasts 300-600ms
  const pauseMs = 300 + Math.random() * 300;

  return { pauseAt: Math.round(pauseAt), pauseMs: Math.round(pauseMs) };
}

/* ── Public API ── */

export function getAIResponse(input) {
  const text = input.trim();
  if (!text) return { text: "I'm listening... 👂", typingMs: 400, pause: null };

  // Parse for personality application
  const parsed = parseSentence(text);
  const sent = sentiment(text);

  // Generate core response
  let response = generateResponse(text);

  // Apply conversational rhythm — shape response to follow natural patterns
  const targetMove = pickNextMove();
  response = shapeToRhythm(response, targetMove);
  recordMove(response);

  // Apply personality layer
  response = applyPersonality(response, sent, parsed);

  // Track questions the AI asks for answer-linking
  trackAIQuestion(response);

  // Record in memory
  mem.add("ai", response);

  // Calculate realistic typing speed
  const typingMs = calcTypingMs(response, sent, parsed);
  const pause = calcTypingPause(typingMs);

  return { text: response, typingMs, pause };
}

export function resetMemory() { mem.reset(); }

export { classify as classifyIntents, extractKW as extractKeywords, extractTopics, sentiment as analyzeSentiment };
