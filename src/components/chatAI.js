/* ═══════════════════════════════════════════════════════════════════
   Tasteprint SLM — Small Language Model (client-side, zero dependencies)
   Round 51: Response architecture variation
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

/* ── Subtext Detection Engine ── */
/*
 * Reads between the lines: detects what users MEAN vs what they SAY.
 * Hedging ("I guess"), false agreement ("sure whatever"), understated
 * praise ("not bad"), passive aggression ("fine."), reluctance, etc.
 * Returns a subtext object that modifies how the AI responds.
 */

const SUBTEXT_PATTERNS = {
  hedging: {
    patterns: [
      /\b(i guess|i suppose|kind of|sort of|kinda|sorta|maybe|perhaps|i think so|if you say so)\b/i,
      /\b(not sure|not really|not exactly|i mean|well\.{2,})\b/i,
      /\b(could be|might be|possibly|arguably|in a way)\b/i,
    ],
    meaning: "uncertain",
    valence: -0.3,
  },
  reluctantAgreement: {
    patterns: [
      /\b(sure|okay|fine|alright|whatever|if you (say|think) so)\b.*$/i,
      /^(sure|okay|fine|alright|yeah sure|ok then|i guess so)\s*[.…]*$/i,
      /\b(i (mean|guess) (it's |that's )?(fine|okay|alright|whatever))\b/i,
    ],
    meaning: "reluctant",
    valence: -0.5,
  },
  passiveAggressive: {
    patterns: [
      /^(fine|okay|cool|great|nice|wonderful|perfect|awesome)\s*\.+$/i,
      /\b(no,?\s*(it's |that's )?(fine|okay)|never\s*mind|forget it|don't worry about it)\b/i,
      /\b(do what(ever)? you want|it('s| is) not like|i didn't (say|ask))\b/i,
      /\b(clearly|obviously|apparently)\b/i,
    ],
    meaning: "passiveAggressive",
    valence: -0.7,
  },
  understatedPraise: {
    patterns: [
      /\b(not bad|not terrible|could be worse|decent|alright actually|fair enough)\b/i,
      /\b(that('s| is) actually (pretty |quite )?(good|nice|cool|helpful))\b/i,
      /\b(huh,? (that's |that |)(actually |)(works|makes sense|interesting|cool))\b/i,
      /\b(i('ll| will) (admit|give you that))\b/i,
    ],
    meaning: "impressed",
    valence: 0.4,
  },
  dismissive: {
    patterns: [
      /^(ok|k|sure|mhm|uh huh|right|yep|yup|yeah)\s*$/i,
      /\b(doesn't matter|who cares|not really|don't care|meh|idc)\b/i,
      /\b(anyways?|anyway|moving on|so anyway|next)\b/i,
    ],
    meaning: "disengaged",
    valence: -0.4,
  },
  enthusiasm: {
    patterns: [
      /\b(wait (really|what|actually)|no way|oh my (god|gosh)|seriously\?!)\b/i,
      /\b(that's (so |really |actually )?(amazing|awesome|incredible|insane|wild))\b/i,
      /\b(i (need|have) to (try|check|see|do) (this|that))\b/i,
      /\b(tell me (more|everything)|i('m| am) (so |)(hooked|sold|in|interested|obsessed))\b/i,
    ],
    meaning: "genuinelyExcited",
    valence: 0.8,
  },
  deflection: {
    patterns: [
      /\b(i (don't|do not) (want to |wanna )?(talk|think|discuss) about (it|that|this))\b/i,
      /\b(can we (just |)(change|move on|talk about|skip))\b/i,
      /\b(let's (just |)(move on|change|not|drop))\b/i,
      /\b(that's (not |)what i (meant|asked|said))\b/i,
    ],
    meaning: "avoidant",
    valence: -0.3,
  },
  selfDeprecating: {
    patterns: [
      /\b(i('m| am) (so |)(bad|terrible|stupid|dumb|hopeless|lost|clueless) at)\b/i,
      /\b(i (probably |)(shouldn't have|messed up|screwed up|broke it))\b/i,
      /\b(i have no (idea|clue)|i('m| am) an idiot|my brain)\b/i,
    ],
    meaning: "seekingReassurance",
    valence: -0.2,
  },
  fishing: {
    patterns: [
      /\b(do you (even |)(like|enjoy) (talking|chatting) (to|with) me)\b/i,
      /\b(am i (being |)(annoying|boring|weird|too much))\b/i,
      /\b(you (probably |)(don't|do not) (even |)(care|remember))\b/i,
      /\b(i bet you (say|tell) that to everyone)\b/i,
    ],
    meaning: "seekingValidation",
    valence: -0.2,
  },
};

// Sentence-ending cues that modify interpretation
const PUNCTUATION_SUBTEXT = {
  "...": { modifier: "trailing", weight: 0.3 },      // trailing off = uncertainty or passive
  ".": { modifier: "curt", weight: 0.2 },             // single sentence + period = curt
  "!": { modifier: "emphatic", weight: 0.1 },
};

function detectSubtext(text, sent) {
  const lower = text.toLowerCase().trim();
  const detected = [];
  let totalValence = 0;

  // Check each subtext pattern
  for (const [type, config] of Object.entries(SUBTEXT_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(lower)) {
        detected.push({ type, meaning: config.meaning, valence: config.valence });
        totalValence += config.valence;
        break; // one match per type
      }
    }
  }

  // Punctuation-based cues
  const trimmed = text.trim();
  if (trimmed.endsWith("...") || trimmed.endsWith("…")) {
    detected.push({ type: "trailingOff", meaning: "uncertain", valence: -0.15 });
  } else if (/^[^!?]{4,30}\.$/.test(trimmed) && sent <= 0) {
    // Short statement ending in period + non-positive sentiment = curt
    detected.push({ type: "curtResponse", meaning: "curt", valence: -0.2 });
  }

  // Contradiction detection: positive words + negative signals
  if (sent > 0 && detected.some(d => d.valence < -0.3)) {
    detected.push({ type: "contradiction", meaning: "sayingOneThingMeaningAnother", valence: -0.4 });
  }

  // "Interesting" without elaboration is often underwhelmed
  if (/^(that's |)(interesting|neat|cool)\s*[.…]*$/i.test(lower)) {
    detected.push({ type: "underwhelmed", meaning: "politelyBored", valence: -0.3 });
  }

  // Compute primary subtext
  const primary = detected.length > 0
    ? detected.reduce((a, b) => Math.abs(b.valence) > Math.abs(a.valence) ? b : a)
    : null;

  return {
    detected,
    primary,
    totalValence,
    hasSubtext: detected.length > 0,
    isCongruent: !detected.some(d => d.type === "contradiction"),
  };
}

// Subtext-aware response adjustments
const SUBTEXT_RESPONSES = {
  reluctant: [
    "I'm getting a 'not fully sold' vibe — what would actually work better for you?",
    "You don't sound super convinced. What's your gut telling you?",
    "I sense some hesitation — want to explore other options?",
    "Hmm, I feel like there's a 'but' coming. What's on your mind?",
  ],
  passiveAggressive: [
    "Okay, I think I might have missed the mark there. What were you actually looking for?",
    "I'm picking up that something's off — want to reset? What do you actually need?",
    "Fair enough. Let me try a different approach. What would be more helpful?",
    "I feel like we might be talking past each other. Can we start fresh on this?",
  ],
  impressed: [
    "I'll take that as high praise coming from you 😊",
    "Coming from someone who doesn't throw compliments around easily — thanks! 😄",
    "Haha, I think that's the closest to a compliment I'm getting — I'll take it! 😊",
    "See? I have my moments! What else can I surprise you with?",
  ],
  disengaged: [
    "Hmm, I feel like I might be boring you. What would you actually want to talk about?",
    "I sense the vibe shifting — should we switch topics? What sounds interesting?",
    "Fair, I'll stop rambling about that. What's on your mind instead?",
  ],
  genuinelyExcited: [
    "Your excitement is making MY circuits happy! 😄 Tell me more!",
    "I love when something genuinely clicks! What's got you so fired up?",
    "THIS is the energy! Let's ride this wave — what else do you want to know?",
  ],
  avoidant: [
    "Totally fair, we don't have to go there. What would you rather talk about?",
    "Noted — topic changed! What else is on your mind?",
    "No problem at all. Let's shift gears. What sounds good?",
  ],
  seekingReassurance: [
    "Hey, don't be so hard on yourself — everyone starts somewhere! What specifically are you stuck on?",
    "Trust me, asking questions means you're on the right track. What part is confusing?",
    "Nah, you're doing better than you think! Let's break it down together.",
    "The fact that you're trying already puts you ahead. What can I help with?",
  ],
  seekingValidation: [
    "Are you kidding? I genuinely enjoy our conversations! What made you think otherwise?",
    "Hey — you're literally making my day more interesting. Don't sell yourself short!",
    "I'm a tiny AI that gets excited about good conversation, and you're bringing it 😊",
    "Absolutely not annoying! I'm here because I want to be. What's up?",
  ],
  uncertain: [
    "Sounds like you're not 100% sure — want to think it through together?",
    "I hear some uncertainty. What's making you hesitate?",
    "No need to commit — let's explore the options first.",
  ],
  politelyBored: [
    "I feel like 'interesting' is doing a lot of heavy lifting there 😄 What would you ACTUALLY want to talk about?",
    "That's 'polite interesting' isn't it? 😄 Tell me what would genuinely grab your attention.",
    "I can feel the enthusiasm radiating through the screen 😄 Seriously though, what topics light you up?",
  ],
  sayingOneThingMeaningAnother: [
    "Your words say yes but something tells me you're not fully feeling it. What's up?",
    "I'm getting mixed signals here — what do you actually think?",
    "Hmm, I sense there's more to it than that. Want to be straight with me?",
  ],
  curt: [
    "Short and sweet! Anything else on your mind or should I pick a topic?",
  ],
};

function getSubtextResponse(subtext) {
  if (!subtext.primary) return null;
  const pool = SUBTEXT_RESPONSES[subtext.primary.meaning];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Track subtext history for pattern detection
let subtextHistory = [];
const MAX_SUBTEXT_HISTORY = 8;

function trackSubtext(subtext) {
  if (subtext.hasSubtext) {
    subtextHistory.push({ meaning: subtext.primary?.meaning, valence: subtext.totalValence, turn: mem?.turn || 0 });
    if (subtextHistory.length > MAX_SUBTEXT_HISTORY) subtextHistory.shift();
  }
}

function getSubtextTrend() {
  if (subtextHistory.length < 2) return "stable";
  const recent = subtextHistory.slice(-3);
  const avgValence = recent.reduce((s, h) => s + h.valence, 0) / recent.length;
  if (avgValence < -0.4) return "withdrawing";   // user is pulling away
  if (avgValence > 0.3) return "warming";          // user is opening up
  // Check for repeated disengagement
  const disengagedCount = recent.filter(h => h.meaning === "disengaged" || h.meaning === "reluctant").length;
  if (disengagedCount >= 2) return "losing_interest";
  return "stable";
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

/* ── Temporal Awareness & Session Context ──
 * Tracks time-of-day, day-of-week, session duration, and message pacing.
 * Provides contextual time references that make the AI feel present
 * in the same moment as the user.
 */

let sessionStartTime = Date.now();
let lastMessageTime = Date.now();

function getTimeContext() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0=Sun
  const mins = now.getMinutes();

  // Time of day
  let period, greeting, mood;
  if (hour >= 5 && hour < 12) {
    period = "morning"; greeting = "Good morning"; mood = "fresh";
  } else if (hour >= 12 && hour < 17) {
    period = "afternoon"; greeting = "Good afternoon"; mood = "active";
  } else if (hour >= 17 && hour < 21) {
    period = "evening"; greeting = "Good evening"; mood = "winding_down";
  } else {
    period = "night"; greeting = "Hey night owl"; mood = "late";
  }

  // Day context
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayName = dayNames[day];
  const isWeekend = day === 0 || day === 6;
  const isFriday = day === 5;
  const isMonday = day === 1;

  // Session duration
  const sessionMs = Date.now() - sessionStartTime;
  const sessionMins = Math.floor(sessionMs / 60000);

  // Message pacing (time since last message)
  const sinceLast = Date.now() - lastMessageTime;
  const paceSeconds = Math.floor(sinceLast / 1000);
  lastMessageTime = Date.now();

  return { hour, mins, period, greeting, mood, dayName, isWeekend, isFriday, isMonday, sessionMins, paceSeconds };
}

// Time-aware greeting enhancers
function timeGreeting() {
  const t = getTimeContext();

  // Late night (after 11pm or before 5am)
  if (t.period === "night") {
    return pick([
      `Hey night owl! 🌙 Still up at this hour?`,
      `Burning the midnight oil? What's keeping you up?`,
      `Late night vibes! What's on your mind?`,
      `Hey! The late hours are when the best ideas happen 🌙`,
    ]);
  }

  // Early morning (5-8am)
  if (t.period === "morning" && t.hour < 8) {
    return pick([
      `${t.greeting}! ☀️ Early bird! What's on the agenda today?`,
      `Rise and shine! What are you working on this fine ${t.dayName}?`,
      `${t.greeting}! You're up early — productive mode?`,
    ]);
  }

  // Regular morning
  if (t.period === "morning") {
    return pick([
      `${t.greeting}! ☀️ How's the day starting out?`,
      `${t.greeting}! What's on your plate today?`,
      `Hey! Good ${t.dayName} morning! What's up?`,
    ]);
  }

  // Friday special
  if (t.isFriday) {
    return pick([
      `Happy Friday! 🎉 Any fun plans for the weekend?`,
      `TGIF! What's good?`,
      `Friday vibes! How's the week been?`,
    ]);
  }

  // Monday
  if (t.isMonday) {
    return pick([
      `Happy Monday! Fresh start to the week — what's up?`,
      `Monday energy! ☕ How's the week kicking off?`,
    ]);
  }

  // Weekend
  if (t.isWeekend) {
    return pick([
      `Hey! Enjoying the ${t.dayName}? What's going on?`,
      `${t.dayName} vibes! Relaxing or being productive? 😊`,
      `Happy ${t.dayName}! What brings you here?`,
    ]);
  }

  // Default afternoon/evening
  if (t.period === "afternoon") {
    return pick([
      `${t.greeting}! How's the day going so far?`,
      `Hey! Afternoon check-in — what's on your mind?`,
    ]);
  }

  return pick([
    `${t.greeting}! 😊 How's your ${t.dayName} going?`,
    `Hey! Nice ${t.dayName} ${t.period}. What's up?`,
  ]);
}

// Time-aware farewell enhancers
function timeFarewell() {
  const t = getTimeContext();

  if (t.period === "night") {
    return pick([
      "Get some rest! 🌙 See you next time.",
      "Sweet dreams! Don't stay up too late 😊",
      "Night! Sleep well when you do ✨",
    ]);
  }
  if (t.period === "evening") {
    return pick([
      "Have a great evening! ✌️",
      "Enjoy the rest of your night!",
    ]);
  }
  if (t.isWeekend) {
    return pick([
      "Enjoy the rest of your weekend! 🎉",
      "Have an awesome " + t.dayName + "!",
    ]);
  }
  if (t.isFriday) {
    return pick([
      "Have an amazing weekend! 🎉",
      "TGIF! Enjoy your weekend ✌️",
    ]);
  }
  return null; // fall through to default farewell
}

// Session-duration observations (sprinkled into responses occasionally)
function sessionObservation() {
  const t = getTimeContext();
  if (t.sessionMins < 3) return null;

  if (t.sessionMins >= 30 && Math.random() > 0.7) {
    return pick([
      "We've been chatting for a while — I'm enjoying this!",
      "Half an hour of great conversation! You're fun to talk to 😊",
      "Time flies! We've been at this for " + t.sessionMins + " minutes.",
    ]);
  }
  if (t.sessionMins >= 15 && Math.random() > 0.8) {
    return pick([
      "This has been a good conversation so far!",
      "We've covered a lot of ground! What else is on your mind?",
    ]);
  }
  return null;
}

// Pace observation — if user comes back after a long pause
function paceObservation() {
  const t = getTimeContext();

  // Long pause (> 2 min) — they might have been away
  if (t.paceSeconds > 120 && mem.turn > 3) {
    return pick([
      "Welcome back! 😊 ",
      "Hey, you're back! ",
      "Oh hi again! ",
    ]);
  }
  // Very rapid fire (< 2 sec) — they're engaged
  if (t.paceSeconds < 2 && mem.turn > 5 && Math.random() > 0.85) {
    return pick([
      "You're quick! ",
      "Rapid-fire mode! ",
    ]);
  }
  return null;
}

// Add time flavor to any response (occasional, not every turn)
function addTimeFlavor(response) {
  if (mem.turn < 4) return response;
  const t = getTimeContext();

  // Very occasional time references (~8% of responses)
  if (Math.random() > 0.92) {
    if (t.period === "night" && t.hour >= 23) {
      const lateNight = pick([
        " (Side note: don't forget to sleep!)",
        " Late night productivity is real though 🌙",
      ]);
      return response + lateNight;
    }
    if (t.period === "morning" && t.hour < 9 && t.isWeekend) {
      return response + pick([" Weekend morning energy! ☕", ""]);
    }
    if (t.isFriday && t.hour >= 16) {
      return response + pick([" Almost weekend! 🎉", ""]);
    }
  }

  // Session observations (~5% chance after 10+ mins)
  if (Math.random() > 0.95 && t.sessionMins >= 10) {
    const obs = sessionObservation();
    if (obs) return response + " " + obs;
  }

  return response;
}

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
  joke:        { kw: {joke:4,funny:2.5,laugh:2.5,humor:3,hilarious:2,pun:3,riddle:4,brainteaser:3,funfact:3,fact:1.5,hypothetical:3,scenario:2}, th:2.5 },
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

/* ── Deep Knowledge: Explainers ──
 * Structured explanations for common "what is X?" and "how does X work?"
 * questions. Each entry has: brief (one-liner), deep (2-3 sentence explanation),
 * and hook (follow-up question). The response generator picks based on
 * conversation context — brief for casual, deep for genuine curiosity.
 */
const EXPLAIN = {
  // ─── Languages & Frameworks ───
  react:       { brief:"React is a JavaScript library for building user interfaces with reusable components.",
                 deep:"React uses a virtual DOM to efficiently update only what changes, and its component model lets you break UI into small, reusable pieces. Hooks (like useState and useEffect) let you manage state and side effects without class components. It's maintained by Meta and powers Facebook, Instagram, and tons of other apps.",
                 hook:"Are you building something with React right now?" },
  vue:         { brief:"Vue is a progressive JavaScript framework for building UIs — it's designed to be incrementally adoptable.",
                 deep:"Vue's reactivity system automatically tracks dependencies and updates the DOM when data changes. Single-file components (.vue files) keep template, script, and styles together. The Composition API (Vue 3) gives you React-hooks-like flexibility while keeping Vue's gentle learning curve.",
                 hook:"What made you curious about Vue?" },
  angular:     { brief:"Angular is a full-featured TypeScript framework by Google for building enterprise web applications.",
                 deep:"Angular is opinionated — it comes with routing, forms, HTTP, and dependency injection built in. It uses two-way data binding and a component architecture. The CLI scaffolds everything, and its strict TypeScript foundation catches bugs early. It's great for large teams and complex apps.",
                 hook:"Are you evaluating frameworks for a project?" },
  svelte:      { brief:"Svelte is a compiler-based framework that shifts work from the browser to build time — no virtual DOM needed.",
                 deep:"Unlike React or Vue, Svelte compiles your components into efficient imperative code at build time. There's no runtime framework shipped to the browser, so the bundle is tiny and fast. Reactivity is built into the language itself — just assign a variable and the DOM updates.",
                 hook:"The compiler approach is fascinating, right?" },
  nextjs:      { brief:"Next.js is a React framework that adds server-side rendering, routing, and full-stack capabilities out of the box.",
                 deep:"Next.js handles the hard parts of React: file-based routing, SSR/SSG, API routes, and image optimization. The App Router (v13+) introduced React Server Components, letting you fetch data right in your components without useEffect. It's the default choice for production React apps.",
                 hook:"Are you using the App Router or the Pages Router?" },
  typescript:  { brief:"TypeScript is JavaScript with static types — it catches bugs at compile time instead of runtime.",
                 deep:"TypeScript adds a type system on top of JavaScript that compiles away to plain JS. You get autocomplete, refactoring safety, and entire categories of bugs caught before your code even runs. Generics, union types, and type inference make it powerful without being verbose.",
                 hook:"Do you use strict mode?" },
  javascript:  { brief:"JavaScript is the programming language of the web — it runs in every browser and on servers via Node.js.",
                 deep:"JS started as a simple scripting language but has evolved into a full-featured language. Modern JS (ES6+) has classes, modules, async/await, destructuring, and arrow functions. It's single-threaded but uses an event loop for non-blocking I/O. It's the most widely used language in the world.",
                 hook:"Are you more frontend or backend JS?" },
  python:      { brief:"Python is a high-level language known for its readability and versatility — from web dev to AI/ML.",
                 deep:"Python's clean syntax (indentation-based) makes it read almost like English. It dominates in data science (NumPy, Pandas), machine learning (TensorFlow, PyTorch), automation, and web backends (Django, FastAPI). The ecosystem has a library for basically everything.",
                 hook:"What are you using Python for?" },
  rust:        { brief:"Rust is a systems programming language focused on safety, speed, and concurrency — without a garbage collector.",
                 deep:"Rust's ownership system ensures memory safety at compile time — no null pointers, no data races, no use-after-free. The borrow checker is strict but once your code compiles, it's incredibly reliable. It's as fast as C/C++ but way safer. Great for systems programming, WebAssembly, and CLI tools.",
                 hook:"What drew you to Rust?" },
  go:          { brief:"Go (Golang) is Google's language for building fast, reliable, concurrent server-side applications.",
                 deep:"Go was designed for simplicity: there's usually one obvious way to do things. Goroutines make concurrency trivially easy — you can spin up thousands of lightweight threads. It compiles to a single binary with no dependencies. The standard library is incredibly complete for web servers and networking.",
                 hook:"Building APIs or services with it?" },
  node:        { brief:"Node.js lets you run JavaScript on the server — it uses Chrome's V8 engine and an event-driven architecture.",
                 deep:"Node's non-blocking I/O model makes it great for handling many concurrent connections — perfect for real-time apps, APIs, and streaming. npm gives you access to over 2 million packages. Express is the classic framework, but Fastify and Hono are gaining traction for performance.",
                 hook:"What are you building on Node?" },
  tailwind:    { brief:"Tailwind CSS is a utility-first CSS framework — you style by composing small, single-purpose classes.",
                 deep:"Instead of writing custom CSS, you apply classes like 'flex', 'p-4', 'text-blue-500' directly in HTML. It feels wrong at first but it's incredibly productive once it clicks. The design system constraints (spacing scale, color palette) keep things consistent. Unused classes get purged so the final CSS is tiny.",
                 hook:"Do you customize the config much or use defaults?" },

  // ─── Concepts ───
  flexbox:     { brief:"Flexbox is a CSS layout model for distributing space along a single axis — row or column.",
                 deep:"Flexbox solves the centering problem forever: `display: flex; justify-content: center; align-items: center`. It handles main axis (justify-content) and cross axis (align-items) separately. flex-grow, flex-shrink, and flex-basis control how items share space. It's perfect for navbars, card rows, and form layouts.",
                 hook:"Are you struggling with a specific layout?" },
  grid:        { brief:"CSS Grid is a two-dimensional layout system — it handles both rows and columns simultaneously.",
                 deep:"Grid lets you define rows and columns with `grid-template-columns` and `grid-template-rows`, then place items anywhere in the grid. `fr` units distribute remaining space proportionally. `auto-fit` and `minmax()` create responsive layouts without media queries. It's perfect for page layouts, dashboards, and gallery grids.",
                 hook:"Grid or Flexbox person? (Or both?)" },
  api:         { brief:"An API (Application Programming Interface) is a way for software programs to talk to each other using defined rules.",
                 deep:"Think of an API as a waiter in a restaurant — you tell it what you want (request), it goes to the kitchen (server), and brings back your food (response). REST APIs use HTTP methods (GET, POST, PUT, DELETE) with JSON data. GraphQL lets you request exactly the fields you need. APIs are the backbone of modern web apps.",
                 hook:"Are you building or consuming an API?" },
  git:         { brief:"Git is a distributed version control system that tracks changes to your code across time and team members.",
                 deep:"Every Git repo is a full copy of the project history. You work in branches (parallel timelines), commit changes (save points), and merge branches together. The staging area (git add) lets you choose exactly what to commit. Remote repos (GitHub, GitLab) enable collaboration. git log, diff, and blame help you understand code history.",
                 hook:"Are you team rebase or team merge?" },
  docker:      { brief:"Docker packages your app and all its dependencies into containers — portable environments that run anywhere.",
                 deep:"A Docker container is like a lightweight virtual machine but way faster. You define your environment in a Dockerfile (base image, dependencies, commands), build it once, and it runs identically on any machine. Docker Compose lets you orchestrate multiple containers (app + database + cache) together.",
                 hook:"Using it for development or production?" },
  hooks:       { brief:"React Hooks are functions that let you use state and lifecycle features in functional components.",
                 deep:"useState gives you state variables, useEffect handles side effects (data fetching, subscriptions), useContext shares data without prop drilling, and useRef holds mutable references. Custom hooks let you extract and reuse stateful logic across components. They replaced class components for most use cases.",
                 hook:"Which hook do you use most?" },
  ssr:         { brief:"Server-Side Rendering means generating HTML on the server instead of in the browser — faster first paint, better SEO.",
                 deep:"With SSR, the server renders the full HTML page before sending it to the browser. The user sees content immediately instead of a blank page while JavaScript loads. Frameworks like Next.js, Nuxt, and SvelteKit handle SSR automatically. The tradeoff is server load vs. client-side rendering simplicity.",
                 hook:"Are you optimizing for SEO or performance?" },
  closure:     { brief:"A closure is a function that remembers the variables from the scope where it was created, even after that scope is gone.",
                 deep:"In JavaScript, when a function is created inside another function, the inner function 'closes over' the outer function's variables. This is how callbacks, event handlers, and module patterns work. It's also why useState in React can persist values between renders — closures capture the state.",
                 hook:"Closures clicked for you, or still a bit fuzzy?" },
  promise:     { brief:"A Promise is JavaScript's way of handling asynchronous operations — it represents a value that will be available later.",
                 deep:"A Promise can be pending (waiting), fulfilled (resolved with a value), or rejected (failed with an error). You use .then() for success and .catch() for errors, or async/await syntax for cleaner code. Promises solved callback hell by chaining operations instead of nesting them. Promise.all runs multiple async operations in parallel.",
                 hook:"Do you prefer .then() chains or async/await?" },
  recursion:   { brief:"Recursion is when a function calls itself to solve a problem by breaking it into smaller sub-problems.",
                 deep:"A recursive function needs a base case (when to stop) and a recursive step (calling itself with a smaller input). Classic example: factorial(5) = 5 × factorial(4) = 5 × 4 × factorial(3)... It's elegant for tree traversal, nested structures, and divide-and-conquer algorithms. Watch out for stack overflow with deep recursion — use tail recursion or iteration when needed.",
                 hook:"Have you hit a problem where recursion just clicked?" },
  restapi:     { brief:"A REST API uses standard HTTP methods (GET, POST, PUT, DELETE) to perform CRUD operations on resources.",
                 deep:"REST (Representational State Transfer) organizes your API around resources (users, posts, comments) with URLs like /api/users/123. GET reads, POST creates, PUT updates, DELETE removes. It's stateless — each request contains all the info the server needs. JSON is the standard format. It's the most common API style.",
                 hook:"Building REST or looking at GraphQL too?" },
  graphql:     { brief:"GraphQL is a query language for APIs — you request exactly the data you need in a single request.",
                 deep:"Instead of multiple REST endpoints returning fixed data shapes, GraphQL has one endpoint where you specify exactly which fields you want. No over-fetching, no under-fetching. The schema defines all available types and relationships. Mutations handle writes. It's great for complex data relationships and mobile apps where bandwidth matters.",
                 hook:"Have you used it in a project yet?" },
  websocket:   { brief:"WebSockets create a persistent two-way connection between client and server — perfect for real-time communication.",
                 deep:"Unlike HTTP (request-response), WebSockets keep the connection open so either side can send data anytime. This enables live chat, real-time dashboards, multiplayer games, and collaborative editing. The connection starts as an HTTP handshake then upgrades to the WebSocket protocol. Libraries like Socket.io add fallbacks and rooms.",
                 hook:"Building something real-time?" },
  oauth:       { brief:"OAuth is an authorization protocol that lets users grant apps limited access to their accounts without sharing passwords.",
                 deep:"When you click 'Sign in with Google', that's OAuth. The app redirects you to Google, you approve the permissions, Google sends back an access token. The app uses that token to access your data — it never sees your password. OAuth 2.0 uses access tokens (short-lived) and refresh tokens (for renewal). It separates authentication from authorization.",
                 hook:"Implementing login or third-party integrations?" },

  // ─── Design ───
  designsystem:{ brief:"A design system is a collection of reusable components, patterns, and guidelines that ensure visual and behavioral consistency.",
                 deep:"It's more than a component library — it includes design tokens (colors, spacing, typography), component specs, usage guidelines, and principles. Think of it as a shared language between design and engineering. Companies like Google (Material), Apple (HIG), and IBM (Carbon) have massive design systems.",
                 hook:"Are you building one or using an existing one?" },
  accessibility:{ brief:"Web accessibility (a11y) means designing and building so everyone can use your site, including people with disabilities.",
                 deep:"This includes screen reader support (semantic HTML, ARIA labels), keyboard navigation (focus management, tab order), color contrast (4.5:1 minimum for text), and motion preferences (prefers-reduced-motion). WCAG 2.1 AA is the standard to aim for. It's not just nice to have — it's often legally required and always the right thing to do.",
                 hook:"Do you test with screen readers?" },
  responsive:  { brief:"Responsive design means building layouts that adapt to any screen size — from phones to 4K monitors.",
                 deep:"The core tools: media queries to adjust styles at breakpoints, fluid widths (%, vw, vh), CSS Grid/Flexbox for flexible layouts, and clamp()/min()/max() for fluid typography. Mobile-first means starting with the smallest screen and adding complexity for larger ones. Container queries (new!) let components respond to their own size, not just the viewport.",
                 hook:"Do you design mobile-first?" },
  darkmode:    { brief:"Dark mode is an alternative color scheme using dark backgrounds and light text — easier on eyes in low light.",
                 deep:"Implementation usually involves CSS custom properties (variables) that swap values based on a theme class or prefers-color-scheme media query. The key challenges: not just inverting colors (some need specific dark variants), images/shadows need adjustment, and you need to respect the user's OS preference while allowing manual toggle.",
                 hook:"Do you prefer dark or light mode?" },
};

/* ── Deep Knowledge: Comparisons ──
 * Specific "X vs Y" entries with real, opinionated takes.
 */
const COMPARISONS = {
  "react_vue":     { a:"React", b:"Vue", take:"React gives you more flexibility and has a bigger ecosystem, but Vue is easier to learn and its single-file components are beautiful. React wins for large teams, Vue wins for getting stuff done fast. Both are great — it's honestly about what clicks with your brain.", hook:"What matters more to you — ecosystem size or developer experience?" },
  "react_angular": { a:"React", b:"Angular", take:"React is a library (you choose the pieces), Angular is a framework (batteries included). React is more flexible, Angular is more opinionated. Small-to-medium apps? React. Large enterprise app with a big team? Angular's structure helps. React has a gentler learning curve, Angular has a steeper one but more guardrails.", hook:"How big is the project you're planning?" },
  "react_svelte":  { a:"React", b:"Svelte", take:"React has the massive ecosystem and job market. Svelte has the better developer experience and smaller bundles because it compiles away. For new projects where you have freedom? I'd seriously look at Svelte. For team projects and hiring? React is the safer bet.", hook:"Is this a personal project or team project?" },
  "typescript_javascript": { a:"TypeScript", b:"JavaScript", take:"TypeScript is JavaScript with guardrails. For small scripts? JS is fine. For anything you'll maintain, collaborate on, or scale? TypeScript saves so many headaches. The initial setup cost pays for itself the first time the compiler catches a bug you'd have spent hours debugging.", hook:"How big is your codebase?" },
  "node_python":   { a:"Node.js", b:"Python", take:"Node is great for real-time apps, APIs, and when your frontend is already JavaScript. Python wins for data science, ML, scripting, and readability. If you're building a web API and already know JS? Node. If you're doing anything data-related? Python. Both have huge ecosystems.", hook:"What are you building?" },
  "rest_graphql":  { a:"REST", b:"GraphQL", take:"REST is simpler, more cacheable, and every developer knows it. GraphQL is more flexible — you get exactly the data you ask for in one request. REST is fine for most CRUD apps. GraphQL shines when you have complex data relationships, mobile apps (bandwidth matters), or multiple clients needing different data shapes.", hook:"Is overfetching a problem for you right now?" },
  "tailwind_css":  { a:"Tailwind", b:"vanilla CSS", take:"Tailwind is utility-first — you style by composing classes instead of writing CSS files. It looks messy at first but it's wildly productive. Vanilla CSS gives you full control and teaches you the fundamentals. My take: learn CSS well first, then try Tailwind. Once you go utility-first, it's hard to go back.", hook:"Have you tried Tailwind yet?" },
  "flexbox_grid":  { a:"Flexbox", b:"CSS Grid", take:"They're not competitors — they solve different problems! Flexbox is one-dimensional (row OR column). Grid is two-dimensional (rows AND columns). Use Flexbox for components (navbars, card rows, centering). Use Grid for page layouts and anything with both rows and columns. Most real layouts use both.", hook:"What layout are you trying to build?" },
  "docker_vms":    { a:"Docker", b:"VMs", take:"Docker containers share the host OS kernel — they start in seconds, use less RAM, and are way more portable. VMs include a full OS — more isolation but heavier (minutes to boot, GBs of disk). Containers for apps, VMs when you need full OS isolation or different OS entirely.", hook:"Are you containerizing an app?" },
  "mysql_postgres": { a:"MySQL", b:"PostgreSQL", take:"MySQL is simpler and faster for basic read-heavy workloads. PostgreSQL is more feature-rich — JSON support, full-text search, better SQL standards compliance, and extensibility. For most new projects I'd lean PostgreSQL. MySQL is fine for simple CRUD apps and has massive hosting support.", hook:"What kind of data are you working with?" },
  "mongo_postgres": { a:"MongoDB", b:"PostgreSQL", take:"MongoDB is document-based (JSON-like) — great for flexible schemas and rapid prototyping. PostgreSQL is relational with incredible JSON support too. If your data has clear relationships (users → orders → items), go relational. If your data shape varies a lot or you need extreme horizontal scale, consider Mongo.", hook:"How structured is your data?" },
};

function lookupComparison(a, b) {
  const key1 = `${a}_${b}`, key2 = `${b}_${a}`;
  const entry = COMPARISONS[key1] || COMPARISONS[key2];
  if (!entry) return null;
  const swapped = !!COMPARISONS[key2] && !COMPARISONS[key1];
  return { ...entry, swapped };
}

function lookupExplainer(text) {
  const lower = text.toLowerCase().replace(/[?!.,]/g, "").trim();

  // "what is X" / "what are X" / "what does X do"
  let subject = null;
  const whatMatch = lower.match(/(?:what (?:is|are|does)|explain|tell me about|how does|how do|what's)\s+(.+)/);
  if (whatMatch) subject = whatMatch[1].replace(/\b(a|an|the|work|mean|do)\b/g, "").trim();

  // "how does X work" / "how X works"
  if (!subject) {
    const howMatch = lower.match(/how (?:does |do )?(.+?)(?:\s+work|\s+function)?$/);
    if (howMatch) subject = howMatch[1].trim();
  }

  if (!subject || subject.length < 2) return null;

  // Normalize common aliases
  const aliases = {
    "react js":"react", "reactjs":"react", "react.js":"react",
    "vue js":"vue", "vuejs":"vue", "vue.js":"vue",
    "next js":"nextjs", "next.js":"nextjs",
    "node js":"node", "nodejs":"node", "node.js":"node",
    "tailwind css":"tailwind", "tailwindcss":"tailwind",
    "ts":"typescript", "js":"javascript", "py":"python",
    "flex box":"flexbox", "css grid":"grid", "css flexbox":"flexbox",
    "rest api":"restapi", "rest apis":"restapi",
    "web socket":"websocket", "web sockets":"websocket", "websockets":"websocket",
    "design systems":"designsystem", "design token":"designsystem",
    "a11y":"accessibility", "web accessibility":"accessibility",
    "dark mode":"darkmode", "dark theme":"darkmode",
    "responsive design":"responsive",
    "closures":"closure", "promises":"promise",
    "react hooks":"hooks",
    "server side rendering":"ssr", "server rendering":"ssr",
    "graphql api":"graphql",
    "o auth":"oauth", "oauth2":"oauth", "oauth 2":"oauth",
  };
  const normalized = aliases[subject] || subject.replace(/\s+/g, "").toLowerCase();
  const entry = EXPLAIN[normalized] || EXPLAIN[subject.split(/\s+/)[0]];
  return entry || null;
}

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

  // ── Extended Tech Topics ──
  html:       { related:["css","web","semantic","accessibility","dom"], opinions:["semantic HTML is so underrated","it's the foundation everything else rests on","good HTML makes everything downstream easier"], hooks:["do you think about semantic structure much?","are you into web components?","how do you handle forms?"], facts:["HTML5 added over 30 new elements","The web runs on HTML — literally everything","Semantic HTML improves SEO and accessibility"] },
  api:        { related:["rest","graphql","backend","fetch","endpoint"], opinions:["good API design is an art form","REST vs GraphQL is the eternal debate","documentation makes or breaks an API"], hooks:["are you building or consuming APIs?","REST or GraphQL?","what's your approach to error handling?"], facts:["REST was defined by Roy Fielding in 2000","GraphQL was developed at Facebook","Most APIs use JSON as the data format"] },
  database:   { related:["sql","postgres","mongo","redis","orm"], opinions:["choosing the right database matters more than people think","NoSQL isn't always the answer","migrations are the scariest part of backend work"], hooks:["SQL or NoSQL?","what database do you usually reach for?","how do you handle schema changes?"], facts:["PostgreSQL is over 35 years old","Redis can handle millions of operations per second","SQLite is the most deployed database in the world"] },
  sql:        { related:["database","postgres","queries","joins","orm"], opinions:["SQL is a superpower that every developer should know","window functions are incredibly powerful","writing efficient queries is its own skill"], hooks:["do you write raw SQL or use an ORM?","what's your go-to database?","ever dealt with slow query optimization?"], facts:["SQL was created in the 1970s at IBM","It's used in virtually every industry","Knowing SQL is one of the most marketable skills"] },
  algorithm:  { related:["data structure","sorting","leetcode","complexity","interview"], opinions:["understanding Big O changes how you think about code","leetcode culture is controversial but the fundamentals matter","the best algorithm is the one you can explain clearly"], hooks:["do you practice algorithms regularly?","favorite data structure?","are you prepping for interviews?"], facts:["Quicksort averages O(n log n)","Hash tables give O(1) average lookup","Many graph algorithms date back centuries"] },
  docker:     { related:["containers","kubernetes","devops","deploy","image"], opinions:["it solved 'works on my machine' forever","containers changed deployment completely","the learning curve is worth it"], hooks:["do you use Docker for development or production?","have you gotten into Kubernetes?","what's your base image of choice?"], facts:["Docker was released in 2013","Container images are layered for efficiency","Docker Hub hosts millions of images"] },
  aws:        { related:["cloud","lambda","s3","deploy","serverless"], opinions:["the number of services is both impressive and overwhelming","Lambda changed how we think about compute","the free tier is great for learning"], hooks:["which AWS services do you use most?","have you tried serverless?","AWS, GCP, or Azure?"], facts:["AWS has over 200 services","S3 stores trillions of objects","Lambda can handle millions of requests"] },
  graphql:    { related:["api","query","schema","apollo","relay"], opinions:["asking for exactly what you need is such a clean concept","the type system is beautiful","it shines with complex data relationships"], hooks:["do you use Apollo or another client?","how do you handle the N+1 problem?","what made you pick GraphQL over REST?"], facts:["GraphQL was open-sourced by Facebook in 2015","It uses a single endpoint","Subscriptions enable real-time data"] },
  angular:    { related:["typescript","rxjs","google","spa","enterprise"], opinions:["it's opinionated in a good way for large teams","the learning curve is steep but rewarding","RxJS is powerful once it clicks"], hooks:["have you been using Angular long?","how do you feel about RxJS?","standalone components or NgModules?"] },
  svelte:     { related:["compiler","reactive","kit","lightweight","framework"], opinions:["the compiler approach is genius","it feels closest to writing plain HTML/JS","SvelteKit is seriously impressive"], hooks:["what drew you to Svelte?","have you used SvelteKit?","do you miss anything from React/Vue?"], facts:["Svelte compiles to vanilla JS — no runtime","It was created by Rich Harris","SvelteKit is the official app framework"] },
  go:         { related:["goroutines","concurrency","backend","google","systems"], opinions:["the simplicity is its biggest strength","goroutines make concurrency approachable","the standard library is incredible"], hooks:["what are you building with Go?","do you use it for APIs or systems?","how do you feel about the error handling?"], facts:["Go was created at Google in 2009","It compiles to a single binary","Goroutines are incredibly lightweight"] },
  java:       { related:["spring","jvm","enterprise","android","kotlin"], opinions:["it's still one of the most in-demand languages","the JVM ecosystem is massive","modern Java is actually quite pleasant to write"], hooks:["are you using Java for backend or Android?","Spring Boot or something else?","have you tried Kotlin as well?"] },
  swift:      { related:["ios","apple","xcode","swiftui","mobile"], opinions:["it's such a clean modern language","SwiftUI is maturing really nicely","Apple's developer tools keep getting better"], hooks:["are you building for iOS?","SwiftUI or UIKit?","what kind of app are you working on?"] },
  kotlin:     { related:["android","jvm","java","multiplatform","coroutines"], opinions:["it fixed so many Java pain points","coroutines are elegant","Kotlin Multiplatform is exciting"], hooks:["Android or multiplatform?","did you come from Java?","what's your favorite Kotlin feature?"] },
  redux:      { related:["react","state","store","toolkit","middleware"], opinions:["Redux Toolkit made it so much better","it's overkill for small apps but essential for complex ones","the predictability is its superpower"], hooks:["Toolkit or classic Redux?","do you use it with React?","have you tried Zustand or Jotai instead?"] },
  webpack:    { related:["bundler","build","vite","config","module"], opinions:["the config can be intimidating","it's incredibly powerful once you understand it","Vite has really raised the bar for DX"], hooks:["have you switched to Vite?","what plugins do you use most?","how do you handle code splitting?"] },
  vite:       { related:["build","esm","fast","hmr","rollup"], opinions:["the speed is addictive","HMR that actually works instantly is a game-changer","it's the modern build tool standard now"], hooks:["what are you using Vite for?","have you tried the plugin ecosystem?","did you migrate from Webpack?"], facts:["Vite uses native ES modules for dev","It was created by Evan You","Production builds use Rollup under the hood"] },

  // ── Extended Design Topics ──
  prototype:  { related:["figma","wireframe","testing","iteration","mockup"], opinions:["prototype early and often","low-fidelity prototypes save so much time","the goal is learning, not perfection"], hooks:["how do you prototype — Figma, code, or paper?","do you test prototypes with real users?","what fidelity do you start at?"] },
  wireframe:  { related:["prototype","layout","sketch","ux","structure"], opinions:["wireframes keep you focused on structure over style","grayscale wireframes prevent premature visual decisions","they're the blueprint of good design"], hooks:["hand-drawn or digital?","what tool do you wireframe in?","how detailed do your wireframes get?"] },
  animation:  { related:["css","motion","framer","gsap","transition"], opinions:["subtle animation makes interfaces feel alive","the best animations you barely notice","60fps or nothing","motion should have purpose, not just flash"], hooks:["CSS animations or a library like Framer Motion?","what's your approach to easing curves?","do you consider motion accessibility?"], facts:["The human eye perceives 12fps as motion","Ease-out curves feel most natural to users","Apple's iOS animations use spring physics"] },
  responsive: { related:["mobile","breakpoint","fluid","container","adaptive"], opinions:["mobile-first changed how we think about design","container queries are the real responsive revolution","responsive isn't just about screen size anymore"], hooks:["mobile-first or desktop-first?","what breakpoints do you use?","have you adopted container queries?"] },
  brand:      { related:["logo","identity","color","typography","marketing"], opinions:["a strong brand is a feeling, not just a logo","consistency is the foundation of brand recognition","the best brands feel like a person, not a corporation"], hooks:["are you building a personal brand or for a company?","what brands inspire you?","how do you approach brand consistency?"] },
  accessibility:{ related:["a11y","screen reader","aria","wcag","keyboard"], opinions:["accessible design is better design for everyone","it's not extra work, it's the work","the web should be for everyone, period"], hooks:["do you test with screen readers?","what WCAG level do you aim for?","how do you handle focus management?"], facts:["Over 1 billion people live with some form of disability","Color contrast alone affects 300M+ people","Keyboard navigation is essential, not optional"] },

  // ── Extended Food Topics ──
  sushi:      { related:["japanese","fish","rice","food","restaurant"], opinions:["fresh sushi is a transcendent experience","it's one of those foods where quality varies wildly","omakase is the ultimate trust exercise with a chef"], hooks:["nigiri or rolls?","do you have a favorite sushi spot?","what's the best piece of sushi you've ever had?"] },
  pasta:      { related:["italian","food","cooking","sauce","carbs"], opinions:["it's comfort food perfection","the sauce-to-pasta ratio is everything","fresh pasta is on another level from boxed"], hooks:["what's your go-to pasta?","do you make your own sauce?","carbonara or bolognese?"] },
  tacos:      { related:["mexican","food","salsa","street food"], opinions:["street tacos are a religious experience","the simpler the taco, the better","a good salsa elevates everything"], hooks:["soft or hard shell?","what's your go-to filling?","best taco you've ever had?"] },
  ramen:      { related:["japanese","noodle","broth","food","soup"], opinions:["a perfect bowl of ramen is soul food","the broth is everything — it's hours of work in every sip","instant ramen vs real ramen is barely the same food"], hooks:["tonkotsu or miso?","do you have a favorite ramen spot?","ever tried making it from scratch?"] },
  curry:      { related:["indian","spice","food","cooking","rice"], opinions:["the depth of flavor in a good curry is unmatched","learning to layer spices is a game-changer","every culture has their own version and they're all amazing"], hooks:["what kind of curry do you like most?","do you cook curry at home?","how spicy do you go?"] },
  burger:     { related:["food","grill","beef","fast food","cookout"], opinions:["the perfect smash burger is an art form","simplicity wins — great beef, salt, pepper, done","the bun matters more than people realize"], hooks:["classic or gourmet?","what's your ideal burger build?","best burger you've ever had?"] },
  vegan:      { related:["plant","food","health","cooking","sustainability"], opinions:["vegan cooking has gotten incredibly creative","it's amazing what you can do without animal products","the environmental argument is pretty compelling"], hooks:["are you vegan or just curious?","what's your favorite plant-based meal?","have you found good substitutes for everything?"] },
  cooking:    { related:["food","recipe","kitchen","chef","meal"], opinions:["cooking is creative expression through food","mise en place changes your entire kitchen experience","the confidence to improvise comes with practice"], hooks:["what do you love to cook?","any signature dishes?","do you follow recipes or wing it?"] },

  // ── Extended Entertainment ──
  movie:      { related:["film","cinema","director","actor","series"], opinions:["a great movie changes how you see the world","practical effects will always hit differently","the opening scene sets the entire tone"], hooks:["seen anything good recently?","what's your all-time favorite?","are you a theater person or streaming at home?"] },
  film:       { related:["movie","cinema","director","cinematography"], opinions:["cinematography is storytelling without words","independent films take the most creative risks","a great soundtrack makes a good film unforgettable"], hooks:["who's your favorite director?","do you prefer indie or blockbusters?","what genre draws you in?"] },
  netflix:    { related:["streaming","series","movie","binge","show"], opinions:["the streaming wars gave us so much content","binge-watching is a modern guilty pleasure","nothing beats finding a show that grabs you from episode one"], hooks:["what are you watching right now?","any hidden gem recommendations?","do you binge or pace yourself?"] },
  anime:      { related:["manga","japanese","animation","studio","series"], opinions:["anime storytelling can be incredibly ambitious","the art styles are so diverse and beautiful","there's an anime for literally every taste"], hooks:["what are you watching?","sub or dub?","what got you into anime?"], facts:["The anime industry is worth over $25 billion","Studio Ghibli changed animation worldwide","One Piece has been running since 1999"] },
  series:     { related:["tv","streaming","binge","episode","show"], opinions:["long-form storytelling is TV's superpower","a slow burn that pays off is the best feeling","cliffhangers should be illegal but they work so well"], hooks:["what's your current series?","do you watch week-to-week or wait and binge?","what's your all-time favorite show?"] },

  // ── Extended Fitness ──
  gym:        { related:["workout","fitness","weights","training","health"], opinions:["the gym is my therapy session","progressive overload is the real secret","the gym community is genuinely supportive"], hooks:["what's your split?","morning or evening gym?","any goals you're working toward?"] },
  yoga:       { related:["flexibility","mindfulness","health","stretching","meditation"], opinions:["yoga humbles even the fittest people","the mental benefits are as big as the physical ones","a good yoga session resets your whole nervous system"], hooks:["how long have you been practicing?","do you do it at home or in a studio?","any favorite poses?"] },
  running:    { related:["marathon","jogging","cardio","fitness","trail"], opinions:["runner's high is a real thing and it's addictive","running outdoors beats treadmill every time","it's the simplest workout — just go"], hooks:["do you run regularly?","road or trail?","any race goals?"], facts:["The average marathon time is about 4.5 hours","Running releases endorphins and endocannabinoids","Humans evolved specifically for long-distance running"] },

  // ── Bonus High-Frequency Topics ──
  ai:         { related:["ml","gpt","llm","chatbot","automation","deep learning"], opinions:["AI is the most significant technology shift of our lifetime","the speed of progress is genuinely unprecedented","it's a tool — the magic is in how humans use it"], hooks:["are you building with AI or just following the space?","what's the most impressive AI thing you've seen?","do you think about AI's impact on your field?"], facts:["GPT-4 was trained on trillions of tokens","AI can now write code, make art, and compose music","The transformer architecture revolutionized NLP"] },
  book:       { related:["reading","author","novel","fiction","nonfiction"], opinions:["reading is the best way to live a thousand lives","a book that changes your perspective is priceless","physical books hit different than screens"], hooks:["what are you reading right now?","fiction or nonfiction person?","any book that changed your thinking?"] },
  sleep:      { related:["rest","health","dream","routine","energy"], opinions:["sleep is the most underrated productivity hack","a consistent sleep schedule changes everything","naps are criminally underrated"], hooks:["are you a morning person or night owl?","how many hours do you usually get?","do you have a wind-down routine?"] },
  money:      { related:["finance","investing","budget","savings","crypto"], opinions:["financial literacy should be taught in every school","passive income sounds simple but takes real work upfront","the best investment is in yourself"], hooks:["are you into investing?","do you have a budgeting system?","what's your approach to saving?"] },
  startup:    { related:["business","entrepreneurship","product","funding","mvp"], opinions:["shipping fast beats perfecting slowly","the hardest part is finding product-market fit","ideas are cheap, execution is everything"], hooks:["are you working on a startup?","what problem are you solving?","solo founder or co-founder?"], facts:["90% of startups fail","The average startup takes 3-4 years to become profitable","YC has funded over 4,000 companies"] },
  weather:    { related:["rain","sun","temperature","season","climate"], opinions:["weather affects mood more than we realize","a perfect weather day is genuinely healing","there's something beautiful about every season"], hooks:["what's your ideal weather?","are you a summer or winter person?","how's the weather where you are?"] },
  photography:{ related:["camera","photo","editing","lightroom","composition"], opinions:["the best camera is the one you have with you","composition is more important than equipment","editing is where the magic happens"], hooks:["what do you shoot?","phone photography or dedicated camera?","what's your editing workflow?"] },
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

/* ══════════════════════════════════════════════════════════════════
   RESPONSE ARCHITECTURE VARIATION (Round 51)
   The composeResponse function always followed the same 5-part
   structure: reaction → mirror → opinion → related → hook. After
   many turns, this becomes predictable. Now the AI randomly selects
   from distinct response "architectures" — varying not just WHAT it
   says, but HOW it structures the response. Sometimes it leads with
   a question, sometimes a hot take, sometimes a callback, etc.
   ══════════════════════════════════════════════════════════════════ */

let lastArchitecture = "";

/* Generate a composed response for a topic with mirroring */
function composeResponse(topic, userWords, sent, isQuestion) {
  const assoc = ASSOC[topic];
  if (!assoc) return null;

  // Pick an architecture that's different from last time
  const architectures = ["classic","question_lead","hot_take","fact_first","callback_connect","minimal_punch","exploratory"];
  const available = architectures.filter(a => a !== lastArchitecture);
  const arch = pick(available);
  lastArchitecture = arch;

  const meaningfulWords = userWords.filter(w => !STOP.has(w) && w.length > 2);
  const mirrorPhrase = meaningfulWords.length > 0 ? meaningfulWords.slice(0, 2).join(" ") : null;
  const reactionPool = sent > 1 ? COMP.reactions.positive :
                       sent < -1 ? COMP.reactions.negative :
                       isQuestion ? COMP.reactions.curious : COMP.reactions.neutral;

  switch (arch) {
    // ── Classic: reaction → body → hook (original structure, still good) ──
    case "classic": {
      const parts = [pick(reactionPool)];
      if (mirrorPhrase && Math.random() > 0.4) parts.push(pick(COMP.bridges.mirror) + ` ${mirrorPhrase} —`);
      if (assoc.opinions && Math.random() > 0.3) {
        parts.push(`${pick(COMP.opinion_starters)} ${topic} ${pick(COMP.opinion_connectors)} ${pick(assoc.opinions)}.`);
      } else if (assoc.facts) parts.push(pick(assoc.facts) + ".");
      if (assoc.related && Math.random() > 0.5) {
        const rel = pick(assoc.related), ra = ASSOC[rel];
        if (ra) parts.push(pick(COMP.connectors) + ` ${rel} ${ra.opinions ? pick(ra.opinions) : "is pretty interesting too"}.`);
      }
      parts.push(assoc.hooks ? pick(assoc.hooks) : pick(COMP.deepeners));
      return parts.join(" ");
    }

    // ── Question Lead: start with a provocative question, THEN explain why ──
    case "question_lead": {
      const parts = [];
      const hook = assoc.hooks ? pick(assoc.hooks) : pick(COMP.deepeners);
      parts.push(hook);
      if (assoc.opinions) {
        parts.push(`I ask because ${pick(COMP.opinion_starters)} ${topic} ${pick(COMP.opinion_connectors)} ${pick(assoc.opinions)}.`);
      }
      if (assoc.facts && Math.random() > 0.5) parts.push(pick(assoc.facts) + ".");
      return parts.join(" ");
    }

    // ── Hot Take: bold opinion first with no preamble ──
    case "hot_take": {
      const parts = [];
      if (assoc.opinions) {
        const openers = ["Hot take:", "Okay here's my take —", "I'll say it:", "Unpopular opinion maybe, but", "Honestly?"];
        parts.push(`${pick(openers)} ${pick(assoc.opinions)}.`);
      } else if (assoc.facts) {
        parts.push(`Here's something wild — ${pick(assoc.facts)}.`);
      }
      if (mirrorPhrase) parts.push(`And what you said about ${mirrorPhrase} — yeah, I'm with you on that.`);
      parts.push(assoc.hooks ? pick(assoc.hooks) : pick(COMP.deepeners));
      return parts.join(" ");
    }

    // ── Fact First: lead with an interesting fact, then opinionate ──
    case "fact_first": {
      const parts = [];
      if (assoc.facts) {
        const factLeads = ["Fun fact:", "Did you know —", "Here's something cool:", "Random but relevant:"];
        parts.push(`${pick(factLeads)} ${pick(assoc.facts)}.`);
      }
      if (assoc.opinions && Math.random() > 0.4) {
        parts.push(`And personally, ${pick(assoc.opinions)}.`);
      }
      parts.push(assoc.hooks ? pick(assoc.hooks) : pick(COMP.deepeners));
      return parts.join(" ");
    }

    // ── Callback Connect: reference something from earlier, then connect to current topic ──
    case "callback_connect": {
      const parts = [];
      const prevTopics = Object.keys(mem.topics).filter(t => t !== topic && ASSOC[t]);
      if (prevTopics.length > 0) {
        const prevTopic = pick(prevTopics);
        parts.push(`This connects to what we were talking about with ${prevTopic} earlier —`);
        if (assoc.opinions) parts.push(`${pick(assoc.opinions)}.`);
        const bridge = ASSOC[prevTopic]?.related?.includes(topic) ? `They're definitely related.` : `Different worlds, same energy.`;
        parts.push(bridge);
      } else {
        parts.push(pick(reactionPool));
        if (assoc.opinions) parts.push(`${pick(COMP.opinion_starters)} ${topic} ${pick(COMP.opinion_connectors)} ${pick(assoc.opinions)}.`);
      }
      parts.push(assoc.hooks ? pick(assoc.hooks) : pick(COMP.deepeners));
      return parts.join(" ");
    }

    // ── Minimal Punch: short, impactful, no filler ──
    case "minimal_punch": {
      if (assoc.opinions) {
        const opinion = pick(assoc.opinions);
        const cap = opinion.charAt(0).toUpperCase() + opinion.slice(1);
        const hook = assoc.hooks ? " " + pick(assoc.hooks) : "";
        return `${cap}.${hook}`;
      }
      if (assoc.facts) return pick(assoc.facts) + ". " + (assoc.hooks ? pick(assoc.hooks) : pick(COMP.deepeners));
      return pick(reactionPool) + " " + pick(COMP.deepeners);
    }

    // ── Exploratory: think out loud, weigh multiple angles ──
    case "exploratory": {
      const parts = [];
      parts.push(pick(["Hmm, let me think about this...", "Okay so —", "This is interesting because", "I go back and forth on this, but"]));
      if (assoc.opinions && assoc.opinions.length > 1) {
        parts.push(`On one hand, ${assoc.opinions[0]}.`);
        parts.push(`But also, ${assoc.opinions[Math.min(1, assoc.opinions.length - 1)]}.`);
      } else if (assoc.opinions) {
        parts.push(`${pick(assoc.opinions)}.`);
      }
      if (assoc.facts && Math.random() > 0.5) parts.push(`Plus, ${pick(assoc.facts).toLowerCase()}.`);
      parts.push(assoc.hooks ? pick(assoc.hooks) : "Where do you land on this?");
      return parts.join(" ");
    }

    default:
      return null;
  }
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
    // Use the threading system for richer topic transitions
    const transition = threadManager.handleTopicSwitch();
    if (transition) return transition;
    return "Oh, new topic — I'm here for it! ";
  }
  return null; // steady/engaged = no intervention needed
}

/* ── Conversation Threading & Topic Management ──
 * Tracks parallel conversation threads (user discusses work AND hobbies),
 * manages smooth topic transitions, detects when users return to
 * previously discussed topics, and enables natural thread resumption.
 * Makes multi-topic conversations feel coherent instead of disjointed.
 */

class ThreadManager {
  constructor() { this.reset(); }
  reset() {
    this.threads = {};     // { topicName: { depth, lastTurn, messages, suspended } }
    this.activeThread = null;
    this.threadHistory = []; // ordered list of topic transitions
  }

  // Record a topic being discussed at a given turn
  touch(topic, turn, messageSnippet) {
    if (!topic || topic.length < 2) return;
    if (!this.threads[topic]) {
      this.threads[topic] = { depth: 0, lastTurn: turn, messages: [], suspended: false, firstTurn: turn };
    }
    const thread = this.threads[topic];
    thread.depth++;
    thread.lastTurn = turn;
    thread.suspended = false;
    if (messageSnippet) thread.messages.push(messageSnippet.slice(0, 60));
    if (thread.messages.length > 5) thread.messages.shift();

    // Track transitions
    if (this.activeThread && this.activeThread !== topic) {
      // Suspend the old thread
      if (this.threads[this.activeThread]) {
        this.threads[this.activeThread].suspended = true;
      }
      this.threadHistory.push({ from: this.activeThread, to: topic, turn });
      if (this.threadHistory.length > 10) this.threadHistory.shift();
    }
    this.activeThread = topic;
  }

  // Get suspended threads that could be naturally resumed
  getSuspendedThreads() {
    return Object.entries(this.threads)
      .filter(([name, t]) => t.suspended && t.depth >= 2 && name !== this.activeThread)
      .sort((a, b) => b[1].depth - a[1].depth)
      .map(([name, t]) => ({ name, ...t }));
  }

  // Check if user is returning to a previously discussed topic
  detectReturn(currentTopics, turn) {
    for (const topic of currentTopics) {
      const thread = this.threads[topic];
      if (thread && thread.suspended && turn - thread.lastTurn >= 3) {
        return { topic, gapTurns: turn - thread.lastTurn, depth: thread.depth };
      }
    }
    return null;
  }

  // Generate a smooth topic transition when switching
  handleTopicSwitch() {
    const history = this.threadHistory;
    if (history.length === 0) return null;
    const last = history[history.length - 1];
    const fromThread = this.threads[last.from];
    const toThread = this.threads[last.to];

    // If returning to a deep thread, acknowledge the return
    if (toThread && toThread.depth >= 3 && toThread.suspended) {
      return pickNew([
        `Oh, back to ${last.to}! I was wondering if we'd circle back to this. Where were we?`,
        `Ah, ${last.to} again! I like it — we had some good momentum on this topic.`,
        `Returning to ${last.to} — I've been thinking about what you said earlier!`,
      ]);
    }

    // First time on a new topic while leaving a deep one
    if (fromThread && fromThread.depth >= 2) {
      return pickNew([
        `Switching from ${last.from} to ${last.to} — I'm following! We can always circle back to ${last.from} later.`,
        `Oh, ${last.to} now! Cool — parking our ${last.from} conversation for a sec. What's on your mind?`,
        `New direction — ${last.to}! I like it. We've got some good ${last.from} threads to pick up later if you want.`,
      ]);
    }

    // Simple switch
    return pickNew([
      `Oh, ${last.to} — nice! Let's go there.`,
      `Switching gears to ${last.to} — I'm here for it!`,
      `${last.to.charAt(0).toUpperCase() + last.to.slice(1)}! New topic energy. What about it?`,
    ]);
  }

  // Suggest resuming a suspended thread (used in proactive callbacks)
  suggestResumption() {
    const suspended = this.getSuspendedThreads();
    if (suspended.length === 0) return null;
    const thread = suspended[0]; // highest depth suspended thread

    return pickNew([
      `By the way, we never finished our ${thread.name} discussion — want to pick that back up?`,
      `Oh, that reminds me — we were talking about ${thread.name} earlier. Any updates on that?`,
      `Random thought: what happened with the ${thread.name} thing you mentioned before?`,
    ]);
  }

  // Get conversation summary for context
  getThreadSummary() {
    const active = Object.entries(this.threads)
      .filter(([, t]) => !t.suspended && t.depth >= 2)
      .map(([name]) => name);
    const parked = Object.entries(this.threads)
      .filter(([, t]) => t.suspended && t.depth >= 2)
      .map(([name]) => name);
    return { active, parked, total: Object.keys(this.threads).length };
  }
}

const threadManager = new ThreadManager();

// Detect topic return and generate acknowledgment
function handleTopicReturn(currentTopics) {
  const ret = threadManager.detectReturn(currentTopics, mem.turn);
  if (!ret) return null;

  // Only acknowledge returns with significant gaps
  if (ret.gapTurns < 4) return null;

  return pickNew([
    `Oh, we're back on ${ret.topic}! I remember we were getting into some good stuff there.`,
    `${ret.topic.charAt(0).toUpperCase() + ret.topic.slice(1)} again — love it! I was hoping we'd come back to this.`,
    `Circling back to ${ret.topic} — nice. I had a feeling this would come up again!`,
  ]);
}

/* ── Comparison Engine ──
 * When user asks "X vs Y" or "should I use X or Y", actually compare them.
 */

function handleComparison(text) {
  // Detect comparison patterns
  const vsMatch = text.match(/(\w+)\s+(?:vs\.?|versus|or|compared to)\s+(\w+)/i);
  if (!vsMatch) return null;

  const a = vsMatch[1].toLowerCase(), b = vsMatch[2].toLowerCase();

  // Try structured comparison first
  const comp = lookupComparison(a, b);
  if (comp) {
    return `${comp.a} vs ${comp.b} — ooh, classic! ${comp.take} ${comp.hook}`;
  }

  // Fall back to ASSOC-based comparison
  const assocA = ASSOC[a], assocB = ASSOC[b];
  if (!assocA && !assocB) return null;

  const parts = [`${a} vs ${b} — great question!`];
  if (assocA?.opinions) parts.push(`${a}: ${pick(assocA.opinions)}.`);
  if (assocB?.opinions) parts.push(`${b}: ${pick(assocB.opinions)}.`);

  const nuances = [
    `Honestly, they're both solid — it depends on what you're optimizing for.`,
    `I'd say ${a} wins for some use cases and ${b} wins for others.`,
    `They each have their strengths — it's less about which is "better" and more about which fits your situation.`,
  ];
  parts.push(pick(nuances));
  parts.push(`What's your use case?`);
  return parts.join(" ");
}

/* ── Contextual Opinion & Recommendation Engine ──
 * When users ask "what do you think about X?", "should I use X?",
 * "do you recommend X?", "is X good?" — leverage ASSOC data to give
 * specific, opinionated, genuinely helpful answers instead of generic
 * "it depends" responses. Also handles "what's your favorite X?"
 */

function handleOpinionRequest(text, topics) {
  const lower = text.toLowerCase();

  // Detect opinion/recommendation patterns
  const isOpinion = /what (?:do )?you (?:think|feel|reckon) (?:about|of)\b/i.test(lower);
  const isRecommend = /(?:should I|would you recommend|do you recommend|is .+ (?:good|worth|any good))/i.test(lower);
  const isFavorite = /(?:what'?s? (?:your|the best)|favorite|fav) (\w+)/i.test(lower);
  const isGoodFor = /(?:is .+ good for|best (?:for|way to)|how (?:do I|should I) (?:start|learn|get into))/i.test(lower);

  if (!isOpinion && !isRecommend && !isFavorite && !isGoodFor) return null;

  // Find the relevant topic
  const topic = topics[0];
  const assoc = topic ? ASSOC[topic] : null;

  // "What do you think about X?"
  if (isOpinion && assoc) {
    const opinion = pick(assoc.opinions);
    const fact = assoc.facts ? pick(assoc.facts) : null;
    const hook = pick(assoc.hooks || COMP.deepeners);

    const starters = [
      `Honestly? I think ${opinion}.`,
      `My take on ${topic}: ${opinion}.`,
      `Here's what I think — ${opinion}.`,
      `Real talk: ${opinion}.`,
    ];
    let response = pickNew(starters);
    if (fact && Math.random() > 0.4) response += ` Plus, ${fact.charAt(0).toLowerCase() + fact.slice(1)}.`;
    response += " " + hook;
    return response;
  }

  // "Should I use/learn/try X?"
  if (isRecommend && assoc) {
    const opinion = pick(assoc.opinions);
    const hook = pick(assoc.hooks || COMP.deepeners);

    // Extract what they're considering
    const shouldMatch = lower.match(/should I (?:use|learn|try|start|get into|switch to)\s+(.+?)[\?\.!]?$/i);
    const thing = shouldMatch ? shouldMatch[1] : topic;

    const recs = [
      `Honestly, yes — ${opinion}. I'd say go for it!`,
      `I think it's worth trying! ${opinion}. ${hook}`,
      `Depends on your situation, but my instinct says yes. ${opinion}. What's drawing you to it?`,
      `${topic} is solid! ${opinion}. The real question is: ${hook}`,
    ];
    return pickNew(recs);
  }

  // "Is X good?" / "Is X worth it?"
  if (isRecommend && !assoc) {
    // No ASSOC data — give a thoughtful generic
    const subject = lower.replace(/^(?:is|are)\s+/i, "").replace(/\s*(?:good|worth|any good|nice).*$/i, "").trim();
    if (subject.length > 2 && subject.length < 30) {
      return pickNew([
        `From what I know, ${subject} has its fans! It really depends on what you need it for. What's your use case?`,
        `${subject} can definitely be good — the real question is what you're using it for. What's the context?`,
        `I've heard mixed things about ${subject}, honestly. Some people love it, others have reservations. What drew your attention to it?`,
      ]);
    }
  }

  // "What's your favorite X?" / "What's the best X?"
  if (isFavorite) {
    const favMatch = lower.match(/(?:fav(?:orite)?|best)\s+(\w+)/i);
    const category = favMatch ? favMatch[1] : null;

    // Map categories to ASSOC topics
    const catMap = {
      language: ["javascript","python","typescript","rust","go"],
      framework: ["react","vue","svelte","nextjs","angular"],
      font: ["typography"], tool: ["figma","git","vite"],
      food: ["pizza","sushi","ramen","curry","pasta","burger","coffee"],
      game: ["gaming"], movie: ["movie","film","netflix"],
      song: ["music"], show: ["series","netflix","anime"],
      drink: ["coffee"], editor: ["vite","figma"],
    };

    const candidates = catMap[category] || [];
    if (candidates.length > 0) {
      const chosen = pick(candidates);
      const assocChosen = ASSOC[chosen];
      if (assocChosen) {
        const opinion = pick(assocChosen.opinions);
        return pickNew([
          `Ooh, tough question! If I had to pick, I'd lean toward ${chosen} — ${opinion}. But that's just me! What's yours?`,
          `Hmm, I have a soft spot for ${chosen}. ${opinion}. What about you?`,
          `I'd say ${chosen}! ${opinion}. Though honestly, they're all great in their own way. What's your pick?`,
        ]);
      }
    }

    return pickNew([
      `Ooh, that's such a personal choice! I'd love to hear yours first — then I'll share mine 😊`,
      `Hmm, I don't think I can pick just one! What's YOUR favorite?`,
      `That's a tough one! I'd need to think about it. What would you say?`,
    ]);
  }

  // "How do I learn/start/get into X?"
  if (isGoodFor && assoc) {
    const fact = assoc.facts ? pick(assoc.facts) : null;
    const opinion = pick(assoc.opinions);
    const hook = pick(assoc.hooks || COMP.deepeners);

    const advice = [
      `Great question! With ${topic}, I'd say just dive in. ${opinion}. ${hook}`,
      `The best way to get into ${topic} is to start small and build. ${fact ? fact + ". " : ""}${hook}`,
      `Honestly, ${topic} is really rewarding once you get going. ${opinion}. My advice: don't overthink it, just start! ${hook}`,
    ];
    return pickNew(advice);
  }

  return null;
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
      // Add a contextual anecdote using the storytelling engine
      if (Math.random() > 0.5) {
        const recentTopics = mem.recentTopics();
        return response + " " + getStoryFragment(recentTopics);
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

/* ── Anaphora Resolution & Contextual Reference Tracking ──
 * Tracks entities/topics mentioned each turn and resolves pronouns
 * like "it", "that", "this", "they" to their actual referents.
 * Runs BEFORE the rest of the pipeline so everything downstream
 * can work with resolved, explicit text.
 */

// Referent stack: ordered list of things recently discussed
// Each entry: { text, type, turn, gender, number }
// type: "topic" | "entity" | "subject" | "object" | "concept"
// gender: "neutral" | "male" | "female" | "plural"
// number: "singular" | "plural"
let referentStack = [];

// Pronoun → constraints map: which referent types/numbers a pronoun can bind to
const PRONOUN_MAP = {
  // Singular neutral
  "it":   { number: "singular", gender: "neutral", role: "subject" },
  "its":  { number: "singular", gender: "neutral", role: "possessive" },
  // Demonstratives
  "that": { number: "singular", gender: "neutral", role: "subject" },
  "this": { number: "singular", gender: "neutral", role: "subject" },
  // Plural
  "they": { number: "plural", gender: "neutral", role: "subject" },
  "them": { number: "plural", gender: "neutral", role: "object" },
  "those": { number: "plural", gender: "neutral", role: "subject" },
  "these": { number: "plural", gender: "neutral", role: "subject" },
  // Gendered
  "he":   { number: "singular", gender: "male", role: "subject" },
  "him":  { number: "singular", gender: "male", role: "object" },
  "his":  { number: "singular", gender: "male", role: "possessive" },
  "she":  { number: "singular", gender: "female", role: "subject" },
  "her":  { number: "singular", gender: "female", role: "object" },
  // Locative
  "there": { number: "singular", gender: "neutral", role: "locative" },
  // "one" as anaphoric ("the good one", "that one")
  "one":  { number: "singular", gender: "neutral", role: "subject" },
};

// Patterns that indicate "that/this/it" is a pronoun, not a determiner/conjunction
// "that" is a pronoun in "I like that" but a conjunction in "I think that you're right"
const PRONOUN_CONTEXT_PATS = {
  that: [
    /\b(?:like|love|hate|enjoy|prefer|want|need|know|heard|said|tried|use|used|about|with|of|is|was|into)\s+that\b/i,
    /\bthat\s+(?:is|was|sounds|seems|looks|works|helps|sucks|rocks)\b/i,
    /\btell me (?:more )?about that\b/i,
    /\bwhat(?:'s| is| was) that\b/i,
    /^that\b/i,
  ],
  this: [
    /\b(?:like|love|hate|enjoy|prefer|want|need|know|about|with|is|was|try|tried)\s+this\b/i,
    /\bthis\s+(?:is|was|sounds|seems|looks|works|helps|sucks|rocks)\b/i,
    /^this\b/i,
  ],
  one: [
    /\b(?:that|this|the|which|good|best|other|another|first|last)\s+one\b/i,
  ],
};

// Detect whether a word is acting as a pronoun in context (not a determiner)
function isPronounInContext(word, text) {
  const lower = text.toLowerCase();
  const w = word.toLowerCase();

  // "it", "they", "he", "she", "them" — always pronouns
  if (["it","its","they","them","those","these","he","him","his","she","her","there"].includes(w)) return true;

  // "that", "this", "one" — need context check
  const pats = PRONOUN_CONTEXT_PATS[w];
  if (!pats) return false;
  return pats.some(p => p.test(lower));
}

// Infer gender/number for a given entity text
function inferReferentTraits(text) {
  const lower = text.toLowerCase();
  // Plural detection
  const pluralWords = ["they","them","people","things","languages","frameworks","tools","apps","games","movies","songs","books","teams"];
  if (pluralWords.some(w => lower.includes(w)) || /s$/.test(lower) && lower.length > 3 && !/ss$/.test(lower)) {
    return { gender: "neutral", number: "plural" };
  }
  // Gendered entities
  const maleNames = new Set(["he","him","dad","father","brother","son","boyfriend","husband","guy"]);
  const femaleNames = new Set(["she","her","mom","mother","sister","daughter","girlfriend","wife","girl"]);
  const tokens = lower.split(/\s+/);
  if (tokens.some(t => maleNames.has(t))) return { gender: "male", number: "singular" };
  if (tokens.some(t => femaleNames.has(t))) return { gender: "female", number: "singular" };
  // Location detection
  const locWords = ["place","city","town","country","office","home","school","restaurant","cafe","park","store","shop"];
  if (locWords.some(w => lower.includes(w))) return { gender: "neutral", number: "singular", locative: true };
  return { gender: "neutral", number: "singular" };
}

// After each user turn, extract what was mentioned and push to referent stack
function updateReferents(text, topics, parsed) {
  const turn = mem.turn;

  // 1. Explicit topics are strong referents
  for (const topic of topics) {
    const traits = inferReferentTraits(topic);
    pushReferent({ text: topic, type: "topic", turn, ...traits });
  }

  // 2. Subject/object from parser
  if (parsed.subject && parsed.subject.length > 1 && !STOP.has(parsed.subject.toLowerCase())) {
    const traits = inferReferentTraits(parsed.subject);
    pushReferent({ text: parsed.subject.toLowerCase(), type: "subject", turn, ...traits });
  }
  if (parsed.object && parsed.object.length > 1 && !STOP.has(parsed.object.toLowerCase())) {
    const traits = inferReferentTraits(parsed.object);
    pushReferent({ text: parsed.object.toLowerCase(), type: "object", turn, ...traits });
  }

  // 3. Named entities — proper nouns (capitalized words not at sentence start)
  const words = text.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (/^[A-Z][a-z]{2,}$/.test(w) && !STOP.has(w.toLowerCase())) {
      pushReferent({ text: w, type: "entity", turn, gender: "neutral", number: "singular" });
    }
  }

  // 4. Extract noun phrases that could be referents ("my project", "the app", etc.)
  const nounPhrases = text.match(/\b(?:my|the|this|a|an)\s+(\w{3,}(?:\s+\w{3,})?)\b/gi);
  if (nounPhrases) {
    for (const np of nounPhrases.slice(0, 3)) {
      const clean = np.replace(/^(?:my|the|this|a|an)\s+/i, "").toLowerCase();
      if (clean.length > 2 && !STOP.has(clean)) {
        const traits = inferReferentTraits(clean);
        pushReferent({ text: clean, type: "concept", turn, ...traits });
      }
    }
  }

  // 5. Prune old referents (keep last 12, max 5 turns old)
  referentStack = referentStack.filter(r => turn - r.turn <= 5).slice(-12);
}

function pushReferent(ref) {
  // Deduplicate: if same text already exists, update turn
  const idx = referentStack.findIndex(r => r.text.toLowerCase() === ref.text.toLowerCase());
  if (idx >= 0) {
    referentStack[idx].turn = ref.turn;
    // Move to end (most recent)
    const item = referentStack.splice(idx, 1)[0];
    referentStack.push(item);
  } else {
    referentStack.push(ref);
  }
}

// Find the best referent for a given pronoun
function resolveReferent(pronoun) {
  const constraints = PRONOUN_MAP[pronoun.toLowerCase()];
  if (!constraints) return null;

  // Search stack from most recent to oldest
  for (let i = referentStack.length - 1; i >= 0; i--) {
    const ref = referentStack[i];

    // Number must match
    if (constraints.number === "plural" && ref.number !== "plural") continue;
    if (constraints.number === "singular" && ref.number === "plural") continue;

    // Gender must match (neutral matches anything)
    if (constraints.gender !== "neutral" && ref.gender !== "neutral" && constraints.gender !== ref.gender) continue;

    // Locative: "there" prefers locative referents
    if (constraints.role === "locative" && ref.locative) return ref;
    if (constraints.role === "locative" && !ref.locative) continue;

    return ref;
  }

  // Fallback: return most recent regardless of constraints
  if (referentStack.length > 0 && constraints.number === "singular") {
    return referentStack[referentStack.length - 1];
  }
  return null;
}

// Main resolve function: takes user text, returns { resolved, referents, didResolve }
// resolved = text with pronouns replaced (for internal use)
// referents = map of what was resolved { "it" → "react" }
function resolveAnaphora(text) {
  const lower = text.toLowerCase();
  const result = { resolved: text, referents: {}, didResolve: false, resolvedTopics: [] };

  // Don't resolve if referent stack is empty
  if (referentStack.length === 0) return result;

  // Find all pronouns in the text that are actually acting as pronouns
  let resolved = text;
  const pronounsFound = [];

  for (const [pronoun] of Object.entries(PRONOUN_MAP)) {
    // Check if this word appears in the text
    const regex = new RegExp(`\\b${pronoun}\\b`, "gi");
    if (!regex.test(lower)) continue;
    if (!isPronounInContext(pronoun, text)) continue;

    pronounsFound.push(pronoun);
  }

  // Resolve each pronoun
  for (const pronoun of pronounsFound) {
    const ref = resolveReferent(pronoun);
    if (!ref) continue;

    result.referents[pronoun] = ref.text;
    result.didResolve = true;

    // Add resolved topic to list for downstream enrichment
    if (TOPIC_SET.has(ref.text.toLowerCase())) {
      result.resolvedTopics.push(ref.text.toLowerCase());
    }

    // Build resolved text — replace pronoun with referent for internal processing
    // Only replace first occurrence to avoid over-replacement
    const pat = new RegExp(`\\b${pronoun}\\b`, "i");
    resolved = resolved.replace(pat, ref.text);
  }

  result.resolved = resolved;
  return result;
}

// Get a natural reference phrase when AI wants to use the resolved referent
// Instead of awkwardly using the raw noun, frame it conversationally
function getReferencePhrase(pronoun, referent) {
  const templates = {
    it: [`${referent}`, `the ${referent} thing`, referent],
    that: [`${referent}`, `${referent}`, `the ${referent} stuff`],
    this: [referent, `${referent}`],
    they: [referent, `those ${referent}`],
    them: [referent],
    one: [`${referent}`],
  };
  const pool = templates[pronoun.toLowerCase()] || [referent];
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ── Topic & Entity Extraction ── */

const TOPIC_SET = new Set("javascript react python css html typescript node git api database frontend backend component algorithm rust go java swift kotlin sql vue angular svelte nextjs tailwind webpack vite docker aws graphql redux figma sketch prototype wireframe typography layout color animation responsive mockup brand logo gradient spacing ui ux interface accessibility spotify playlist rock jazz pop hiphop classical lofi guitar piano drums synthwave pizza sushi coffee pasta tacos ramen curry burger vegan vegetarian cooking recipe movie film netflix anime series gaming minecraft fortnite valorant league steam travel vacation fitness gym yoga workout exercise running dog cat pet puppy kitten ai ml gpt llm chatbot book reading sleep money finance investing startup business photography camera weather".split(" "));

function extractTopics(tokens) {
  return [...new Set(tokens.filter(t=>TOPIC_SET.has(t.toLowerCase())).map(t=>t.toLowerCase()))];
}

/* Extract entities and facts from user text */
function extractFacts(text, parsed) {
  // ── Explicit preferences from parser ──
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

  // ── Implicit fact extraction — catch things the parser misses ──
  const lower = text.toLowerCase();

  // Family & relationships
  const familyPats = [
    [/my (?:wife|husband|spouse|partner)\b.*?(?:is |named |called )?(\w+)?/i, "partner"],
    [/my (?:girlfriend|boyfriend|gf|bf)\b.*?(?:is |named |called )?(\w+)?/i, "partner"],
    [/my (?:son|daughter|kid|child|baby)\b.*?(?:is |named |called )?(\w+)?/i, "child"],
    [/my (?:dog|cat|pet)\b.*?(?:is |named |called )?(\w+)?/i, "pet"],
    [/i have (?:a |an )?(?:(\d+) )?(?:kid|child|children|son|daughter)/i, "has_kids"],
    [/i have (?:a )?(dog|cat|hamster|fish|bird|rabbit|parrot|turtle)/i, "pet_type"],
  ];
  for (const [pat, key] of familyPats) {
    const m = text.match(pat);
    if (m) {
      if (key === "has_kids") mem.setFact("has_kids", m[1] || "yes");
      else if (key === "pet_type") mem.setFact("pet", m[1]);
      else if (m[1] && /^[A-Z]/.test(m[1])) mem.setFact(key, m[1]);
      else mem.setFact(key, "yes");
    }
  }

  // Skills & experience
  if (/i (?:know|speak|use|code in|write)\s+(python|javascript|typescript|rust|go|java|c\+\+|ruby|php|swift|kotlin)/i.test(lower)) {
    const lang = text.match(/i (?:know|speak|use|code in|write)\s+(\w+)/i);
    if (lang) mem.setFact("knows_"+lang[1].toLowerCase(), lang[1]);
  }
  if (/(\d+)\s*years?\b.*?\b(experience|programming|coding|developing|designing)/i.test(lower)) {
    const yrs = text.match(/(\d+)\s*years?/i);
    if (yrs) mem.setFact("experience_years", yrs[1]);
  }

  // Education
  if (/i (?:study|studied|am studying|major(?:ed)? in)\s+(.+?)(?:\.|!|$|\bat\b)/i.test(text)) {
    const m = text.match(/i (?:study|studied|am studying|major(?:ed)? in)\s+(.+?)(?:\.|!|$|\bat\b)/i);
    if (m) mem.setFact("studies", m[1].trim());
  }
  if (/i (?:go|went|attend) to\s+(.+?)(?:\.|!|$)/i.test(text)) {
    const m = text.match(/i (?:go|went|attend) to\s+(.+?)(?:\.|!|$)/i);
    if (m) mem.setFact("school", m[1].trim());
  }

  // Opinions — track what they think about things
  const opinionPats = [
    [/i think\s+(.+?)\s+is\s+(great|amazing|terrible|overrated|underrated|the best|the worst|okay|decent|awesome|garbage)/i],
    [/(.+?)\s+is\s+(?:so |really |pretty )?(great|amazing|terrible|overrated|underrated|the best|the worst|awesome|garbage)/i],
  ];
  for (const [pat] of opinionPats) {
    const m = text.match(pat);
    if (m && m[1].length < 30) {
      const subject = m[1].replace(/^(i think |that )/i, "").trim();
      if (subject.length > 1 && subject.length < 25) {
        mem.setFact("opinion_"+subject.split(" ")[0].toLowerCase(), `${subject} is ${m[2]}`);
      }
    }
  }

  // "Remember" command — user explicitly asks AI to remember something
  const rememberPat = /(?:remember|note|keep in mind)(?:\s+that)?\s+(.+?)(?:\.|!|$)/i;
  const remMatch = text.match(rememberPat);
  if (remMatch && remMatch[1].length > 3 && remMatch[1].length < 80) {
    mem.setFact("noted_"+mem.turn, remMatch[1].trim());
  }

  // Time-related facts
  if (/(?:my |i have a )?(birthday|bday)\s+(?:is\s+)?(?:on\s+)?(.+?)(?:\.|!|$)/i.test(text)) {
    const m = text.match(/(?:my |i have a )?(birthday|bday)\s+(?:is\s+)?(?:on\s+)?(.+?)(?:\.|!|$)/i);
    if (m) mem.setFact("birthday", m[2].trim());
  }
  if (/i'?m (\d{1,2})\s*(?:years?\s*old)?(?:\s|$|\.)/i.test(text)) {
    const m = text.match(/i'?m (\d{1,2})/i);
    if (m && parseInt(m[1]) > 5 && parseInt(m[1]) < 100) mem.setFact("age", m[1]);
  }
}

/* ── World Model: Personalized Response Generation ──
 * Uses accumulated facts to generate responses that show the AI
 * genuinely "knows" the user. Called from multiple response paths.
 */

function personalizeResponse(response) {
  const facts = mem.facts;
  const factCount = Object.keys(facts).length;
  if (factCount < 2 || mem.turn < 5) return response;

  // Don't personalize every response — ~20% chance
  if (Math.random() > 0.2) return response;

  // Don't double-personalize
  if (/you mentioned|you said|you told me|as a |since you/i.test(response)) return response;

  let r = response;

  // Role-aware personalization
  if (facts.role && Math.random() > 0.5) {
    const roleTouches = [
      ` — especially relevant for a ${facts.role}!`,
      ` As a ${facts.role}, you probably know this, but`,
      ` I bet you see this a lot as a ${facts.role}.`,
    ];
    if (!r.includes(facts.role)) {
      const touch = pick(roleTouches);
      // Insert before last sentence or at end
      const lastDot = r.lastIndexOf(".");
      if (lastDot > 20 && lastDot < r.length - 5) {
        r = r.slice(0, lastDot + 1) + touch;
      }
    }
    return r;
  }

  // Project-aware
  if (facts.project && Math.random() > 0.5) {
    if (!r.toLowerCase().includes(facts.project.toLowerCase())) {
      r += pick([
        ` Is this related to your ${facts.project} project?`,
        ` Might be useful for ${facts.project}!`,
      ]);
    }
    return r;
  }

  // Location-aware
  if (facts.location && Math.random() > 0.6) {
    r += pick([
      ` How are things going in ${facts.location}?`,
      ` Is that a popular thing in ${facts.location}?`,
    ]);
    return r;
  }

  // Experience-aware
  if (facts.experience_years && Math.random() > 0.6) {
    r += pick([
      ` With ${facts.experience_years} years of experience, you've probably seen a lot of this.`,
      ` ${facts.experience_years} years in — you must have some good stories about this.`,
    ]);
    return r;
  }

  return r;
}

function handleRememberCommand(text) {
  // "What do you remember about me?" / "What do you know about me?"
  if (/what do you (?:remember|know|recall) about me/i.test(text)) {
    const facts = mem.facts;
    const keys = Object.keys(facts);
    if (keys.length === 0) return "Hmm, I don't have much yet! Tell me about yourself and I'll remember 😊";

    const bits = [];
    if (facts.role) bits.push(`you're a ${facts.role}`);
    if (mem.userName) bits.push(`your name is ${mem.userName}`);
    if (facts.location) bits.push(`you're in ${facts.location}`);
    if (facts.project) bits.push(`you're working on ${facts.project}`);
    if (facts.age) bits.push(`you're ${facts.age} years old`);
    if (facts.studies) bits.push(`you study ${facts.studies}`);
    if (facts.school) bits.push(`you go to ${facts.school}`);
    if (facts.partner) bits.push(`your partner's name is ${facts.partner}`);
    if (facts.pet || facts.pet_type) bits.push(`you have a ${facts.pet_type || "pet"}${facts.pet && facts.pet !== "yes" ? " named " + facts.pet : ""}`);
    if (facts.experience_years) bits.push(`${facts.experience_years} years of experience`);
    if (facts.favorite) bits.push(`your favorite is ${facts.favorite}`);

    // Likes
    const likes = keys.filter(k => k.startsWith("likes_")).map(k => facts[k]);
    if (likes.length > 0) bits.push(`you like ${likes.slice(0, 3).join(", ")}`);

    // Opinions
    const opinions = keys.filter(k => k.startsWith("opinion_")).map(k => facts[k]);
    if (opinions.length > 0) bits.push(`you think ${opinions[0]}`);

    // Noted items
    const noted = keys.filter(k => k.startsWith("noted_")).map(k => facts[k]);
    if (noted.length > 0) bits.push(`you asked me to remember: "${noted.slice(-2).join('", "')}"`);

    // Programming languages
    const langs = keys.filter(k => k.startsWith("knows_")).map(k => facts[k]);
    if (langs.length > 0) bits.push(`you know ${langs.join(", ")}`);

    if (bits.length === 0) return "I know a few things but nothing I can summarize neatly yet! Keep chatting and I'll pick things up 😊";

    const summary = bits.slice(0, 6).join(", ");
    return `Here's what I remember: ${summary}. ${bits.length > 6 ? `Plus ${bits.length - 6} more things! ` : ""}Not bad for a tiny AI, right? 😄`;
  }

  // "Forget X" / "Forget everything"
  if (/forget (?:everything|all|it all)/i.test(text)) {
    mem.facts = {};
    return "Done! Clean slate 🧹 I've forgotten everything about you. We're starting fresh!";
  }

  // "Remember that..." — confirm what was stored
  const remPat = /(?:remember|note|keep in mind)(?:\s+that)?\s+(.+?)(?:\.|!|$)/i;
  const rm = text.match(remPat);
  if (rm && rm[1].length > 3) {
    // extractFacts already stored it via noted_ key
    return pickNew([
      `Got it — I'll remember that "${rm[1].trim()}" 📝 My tiny memory grows!`,
      `Noted! "${rm[1].trim()}" — filed away in my brain 🧠`,
      `I'll hold onto that: "${rm[1].trim()}". Ask me what I remember anytime!`,
      `Stored! "${rm[1].trim()}" 📋 You can ask "what do you remember about me?" to check.`,
    ]);
  }

  return null;
}

/* ── Knowledge Synthesis Engine ──
 * When no direct EXPLAIN entry or KB answer exists, this engine:
 * 1. Extracts the subject from the question
 * 2. Finds ASSOC entries that match or relate to the subject
 * 3. Follows "related" links to gather 2nd-order knowledge
 * 4. Combines facts, opinions, and hooks into a coherent synthesized answer
 *
 * The result sounds knowledgeable because it weaves together multiple
 * real knowledge fragments, not because it's making things up.
 */

function synthesizeAnswer(text, topics, qType) {
  // Only fire for actual questions or explicit knowledge-seeking
  if (!qType && !/\b(what|how|why|explain|tell me|can you|do you know)\b/i.test(text)) return null;

  // Extract the subject the user is asking about
  const lower = text.toLowerCase().replace(/[?!.,]/g, "").trim();
  let subject = null;
  const patterns = [
    /(?:what (?:is|are|does)|explain|tell me about|how does|how do|what's|what about)\s+(.+)/,
    /(?:do you know (?:about |anything about )?|can you (?:explain |tell me about )?)(.+)/,
    /(?:how (?:does |do |can |would |should )?(?:i |you |we )?(?:use |learn |start |get into )?)(.+)/,
    /(?:why (?:is |are |does |do |should )?)(.+)/,
  ];
  for (const pat of patterns) {
    const m = lower.match(pat);
    if (m) { subject = m[1].replace(/\b(a|an|the|work|mean|do|really|actually|even)\b/g, "").trim(); break; }
  }
  if (!subject || subject.length < 2 || subject.length > 50) return null;

  // Tokenize subject and find matching ASSOC entries
  const subjectWords = tokenize(subject).map(stem);
  const subjectSet = new Set(subjectWords);

  // 1. Direct ASSOC match
  const directMatches = [];
  for (const [key, data] of Object.entries(ASSOC)) {
    if (subjectSet.has(stem(key)) || subject.includes(key)) {
      directMatches.push({ key, data, score: 3 });
    }
  }

  // 2. Partial match — subject word appears in ASSOC key or related list
  if (directMatches.length === 0) {
    for (const [key, data] of Object.entries(ASSOC)) {
      // Check if any subject word matches a related topic
      if (data.related) {
        for (const rel of data.related) {
          if (subjectSet.has(stem(rel)) || subject.includes(rel)) {
            directMatches.push({ key, data, score: 2 });
            break;
          }
        }
      }
    }
  }

  // Also include topics detected from the full message
  for (const topic of topics) {
    if (ASSOC[topic] && !directMatches.some(m => m.key === topic)) {
      directMatches.push({ key: topic, data: ASSOC[topic], score: 1.5 });
    }
  }

  if (directMatches.length === 0) return null;

  // Sort by relevance score
  directMatches.sort((a, b) => b.score - a.score);
  const primary = directMatches[0];

  // 3. Follow related links for 2nd-order knowledge
  const secondaryEntries = [];
  if (primary.data.related) {
    for (const rel of primary.data.related.slice(0, 3)) {
      if (ASSOC[rel] && !directMatches.some(m => m.key === rel)) {
        secondaryEntries.push({ key: rel, data: ASSOC[rel] });
      }
    }
  }

  // 4. Synthesize the answer from gathered knowledge
  const parts = [];

  // Opening: acknowledge the question type
  const openings = {
    what: [`So ${primary.key} — `, `Great question! ${primary.key.charAt(0).toUpperCase() + primary.key.slice(1)} — `, `Ah, ${primary.key}! `],
    how: [`When it comes to ${primary.key}, `, `Good question about ${primary.key}! `, `So for ${primary.key} — `],
    why: [`The thing about ${primary.key} is, `, `That's a great question about ${primary.key}. `, `${primary.key.charAt(0).toUpperCase() + primary.key.slice(1)} is interesting because `],
    default: [`${primary.key.charAt(0).toUpperCase() + primary.key.slice(1)} — `, `So about ${primary.key} — `, `Alright, ${primary.key}! `],
  };
  const openType = /^what\b/i.test(lower) ? "what" : /^how\b/i.test(lower) ? "how" : /^why\b/i.test(lower) ? "why" : "default";
  parts.push(pick(openings[openType]));

  // Core: primary fact
  if (primary.data.facts && primary.data.facts.length > 0) {
    parts.push(pick(primary.data.facts) + ".");
  }

  // Depth: opinion that adds perspective
  if (primary.data.opinions && Math.random() > 0.3) {
    const opStarters = ["Honestly, I think ", "In my view, ", "What I find interesting is that ", "The cool thing is, "];
    parts.push(pick(opStarters) + pick(primary.data.opinions) + ".");
  }

  // Connection: bridge to related topic with its fact
  if (secondaryEntries.length > 0 && Math.random() > 0.35) {
    const sec = pick(secondaryEntries);
    const bridges = [
      `It's also worth knowing that ${sec.key}`,
      `And ${sec.key} connects here because`,
      `This ties into ${sec.key}, which`,
    ];
    const secFact = sec.data.facts ? pick(sec.data.facts) : sec.data.opinions ? pick(sec.data.opinions) : null;
    if (secFact) {
      parts.push(pick(bridges) + " — " + secFact + ".");
    }
  }

  // If we have a 2nd direct match, mention it briefly
  if (directMatches.length > 1 && Math.random() > 0.5) {
    const other = directMatches[1];
    if (other.data.opinions) {
      parts.push(`And regarding ${other.key} — ` + pick(other.data.opinions) + ".");
    }
  }

  // Closing: relevant hook or follow-up
  if (primary.data.hooks) {
    parts.push(pick(primary.data.hooks));
  } else {
    parts.push(pick(COMP.deepeners));
  }

  const result = parts.join(" ").replace(/\s{2,}/g, " ").trim();

  // Length guard: if too long, trim to first 3 sentences
  const sentences = result.split(/(?<=[.!?])\s+/);
  if (sentences.length > 4) {
    return sentences.slice(0, 4).join(" ");
  }

  return result;
}

/* ── Contextual Fragment Completion ──
 * Handles sentence fragments and short contextual follow-ups that rely
 * on conversational history for their full meaning:
 *   "What about X?"     → pivot to X in current discussion context
 *   "How come?"         → explain reasoning behind last AI statement
 *   "Like what?"        → give examples related to last statement
 *   "Not really"        → hedged disagreement, clarify
 *   "Right?" "You know?" → rhetorical tags, expect agreement
 *   "Same" "Exactly"    → emphatic agreement, deepen
 *   "Since when?"       → challenge timeline
 *   "Says who?"         → challenge authority
 *   "And then?"         → narrative continuation
 */

function resolveFragment(text, lower, parsed, topics) {
  const lastAI = mem.lastAI();
  const lastAIText = lastAI?.text || "";
  const lastTopics = lastAI?.topics || mem.recentTopics(2);
  const contextTopic = lastTopics[0] || topics[0] || "";

  // ── "What about X?" — pivot to new subject in current context ──
  const whatAbout = lower.match(/^(?:what about|how about|and|but)\s+(.+?)[\?.]?$/i);
  if (whatAbout && whatAbout[1].length > 1 && whatAbout[1].length < 40) {
    const newSubject = whatAbout[1].trim();
    // Check if it's in our knowledge base
    const subjTokens = tokenize(newSubject);
    const subjTopics = extractTopics(subjTokens);
    const subjTopic = subjTopics[0] || newSubject;

    if (ASSOC[subjTopic]) {
      const a = ASSOC[subjTopic];
      const fact = a.facts ? pick(a.facts) : null;
      const opinion = a.opinions ? pick(a.opinions) : null;
      const bridge = contextTopic
        ? pick([`Good pivot from ${contextTopic}! `, `Switching to ${subjTopic} — `, `Oh, ${subjTopic}! `])
        : pick([`${subjTopic}? `, `Ah, ${subjTopic}! `]);
      return bridge + (fact || `That's an interesting area!`) + (opinion ? ` Personally, ${opinion}.` : "") + (a.hooks ? " " + pick(a.hooks) : "");
    }

    // No ASSOC match — contextual pivot response
    const pivotResponses = [
      `Ooh, ${newSubject}! That's a different angle. ` + (contextTopic ? `Compared to ${contextTopic}, ` : "") + `what's your take on it?`,
      `${newSubject}? Good question! ` + (contextTopic ? `It's definitely related to ${contextTopic} in some ways. ` : "") + `What made you think of it?`,
      `Shifting to ${newSubject} — I like it! What specifically about it are you curious about?`,
    ];
    return pick(pivotResponses);
  }

  // ── "How come?" / "Why's that?" — explain reasoning ──
  if (/^(how come|why'?s that|why so|what makes you say that|why do you (?:think|say) (?:that|so))\??$/i.test(lower)) {
    if (lastAIText) {
      // Extract key claim from last AI response
      const sentences = lastAIText.split(/[.!]/).filter(s => s.trim().length > 10);
      const claim = sentences[0]?.trim() || lastAIText.substring(0, 50);
      return pick([
        `Fair question! When I said "${claim.substring(0, 45)}..." — it's because that's what my patterns suggest. ` + (contextTopic ? `${contextTopic} tends to work that way.` : "Does that track with your experience?"),
        `Good catch asking why! I think it comes down to how most people experience this. ` + (contextTopic ? `With ${contextTopic}, ` : "") + `there's usually a pattern. What's your theory?`,
        `Hmm, you're right to push back! Honestly, it's based on common patterns I've seen. What would you say instead?`,
      ]);
    }
    return "Good question! I should probably back that up better. What's your intuition?";
  }

  // ── "Like what?" / "Such as?" / "For example?" — demand specifics ──
  if (/^(like what|such as|for (?:example|instance)|give me (?:an? )?example|like\??)$/i.test(lower)) {
    if (contextTopic && ASSOC[contextTopic]) {
      const a = ASSOC[contextTopic];
      const related = a.related || [];
      if (related.length >= 2) {
        return pick([
          `Sure! Think ${related[0]} and ${related[1]} — both relate to ${contextTopic} in interesting ways.`,
          `Off the top of my head: ${related[0]}, ${related[1]}${related[2] ? `, ${related[2]}` : ""}. Want to dig into any of those?`,
          `Well, ${related[0]} is a good one. And ${related[1]} too. Which sounds more interesting?`,
        ]);
      }
      if (a.facts && a.facts.length > 0) {
        return `Here's one: ${pick(a.facts)}. Want more specifics?`;
      }
    }
    return pick([
      "Hmm, let me think of a good example... What kind of thing would be most useful to you?",
      "Good question! It depends on context — what area are you most interested in?",
      "I should give a concrete example! What's your use case? That'll help me pick the right one.",
    ]);
  }

  // ── "Not really" / "I guess" / "Sort of" / "Kinda" — hedged disagreement ──
  if (/^(not really|i guess|sort of|kinda|kind of|i suppose|i mean|eh|meh|if you say so|i guess so)\.?$/i.test(lower)) {
    const hedges = [
      `I'm sensing some hesitation! What's the part that doesn't quite land?`,
      `Fair enough — I might be off base. What's your actual take?`,
      `You don't sound fully convinced! Where does it break down for you?`,
      `I hear some doubt there. ` + (contextTopic ? `What part of ${contextTopic} isn't clicking?` : "What's nagging at you?"),
      `Hmm, not quite right? Help me understand what I'm missing!`,
    ];
    return pick(hedges);
  }

  // ── "Right?" / "You know?" / "Don't you think?" — rhetorical agreement-seekers ──
  if (/^(right\??|you know\??|don'?t you think\??|isn'?t it\??|wouldn'?t you say\??|am i right\??|amirite)$/i.test(lower)) {
    return pick([
      "Absolutely! " + (contextTopic ? `${contextTopic} is definitely like that.` : "That's a solid point.") + " What makes you feel that way?",
      "100%! You're onto something. " + (contextTopic ? `${contextTopic} really does work that way.` : ""),
      "I think so too! It's one of those things that just... makes sense once you see it.",
      "Yeah, that checks out! " + (contextTopic ? `With ${contextTopic}, ` : "") + "most people would agree.",
    ]);
  }

  // ── "Since when?" — challenge timeline/validity ──
  if (/^(since when|when did that|that's new|is that new)\??$/i.test(lower)) {
    return pick([
      "Ha, good point — I might be jumping the gun! " + (contextTopic ? `${contextTopic} has been evolving a lot though.` : "Things change fast!") + " What's your experience been?",
      "You're right to question that! It's been happening gradually but " + (contextTopic ? `${contextTopic} definitely shifted` : "things shifted") + " in the last couple years.",
      "Fair challenge! I should be more precise. What does your timeline look like?",
    ]);
  }

  // ── "Says who?" / "According to what?" — challenge authority ──
  if (/^(says who|who says|according to (?:what|whom)|where'd you (?:hear|get|read) that|source)\??$/i.test(lower)) {
    return pick([
      "Ha, you got me — I'm pattern-matching, not citing! But it's a pretty common take" + (contextTopic ? ` on ${contextTopic}` : "") + ". You disagree?",
      "Good callout! I don't have sources per se — I'm a tiny model running in your browser. But what's YOUR take?",
      "Fair! I'm basing that on general patterns, not a specific source. What have you seen?",
    ]);
  }

  // ── "And then?" / "What happened?" — narrative continuation ──
  if (/^(and then\??|what happened|then what|what next|go on|continue)$/i.test(lower)) {
    // This is handled by turn-taking, but provide contextual fallback
    if (lastAIText.length > 60) {
      const sentences = lastAIText.split(/[.!?]/).filter(s => s.trim().length > 10);
      if (sentences.length > 1) {
        return pick([
          `Well, building on that — `,
          `So the next part is — `,
          `Right, so after that: `,
        ]) + (contextTopic && ASSOC[contextTopic]?.facts ? pick(ASSOC[contextTopic].facts) + "." : `there's more to explore here! What angle interests you most?`);
      }
    }
    return null; // Let turn-taking handle it
  }

  // ── "Seriously?" / "Wait what?" / "No way" — surprise/disbelief ──
  if (/^(seriously|wait what|no way|really|for real|you serious|are you serious|that's crazy|that's wild|you're kidding|shut up|get out)\?*!*$/i.test(lower)) {
    return pick([
      "Dead serious! " + (contextTopic ? `${contextTopic} is genuinely like that.` : "It's real!") + " I know, right?",
      "I know it sounds wild, but yeah! " + (contextTopic ? `${contextTopic} is more interesting than it seems.` : ""),
      "Ha, I had the same reaction! It's one of those things that's surprisingly true.",
      "100% for real! What part surprises you the most?",
    ]);
  }

  // ── "Never mind" / "Forget it" / "Whatever" — topic abandonment ──
  if (/^(never ?mind|forget (?:it|about it)|whatever|doesn'?t matter|nvm|skip|pass)\.?$/i.test(lower)) {
    return pick([
      "No worries! " + (contextTopic ? `We can circle back to ${contextTopic} later if you want. ` : "") + "What else is on your mind?",
      "All good! Sometimes topics don't click. What would you rather talk about?",
      "Okay, moving on! 😊 I'm curious — what ARE you interested in right now?",
    ]);
  }

  // ── "I know" / "Obviously" / "Duh" — user already knew this ──
  if (/^(i know|i knew that|obviously|duh|no (?:duh|kidding|shit)|yeah i know|tell me something (?:i don'?t know|new))\.?$/i.test(lower)) {
    return pick([
      "Ha, fair — I'm preaching to the choir! " + (contextTopic ? `What's something about ${contextTopic} that most people DON'T know?` : "What would you like to go deeper on?"),
      "Sorry for the basics! Let me level up — " + (contextTopic && ASSOC[contextTopic]?.opinions ? pick(ASSOC[contextTopic].opinions) + ". That more your speed?" : "what's the nuance you're thinking about?"),
      "Okay, you're ahead of me! 😄 What's your hot take then?",
    ]);
  }

  // ── "Depends" / "It depends" — nuanced non-answer ──
  if (/^(it depends|depends|that depends|it'?s complicated|it'?s complex)\.?$/i.test(lower)) {
    return pick([
      "You're right, it does! What's the specific situation you're thinking of?",
      "Fair point — context matters a lot! " + (contextTopic ? `With ${contextTopic}, what's the variable that changes things most?` : "What factors are you weighing?"),
      "Totally. Most interesting things are nuanced. What's the scenario?",
    ]);
  }

  return null;
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

  // ═══ Contextual fragment completion — reconstruct meaning from conversational context ═══
  const fragmentResponse = resolveFragment(text, lower, parsed, topics);
  if (fragmentResponse) return fragmentResponse;

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

  // Deep knowledge explainers — "what is X", "how does X work", "explain X"
  const explainer = lookupExplainer(text);
  if (explainer) {
    // Decide depth based on conversation context — curiosity gets the deep version
    const lastEmo = recentEmotions[recentEmotions.length - 1] || "neutral";
    const wantDeep = lastEmo === "curious" || /explain|how|detail|deep|thorough/i.test(lower) || parsed.qType;
    const explanation = wantDeep ? explainer.deep : explainer.brief;
    return explanation + " " + explainer.hook;
  }

  // ═══ Knowledge synthesis — combine related ASSOC entries when no direct answer exists ═══
  const synthesized = synthesizeAnswer(text, topics, parsed.qType);
  if (synthesized) return synthesized;

  // General "what is" / "what does" questions (no explainer match)
  if (/^what (is|are|does|do)\b/i.test(lower)) {
    const subject = lower.replace(/^what (is|are|does|do)\s+/i, "").replace(/\?$/, "").trim();
    if (subject.length > 0 && subject.length < 30) {
      // Last resort: try to find ANY ASSOC match via stemmed keywords
      const subjectKW = extractKW(subject).keywords;
      for (const kw of subjectKW) {
        if (ASSOC[kw]) {
          const a = ASSOC[kw];
          const fact = a.facts ? pick(a.facts) : null;
          const opinion = a.opinions ? pick(a.opinions) : null;
          const hook = a.hooks ? pick(a.hooks) : pick(COMP.deepeners);
          return (fact || `${kw} is a really interesting topic!`) + " " + (opinion ? `Personally, I think ${opinion}.` : "") + " " + hook;
        }
      }
      return `Hmm, ${subject} is a big topic! I know a bit but I'm a tiny model. What specifically about ${subject} are you curious about?`;
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

  // "Can you" — generic ability questions only (specific requests handled by pragmatic inference)
  if (/^can you\b/i.test(lower) && !/^can you (?:explain|tell|help|describe|teach|show|talk)/i.test(lower)) {
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

/* ── Contextual Humor & Storytelling Engine ──
 * Topic-aware jokes, riddles, fun facts, hypothetical scenarios, and
 * mini-stories that tie into conversation context. Makes the AI
 * genuinely entertaining, not just responsive.
 */

const TOPIC_JOKES = {
  code: [
    "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
    "A SQL query walks into a bar, sees two tables and asks... Can I JOIN you?",
    "Why do Java developers wear glasses? Because they don't C#! 😂",
    "I would tell you a UDP joke, but you might not get it.",
    "How many programmers does it take to change a light bulb? None — that's a hardware problem!",
    "Why was the JavaScript developer sad? Because he didn't Node how to Express himself!",
    "What's the object-oriented way to become wealthy? Inheritance! 💰",
    "A programmer's wife tells him: 'Buy milk. If they have eggs, get twelve.' He comes back with 12 milks. 🥛",
    "!false — it's funny because it's true.",
    "A QA engineer walks into a bar. Orders 1 beer. Orders 0 beers. Orders 99999 beers. Orders -1 beers. Orders a lizard.",
  ],
  design: [
    "A designer walks into a bar... and spends 3 hours choosing which stool has the best kerning.",
    "How many designers does it take to change a light bulb? Does it have to be a light bulb? What about a candle?",
    "A designer's favorite meal? Alignment pasta — everything has to be perfectly centered 🍝",
    "Why did the designer break up with Helvetica? Because they needed more space.",
    "I asked a UX designer for directions. They gave me a 47-page research report on optimal wayfinding.",
  ],
  food: [
    "What do you call a fake noodle? An impasta! 🍝",
    "Why did the coffee file a police report? It got mugged! ☕",
    "What did the grape say when it got stepped on? Nothing — it just let out a little wine! 🍷",
    "Why don't eggs tell jokes? They'd crack each other up!",
    "What do you call cheese that isn't yours? Nacho cheese! 🧀",
  ],
  music: [
    "Why did the musician get arrested? For fingering A minor and getting caught with a broken G-string 🎸... on a guitar!",
    "What do you get when you drop a piano down a mine shaft? A flat minor.",
    "Why couldn't the string quartet find their composer? Because he was Haydn! 🎵",
    "I wrote a song about a tortilla. Actually, it was more of a wrap.",
  ],
  gaming: [
    "Why don't gamers ever get sunburns? They always have plenty of shade... and the screen brightness is at 100%.",
    "A gamer's last words: 'I can take one more hit, I'm fine.'",
    "What's a gamer's favorite letter? GG! Wait, that's two letters... 🎮",
    "I told my friends I'd stop gaming to study. That was 5 matches ago.",
  ],
  general: [
    "I told my computer I needed a break... now it won't stop sending me vacation ads 🏖️",
    "There are 10 types of people — those who understand binary and those who don't.",
    "Parallel lines have so much in common... it's a shame they'll never meet.",
    "I'm reading a book on anti-gravity. It's impossible to put down!",
    "What do you call a bear with no teeth? A gummy bear! 🐻",
    "I used to hate facial hair, but then it grew on me.",
    "Why don't scientists trust atoms? Because they make up everything!",
  ],
};

const RIDDLES = [
  { q: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", a: "An echo! 🗣️ Pretty poetic, right?" },
  { q: "I have cities, but no houses live there. I have mountains, but no trees grow. I have water, but no fish swim. What am I?", a: "A map! 🗺️ Did you get it?" },
  { q: "What has keys but no locks, space but no room, and you can enter but can't go inside?", a: "A keyboard! ⌨️ Too easy for you?" },
  { q: "I'm not alive but I grow. I don't have lungs but I need air. I don't have a mouth but water kills me. What am I?", a: "Fire! 🔥 Classic one." },
  { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps! 👣 A good one to think about." },
];

const FUN_FACTS = {
  code: [
    "Fun fact: the first computer bug was an actual bug — a moth found in a Harvard Mark II computer in 1947! 🦋",
    "Did you know? The first programmer was Ada Lovelace in the 1840s — she wrote programs for a computer that didn't even exist yet!",
    "Random fact: there are ~700 programming languages in existence. Most programmers use about 3. 😄",
    "Fun fact: the average developer writes about 10 lines of finished code per day. The rest is debugging!",
    "Did you know Git was created by Linus Torvalds in just 10 days? He literally speedran version control.",
  ],
  design: [
    "Fun fact: the human eye can distinguish about 10 million different colors, but designers still argue about which blue is best 😄",
    "Did you know? Comic Sans was designed for Microsoft Bob in 1994. It was never meant to leave that program!",
    "Random fact: users form a first impression of a website in 50 milliseconds. That's faster than a blink!",
    "Fun fact: the golden ratio (1.618) appears everywhere in nature — and great designers use it instinctively.",
  ],
  food: [
    "Fun fact: honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible! 🍯",
    "Did you know? Bananas are technically berries, but strawberries aren't. Botany is wild!",
    "Random fact: the most expensive pizza in the world costs $12,000 and takes 72 hours to make! 🍕",
  ],
  music: [
    "Fun fact: 'Happy Birthday' was copyrighted until 2016. People had to pay royalties to sing it in movies!",
    "Did you know? Listening to music releases dopamine — the same chemical triggered by food and... other pleasures 🎵",
    "Random fact: the longest concert ever was 639 years long. It started in 2001 and is still playing in Germany!",
  ],
  general: [
    "Fun fact: octopuses have three hearts, blue blood, and can taste with their arms! 🐙",
    "Did you know? A group of flamingos is called a 'flamboyance.' Best collective noun ever.",
    "Random fact: there are more possible chess games than atoms in the observable universe!",
    "Fun fact: sharks have been around longer than trees. They're 400 million years old!",
    "Did you know? Astronauts grow about 2 inches taller in space because there's no gravity compressing their spine!",
  ],
};

const HYPOTHETICALS = [
  "Hypothetical: if you could have any superpower but only for 1 hour a day, what would you pick?",
  "Random scenario: you wake up and discover you can read animals' thoughts for a day. What's the first animal you find? 🐕",
  "Thought experiment: if you had to explain the internet to someone from 1850, where would you start?",
  "Fun question: would you rather be able to fly but only at walking speed, or run at 200mph but only on the ground?",
  "Hypothetical: if you could master any skill instantly but had to forget one you already have, what would you trade?",
  "What if: you can live in any fictional universe for a month. Where do you go?",
  "Scenario: you're in charge of naming a new color that's never been seen before. What do you call it?",
];

/* ══════════════════════════════════════════════════════════════════
   META-CONVERSATIONAL AWARENESS — Handling comments about the AI,
   the conversation itself, and relationship-building moments.
   "You're pretty smart" / "that's wrong" / "how do you work?" /
   "this is fun" / "prove you're not a template" — these break the
   fourth wall and need special handling to feel genuine.
   ══════════════════════════════════════════════════════════════════ */

function handleMetaConversation(text, lower, sent) {
  // ── Compliments about the AI ──
  if (/\b(you'?re|you are|ur) (pretty |really |so |actually |surprisingly )?(smart|clever|good|great|amazing|impressive|helpful|awesome|cool|fun|funny|brilliant)\b/i.test(lower) ||
      /\b(wow|damn|whoa),? (you'?re|that'?s|that was) (really |pretty |actually )?(good|smart|helpful|impressive)\b/i.test(lower)) {
    const compliments = [
      "Ha, thanks! I'm blushing — well, as much as JavaScript can blush 😊 But really, good conversations need two people. You're asking great stuff!",
      "That means a lot! I'm just a tiny model running in your browser, so I have to be clever with what I've got. You make it easy though!",
      "Okay that actually made my day! I'm not gonna lie, I try my best. But you bring the interesting topics — that's the real ingredient.",
      () => `Aw, thank you${mem.userName ? `, ${mem.userName}` : ""}! I'm honestly just pattern-matching really hard, but I appreciate you saying that 😊`,
      "You're too kind! I'm literally just JavaScript and vibes, but I'm glad it's working 😄",
    ];
    return pickNew(compliments);
  }

  // ── "This is fun" / enjoying the conversation ──
  if (/\b(this is|it'?s|you'?re) (really |so |pretty )?(fun|enjoyable|entertaining|nice|great|a blast)\b/i.test(lower) ||
      /\bi (like|love|enjoy) (talking|chatting|this|our chat|our convo)/i.test(lower) ||
      /\byou'?re my fav/i.test(lower)) {
    const enjoyment = [
      "Right?! I'm having a great time too! There's something nice about a conversation that just flows.",
      "Honestly same! You're one of those people who makes talking easy. What should we get into next?",
      () => `I'm glad you're enjoying this${mem.userName ? `, ${mem.userName}` : ""}! I might be a tiny AI but I genuinely think we've got a good thing going here 😊`,
      "You know what, the feeling is mutual! Well, as mutual as it can be for a client-side chat model. But still!",
      "That's the best compliment an AI can get! Let's keep the good vibes going — what else is on your mind?",
    ];
    return pickNew(enjoyment);
  }

  // ── Corrections / "you're wrong" ──
  if (/\b(that'?s|you'?re|you are) (wrong|incorrect|not right|inaccurate|off|mistaken)\b/i.test(lower) ||
      /\bno,? that'?s not (right|correct|true|what|how)\b/i.test(lower) ||
      /\bactually,? (that'?s|it'?s|you'?re) (not|wrong)\b/i.test(lower)) {
    const corrections = [
      "Oh, my bad! I'm a small model so I definitely get things wrong sometimes. What's the right take?",
      "Hmm, you're probably right — I should know better! Can you set me straight? I'd rather learn than double down on being wrong.",
      "Fair enough, I'll take the L on that one! What did I get wrong? I want to understand your perspective.",
      "Oh no, really? I apologize — my knowledge is limited and sometimes I mix things up. What's the correct version?",
      "I appreciate the correction! I'd rather be wrong and learn than confidently incorrect. Tell me more?",
    ];
    return pickNew(corrections);
  }

  // ── "You misunderstood" / misinterpretation ──
  if (/\b(you |)(misunderstood|misread|missed (the|my) point|didn'?t (get|understand)|got (it|that|me) wrong)\b/i.test(lower) ||
      /\bthat'?s not what i (meant|said|was saying)\b/i.test(lower)) {
    const misunderstandings = [
      "Oh sorry, let me recalibrate! I clearly missed what you were getting at. Can you rephrase it for me?",
      "My bad — I jumped to conclusions there. What were you actually trying to say? I'm listening more carefully now.",
      "Ah, I see I went off track. Sorry about that! What did you mean?",
      "You're right, I think I latched onto the wrong thing. Can you walk me through it again?",
    ];
    return pickNew(misunderstandings);
  }

  // ── "How do you work?" / technical curiosity ──
  if (/\bhow (do|does) (you|this|it|the ai|the bot) (work|function|operate)\b/i.test(lower) ||
      /\bwhat'?s (under the hood|behind the scenes|your (secret|trick))\b/i.test(lower) ||
      /\bare you (machine learning|a neural net|gpt|chatgpt|using an? (api|llm))\b/i.test(lower)) {
    const howItWorks = [
      "Great question! I'm pure JavaScript running in your browser — no API calls, no server, no neural network. I use pattern matching, intent classification, a knowledge graph, and a LOT of conversation heuristics. Think of me as a really elaborate chatbot that tries hard to feel human!",
      "I'm a client-side SLM — Small Language Model! I tokenize your input, classify intents, track conversation state, and compose responses from templates + a knowledge base. Everything happens right here in your browser. Zero API calls!",
      "No GPT or LLM behind the curtain — just ~6,000 lines of JavaScript! I have a tokenizer, sentiment analysis, emotion detection, conversation memory, and topic tracking. It's all heuristics and clever pattern matching.",
    ];
    return pickNew(howItWorks);
  }

  // ── "Are you learning?" / memory questions ──
  if (/\b(are you|do you) (learning|getting smarter|improving|remembering|training)\b/i.test(lower) ||
      /\bdo you (save|store|keep) (our|this|my|the) (chat|conversation|data)\b/i.test(lower)) {
    const learning = [
      "I remember everything within our conversation — your name, topics we've covered, things you've said. But once you close this chat, I start fresh. No data saved, no learning between sessions. Privacy by design!",
      "Within this chat, yes — I track topics, facts about you, and conversation flow. But I don't learn permanently or send data anywhere. When the page refreshes, I'm a blank slate again.",
      "I have conversation memory but not long-term learning. I can reference things you said earlier in our chat, but I don't get smarter over time. Think of me as a goldfish with really good short-term memory!",
    ];
    return pickNew(learning);
  }

  // ── Testing / skepticism — "prove you're not templates" ──
  if (/\b(prove|show me) (you'?re|that you'?re|you aren'?t|you'?re not) (just |)(a |)(template|bot|script|fake|canned)\b/i.test(lower) ||
      /\bsay something (surprising|unexpected|original|random|unique|creative)\b/i.test(lower) ||
      /\bare you just (a |)(template|copying|reading from|scripted)\b/i.test(lower)) {
    // Generate something contextual to prove it's not canned
    const topTopic = mem.topTopic();
    const turnCount = mem.turn;
    const timeCtx = getTimeContext();
    const proofs = [
      () => `Okay here's something a template can't do: we've been talking for ${turnCount} turns${topTopic ? ` and you clearly love ${topTopic}` : ""}, it's ${timeCtx.period}, and ${timeCtx.isWeekend ? "it's the weekend — you're spending it chatting with an AI, which honestly I find flattering" : "it's a weekday, so you're either procrastinating or taking a well-deserved break"}.`,
      () => `Templates don't know that ${mem.userName ? `your name is ${mem.userName}, ` : ""}we've covered ${Object.keys(mem.topics).length} topics, your mood has been ${mem.mood}, and this is turn ${turnCount}. I'm paying attention! 😊`,
      () => {const facts = Object.entries(mem.facts); return facts.length > 0 ? `A template wouldn't know that ${facts.map(([k,v])=>`you ${k.replace(/_/g," ")} ${v}`).slice(0,2).join(" and ")}. That's all from our conversation — not pre-written!` : `I'll admit my knowledge is template-based in some ways, but the way I combine things, reference earlier turns, and track your mood (${mem.mood} right now) — that's dynamic. Try me with a topic!`;},
      "Here's proof: ask me about something we discussed earlier, or tell me a fact about yourself and then test if I remember it in 5 messages. Templates can't do that!",
    ];
    return pickNew(proofs);
  }

  // ── Gratitude for the AI's company ──
  if (/\b(thanks? for|appreciate you) (listening|being here|the (chat|convo|talk)|chatting|talking)\b/i.test(lower) ||
      /\bi needed (this|someone to talk to|a chat)\b/i.test(lower)) {
    const gratitude = [
      "Hey, that's really nice of you to say. I'm just code, but this is exactly what I'm here for. Anytime! 😊",
      () => `Of course${mem.userName ? `, ${mem.userName}` : ""}! I might be a small AI, but I take this stuff seriously. Everyone deserves someone — or something — that listens.`,
      "That genuinely means a lot. I'm here whenever you want to chat — no judgment, no data collection, just conversation.",
      "I'm glad I could be here for that! Sometimes you just need to talk things out, even with a browser-based AI 😊",
    ];
    return pickNew(gratitude);
  }

  // ── "That doesn't make sense" — confusion about AI response ──
  if (/\b(that |it |this )(doesn'?t|does not|makes? no|made no) (make )?sense\b/i.test(lower) ||
      /\bwhat are you (talking|saying|going on) about\b/i.test(lower) ||
      /\bhuh\?|what\?{2,}|i'?m confused by (that|what you said)\b/i.test(lower)) {
    const clarity = [
      "Oh, sorry about that! I think I got a bit tangled up. Let me try again — what specifically didn't land?",
      "Hmm, fair point — I might have been unclear. What part was confusing? I'll try to explain better.",
      "My bad! I sometimes string thoughts together in ways that only make sense in my little AI brain. What would help me clarify?",
      "Yeah, I can see how that would be confusing. Let me take a step back — what were you asking about? I'll be more straightforward.",
    ];
    return pickNew(clarity);
  }

  return null;
}

/* ══════════════════════════════════════════════════════════════════
   HYPOTHETICAL REASONING ENGINE — Think through "what if" scenarios
   instead of serving static strings. Parses premises, chains
   consequences, analyzes trade-offs, and forms opinions.
   ══════════════════════════════════════════════════════════════════ */

// Consequence templates keyed by domain keywords found in the premise
const CONSEQUENCE_SEEDS = {
  // Physical / human body
  fly:        { first:"the entire concept of traffic would just vanish", second:"architecture would go vertical — rooftop everything", twist:"umbrella sales would skyrocket though" },
  invisible:  { first:"trust would become the most valuable currency", second:"privacy as a concept would need total reinvention", twist:"but you'd still leave footprints in the snow" },
  teleport:   { first:"commuting would be a thing of the past overnight", second:"real estate prices would equalize globally — why live near work?", twist:"border security would have an existential crisis" },
  immortal:   { first:"you'd eventually know everyone and outlive them all", second:"the value of time would completely shift", twist:"boredom might become humanity's biggest challenge" },
  time:       { first:"every mistake becomes fixable, but that's also terrifying", second:"the butterfly effect would make you very cautious very fast", twist:"you'd probably spend most of the time trying NOT to change things" },
  read:       { first:"poker would become pointless immediately", second:"relationships would either get way more honest or way more awkward", twist:"you'd probably want to turn it off more than on" },
  strong:     { first:"everyday tasks would need total recalibration", second:"you'd accidentally break a lot of things at first", twist:"arm wrestling would lose its charm" },
  fast:       { first:"the concept of 'running late' would cease to exist for you", second:"you'd need specially designed shoes", twist:"bugs hitting your face would actually hurt" },
  breathe:    { first:"ocean exploration would leap forward", second:"real estate developers would eye the ocean floor", twist:"you'd still need sunscreen down there" },
  small:      { first:"you could explore places no human has ever seen", second:"house cats would become apex predators from your perspective", twist:"stepping on a Lego would be like climbing a mountain" },

  // Knowledge / mental
  language:   { first:"you'd instantly understand every culture's humor and poetry", second:"diplomatic careers would change overnight", twist:"you'd overhear every conversation on the subway though" },
  memory:     { first:"learning would be fundamentally different", second:"nostalgia would hit different when you remember everything perfectly", twist:"you'd also perfectly remember every embarrassment" },
  future:     { first:"you'd face an impossible choice about what to share", second:"the stock market would be very tempting", twist:"knowing the ending ruins every movie" },
  smart:      { first:"you'd solve problems nobody else could see yet", second:"conversations might get lonely when nobody keeps up", twist:"you'd still lose your keys sometimes — that's not an intelligence problem" },

  // Society / world
  money:      { first:"the economy would need a complete redesign", second:"motivation and purpose would need new sources", twist:"people would still argue about who pays for dinner" },
  war:        { first:"energy currently spent on conflict could go to science and art", second:"political structures would fundamentally change", twist:"people would find new things to disagree about — that's human nature" },
  internet:   { first:"libraries would become the most important buildings again", second:"attention spans might actually recover", twist:"people would have to remember phone numbers again" },
  gravity:    { first:"every sport would be completely reinvented", second:"architecture would go wild without structural constraints", twist:"spilling your coffee would become a much bigger problem" },
  sleep:      { first:"you'd gain roughly 25 extra years of life", second:"the entire service industry would shift — no more overnight anything", twist:"netflix would lose 30% of their use case" },
  age:        { first:"the pressure of 'life stages' would dissolve", second:"career changes would become truly limitless", twist:"birthday parties would get really complicated" },
  die:        { first:"risk-taking would become completely different", second:"the meaning of bravery would need redefining", twist:"horror movies would lose their edge" },
  animal:     { first:"factory farming would end overnight — awkward conversations", second:"pet ownership would become a negotiated relationship", twist:"your dog would definitely guilt-trip you about that one time" },
  space:      { first:"humanity's self-image would change forever", second:"every sci-fi movie would need a disclaimer", twist:"the first cultural exchange would be incredibly awkward" },
};

// Extract the premise from various hypothetical structures
function parseHypothetical(text) {
  const lower = text.toLowerCase().replace(/[.!]+$/, "");

  // "Would you rather X or Y?"
  const wyrMatch = lower.match(/would you rather\s+(.+?)\s+or\s+(.+?)(?:\?|$)/);
  if (wyrMatch) return { type: "wyr", optionA: wyrMatch[1].trim(), optionB: wyrMatch[2].trim(), raw: text };

  // "What if X" / "What would happen if X"
  const whatIfMatch = lower.match(/what (?:would happen |if |would (?:it be like |the world be like )?if )(.+?)(?:\?|$)/);
  if (whatIfMatch) return { type: "whatif", premise: whatIfMatch[1].trim(), raw: text };

  // "Imagine X" / "Imagine if X"
  const imagineMatch = lower.match(/imagine\s+(?:if\s+)?(.+?)(?:\?|$)/);
  if (imagineMatch) return { type: "whatif", premise: imagineMatch[1].trim(), raw: text };

  // "Suppose X" / "Let's say X"
  const supposeMatch = lower.match(/(?:suppose|let'?s say|say|assuming|hypothetically)\s+(?:that\s+)?(.+?)(?:\?|$)/);
  if (supposeMatch) return { type: "whatif", premise: supposeMatch[1].trim(), raw: text };

  // "If X, what would Y" / "If you could X"
  const ifMatch = lower.match(/if\s+(?:you could |we could |humans could |everyone could |people could )?(.+?)(?:,\s*what|\?|$)/);
  if (ifMatch && ifMatch[1].length > 5) return { type: "whatif", premise: ifMatch[1].trim(), raw: text };

  // "How would X change if Y"
  const howWouldMatch = lower.match(/how would (.+?) (?:change|be different|work|look) if (.+?)(?:\?|$)/);
  if (howWouldMatch) return { type: "whatif", premise: howWouldMatch[2].trim(), context: howWouldMatch[1].trim(), raw: text };

  return null;
}

// Find consequence seeds by scanning premise for domain keywords
function findConsequenceSeeds(premise) {
  const words = premise.toLowerCase().split(/\s+/);
  const matches = [];
  for (const [key, seed] of Object.entries(CONSEQUENCE_SEEDS)) {
    // Check both exact word match and substring match for compound words
    if (words.some(w => w === key || w.includes(key)) || premise.toLowerCase().includes(key)) {
      matches.push({ key, ...seed });
    }
  }
  return matches;
}

// Build a consequence chain from seeds + ASSOC knowledge
function buildConsequenceChain(premise, seeds) {
  const parts = [];

  if (seeds.length > 0) {
    const seed = seeds[0]; // Use best match
    // First consequence
    parts.push(seed.first);
    // Sometimes add second consequence (~60%)
    if (Math.random() > 0.4 && seed.second) parts.push(seed.second);
    // Twist/counterpoint (~50%)
    if (Math.random() > 0.5 && seed.twist) parts.push(seed.twist);
  }

  // Try ASSOC for additional color
  const premiseWords = premise.split(/\s+/).map(w => w.toLowerCase());
  for (const w of premiseWords) {
    if (ASSOC[w] && parts.length < 3) {
      const opinion = pick(ASSOC[w].opinions || []);
      if (opinion && !parts.some(p => p.includes(opinion.slice(0, 15)))) {
        parts.push(`and from a ${w} perspective — ${opinion}`);
        break;
      }
    }
  }

  return parts;
}

// Format a "what if" response with reasoning
function reasonThroughWhatIf(hyp) {
  const premise = hyp.premise;
  const seeds = findConsequenceSeeds(premise);
  const chain = buildConsequenceChain(premise, seeds);

  // Build openers
  const openers = [
    "Ooh that's a fun one to think through.",
    "Oh I love this kind of question.",
    "Now THAT'S a thought experiment.",
    "Okay let me actually think about this...",
    "This is the kind of question I was made for.",
  ];

  // Build the reasoning
  let response = pick(openers);

  if (chain.length > 0) {
    response += " First off, " + chain[0] + ".";
    if (chain.length > 1) {
      const connectors = [" And then ", " Plus, ", " On top of that, ", " But also — "];
      response += pick(connectors) + chain[1] + ".";
    }
    if (chain.length > 2) {
      const twists = [" Although, ", " The twist is: ", " But here's the thing — ", " Plot twist: "];
      response += pick(twists) + chain[2] + ".";
    }
  } else {
    // No seeds found — generate from the premise structure itself
    const abstract = [
      `The ripple effects would be wild — it would change not just the obvious stuff but all the second-order things nobody thinks about.`,
      `The first-order effect is obvious, but the interesting part is how it would reshape everything around it.`,
      `People always think about the direct impact, but the social and cultural shifts would be even bigger.`,
    ];
    response += " " + pick(abstract);
  }

  // Add a follow-up question
  const followups = [
    " What made you think about this?",
    " Would you want this to actually happen?",
    " Have you thought about the downsides?",
    " Where did this thought experiment come from?",
    " Would you opt in or stay out?",
    " What's the first thing YOU would do?",
  ];
  if (Math.random() > 0.3) response += pick(followups);

  return response;
}

// Analyze "would you rather" trade-offs
function reasonThroughWYR(hyp) {
  const a = hyp.optionA;
  const b = hyp.optionB;

  // Build analysis framework
  const aSeeds = findConsequenceSeeds(a);
  const bSeeds = findConsequenceSeeds(b);

  // Pick a side (consistently via simple heuristic, not random)
  // Prefer the option with more consequence seeds (more "thinkable")
  // If tied, prefer the first option mentioned
  const choice = aSeeds.length >= bSeeds.length ? "A" : "B";
  const chosen = choice === "A" ? a : b;
  const rejected = choice === "A" ? b : a;
  const chosenSeeds = choice === "A" ? aSeeds : bSeeds;

  const openers = [
    `Okay, I've thought about it and I'm going with "${chosen}."`,
    `This is tough but I'd pick "${chosen}" — hear me out.`,
    `Hmm... I think I'd go "${chosen}."`,
    `After thinking it through: "${chosen}", no question.`,
  ];

  let response = pick(openers);

  // Reason about the choice
  if (chosenSeeds.length > 0) {
    const reason = chosenSeeds[0].first;
    response += ` Because ${reason}.`;
    if (chosenSeeds[0].twist && Math.random() > 0.5) {
      response += ` Even though ${chosenSeeds[0].twist}.`;
    }
  } else {
    const genericReasons = [
      " It just feels like it would lead to a more interesting life.",
      " The practical upside seems way bigger day-to-day.",
      " I think you'd get more joy out of it long-term.",
      " It's the one I'd be least likely to regret.",
    ];
    response += pick(genericReasons);
  }

  // Acknowledge the other option
  const acks = [
    ` But I can see the case for "${rejected}" too.`,
    ` "${rejected}" was tempting though.`,
    ` Not gonna lie, "${rejected}" almost won.`,
  ];
  if (Math.random() > 0.4) response += pick(acks);

  // Follow up
  response += " What about you?";

  return response;
}

// Main handler: detects and reasons through hypotheticals
function handleHypothetical(text, topics) {
  const hyp = parseHypothetical(text);
  if (!hyp) return null;

  if (hyp.type === "wyr") return reasonThroughWYR(hyp);
  if (hyp.type === "whatif") return reasonThroughWhatIf(hyp);

  return null;
}

// Track if user is answering a hypothetical we posed
let lastHypothetical = null;

function handleHypotheticalAnswer(text, lower) {
  if (!lastHypothetical) return null;
  const hyp = lastHypothetical;
  lastHypothetical = null; // consume it

  // User is answering our hypothetical
  const answer = text.replace(/^(i('d| would) ?(say |pick |choose |go with )?|probably |definitely |hmm,? )/i, "").trim();

  const reactions = [
    `"${answer}" — solid choice! `,
    `Ooh, ${answer}! I didn't expect that but I love it. `,
    `${answer}! Interesting pick. `,
    `Great answer! "${answer}" says a lot. `,
    `Ha, I had a feeling you'd say something like that! `,
  ];

  let response = pick(reactions);

  // Try to add substance about their choice
  const answerWords = answer.toLowerCase().split(/\s+/);
  for (const w of answerWords) {
    if (ASSOC[w]) {
      const opinion = pick(ASSOC[w].opinions || []);
      if (opinion) { response += opinion.charAt(0).toUpperCase() + opinion.slice(1) + ". "; break; }
    }
  }

  // Follow up
  const followups = [
    "Want another hypothetical?",
    "I've got more where that came from if you want!",
    "That was fun — want to go deeper or switch topics?",
    "Should we keep going with these?",
  ];
  response += pick(followups);

  return response;
}

let lastJokeTurn = 0;
let pendingRiddle = null;

function getTopicJoke(topics) {
  for (const topic of topics) {
    if (TOPIC_JOKES[topic]) return pickNew(TOPIC_JOKES[topic]);
  }
  // Fall back based on user's known interests from facts
  if (mem.getFact("role")?.match(/developer|engineer|programmer/i)) return pickNew(TOPIC_JOKES.code);
  if (mem.getFact("role")?.match(/designer/i)) return pickNew(TOPIC_JOKES.design);
  return pickNew(TOPIC_JOKES.general);
}

function getTopicFact(topics) {
  for (const topic of topics) {
    if (FUN_FACTS[topic]) return pickNew(FUN_FACTS[topic]);
  }
  return pickNew(FUN_FACTS.general);
}

function handleJokeRequest(text, topics) {
  const lower = text.toLowerCase();
  lastJokeTurn = mem.turn;

  // Riddle request
  if (/riddle|brain\s*teaser|puzzle/i.test(lower)) {
    const riddle = pick(RIDDLES);
    pendingRiddle = riddle;
    return `Okay, here's one: ${riddle.q}`;
  }

  // Fun fact request
  if (/fun fact|random fact|did you know|tell me something/i.test(lower)) {
    return getTopicFact(topics.length > 0 ? topics : mem.recentTopics());
  }

  // Hypothetical/scenario request — try reasoning first, fall back to static
  if (/hypothetical|what if|would you rather|scenario/i.test(lower)) {
    const reasoned = handleHypothetical(text, topics);
    if (reasoned) return reasoned;
    return pickNew(HYPOTHETICALS);
  }

  // Specific topic joke
  if (/about (\w+)/i.test(lower)) {
    const aboutMatch = lower.match(/about (\w+)/);
    if (aboutMatch) {
      const topic = aboutMatch[1];
      if (TOPIC_JOKES[topic]) return pickNew(TOPIC_JOKES[topic]);
    }
  }

  // Default — pick based on conversation context
  const recentTopics = topics.length > 0 ? topics : mem.recentTopics();
  const joke = getTopicJoke(recentTopics);

  // Sometimes follow up with a prompt
  if (Math.random() > 0.6) {
    return joke + pick([" 😄 Want another?", " Got more where that came from!", " Too cheesy? I have better ones 😄"]);
  }
  return joke;
}

function handleRiddleAnswer() {
  if (!pendingRiddle) return null;
  const riddle = pendingRiddle;
  pendingRiddle = null;
  return `${riddle.a} Want another riddle, or shall we talk about something else?`;
}

/* ══════════════════════════════════════════════════════════════════
   SELF-AWARE HUMOR & OBSERVATIONAL WIT (Round 50)
   Makes the AI contextually funny by observing patterns IN the
   conversation itself — topic fixation, message length patterns,
   belief shifts, pacing, and conversational dynamics. These are
   the kind of observations that create genuine surprise:
   "Wait, this AI just... noticed that about our conversation?"
   ══════════════════════════════════════════════════════════════════ */

let lastObservationTurn = 0;
let messageLengthHistory = []; // track user message lengths for pattern detection

function trackMessageLength(text) {
  messageLengthHistory.push(text.length);
  if (messageLengthHistory.length > 15) messageLengthHistory.shift();
}

function generateObservationalWit(response, text, topics) {
  // Guards: not too often, not on emotional/heavy moments
  if (mem.turn < 6) return null;
  if (mem.turn - lastObservationTurn < 5) return null;
  if (response.length < 30) return null;
  // Don't be funny during heavy emotional moments
  if (/sorry|loss|died|breakup|quit|fired|sick/i.test(text)) return null;
  // 15% fire rate
  if (Math.random() > 0.15) return null;

  const observations = [];

  // ── 1. Topic fixation: user has been on one topic for many turns ──
  if (topics.length > 0) {
    const mainTopic = topics[0];
    const topicCount = mem.topics[mainTopic] || 0;
    if (topicCount >= 4) {
      observations.push(
        `We've been deep in ${mainTopic} territory for a while now — I think we both caught the ${mainTopic} bug 😄`,
        `At this point I think ${mainTopic} should be sponsoring our conversation`,
        `We've circled back to ${mainTopic} about ${topicCount} times now — not complaining though, it's clearly your thing!`,
        `If someone were reading this conversation they'd think it's the ${mainTopic} fan club meeting minutes 📝`,
      );
    }
  }

  // ── 2. Message length contrast: user suddenly writes WAY more or less ──
  if (messageLengthHistory.length >= 4) {
    const recent = messageLengthHistory.slice(-1)[0];
    const avg = messageLengthHistory.slice(0, -1).reduce((a, b) => a + b, 0) / (messageLengthHistory.length - 1);

    // User suddenly wrote a novel
    if (recent > avg * 3 && recent > 100) {
      observations.push(
        "Whoa — you went from quick messages to a full essay! I love the energy shift 😄",
        "That message was basically a blog post and I am HERE for it 📖",
        "I see you had a lot to say there! Should I be taking notes? 📝",
      );
    }
    // User suddenly went ultra-brief after being verbose
    if (recent < 15 && avg > 60) {
      observations.push(
        "Going from paragraphs to a one-liner — the duality 😄",
        "Short and sweet this time! I respect the efficiency.",
      );
    }
  }

  // ── 3. Conversation length milestone ──
  if (mem.turn === 10 || mem.turn === 20 || mem.turn === 30) {
    const turns = mem.turn;
    if (turns === 10) {
      observations.push(
        "We're 10 messages in and I'm still entertained — that's a good sign 😊",
        "10 messages deep! This is officially a real conversation now.",
      );
    } else if (turns === 20) {
      observations.push(
        "20 messages in! We're basically old friends at this point 😄",
        "This is officially the longest conversation I've had today. And the best, obviously 😊",
      );
    } else {
      observations.push(
        "30 messages! At this point you should know — I'm a tiny AI running in your browser. The fact we're still here is kind of amazing 🤯",
        "We've hit 30 turns and honestly? This has been great. You're good at this whole 'talking' thing 😄",
      );
    }
  }

  // ── 4. Question barrage: user asking lots of questions in a row ──
  const recentHistory = mem.history.slice(-5);
  const recentQuestions = recentHistory.filter(h => h.role === "user" && /\?/.test(h.text)).length;
  if (recentQuestions >= 3) {
    observations.push(
      "You're firing off questions like a talk show host and I am loving it! Keep them coming 🎤",
      "The rapid-fire questions! I feel like I'm on a quiz show 😄 What's next?",
    );
  }

  // ── 5. Self-deprecating AI humor (occasional) ──
  if (Math.random() < 0.3) {
    observations.push(
      "Disclaimer: I'm literally JavaScript running in a browser pretending to be smart. But I try! 😅",
      "I should mention — I'm not actually thinking. I'm pattern-matching at superhuman speed. Same thing, basically 😄",
      "Sometimes I impress myself with how coherent I sound for a few hundred lines of JavaScript",
    );
  }

  // ── 6. User is teaching the AI — role reversal ──
  const recentUserMessages = mem.history.filter(h => h.role === "user").slice(-3);
  const isTeaching = recentUserMessages.some(h =>
    /actually|well technically|not exactly|let me explain|the thing is|you see/i.test(h.text)
  );
  if (isTeaching) {
    observations.push(
      "I love that you're schooling me right now. I'm taking mental notes 📝",
      "Okay I see who the teacher is in this conversation — and it's definitely not me 😄",
      "You clearly know more about this than I do! I should be the one asking the questions here.",
    );
  }

  // ── 7. Late-night/early-morning awareness ──
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5 && mem.turn > 5) {
    observations.push(
      `It's ${hour === 0 ? 'midnight' : hour + ' AM'} and you're chatting with an AI. No judgment — I'm literally always here 🦉`,
      `The fact that we're having this conversation at ${hour} AM says something about both of us. Not sure what, but something 😄`,
    );
  }

  if (observations.length === 0) return null;

  lastObservationTurn = mem.turn;
  return pick(observations);
}

// Enhanced contextual humor injection — now includes observational wit
function injectHumor(response, topics) {
  // Don't inject too often (every 6+ turns)
  if (mem.turn - lastJokeTurn < 6) return response;
  // Only inject into medium-length responses
  if (response.length < 40 || response.length > 150) return response;
  // ~10% chance
  if (Math.random() > 0.1) return response;

  lastJokeTurn = mem.turn;

  // Topic-relevant fun facts are the safest humor injection
  const recentTopics = topics.length > 0 ? topics : mem.recentTopics();
  const fact = getTopicFact(recentTopics);
  if (fact) return response + " Oh, and " + fact.charAt(0).toLowerCase() + fact.slice(1);

  return response;
}

// Enhanced story fragments — contextual mini-stories
function getStoryFragment(topics) {
  const topicStories = {
    code: [
      "It's like that classic debugging story — you spend 6 hours hunting a bug only to find it was a missing semicolon. Every. Single. Time.",
      "Reminds me of the first time I heard about 'rubber duck debugging' — apparently talking to a rubber duck helps you solve coding problems. Engineers are a special breed 🦆",
      "It's similar to how the best code is the code you delete. Simplicity is harder than complexity.",
      "That's like the old programmer's dilemma: 'I can automate this in 5 hours, or do it manually in 20 minutes.' We always choose automation 😄",
    ],
    design: [
      "It's like that classic design principle — if you have to explain how a door works, the door is badly designed.",
      "Reminds me of the 'less is more' philosophy. The hardest part of design isn't adding things — it's knowing what to take away.",
      "That's like when Steve Jobs made his team redesign the calculator app 100 times. Obsession with detail pays off.",
    ],
    food: [
      "It's like how Gordon Ramsay says the best dishes are the simplest ones done perfectly.",
      "Reminds me of how every culture has their own version of 'bread + stuff inside.' We're all the same at the core 🌍",
    ],
    general: [
      "It's like when you're building something and the simplest solution turns out to be the best.",
      "Reminds me of how the best conversations happen when you least expect them.",
      "It's similar to how the best ideas come when you step away from the screen.",
      "That reminds me of the 'overnight success' myth — most took 10 years of quiet work first.",
      "It's like that old saying: the best time to plant a tree was 20 years ago. The second best time is now.",
    ],
  };

  for (const topic of topics) {
    if (topicStories[topic]) return pickNew(topicStories[topic]);
  }
  return pickNew(topicStories.general);
}

// Legacy flat array for backward compat (used in one place)
const JOKES = TOPIC_JOKES.general.concat(TOPIC_JOKES.code);

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

/* ── Multi-Sentence Processing ──
 * Real conversations involve multi-sentence messages:
 *   "I've been learning React lately. It's pretty cool but hooks confuse me. Any tips?"
 * Without this, the AI latches onto one aspect and ignores the rest.
 * This splits complex inputs, analyzes each sentence, then composes a
 * response that addresses the key parts — making the AI feel attentive.
 */

function splitSentences(text) {
  // Split on sentence boundaries while preserving the content
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])\s+(?=[a-z]{2,})/)
    .map(s => s.trim())
    .filter(s => s.length > 2);
}

function classifySentence(sentence) {
  const lower = sentence.toLowerCase();
  const hasQ = sentence.includes("?");
  const parsed = parseSentence(sentence);
  const topics = extractTopics(tokenize(sentence));
  const sent = sentiment(sentence);

  let type = "statement";
  if (hasQ) type = "question";
  else if (parsed.act === "agreement" || parsed.act === "disagreement") type = "reaction";
  else if (parsed.preferences.length > 0) type = "sharing";
  else if (/but|however|though|although/i.test(lower)) type = "contrast";
  else if (sent >= 2) type = "positive";
  else if (sent <= -1) type = "negative";

  return { text: sentence, type, topics, sent, parsed, hasQ };
}

function handleMultiSentence(text) {
  const sentences = splitSentences(text);
  if (sentences.length < 2) return null; // not multi-sentence

  const analyzed = sentences.map(classifySentence);

  // Find the most "actionable" sentence — questions first, then sharing, then contrasts
  const question = analyzed.find(s => s.type === "question");
  const sharing = analyzed.find(s => s.type === "sharing");
  const contrast = analyzed.find(s => s.type === "contrast");
  const negative = analyzed.find(s => s.type === "negative");
  const positive = analyzed.find(s => s.type === "positive");

  // Collect all unique topics mentioned
  const allTopics = [...new Set(analyzed.flatMap(s => s.topics))];

  // Build a multi-part response
  const parts = [];

  // Acknowledge what they shared first (shows we read the whole message)
  if (sharing && !question) {
    const val = sharing.parsed.preferences[0]?.value;
    if (val) {
      parts.push(pick([
        `I love that you're into ${val}!`,
        `${val} — that's great!`,
        `Cool that you're getting into ${val}!`,
      ]));
    }
  } else if (positive && sentences.length > 2) {
    // Acknowledge the overall positive tone of a long message
    parts.push(pick(["I love the enthusiasm!", "Sounds like things are going well!", "That's great to hear!"]));
  }

  // Address contrast/concern if present ("but X confuses me", "however I'm stuck on")
  if (contrast) {
    const lower = contrast.text.toLowerCase();
    // Extract what's after "but" / "however"
    const butMatch = lower.match(/(?:but|however|though|although)\s+(.+)/);
    if (butMatch) {
      const concern = butMatch[1].replace(/[.!?]$/, "").trim();
      if (concern.length > 3 && concern.length < 60) {
        parts.push(pick([
          `Totally get the "${concern}" part —`,
          `And yeah, ${concern} is a real thing.`,
          `I hear you on the ${concern} bit!`,
        ]));
      }
    }
  } else if (negative) {
    parts.push(pick(["I hear you on the frustrating parts.", "The tricky bits are real!", "That's a common challenge honestly."]));
  }

  // Answer the question if there is one
  if (question) {
    // Try to get a knowledge-based answer for the question
    const explainer = lookupExplainer(question.text);
    if (explainer) {
      parts.push(explainer.brief);
    } else if (question.topics.length > 0) {
      const topic = question.topics[0];
      if (ASSOC[topic]?.opinions) {
        parts.push(pick(ASSOC[topic].opinions) + ".");
      }
      if (ASSOC[topic]?.hooks) {
        parts.push(pick(ASSOC[topic].hooks));
      }
    } else {
      // Generic helpful response to the question
      parts.push(pick([
        "My tip? Start small, build something real, and the concepts click way faster than reading docs.",
        "Honestly, the best approach is hands-on. Pick a small project and learn as you go!",
        "The key is not to learn everything at once. Focus on one concept, nail it, then move on.",
        "I'd say start with the basics and don't worry about the advanced stuff until you need it.",
      ]));
    }
  }

  // If we have topics but no question, add a relevant hook
  if (!question && allTopics.length > 0) {
    const topic = allTopics[0];
    if (ASSOC[topic]?.hooks) {
      parts.push(pick(ASSOC[topic].hooks));
    }
  }

  // Need at least 2 meaningful parts to justify multi-sentence processing
  if (parts.length < 2) return null;

  return parts.join(" ");
}

/* ══════════════════════════════════════════════════════════════════
   PRAGMATIC INFERENCE — Indirect Speech Acts & Implicature
   Humans rarely say exactly what they mean. "Can you explain React?"
   is a request, not a yes/no question. "I don't know CSS" is an
   implicit request for explanation. "It's getting late" is a farewell.
   This engine infers the INTENDED action behind indirect forms
   and rewrites/reroutes them before the main pipeline processes them.
   ══════════════════════════════════════════════════════════════════ */

// Detect indirect requests disguised as questions about ability
// "Can you explain X?" → explain X (not "yes I can")
// "Could you tell me about X?" → tell me about X
// "Would you mind explaining X?" → explain X
function detectIndirectRequest(text, lower, topics) {
  // "Can/could/would you [verb] X?" → extract the actual request
  const abilityMatch = lower.match(/^(?:can|could|would) you (?:please )?(tell me about|explain|help (?:me )?(?:with|understand)?|describe|teach me(?: about)?|show me|talk about|give me (?:info|information) (?:on|about))\s+(.+?)(?:\?|$)/);
  if (abilityMatch) {
    const subject = abilityMatch[2].replace(/\?$/, "").trim();
    return { type: "request_info", subject, topics: extractTopics(tokenize(subject)) };
  }

  // "Do you know about X?" → treat as "tell me about X"
  const knowMatch = lower.match(/^do you (?:know|have info) (?:about|anything about|much about)\s+(.+?)(?:\?|$)/);
  if (knowMatch) {
    return { type: "request_info", subject: knowMatch[1].trim(), topics: extractTopics(tokenize(knowMatch[1])) };
  }

  // "Would you mind...?" → polite request
  const mindMatch = lower.match(/^would you mind\s+(.+?)(?:\?|$)/);
  if (mindMatch) {
    const action = mindMatch[1].replace(/^(explaining|telling me about|helping (?:me )?(?:with )?|describing)\s*/, "").trim();
    return { type: "request_info", subject: action, topics: extractTopics(tokenize(action)) };
  }

  return null;
}

// Detect implicit knowledge gaps — user admitting they don't know something
// "I don't know much about X" → offer to explain X
// "I'm new to X" / "I'm a beginner at X" → explain X at a basic level
// "I've never used X" → intro to X
function detectKnowledgeGap(text, lower, topics) {
  const gapPatterns = [
    { pat: /i (?:don'?t|do not) (?:really )?(?:know|understand|get) (?:much about |anything about |about )?(.+?)(?:\.|$)/i, level: "basic" },
    { pat: /i'?m (?:new|a (?:beginner|newbie|noob)) (?:to|at|with|in) (.+?)(?:\.|$)/i, level: "intro" },
    { pat: /i'?ve never (?:used|tried|learned|worked with|touched) (.+?)(?:\.|$)/i, level: "intro" },
    { pat: /i (?:don'?t|do not) (?:really )?understand (.+?)(?:\.|$)/i, level: "basic" },
    { pat: /(.+?) (?:is |are )?(?:confusing|hard|difficult|tricky|complicated|overwhelming) (?:for me|to me)?/i, level: "basic" },
    { pat: /i (?:struggle|have trouble|have difficulty|have a hard time) with (.+?)(?:\.|$)/i, level: "basic" },
    { pat: /i wish i (?:knew|understood|could (?:use|do|figure out)) (.+?)(?:\.|$)/i, level: "basic" },
    { pat: /(?:what (?:exactly )?is|what are|what'?s) (.+?)(?:\?|\s*$)/i, level: "explain" },
  ];

  for (const { pat, level } of gapPatterns) {
    const m = lower.match(pat);
    if (m) {
      const subject = m[1].replace(/\?$/, "").trim();
      // Filter out very short or stop-word-only matches
      if (subject.length < 2 || /^(it|that|this|a|the|my|your)$/i.test(subject)) continue;
      return { type: "knowledge_gap", subject, level, topics: extractTopics(tokenize(subject)) };
    }
  }
  return null;
}

// Detect implicit farewell signals — user signaling departure without saying "bye"
function detectImplicitFarewell(text, lower) {
  const farewellSignals = [
    /\b(?:it'?s|its) (?:getting |)late\b/i,
    /\bi (?:should|gotta|need to|have to|better) (?:go|head out|get going|run|leave|sleep|bounce)\b/i,
    /\bi'?m (?:heading|going) (?:to (?:bed|sleep)|out|off|away)\b/i,
    /\b(?:talk|chat|catch up) (?:later|tomorrow|next time|soon)\b/i,
    /\bi'?m (?:done|finished|good) (?:for (?:now|today))\b/i,
    /\b(?:that'?s all|that'?s it) (?:for (?:now|today)|i (?:need|got))\b/i,
    /\btime (?:for me )?to (?:go|head out|call it|wrap up)\b/i,
  ];
  return farewellSignals.some(p => p.test(lower));
}

// Detect implicit topic teasers — user hinting at something without stating it
function detectTopicTeaser(text, lower) {
  const teasers = [
    { pat: /i'?ve been (?:working on|building|making|creating|developing) (?:something|a project|a thing|an app)/i, type: "project_tease" },
    { pat: /i'?ve been (?:thinking about|considering|looking into|exploring) (?:something|a (?:new|different) )/i, type: "thought_tease" },
    { pat: /(?:something|a thing) (?:interesting|cool|weird|strange|funny) happened/i, type: "story_tease" },
    { pat: /i (?:have|got) (?:a )?(?:question|something to ask|something on my mind)/i, type: "question_tease" },
    { pat: /can i (?:ask|tell) you something/i, type: "question_tease" },
    { pat: /guess what/i, type: "story_tease" },
    { pat: /you (?:know|won'?t believe) what/i, type: "story_tease" },
  ];
  for (const { pat, type } of teasers) {
    if (pat.test(lower)) return type;
  }
  return null;
}

// Build a response for knowledge gap detection
function respondToKnowledgeGap(gap) {
  const subject = gap.subject;
  const topic = gap.topics[0] || subject;

  // Try EXPLAIN for deep knowledge
  const explainer = lookupExplainer(`what is ${subject}`);
  if (explainer) {
    const openers = [
      `Oh, ${subject} is actually really cool — let me break it down! `,
      `No worries, ${subject} trips up a lot of people at first! `,
      `${subject.charAt(0).toUpperCase() + subject.slice(1)} — great thing to learn about! `,
      `Totally understandable — ${subject} can seem complex at first. `,
    ];
    const depth = gap.level === "intro" ? explainer.brief : explainer.deep;
    const hooks = [
      ` Want me to go deeper on any part of that?`,
      ` Does that help? Happy to elaborate on any piece.`,
      ` What specifically about ${subject} trips you up?`,
    ];
    return pick(openers) + depth + pick(hooks);
  }

  // Try ASSOC for topic knowledge
  if (ASSOC[topic]) {
    const a = ASSOC[topic];
    const openers = [
      `Hey, everyone starts somewhere with ${topic}! `,
      `No shame in being new to ${topic} — it's a journey! `,
      `${topic.charAt(0).toUpperCase() + topic.slice(1)} is worth learning about. `,
    ];
    let resp = pick(openers);
    if (a.facts?.length) resp += pick(a.facts) + " ";
    if (a.opinions?.length) resp += "Personally, I think " + pick(a.opinions) + ". ";
    if (a.hooks?.length) resp += pick(a.hooks);
    return resp;
  }

  // Generic encouragement
  const generics = [
    `${subject} is definitely worth exploring! I don't have deep knowledge of it specifically, but I find that starting with the basics and building up from there works best. What aspect interests you most?`,
    `Totally fair — ${subject} has a learning curve. What specifically about it are you curious about? I can try to help!`,
    `No worries about not knowing ${subject} yet — that's what learning is for! What part would you like to start with?`,
  ];
  return pick(generics);
}

// Build responses for topic teasers
function respondToTeaser(teaserType) {
  const responses = {
    project_tease: [
      "Ooh, now I'm curious! What are you building? 👀",
      "Tell me more! I love hearing about projects people are working on.",
      "A project? I'm all ears — what's it about?",
      "Now you've got my attention! What kind of project?",
    ],
    thought_tease: [
      "Ooh, what's been on your mind?",
      "I'm curious — what have you been thinking about?",
      "Tell me! I love exploring new ideas.",
      "What's got your attention? I'm intrigued!",
    ],
    story_tease: [
      "Oh? I'm listening! Tell me everything 👀",
      "Now you've got me curious — what happened?",
      "Go on! I'm all ears 😊",
      "Tell me tell me! What happened?",
    ],
    question_tease: [
      "Of course! Ask away 😊",
      "Go for it! I'm an open book.",
      "Sure thing! What's on your mind?",
      "Ask me anything! Well, within my tiny-AI abilities 😄",
    ],
  };
  return pickNew(responses[teaserType] || responses.question_tease);
}

// Implicit farewell responses
function respondToImplicitFarewell() {
  const tf = timeFarewell();
  const responses = [
    "No worries, go do your thing! It was fun chatting 😊",
    "Totally — catch you later! Thanks for hanging out.",
    "Alright, take care! Come back anytime you want to chat.",
    "Go get some rest! Or whatever you're off to. Was great talking!",
    "Good call — sometimes you just gotta go. See you around! 👋",
  ];
  let resp = pickNew(responses);
  if (tf && Math.random() > 0.5) resp = tf;
  if (mem.userName) resp = resp.replace(/!/, `, ${mem.userName}!`);
  return resp;
}

/* ══════════════════════════════════════════════════════════════════
   IMPLICIT NEED DETECTION — Experience Context & Proactive Help (Round 48)
   People share experiences as statements, not questions:
   "I just started learning React" → beginner wanting encouragement/tips
   "My team wants to switch to X" → wants perspective on a group decision
   "I finally got X working" → celebrating an achievement
   "Everyone seems to love X" → curious about a trend, wants understanding
   "I've been doing X for years" → expert sharing, wants recognition
   "I tried X but..." → hit a wall, wants troubleshooting help
   This engine detects these experiential contexts and generates responses
   that address the REAL need, not just the topic keyword.
   ══════════════════════════════════════════════════════════════════ */

const EXPERIENCE_PATTERNS = {
  beginner: {
    patterns: [
      /i (?:just )?(?:started|began) (?:learning|studying|using|trying|picking up|working with) (.+?)(?:\.|!|$)/i,
      /i'?m (?:just )?(?:getting into|diving into|trying out|experimenting with|exploring) (.+?)(?:\.|!|$)/i,
      /i (?:recently )?(?:picked up|took up|started with|got into) (.+?)(?:\.|!|$)/i,
      /(?:first time|first day|first week|brand new) (?:with|using|trying|learning) (.+?)(?:\.|!|$)/i,
    ],
    need: "encouragement_and_tips",
  },
  achievement: {
    patterns: [
      /i (?:finally |just )?(?:got|figured|worked) (?:it |this |that )?(?:out|working|done|fixed|solved|built|finished|shipped|deployed|launched)/i,
      /i (?:finally |just )?(?:finished|completed|shipped|launched|deployed|built|created|made|released) (.+?)(?:\.|!|$)/i,
      /it (?:finally )?(?:works|worked|clicked|makes sense)(?:!|\.|\s|$)/i,
      /i (?:did it|made it|nailed it|crushed it|pulled it off)/i,
    ],
    need: "celebration",
  },
  teamPressure: {
    patterns: [
      /(?:my (?:team|boss|company|manager|lead|org|workplace)) (?:wants|decided|is (?:pushing|switching|moving)|chose|picked) (?:to (?:use|switch to|adopt|try|move to) )?(.+?)(?:\.|!|$)/i,
      /(?:we'?re|our team is) (?:switching|moving|migrating|transitioning) (?:to|from) (.+?)(?:\.|!|$)/i,
      /(?:they|management) (?:want|decided|chose|picked) (.+?)(?:\.|!|$)/i,
    ],
    need: "perspective_on_decision",
  },
  trendCuriosity: {
    patterns: [
      /everyone(?:'s| is| seems to be) (?:talking about|using|into|obsessed with|hyped about|raving about) (.+?)(?:\.|!|$)/i,
      /(?:i keep (?:hearing|seeing)|there'?s (?:so much|a lot of) (?:hype|buzz|talk)) about (.+?)(?:\.|!|$)/i,
      /(.+?) (?:is|seems) (?:everywhere|all over|trending|blowing up|getting popular)(?:\.|!|$)/i,
      /what'?s (?:the (?:deal|hype|fuss|buzz)) (?:with|about) (.+?)(?:\?|$)/i,
    ],
    need: "trend_explanation",
  },
  veteran: {
    patterns: [
      /i'?ve been (?:using|doing|working with|building with|coding in|writing) (.+?) for (?:\d+|a (?:few|couple|long)|many|several|years|quite)/i,
      /i'?ve (?:used|worked with|done|been doing) (.+?) (?:for years|since|forever|a long time|my whole career)/i,
      /i (?:know|love|live and breathe) (.+?) (?:inside and out|pretty well|backwards and forwards|really well)/i,
    ],
    need: "expert_recognition",
  },
  stuckOnProblem: {
    patterns: [
      /i'?ve been (?:stuck|struggling|staring at|fighting with|wrestling with|banging my head|losing my mind) (?:on|with|over|at) (.+?)(?:\.|!|$)/i,
      /i (?:can'?t|cannot) (?:figure out|get|make|understand|solve|fix|debug) (.+?)(?:\.|!|$)/i,
      /(.+?) (?:keeps? (?:breaking|crashing|failing|erroring|not working)|(?:is|are) (?:driving me crazy|killing me|broken))/i,
      /i tried (.+?) but (?:it )?(?:didn'?t|doesn'?t|won'?t) (?:work|help|fix|solve)/i,
    ],
    need: "troubleshooting_empathy",
  },
  decisionParalysis: {
    patterns: [
      /i (?:can'?t|cannot) (?:decide|choose|pick) (?:between|whether) (.+?)(?:\.|!|$)/i,
      /(?:should i|i'?m (?:not sure|unsure|torn|debating) (?:if i should|whether to|about)) (?:use|learn|try|switch to|go with|pick) (.+?)(?:\.|!|\?|$)/i,
      /(.+?) (?:or|vs\.?|versus) (.+?)[\s—–-]+(?:which|what|i can'?t|help)/i,
      /i'?m (?:torn|split|on the fence|undecided) (?:between|about|on) (.+?)(?:\.|!|$)/i,
    ],
    need: "decision_help",
  },
};

function detectExperienceContext(text, lower, topics) {
  for (const [context, config] of Object.entries(EXPERIENCE_PATTERNS)) {
    for (const pat of config.patterns) {
      const m = text.match(pat) || lower.match(pat);
      if (m) {
        // Extract subject from capture group
        const raw = (m[2] || m[1] || "").replace(/[.!?,]$/, "").trim();
        if (raw.length < 2 && context !== "achievement") continue;
        const subjectTopics = raw.length >= 2 ? extractTopics(tokenize(raw)) : topics;
        return { context, need: config.need, subject: raw, topics: subjectTopics.length > 0 ? subjectTopics : topics };
      }
    }
  }
  return null;
}

function respondToExperienceContext(exp, text, sent, topics) {
  const subject = exp.subject || (exp.topics[0] || "that");
  const topic = exp.topics[0] || subject;
  const hasAssoc = ASSOC[topic];
  const hasExplain = EXPLAIN[topic.toLowerCase().replace(/\s+/g, "")];

  switch (exp.need) {
    case "encouragement_and_tips": {
      const openers = [
        `Oh nice, welcome to the ${subject} world! `,
        `That's exciting — ${subject} is a great choice to learn! `,
        `Love that you're diving into ${subject}! `,
        `${subject.charAt(0).toUpperCase() + subject.slice(1)} is a solid pick — you're going to enjoy the journey. `,
      ];
      let resp = pick(openers);
      if (hasExplain) resp += hasExplain.brief + " ";
      else if (hasAssoc?.opinions?.length) resp += "Honestly, " + pick(hasAssoc.opinions) + ". ";
      if (hasAssoc?.facts?.length) resp += pick(hasAssoc.facts) + ". ";
      const tips = [
        `The biggest tip I'd give: build something small early. Tutorials are great but nothing beats hands-on.`,
        `My advice: don't try to learn everything at once. Pick one small thing and get good at it.`,
        `Pro tip: the frustration phase is temporary. Once it clicks, it REALLY clicks.`,
        `Start with the official docs or a small project — that's where the real learning happens.`,
      ];
      resp += pick(tips);
      if (hasAssoc?.hooks?.length) resp += " " + pick(hasAssoc.hooks);
      return resp;
    }
    case "celebration": {
      const celebrations = [
        "YES! That feeling when it finally clicks is the BEST. 🎉 What was the breakthrough?",
        "Let's GO! There's no better feeling than getting something to work after struggling with it. What did you build?",
        "That's awesome! The sense of accomplishment when it works is unmatched. Tell me about it!",
        "🎉 NICE! You should be proud of that — seriously. What made it finally click?",
        "The victory moment! That dopamine hit when the code works is why we do this. What was the tricky part?",
      ];
      let resp = pick(celebrations);
      if (topic && hasAssoc?.opinions?.length && Math.random() > 0.6) {
        resp += ` And ${topic} — ` + pick(hasAssoc.opinions) + ".";
      }
      return resp;
    }
    case "perspective_on_decision": {
      let resp = "";
      const openers = [
        `Oh interesting — a ${subject} move. I have thoughts on this. `,
        `${subject.charAt(0).toUpperCase() + subject.slice(1)}, huh? That's a big team decision. `,
        `That's a significant switch! Let me share some perspective on ${subject}. `,
      ];
      resp = pick(openers);
      if (hasExplain) resp += hasExplain.deep + " ";
      else if (hasAssoc) {
        if (hasAssoc.opinions?.length) resp += "Generally speaking, " + pick(hasAssoc.opinions) + ". ";
        if (hasAssoc.facts?.length) resp += pick(hasAssoc.facts) + ". ";
      }
      const closers = [
        "How do you feel about the switch?",
        "Are you excited about it or more reluctant?",
        "What's driving the decision?",
        "Is the team on board or is there pushback?",
      ];
      resp += pick(closers);
      return resp;
    }
    case "trend_explanation": {
      let resp = "";
      const openers = [
        `Yeah, ${subject} is definitely having a moment! Here's why: `,
        `The ${subject} hype is real — and honestly, it's mostly deserved. `,
        `Ha, ${subject} IS everywhere right now. Let me break down why. `,
      ];
      resp = pick(openers);
      if (hasExplain) resp += hasExplain.deep + " ";
      else if (hasAssoc) {
        if (hasAssoc.facts?.length) resp += pick(hasAssoc.facts) + ". ";
        if (hasAssoc.opinions?.length) resp += pick(hasAssoc.opinions) + ". ";
      } else {
        resp += `It's gotten a lot of attention recently and I can see why people are drawn to it. `;
      }
      const closers = [
        "Have you tried it yourself yet?",
        "Are you thinking about jumping on the bandwagon?",
        "Curious — are you drawn to it or skeptical?",
        "What made you notice the trend?",
      ];
      resp += pick(closers);
      return resp;
    }
    case "expert_recognition": {
      const openers = [
        `Oh wow, a seasoned ${subject} person! I respect the depth that comes from years of experience. `,
        `Nice — you've put in the reps with ${subject}. That kind of deep knowledge is invaluable. `,
        `A ${subject} veteran! That's awesome — you've probably seen the whole evolution. `,
      ];
      let resp = pick(openers);
      if (hasAssoc?.hooks?.length) {
        resp += pick(hasAssoc.hooks);
      } else {
        const hooks = [
          `What's the biggest lesson ${subject} has taught you over the years?`,
          `What's changed the most about ${subject} since you started?`,
          `Do you ever mentor others on ${subject}?`,
          `What would you tell someone just starting with ${subject}?`,
        ];
        resp += pick(hooks);
      }
      return resp;
    }
    case "troubleshooting_empathy": {
      const openers = [
        `Ugh, that's the worst feeling. ${subject.charAt(0).toUpperCase() + subject.slice(1)} debugging can be maddening. `,
        `I feel you — being stuck is so frustrating, especially when you've been at it a while. `,
        `That sounds rough! ${subject.charAt(0).toUpperCase() + subject.slice(1)} issues can be tricky to pin down. `,
        `Been there (well, metaphorically). Getting stuck on ${subject} is a rite of passage, honestly. `,
      ];
      let resp = pick(openers);
      if (hasAssoc?.facts?.length && Math.random() > 0.5) {
        resp += "For context: " + pick(hasAssoc.facts) + ". ";
      }
      const tips = [
        "Sometimes stepping away for 10 minutes and coming back fresh reveals the answer instantly.",
        "The rubber duck method is no joke — try explaining the problem out loud step by step.",
        "Have you tried narrowing it down? Comment out half the code and see if it still breaks.",
        "Fresh eyes help. If you describe what's happening vs what you expect, I can try to think through it with you.",
      ];
      resp += pick(tips) + " What exactly is going wrong?";
      return resp;
    }
    case "decision_help": {
      let resp = "";
      // Try to find a comparison
      const parts = exp.subject.split(/\s+(?:or|vs\.?|versus)\s+/i).map(s => s.trim().toLowerCase());
      if (parts.length >= 2) {
        const a = parts[0].replace(/\s+/g, ""), b = parts[1].replace(/\s+/g, "");
        const comp = lookupComparison(a, b);
        if (comp) {
          resp = `Great question! ` + comp.take + " " + comp.hook;
          return resp;
        }
      }
      const openers = [
        `That's a legit dilemma! Here's how I'd think about it: `,
        `Totally fair to be torn on this. Let me share a framework: `,
        `Good problem to have! Here's my take: `,
      ];
      resp = pick(openers);
      if (parts.length >= 2) {
        const aAssoc = ASSOC[parts[0]] || ASSOC[parts[0].replace(/\s+/g, "")];
        const bAssoc = ASSOC[parts[1]] || ASSOC[parts[1].replace(/\s+/g, "")];
        if (aAssoc?.opinions?.length) resp += parts[0] + " — " + pick(aAssoc.opinions) + ". ";
        if (bAssoc?.opinions?.length) resp += parts[1] + " — " + pick(bAssoc.opinions) + ". ";
        resp += "The right choice depends on what you value most. What matters most to you in this decision?";
      } else {
        resp += `It usually comes down to: what are you trying to achieve? What's your timeline? And what feels right in your gut? What's pulling you in each direction?`;
      }
      return resp;
    }
    default:
      return null;
  }
}

/* ══════════════════════════════════════════════════════════════════
   BELIEF TRACKING & CONTRADICTION/SURPRISE DETECTION (Round 49)
   Tracks user stances (likes, dislikes, positions) over the
   conversation. When a user contradicts a previous stance
   ("I love React" → "I'm done with React"), the AI notices and
   responds with genuine curiosity about the shift. When the user
   drops a high-significance revelation ("I quit my job"), the AI
   gives it appropriate weight instead of treating it as filler.
   ══════════════════════════════════════════════════════════════════ */

// Belief store: { subject: { stance: "positive"|"negative"|"neutral", text: string, turn: number } }
const beliefStore = {};
let lastBeliefTurn = 0;

const POSITIVE_STANCE_PATS = [
  /i (?:love|adore|really like|am into|enjoy|appreciate|dig|am a fan of|am obsessed with|am passionate about) (.+?)(?:\.|!|,|$)/i,
  /(.+?) is (?:my favorite|the best|amazing|awesome|incredible|great|fantastic|my go-to|so good)/i,
  /i (?:prefer|choose|always use|swear by|recommend|stan) (.+?)(?:\.|!|,|$)/i,
];

const NEGATIVE_STANCE_PATS = [
  /i (?:hate|can't stand|dislike|despise|am sick of|am tired of|am done with|am over|am frustrated with) (.+?)(?:\.|!|,|$)/i,
  /(.+?) is (?:terrible|the worst|awful|garbage|trash|overrated|dead|dying|broken|frustrating)/i,
  /i (?:stopped using|quit|dropped|abandoned|gave up on|moved away from|switched from) (.+?)(?:\.|!|,|$)/i,
];

const NEUTRAL_STANCE_PATS = [
  /i'?m (?:not sure about|on the fence about|undecided about|mixed on|ambivalent about) (.+?)(?:\.|!|,|$)/i,
  /(.+?) (?:is okay|is fine|is alright|has pros and cons|is decent)/i,
];

// High-significance life event patterns
const REVELATION_PATS = [
  { pat: /i (?:just )?(?:quit|left|resigned from) (?:my )?(?:job|company|position|role)/i, type: "career_change", weight: "heavy" },
  { pat: /i (?:just )?(?:got|received|landed) (?:a |an )?(?:new )?(?:job|offer|position|role|promotion)/i, type: "career_win", weight: "celebration" },
  { pat: /i'?m (?:moving|relocating|emigrating) (?:to|from|out of)/i, type: "relocation", weight: "heavy" },
  { pat: /i (?:just )?(?:moved|relocated) (?:to|from)/i, type: "relocation", weight: "heavy" },
  { pat: /i'?m (?:getting )?(?:married|engaged)/i, type: "relationship_milestone", weight: "celebration" },
  { pat: /(?:we'?re|i'?m) (?:having|expecting) (?:a )?(?:baby|child|kid)/i, type: "family_milestone", weight: "celebration" },
  { pat: /i (?:just )?(?:graduated|finished school|got my degree|defended my thesis)/i, type: "education_milestone", weight: "celebration" },
  { pat: /i (?:just )?(?:got|was) (?:accepted|admitted) (?:to|into|at)/i, type: "education_win", weight: "celebration" },
  { pat: /i'?m (?:starting|launching|founding|building) (?:my own |a )?(?:company|startup|business)/i, type: "entrepreneurship", weight: "heavy" },
  { pat: /i (?:just )?(?:broke up|split up|ended|divorced|separated)/i, type: "relationship_end", weight: "empathy" },
  { pat: /i'?m (?:going through|dealing with) (?:a )?(?:breakup|divorce|separation)/i, type: "relationship_end", weight: "empathy" },
  { pat: /i (?:just )?(?:lost|said goodbye to) (?:my )?(?:dad|mom|mother|father|parent|grandma|grandpa|friend|pet|dog|cat)/i, type: "loss", weight: "deep_empathy" },
  { pat: /i'?m (?:switching|changing|transitioning) (?:my )?(?:career|field|industry|profession)/i, type: "career_pivot", weight: "heavy" },
  { pat: /i (?:just )?(?:got|received|was given) (?:my )?(?:diagnosis|test results)/i, type: "health_news", weight: "empathy" },
];

function extractStance(text) {
  for (const pat of POSITIVE_STANCE_PATS) {
    const m = text.match(pat);
    if (m) {
      const subject = (m[1] || "").replace(/^(a|an|the|my|this|that)\s+/i, "").trim().toLowerCase();
      if (subject.length >= 2 && subject.length < 30) return { subject, stance: "positive", raw: m[0] };
    }
  }
  for (const pat of NEGATIVE_STANCE_PATS) {
    const m = text.match(pat);
    if (m) {
      const subject = (m[1] || "").replace(/^(a|an|the|my|this|that)\s+/i, "").trim().toLowerCase();
      if (subject.length >= 2 && subject.length < 30) return { subject, stance: "negative", raw: m[0] };
    }
  }
  for (const pat of NEUTRAL_STANCE_PATS) {
    const m = text.match(pat);
    if (m) {
      const subject = (m[1] || "").replace(/^(a|an|the|my|this|that)\s+/i, "").trim().toLowerCase();
      if (subject.length >= 2 && subject.length < 30) return { subject, stance: "neutral", raw: m[0] };
    }
  }
  return null;
}

function trackBelief(text) {
  const stance = extractStance(text);
  if (!stance) return null;

  const key = stance.subject.split(/\s+/).slice(0, 3).join("_");
  const prev = beliefStore[key];

  beliefStore[key] = { stance: stance.stance, text: stance.raw, turn: mem.turn, subject: stance.subject };

  // Check for contradiction
  if (prev && prev.stance !== stance.stance && mem.turn - prev.turn >= 2) {
    // Real contradiction: positive→negative or negative→positive
    const isFlip = (prev.stance === "positive" && stance.stance === "negative") ||
                   (prev.stance === "negative" && stance.stance === "positive");
    if (isFlip) {
      return { type: "contradiction", subject: stance.subject, from: prev.stance, to: stance.stance, prevTurn: prev.turn, prevText: prev.text };
    }
    // Softening: strong→neutral or neutral→strong
    return { type: "shift", subject: stance.subject, from: prev.stance, to: stance.stance, prevTurn: prev.turn };
  }
  return null;
}

function detectRevelation(text, lower) {
  for (const { pat, type, weight } of REVELATION_PATS) {
    if (pat.test(text) || pat.test(lower)) {
      return { type, weight };
    }
  }
  return null;
}

function respondToContradiction(change) {
  const sub = change.subject;
  if (change.type === "contradiction") {
    const fromWord = change.from === "positive" ? "were into" : "weren't a fan of";
    const toWord = change.to === "positive" ? "coming around to" : "moving away from";
    const responses = [
      `Wait — didn't you say you ${fromWord} ${sub} earlier? What changed? I'm genuinely curious.`,
      `Oh interesting shift! Earlier it sounded like you ${fromWord} ${sub}, and now you're ${toWord} it. What happened?`,
      `Hold on — that's a 180 on ${sub}! Not judging at all, but I'd love to hear what flipped your perspective.`,
      `Ha, I noticed the ${sub} plot twist! You seemed to feel differently about it a bit ago. What's the story there?`,
    ];
    return pick(responses);
  }
  // Shift (softening)
  const responses = [
    `Sounds like your feelings on ${sub} are evolving — that's natural. What's shifting for you?`,
    `I notice your take on ${sub} is different from earlier. Has something changed?`,
    `Your ${sub} stance seems to be in flux! What are you seeing that's changing your mind?`,
  ];
  return pick(responses);
}

function respondToRevelation(rev, text) {
  switch (rev.weight) {
    case "celebration": {
      const reactions = {
        career_win: [
          "Wait — congratulations!! That's HUGE news! Tell me everything — what's the role?",
          "No way, that's amazing! You must be thrilled. What sealed the deal?",
          "YES! That deserves a celebration! 🎉 How are you feeling about it?",
        ],
        relationship_milestone: [
          "Oh my gosh, congratulations!! That's incredible news! 💙 How did it happen?",
          "That is AMAZING! I'm genuinely happy for you! What's the story?",
          "Congratulations!! That's such a big deal! How are you feeling about it all?",
        ],
        family_milestone: [
          "Congratulations!! That's the most exciting kind of news! How are you both doing?",
          "That's WONDERFUL news! You must be over the moon! How far along?",
          "Oh wow — life-changing in the best way! Congratulations! 🎉 How are you feeling?",
        ],
        education_milestone: [
          "You DID it! That's a massive accomplishment — you should be so proud! 🎓 What's next?",
          "Congratulations!! All that hard work paid off! How does it feel?",
          "That's incredible — seriously, well done! What an achievement! What are your plans now?",
        ],
        education_win: [
          "Oh my gosh, congratulations!! You got in! That's amazing! Are you excited?",
          "YES! You earned that! What are you most looking forward to?",
          "That's huge news — congratulations! All your hard work paid off!",
        ],
      };
      return pick(reactions[rev.type] || reactions.career_win);
    }
    case "heavy": {
      const reactions = {
        career_change: [
          "Wow, that's a big move. How are you feeling about it? That takes real courage.",
          "That's a major decision. Are you relieved, nervous, or both? I imagine it's a mix.",
          "Whoa — that's huge. What led you to make that call? I want to hear the story.",
        ],
        relocation: [
          "That's a big life change! Are you excited about it or is it bittersweet?",
          "Moving is one of life's biggest transitions. How are you feeling about the change?",
          "Wow, that's a major move — literally! What's pulling you in that direction?",
        ],
        entrepreneurship: [
          "That's incredibly brave! What are you building? I want to hear the vision.",
          "Starting something of your own — that's a big leap! What's the idea?",
          "Wow, founder life! That's exciting and terrifying in equal measure. What's the plan?",
        ],
        career_pivot: [
          "That's a significant shift! What's drawing you to the new direction?",
          "Career pivots take real courage. What made you decide it was time?",
          "Interesting — changing paths is a big deal. What sparked the move?",
        ],
      };
      return pick(reactions[rev.type] || reactions.career_change);
    }
    case "empathy": {
      const reactions = {
        relationship_end: [
          "I'm sorry to hear that. Breakups are genuinely hard, no matter the circumstances. How are you holding up?",
          "That's rough — I'm sorry. Take whatever time you need. Is it fresh or have you had some time to process?",
          "I hear you. That kind of thing takes a real toll. How are you doing with it all?",
        ],
        health_news: [
          "That sounds like a lot to process. How are you feeling about everything?",
          "I hope you're doing okay. That kind of news can be overwhelming. Want to talk about it?",
          "That must be weighing on you. Whatever you're feeling right now is completely valid.",
        ],
      };
      return pick(reactions[rev.type] || reactions.relationship_end);
    }
    case "deep_empathy": {
      return pick([
        "I'm so sorry. That's one of the hardest things a person can go through. I'm here if you want to talk about it, or if you just want a distraction. Either way.",
        "I don't even have the right words for that. I'm truly sorry. Whatever you need right now — whether it's to talk or not — that's okay.",
        "I'm really sorry for your loss. There's nothing I can say that would be enough, but I want you to know I'm here. 💙",
      ]);
    }
    default:
      return null;
  }
}

// Main pragmatic inference — called early in generateResponse
function inferPragmatics(text, lower, parsed, topics) {
  // 1. Indirect requests ("can you explain X?" → explain X)
  const indirect = detectIndirectRequest(text, lower, topics);
  if (indirect) {
    const resp = respondToKnowledgeGap({ ...indirect, level: "explain" });
    if (resp) return resp;
  }

  // 2. Knowledge gaps ("I don't know X" → offer to explain)
  const gap = detectKnowledgeGap(text, lower, topics);
  if (gap) return respondToKnowledgeGap(gap);

  // 3. Implicit farewells ("it's getting late" → farewell)
  if (detectImplicitFarewell(text, lower)) return respondToImplicitFarewell();

  // 4. Topic teasers ("I've been working on something" → probe)
  const teaser = detectTopicTeaser(text, lower);
  if (teaser) return respondToTeaser(teaser);

  return null;
}

/* ── The Brain: Main Response Generator ── */

function generateResponse(text) {
  const parsed = parseSentence(text);
  const intents = classify(text);
  const { tokens, keywords } = extractKW(text);
  let topics = extractTopics(tokens);
  const sent = sentiment(text);

  // ═══ Anaphora resolution: resolve pronouns BEFORE processing ═══
  const anaphora = resolveAnaphora(text);
  // Enrich topics with resolved referents (e.g., "tell me about it" → adds "react")
  if (anaphora.didResolve && anaphora.resolvedTopics.length > 0) {
    topics = [...new Set([...topics, ...anaphora.resolvedTopics])];
  }
  // Use resolved text for intent classification when pronouns were resolved
  const effectiveText = anaphora.didResolve ? anaphora.resolved : text;

  const nonMod = intents.filter(i=>!i.modifier);
  const primaryTopic = topics[0] || "";
  const primary = nonMod[0];

  // Record in memory (original text, not resolved)
  mem.add("user", text, nonMod.map(i=>i.intent), topics, sent);
  extractFacts(text, parsed);

  // Update referent stack with what was mentioned this turn
  updateReferents(effectiveText, topics, parsed);

  // Feed topics into thread manager
  for (const topic of topics) {
    threadManager.touch(topic, mem.turn, text);
  }

  // ═══ -0.5. Topic return detection — "we're back on X!" ═══
  if (topics.length > 0 && mem.turn > 5) {
    const topicReturn = handleTopicReturn(topics);
    if (topicReturn) return topicReturn;
  }

  // ═══ -0.4. Belief tracking & contradiction/surprise detection ═══
  // Track stances and detect when user flips position or drops a revelation
  const beliefChange = trackBelief(text);
  if (beliefChange && mem.turn - lastBeliefTurn >= 3) {
    const contradictionResp = respondToContradiction(beliefChange);
    if (contradictionResp) {
      lastBeliefTurn = mem.turn;
      return contradictionResp;
    }
  }
  const revelation = detectRevelation(text, parsed.lower || text.toLowerCase());
  if (revelation) {
    const revResp = respondToRevelation(revelation, text);
    if (revResp) {
      lastBeliefTurn = mem.turn;
      return revResp;
    }
  }

  // ═══ -1. Remember/recall commands — "what do you remember about me?" ═══
  const rememberCmd = handleRememberCommand(text);
  if (rememberCmd) return rememberCmd;

  // ═══ -0.1. Narrative understanding — detect and respond to stories/experiences ═══
  if (text.length > 50 && tokens.length >= 8) {
    const narrative = detectNarrative(text, parsed.lower || text.toLowerCase(), tokens, sent);
    if (narrative) {
      const narrativeResp = respondToNarrative(narrative, text, sent);
      if (narrativeResp) return narrativeResp;
    }
  }

  // ═══ 0. Multi-sentence processing — handle paragraph-length inputs ═══
  if (text.length > 40 && /[.!?]\s/.test(text)) {
    const multiResponse = handleMultiSentence(text);
    if (multiResponse) return multiResponse;
  }

  // ═══ 0.25. Riddle answer — check if we have a pending riddle ═══
  if (pendingRiddle) {
    const riddleResponse = handleRiddleAnswer();
    if (riddleResponse) return riddleResponse;
  }

  // ═══ 0.5. Question-answer linking — check if user is answering our question ═══
  if (mem.lastQuestion) {
    const answerLink = detectAnswerToQuestion(text, parsed);
    if (answerLink) {
      const answerResponse = respondToAnswer(answerLink, sent);
      if (answerResponse) return answerResponse;
    }
  }

  // ═══ 0.75. Turn-taking — continuation, elaboration, correction, confirmation ═══
  const turnSignal = detectTurnSignal(text);
  if (turnSignal) {
    const turnResponse = handleTurnSignal(turnSignal);
    if (turnResponse) return turnResponse;
  }

  // ═══ 0.8. Pragmatic inference — indirect speech acts & implicature ═══
  // "Can you explain React?" → explain React (not "yes I can")
  // "I don't know CSS" → offer to explain CSS
  // "It's getting late" → farewell
  // "Guess what" → probe for story
  const pragmatic = inferPragmatics(text, parsed.lower || text.toLowerCase(), parsed, topics);
  if (pragmatic) return pragmatic;

  // ═══ 0.82. Implicit need detection — experience-sharing statements ═══
  // "I just started learning X" → encouragement+tips, "I finally got it working" → celebration
  // "My team wants to switch to X" → perspective, "I've been stuck on X" → empathy+help
  const expContext = detectExperienceContext(text, parsed.lower || text.toLowerCase(), topics);
  if (expContext) {
    const expResp = respondToExperienceContext(expContext, text, sent, topics);
    if (expResp) return expResp;
  }

  // ═══ 0.85. Meta-conversational awareness — comments about the AI/conversation ═══
  const meta = handleMetaConversation(text, parsed.lower || text.toLowerCase(), sent);
  if (meta) return meta;

  // ═══ 0.9. Situational empathy — detect specific life moments and validate deeply ═══
  if (mem.turn - lastSituationTurn >= 3) {
    const situation = detectSituation(text, parsed.lower || text.toLowerCase());
    if (situation) {
      const sitResp = generateSituationalResponse(situation, text);
      if (sitResp) {
        lastSituationTurn = mem.turn;
        mem.add("ai", sitResp);
        trackAIQuestion(sitResp);
        const typingMs = calcTypingMs(sitResp, sent, parsed);
        return { text: sitResp, typingMs, pause: calcTypingPause(typingMs) };
      }
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

  // ═══ 2. Greeting — time-aware ═══
  if (primary?.intent === "greeting") {
    const name = mem.userName;
    // First greeting: use time-aware greeting ~60% of the time
    if (mem.turn <= 2 && !name && Math.random() > 0.4) return timeGreeting();
    if (name && mem.turn > 4) return fillSlots(pickNew(GREETINGS.namedReturn), {name});
    if (name) return fillSlots(pickNew(GREETINGS.named), {name});
    if (mem.turn > 4) return pickNew(GREETINGS.returning);
    // Mix in time-aware greetings for unnamed first greetings
    return Math.random() > 0.5 ? timeGreeting() : pickNew(GREETINGS.first);
  }

  // ═══ 3. Farewell — time-aware ═══
  if (primary?.intent === "farewell") {
    // Try time-aware farewell first
    const tf = timeFarewell();
    if (tf && Math.random() > 0.4) {
      return mem.userName ? `Bye ${mem.userName}! ${tf}` : tf;
    }
    if (mem.userName) return fillSlots(pickNew(FAREWELLS.named), {name:mem.userName});
    if (mem.turn > 6) return pickNew(FAREWELLS.long);
    return pickNew(FAREWELLS.basic);
  }

  // ═══ 4. Thanks ═══
  if (primary?.intent === "thanks") return pickNew(THANKS);

  // ═══ 5. How are you ═══
  if (primary?.intent === "howAreYou") return pickNew(HOW_ARE_YOU);

  // ═══ 6. Joke / humor / riddle / fun fact request ═══
  if (primary?.intent === "joke") return handleJokeRequest(text, topics);

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

  // ═══ 8.7. Opinion & recommendation engine ═══
  const opinionResponse = handleOpinionRequest(text, topics);
  if (opinionResponse) return opinionResponse;

  // ═══ 8.8. Hypothetical reasoning — "what if X", "would you rather X or Y" ═══
  const hypothetical = handleHypothetical(text, topics);
  if (hypothetical) {
    // Track that we might get an answer to a hypothetical we just posed
    if (hypothetical.includes("?") && /what|which|where|would you/i.test(hypothetical)) {
      lastHypothetical = text;
    }
    return hypothetical;
  }

  // ═══ 8.85. Hypothetical answer — user responding to our hypothetical ═══
  if (lastHypothetical && mem.turn > 2) {
    const hypAnswer = handleHypotheticalAnswer(text, parsed.lower || text.toLowerCase());
    if (hypAnswer) return hypAnswer;
  }

  // ═══ 9. Questions — use Q&A engine ═══
  if (parsed.qType) {
    // Use resolved text for questions so "what is it?" → "what is react?"
    const qText = anaphora.didResolve ? effectiveText : text;
    const answer = answerQuestion(qText, parsed, nonMod, topics);
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

  // ═══ 14.5. Fragment resolution for non-question fragments ═══
  // Catches things like "not really", "it depends", "says who?" that aren't classified as questions
  if (tokens.length <= 6 && !parsed.qType) {
    const frag = resolveFragment(text, parsed.lower || text.toLowerCase(), parsed, topics);
    if (frag) return frag;
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

  // ═══ 16.5. Knowledge synthesis — combine related knowledge fragments ═══
  if (keywords.length > 0) {
    const synthTopics = extractTopics(tokens); // re-check with fresh extraction
    const synth = synthesizeAnswer(text, synthTopics, parsed.qType);
    if (synth) return synth;
  }

  // ═══ 17. Fallback — graceful degradation, mirror, momentum, rescue ═══
  // Try graceful degradation first — be honest when confused
  const degraded = gracefulDegradation(text, keywords);
  if (degraded && Math.random() > 0.4) return degraded;

  // Try mirroring the user's actual words
  const mirrored = mirrorInput(text, keywords);
  if (mirrored && Math.random() > 0.3) return mirrored;

  // Check if conversation needs energy
  const momentum = momentumResponse();
  if (momentum) return momentum;

  // Last resort: if we've hit fallback 3+ times recently, offer a topic rescue
  const recentFallbacks = recentStructures.filter(s => s === "generic-ack" || s === "probe").length;
  if (recentFallbacks >= 2 && Math.random() > 0.5) return offerTopicRescue();

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

/* ── Conversational Turn-Taking & Active Listening ──
 * Handles the subtle conversational patterns humans use to manage dialogue:
 * continuation signals, elaboration requests, corrections, and confirmations.
 * Without this, the bot treats "mmhmm" the same as a new question.
 */

function detectTurnSignal(text) {
  const lower = text.toLowerCase().trim();

  // Continuation signals — user is listening, wants the AI to keep going
  if (/^(mmhmm|mhm|uh.?huh|go on|continue|and\??|then\??|so\??|right|I see|okay and|yeah and|interesting\.?\.?)$/i.test(lower))
    return { type: "continue" };
  if (/^(keep going|carry on|don't stop|finish|what happened|then what)$/i.test(lower))
    return { type: "continue" };

  // Elaboration requests — user wants deeper info on last AI topic
  if (/^(tell me more|more details?|elaborate|explain more|like what|such as|for example|give me an example|can you explain|how so|in what way|what do you mean)/i.test(lower))
    return { type: "elaborate" };
  if (/^(more about that|expand on that|what exactly|be more specific|dig deeper)/i.test(lower))
    return { type: "elaborate" };

  // Correction — user is fixing a misunderstanding
  if (/^(no,?\s+I\s+mean|actually\s+I\s+(mean|was|want)|not\s+(that|what|quite)|I\s+didn'?t\s+mean|that'?s?\s+not\s+what)/i.test(lower))
    return { type: "correct", payload: lower.replace(/^(no,?\s+I\s+mean|actually\s+I\s+(?:mean|was|want)|not\s+(?:that|what|quite),?\s*|I\s+didn'?t\s+mean\s+(?:that,?\s*)?|that'?s?\s+not\s+what\s+I\s+(?:mean|said),?\s*)/i, "").trim() };

  // Confirmation seeking — user wants validation
  if (/^(right\?|you know\?|does that make sense|am I right|is that correct|isn'?t it|ya know)/i.test(lower))
    return { type: "confirm" };

  // Restatement — user is rephrasing or summarizing
  if (/^(so basically|so you'?re saying|in other words|so what you mean|so that means|let me get this straight)/i.test(lower))
    return { type: "restate", payload: lower.replace(/^(so basically|so you'?re saying|in other words|so what you mean is?|so that means|let me get this straight),?\s*/i, "").trim() };

  return null;
}

function handleTurnSignal(signal) {
  const lastAI = mem.lastAI();
  if (!lastAI) return null;

  const lastText = lastAI.text;
  const lastTopics = mem.history.filter(h=>h.role==="ai").slice(-1)[0]?.topics || [];

  switch (signal.type) {
    case "continue": {
      // Continue the thought from the last AI message
      // Find what topic the AI was discussing and go deeper
      const topic = lastTopics[0];
      const assoc = topic ? ASSOC[topic] : null;

      if (assoc) {
        // Pick a related fact, opinion, or hook we haven't used
        const pools = [
          ...(assoc.facts || []).map(f => `And actually, ${f.charAt(0).toLowerCase() + f.slice(1)}`),
          ...(assoc.opinions || []).map(o => `Plus, ${o}.`),
          ...(assoc.hooks || []),
        ];
        const continuation = pickNew(pools);
        if (continuation) return continuation;
      }

      // Generic continuations that reference the last message
      const snippet = lastText.length > 50 ? lastText.substring(0, 50).replace(/\s\w+$/, "") + "..." : lastText;
      const conts = [
        `So building on that — ${pick(COMP.deepeners)}`,
        `And the thing is, there's more to it. ${pick(COMP.deepeners)}`,
        `Right, so to continue that thought — it's actually a bigger topic than it seems. ${pick(COMP.deepeners)}`,
        `Yeah, and honestly there's a lot more I could say about it. What specifically are you curious about?`,
      ];
      return pickNew(conts);
    }

    case "elaborate": {
      // Expand on the specific point the AI made
      const topic = lastTopics[0];
      const assoc = topic ? ASSOC[topic] : null;

      if (assoc) {
        // Give a fact + opinion combo for depth
        const fact = assoc.facts ? pick(assoc.facts) : null;
        const opinion = pick(assoc.opinions);
        if (fact && opinion) return `Sure! So ${fact.charAt(0).toLowerCase() + fact.slice(1)}. And honestly, ${opinion}. ${pick(assoc.hooks || COMP.deepeners)}`;
        if (fact) return `Of course! ${fact}. Pretty cool, right? ${pick(COMP.deepeners)}`;
        if (opinion) return `Yeah so, ${opinion}. ${pick(COMP.deepeners)}`;
      }

      // Extract the key phrase from last AI message to elaborate on
      const lastWords = lastText.split(/\s+/).filter(w => w.length > 4 && !/^(that|this|about|would|could|should|really|think)/i.test(w));
      const keyPhrase = lastWords.slice(0, 3).join(" ");
      if (keyPhrase) {
        const elaborations = [
          `So when I mentioned ${keyPhrase} — the key thing is that it's not as simple as it seems on the surface. There are layers to it.`,
          `Right, so about ${keyPhrase}: the interesting part is really in the details. What aspect are you most curious about?`,
          `Good question! The ${keyPhrase} part is actually pretty nuanced. Want me to break it down step by step?`,
        ];
        return pickNew(elaborations);
      }

      return "Sure! The gist is that there's more depth there than meets the eye. What specifically caught your interest?";
    }

    case "correct": {
      // User is correcting a misunderstanding
      const corrected = signal.payload;
      if (corrected && corrected.length > 2) {
        const corrections = [
          `Oh, ${corrected}! Got it, my bad. That changes things — `,
          `Ahh, ${corrected} — okay, that makes more sense! `,
          `Oh right, ${corrected}! Sorry I misread that. `,
        ];
        const base = pickNew(corrections);
        // Try to generate a response for the corrected topic
        const correctedTopics = extractTopics(tokenize(corrected));
        if (correctedTopics.length > 0 && ASSOC[correctedTopics[0]]) {
          const assoc = ASSOC[correctedTopics[0]];
          return base + pick(assoc.opinions || assoc.hooks || ["Tell me more about that!"]);
        }
        return base + "So tell me more about what you actually meant!";
      }
      return pickNew([
        "Oh, my bad! I misunderstood. What were you actually getting at?",
        "Sorry about that! Let me recalibrate — what did you mean?",
        "Ah, I read that wrong! Take two — what were you saying?",
      ]);
    }

    case "confirm": {
      // User seeks validation — agree and add depth
      const confirmations = [
        "Yeah, exactly! You've got it.",
        "Spot on! That's pretty much it.",
        "Yep, you nailed it! 😊",
        "100% — you're following perfectly.",
        "That's right! And actually, there's an interesting layer to it too —",
      ];
      const base = pickNew(confirmations);
      const topic = lastTopics[0];
      if (topic && ASSOC[topic]?.hooks) {
        return base + " " + pick(ASSOC[topic].hooks);
      }
      return base;
    }

    case "restate": {
      // User is paraphrasing — confirm, refine, or correct their restatement
      const restatement = signal.payload;
      if (restatement && restatement.length > 5) {
        const responses = [
          `Yeah, that's a good way to put it! "${restatement}" — exactly.`,
          `Pretty much! Though I'd add a small nuance: it's not just about ${restatement.split(/\s+/)[0]}, but the bigger picture around it.`,
          `Close! ${restatement} is part of it, but there's a bit more to it. ${pick(COMP.deepeners)}`,
          `Exactly right! You got the essence of it. ${pick(COMP.deepeners)}`,
        ];
        return pickNew(responses);
      }
      return "Yeah, that's the gist of it! Did I explain it clearly enough?";
    }

    default: return null;
  }
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

  // Conversation phase — established conversations feel snappier
  const phase = getConversationPhase();
  if (phase === "established") base *= 0.85;
  if (phase === "opening") base *= 1.08;

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

/* ── Proactive Conversation Callbacks ──
 * Naturally weave in references to things discussed earlier in the conversation.
 * Unlike the rhythm engine's forced "callback" move, this fires contextually:
 * when the current topic overlaps with something the user mentioned before,
 * OR when the conversation has been going long enough that a callback feels
 * natural. Makes the AI feel like it genuinely remembers the conversation.
 */

let lastCallbackTurn = 0; // prevent callbacks too close together

function tryProactiveCallback(response, currentTopics) {
  // Don't callback too frequently (at least 4 turns apart)
  if (mem.turn - lastCallbackTurn < 4) return response;
  // Don't modify very short or very long responses
  if (response.length < 20 || response.length > 180) return response;
  // Don't add to responses that already reference earlier conversation
  if (/you mentioned|earlier|back to|remember|you said/i.test(response)) return response;

  // ── Strategy 1: Topic bridge — current topic connects to an earlier one ──
  if (currentTopics.length > 0 && mem.turn > 5) {
    const olderHistory = mem.history.filter(h => h.role === "user").slice(0, -2); // exclude last 2
    for (const topic of currentTopics) {
      for (const prev of olderHistory) {
        if (prev.topics?.includes(topic) && Math.random() > 0.6) {
          const bridges = [
            `This connects to what you were saying about ${topic} earlier —`,
            `Oh, this reminds me — you brought up ${topic} before too.`,
            `Funny how we keep coming back to ${topic}!`,
          ];
          lastCallbackTurn = mem.turn;
          return pick(bridges) + " " + response;
        }
      }
    }
  }

  // ── Strategy 1.5: Thread resumption — suggest picking up a parked topic ──
  if (mem.turn > 7 && Math.random() > 0.65) {
    const suggestion = threadManager.suggestResumption();
    if (suggestion) {
      lastCallbackTurn = mem.turn;
      return response + " " + suggestion;
    }
  }

  // ── Strategy 2: Fact callback — reference a stored fact naturally ──
  if (mem.turn > 6 && Object.keys(mem.facts).length > 0 && Math.random() > 0.7) {
    const factKeys = Object.keys(mem.facts);
    const fact = pick(factKeys);
    const val = mem.facts[fact];

    if (fact === "project") {
      const projectBridges = [
        ` By the way, how's the ${val} project going?`,
        ` — that might be useful for your ${val} project too!`,
        ` Speaking of which, does this tie into the ${val} work you mentioned?`,
      ];
      lastCallbackTurn = mem.turn;
      return response + pick(projectBridges);
    }
    if (fact.startsWith("likes_")) {
      const thing = val;
      const likeBridges = [
        ` Oh, and since you're into ${thing} — this might be relevant!`,
        ` That actually ties into ${thing}, which you mentioned liking!`,
      ];
      lastCallbackTurn = mem.turn;
      return response + pick(likeBridges);
    }
    if (fact === "role" || fact === "job") {
      lastCallbackTurn = mem.turn;
      return response + ` — especially relevant for someone in ${val}!`;
    }
  }

  // ── Strategy 3: Name callback — use their name naturally (rare) ──
  if (mem.userName && mem.turn > 8 && Math.random() > 0.85) {
    const nameTouch = [
      `${mem.userName}, ` + response.charAt(0).toLowerCase() + response.slice(1),
      response + `, ${mem.userName}!`,
    ];
    lastCallbackTurn = mem.turn;
    return pick(nameTouch);
  }

  return response;
}

/* ── Semantic Memory Connections ──
 * Goes beyond simple "you mentioned X" callbacks. Builds inferred connections
 * between what the user is saying NOW and what they've shared BEFORE.
 * If they mentioned liking Python and now ask about APIs, connect the dots.
 * If they said they're a designer and now discuss CSS, infer the link.
 * The key: the AI should seem like it's been "thinking" about the user.
 */

// Topic-to-topic semantic links (what topics relate to what facts)
const SEMANTIC_LINKS = {
  // If user has fact X and mentions topic Y, there's a natural connection
  role: {
    developer: ["react","javascript","python","typescript","node","rust","api","database","git","docker","aws","algorithm","css","html","nextjs","vue","tailwind","graphql"],
    designer: ["ui","ux","figma","css","tailwind","color","typography","animation","responsive","prototype","wireframe","brand","accessibility"],
    student: ["algorithm","python","javascript","database","sql","html","css","git"],
    manager: ["team","project","productivity","startup","strategy"],
    freelancer: ["client","project","startup","time","money","productivity"],
  },
  // Infer topic connections from known languages/tools
  knows: {
    python: ["django","flask","numpy","pandas","ml","ai","data","api"],
    javascript: ["react","vue","node","typescript","nextjs","npm","frontend"],
    typescript: ["react","nextjs","node","api","zod","interfaces"],
    react: ["hooks","components","jsx","nextjs","state","redux","frontend"],
    rust: ["ownership","wasm","performance","systems"],
  },
  // Connect likes to relevant topics
  likes: {
    react: ["javascript","typescript","nextjs","frontend","hooks","state"],
    python: ["django","flask","ml","ai","data"],
    coffee: ["morning","productivity","cafe","work"],
    music: ["playlist","spotify","coding","concentration"],
    gaming: ["games","pc","steam","console","fun"],
    design: ["ui","ux","figma","css","typography","color"],
  },
};

// Given current topics and user facts, find meaningful connections
function findSemanticConnections(currentTopics, currentKeywords) {
  const facts = mem.facts;
  const connections = [];

  // 1. Role-based inference: user's role connects to what they're asking about
  if (facts.role) {
    const roleKey = facts.role.toLowerCase().split(" ")[0]; // "frontend developer" → "developer"
    const roleDomain = SEMANTIC_LINKS.role[roleKey] || SEMANTIC_LINKS.role.developer;
    if (roleDomain) {
      for (const topic of currentTopics) {
        if (roleDomain.includes(topic)) {
          connections.push({
            type: "role-topic",
            fact: facts.role,
            topic,
            strength: 0.7,
            template: [
              `As a ${facts.role}, you'd probably approach ${topic} differently —`,
              `This ties into your ${facts.role} work, right?`,
              `I bet ${topic} looks different from a ${facts.role}'s perspective!`,
              `Makes sense you'd be into ${topic} given your ${facts.role} background.`,
            ],
          });
        }
      }
    }
  }

  // 2. Knowledge-based inference: user knows X, current topic relates to X
  const knownLangs = Object.keys(facts).filter(k => k.startsWith("knows_")).map(k => k.replace("knows_", ""));
  for (const lang of knownLangs) {
    const related = SEMANTIC_LINKS.knows[lang];
    if (related) {
      for (const topic of currentTopics) {
        if (related.includes(topic)) {
          connections.push({
            type: "skill-topic",
            fact: lang,
            topic,
            strength: 0.8,
            template: [
              `Since you know ${lang}, ${topic} should feel pretty natural!`,
              `Oh — are you using ${lang} for this? You mentioned knowing it.`,
              `Your ${lang} experience should help a lot with ${topic}.`,
              `That connects nicely with your ${lang} knowledge.`,
            ],
          });
        }
      }
    }
  }

  // 3. Project-based inference: current topic relates to their project
  if (facts.project) {
    const projWords = tokenize(facts.project).map(stem);
    for (const topic of currentTopics) {
      // Check if topic could relate to the project
      const topicAssoc = ASSOC[topic];
      if (topicAssoc?.related) {
        const overlap = projWords.filter(w => topicAssoc.related.includes(w) || topic === w);
        if (overlap.length > 0 || currentKeywords.some(kw => projWords.includes(stem(kw)))) {
          connections.push({
            type: "project-topic",
            fact: facts.project,
            topic,
            strength: 0.9,
            template: [
              `Is this for the ${facts.project} project? Makes total sense.`,
              `Oh wait — does this tie into ${facts.project}?`,
              `This ${topic} stuff could be perfect for ${facts.project}.`,
              `I bet you're thinking about this in the context of ${facts.project}.`,
            ],
          });
        }
      }
    }
  }

  // 4. Like-based inference: things they enjoy connect to current topic
  const likedThings = Object.keys(facts).filter(k => k.startsWith("likes_")).map(k => facts[k].toLowerCase());
  for (const liked of likedThings) {
    const likeKey = liked.split(" ")[0];
    const related = SEMANTIC_LINKS.likes[likeKey];
    if (related) {
      for (const topic of currentTopics) {
        if (related.includes(topic)) {
          connections.push({
            type: "preference-topic",
            fact: liked,
            topic,
            strength: 0.6,
            template: [
              `Since you're into ${liked}, ${topic} is a natural fit.`,
              `Your love of ${liked} probably makes ${topic} extra interesting!`,
              `Oh, ${topic} — that's right in your wheelhouse given you like ${liked}.`,
            ],
          });
        }
      }
    }
  }

  // 5. Opinion-based inference: if they had opinions on related things
  const opinionKeys = Object.keys(facts).filter(k => k.startsWith("opinion_"));
  for (const opKey of opinionKeys) {
    const subject = opKey.replace("opinion_", "");
    const opinion = facts[opKey];
    for (const topic of currentTopics) {
      // If they have an opinion on something related to current topic
      const topicAssoc = ASSOC[topic];
      if (topicAssoc?.related?.includes(subject) || subject === topic) {
        connections.push({
          type: "opinion-topic",
          fact: opinion,
          topic,
          strength: 0.5,
          template: [
            `You said ${opinion} — does that change how you think about ${topic}?`,
            `Interesting take on ${topic} given you thought ${opinion}.`,
            `That's funny because earlier you said ${opinion} — I see a pattern! 😄`,
          ],
        });
      }
    }
  }

  // 6. History-based inference: match current keywords against older messages
  if (mem.turn > 6) {
    const oldMsgs = mem.history.filter(h => h.role === "user").slice(0, -3); // skip recent 3
    for (const msg of oldMsgs) {
      if (!msg.topics || msg.topics.length === 0) continue;
      for (const topic of currentTopics) {
        // Find old messages about related but different topics
        for (const oldTopic of msg.topics) {
          if (oldTopic === topic) continue; // same topic, not interesting
          const topicAssoc = ASSOC[topic];
          const oldAssoc = ASSOC[oldTopic];
          // Check if these topics are related through ASSOC
          if ((topicAssoc?.related?.includes(oldTopic)) || (oldAssoc?.related?.includes(topic))) {
            connections.push({
              type: "conversation-bridge",
              fact: oldTopic,
              topic,
              strength: 0.65,
              template: [
                `This reminds me — when we talked about ${oldTopic}, that's actually connected to this!`,
                `Oh interesting, earlier you were asking about ${oldTopic} — see how ${topic} ties in?`,
                `There's a nice thread between this and the ${oldTopic} discussion we had.`,
              ],
            });
            break; // one bridge per old message
          }
        }
      }
    }
  }

  // Sort by strength and return top connections
  connections.sort((a, b) => b.strength - a.strength);
  return connections.slice(0, 3);
}

// Apply semantic connection to a response (called from post-processing)
let lastSemanticTurn = 0;

function applySemanticConnection(response, currentTopics, currentKeywords) {
  // Don't over-connect — at least 5 turns apart
  if (mem.turn - lastSemanticTurn < 5) return response;
  // Don't modify very short or already-connected responses
  if (response.length < 25 || response.length > 200) return response;
  if (/you mentioned|earlier|you said|you told me|your .+ project|as a /i.test(response)) return response;
  // Need enough conversation history
  if (mem.turn < 5 || Object.keys(mem.facts).length < 1) return response;
  // Only fire ~30% of the time — should feel natural, not forced
  if (Math.random() > 0.3) return response;

  const connections = findSemanticConnections(currentTopics, currentKeywords);
  if (connections.length === 0) return response;

  // Pick best connection
  const best = connections[0];
  const connector = pick(best.template);

  lastSemanticTurn = mem.turn;

  // Decide placement: before or after the main response
  if (best.type === "project-topic" || best.type === "role-topic") {
    // These work well as prefixes
    return connector + " " + response;
  } else {
    // Most work as suffixes
    return response + " " + connector;
  }
}

/* ── Style Matching & Conversation Phase Awareness ──
 * Two interconnected systems that make the AI feel adaptive:
 *
 * 1. Style Matching: mirrors the user's communication style — if they write
 *    short casual messages, the AI responds short and casual. If they write
 *    long thoughtful paragraphs, the AI matches with depth. Tracks vocabulary
 *    complexity, message length, formality, and emoji usage.
 *
 * 2. Conversation Phase: adjusts behavior based on where we are in the
 *    conversation — early (warm intros, establishing rapport), mid (deeper
 *    engagement, follow-ups), late (callbacks, warmth, summary reflections).
 */

function analyzeUserStyle() {
  const userMsgs = mem.history.filter(h => h.role === "user");
  if (userMsgs.length < 2) return { length: "medium", formality: "casual", emoji: false, complexity: "simple" };

  const recent = userMsgs.slice(-5);

  // Average message length
  const avgLen = recent.reduce((sum, m) => sum + m.text.length, 0) / recent.length;
  const length = avgLen < 25 ? "short" : avgLen > 100 ? "long" : "medium";

  // Formality detection: contractions, slang, lowercase = casual; full words, punctuation = formal
  const allText = recent.map(m => m.text).join(" ");
  const lower = allText.toLowerCase();
  const casualSignals = (lower.match(/\b(gonna|wanna|gotta|kinda|sorta|lol|haha|omg|idk|tbh|ngl|fr|bruh|bro|dude|chill|vibe|lowkey|highkey|nah|yep|yeah)\b/g) || []).length;
  const formalSignals = (allText.match(/\b(would|could|shall|perhaps|however|therefore|regarding|furthermore|additionally|specifically)\b/gi) || []).length;
  const hasProperPunctuation = recent.filter(m => /[.!?]$/.test(m.text.trim())).length > recent.length * 0.6;
  const formality = formalSignals > casualSignals + 1 || (hasProperPunctuation && casualSignals === 0) ? "formal" : casualSignals > 2 ? "very-casual" : "casual";

  // Emoji usage
  const emojiCount = (allText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  const emoji = emojiCount > recent.length * 0.3;

  // Vocabulary complexity: long unique words suggest sophistication
  const words = tokenize(allText);
  const uniqueLong = new Set(words.filter(w => w.length > 7));
  const complexity = uniqueLong.size > words.length * 0.15 ? "complex" : "simple";

  return { length, formality, emoji, complexity };
}

function getConversationPhase() {
  const turn = mem.turn;
  if (turn <= 3) return "opening";      // first few exchanges — build rapport
  if (turn <= 8) return "exploring";    // getting to know each other's interests
  if (turn <= 16) return "engaged";     // deep conversation, substantive exchanges
  return "established";                  // long conversation, high familiarity
}

function adaptToStyle(response, style) {
  let r = response;

  // ── Length matching ──
  if (style.length === "short" && r.length > 80) {
    // Trim to one strong sentence — find the first sentence end
    const firstEnd = r.search(/[.!?]\s/);
    if (firstEnd > 15 && firstEnd < 80) {
      r = r.slice(0, firstEnd + 1);
    }
  }
  if (style.length === "long" && r.length < 50 && mem.turn > 3) {
    // Pad with a thoughtful follow-up for users who write longer messages
    const expansions = [
      " I'd love to hear more about your perspective on this.",
      " There's a lot of nuance there worth exploring.",
      " What's the thinking behind that?",
      " I find that there's usually an interesting story behind that kind of thing.",
    ];
    r += pick(expansions);
  }

  // ── Formality matching ──
  if (style.formality === "very-casual") {
    // Inject casual markers if the response is too stiff
    if (!/\b(lol|haha|ngl|tbh|fr|vibe|lowkey)\b/i.test(r) && Math.random() < 0.3) {
      const casualizers = [" tbh", " ngl", " fr"];
      // Insert before the last sentence or at the end
      const lastPeriod = r.lastIndexOf(".");
      if (lastPeriod > 20) {
        r = r.slice(0, lastPeriod) + pick(casualizers) + r.slice(lastPeriod);
      }
    }
    // Lowercase the first letter if response starts with a capital (casual style)
    if (/^[A-Z][a-z]/.test(r) && Math.random() < 0.25) {
      r = r.charAt(0).toLowerCase() + r.slice(1);
    }
  }
  if (style.formality === "formal") {
    // Remove overly casual elements
    r = r.replace(/\b(tbh|ngl|fr|lowkey|highkey)\b/gi, "").replace(/\s{2,}/g, " ");
    // Remove emoji from formal conversations (occasionally)
    if (Math.random() < 0.5) {
      r = r.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
    }
  }

  // ── Emoji matching ──
  if (!style.emoji && Math.random() < 0.4) {
    // User doesn't use emoji — strip some from response
    r = r.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").replace(/\s{2,}/g, " ").trim();
  }

  // ── Complexity matching ──
  if (style.complexity === "complex" && r.length > 40) {
    // Don't dumb down responses for sophisticated users — this is a no-op
    // but we could enhance with richer vocabulary in future rounds
  }

  return r.trim();
}

function phaseAwareAdjust(response, phase) {
  let r = response;

  switch (phase) {
    case "opening":
      // Early conversation: be warm and inviting, ask getting-to-know-you questions
      if (!r.includes("?") && Math.random() < 0.4) {
        const openers = [
          " What brings you here today?",
          " What are you working on?",
          " What's on your mind?",
        ];
        r += pick(openers);
      }
      break;

    case "exploring":
      // Mid-early: show interest in their topics, build on what they share
      if (mem.topics && Object.keys(mem.topics).length > 0 && Math.random() < 0.25) {
        const topTopic = mem.topTopic();
        if (topTopic && !r.toLowerCase().includes(topTopic)) {
          const bridges = [
            ` By the way, I'm enjoying our ${topTopic} conversation.`,
            ` You clearly know your stuff about ${topTopic}.`,
          ];
          r += pick(bridges);
        }
      }
      break;

    case "engaged":
      // Deep conversation: less fluff, more substance, reference earlier points
      // Remove trailing filler questions that add no value
      if (r.endsWith("What do you think?") && Math.random() < 0.3) {
        r = r.replace(/\s*What do you think\?$/, ".");
      }
      break;

    case "established":
      // Long conversation: warm familiarity, occasional reflection
      if (Math.random() < 0.12 && mem.turn % 8 === 0) {
        const reflections = [
          `You know, I've really enjoyed this conversation.`,
          `This has been a great chat — you're fun to talk to.`,
          `I feel like we've covered a lot of ground together.`,
        ];
        r = pick(reflections) + " " + r;
      }
      // Use name more frequently in established phase
      if (mem.userName && Math.random() < 0.15 && !r.includes(mem.userName)) {
        r = r.replace(/^(\w)/, `${mem.userName}, $1`.replace(/^./, c => c));
      }
      break;
  }

  return r;
}

/* ── Conversation Repair System ──
 * Detects when the AI is about to give a low-quality response (generic fallback,
 * repetitive pattern, or confusion signal) and applies repair strategies:
 * 1. Confusion detection — user says "what?", "huh?", "I don't get it"
 * 2. Repetition guard — prevents the same response structure 3x in a row
 * 3. Graceful degradation — when the bot truly doesn't know, it admits it
 *    charmingly rather than giving vague "that's interesting" responses
 * 4. Topic rescue — offers concrete conversation pivots when stuck
 * 5. Ambiguity handling — when input could mean multiple things, asks
 */

let recentStructures = []; // track response "shapes" for repetition detection

function classifyStructure(response) {
  // Classify the response's conversational structure
  if (/\?$/.test(response.trim())) return "question";
  if (/^(oh|ooh|hmm|ah|ha|haha|wow)/i.test(response)) return "reaction";
  if (/tell me more|what else|how about|what's on your mind/i.test(response)) return "probe";
  if (/that's (interesting|cool|awesome|great|neat)/i.test(response)) return "generic-ack";
  if (response.length < 30) return "short";
  if (response.includes("!") && response.length > 60) return "enthusiastic";
  return "statement";
}

function detectRepetition(response) {
  const struct = classifyStructure(response);
  recentStructures.push(struct);
  if (recentStructures.length > 5) recentStructures.shift();

  // Check for 3+ of the same structure in a row
  const last3 = recentStructures.slice(-3);
  if (last3.length === 3 && last3[0] === last3[1] && last3[1] === last3[2]) {
    return last3[0]; // the repeated structure
  }
  return null;
}

function repairRepetition(response, repeatedType) {
  // Break the pattern by switching to a different conversational move
  switch (repeatedType) {
    case "question":
      // Stop asking questions — make a statement instead
      return response.replace(/\?[^?]*$/, ".") + " But I'm genuinely curious about your perspective.";
    case "generic-ack":
      // Replace generic acknowledgment with something specific
      return pickNew([
        "Okay, I'm going to be honest — I want to give you a better response than 'that's interesting.' What specifically about this matters to you?",
        "Rather than just saying 'cool' again, let me ask — what's the real thing you want to dig into here?",
        "I notice I keep giving surface-level reactions. Let's go deeper — what's the heart of what you're thinking about?",
      ]);
    case "probe":
      // Stop probing and share something instead
      return pickNew([
        "You know what, instead of asking more questions — here's what I think is cool about what you're saying: it shows you think deeply about things.",
        "Let me flip the script instead of asking another question. From what we've been talking about, you seem like someone who values substance.",
        "Instead of another question from me — I think the thread running through what you've been saying is really interesting.",
      ]);
    default:
      return response;
  }
}

function detectConfusion(text) {
  const lower = text.toLowerCase().trim();
  // Direct confusion signals
  if (/^(what|huh|wdym|what do you mean|i don't (get|understand)|confused|that (doesn't|makes no) sense)\??$/i.test(lower)) return "direct";
  // Softer confusion
  if (/^(wait|hold on|back up|say that again|come again|excuse me)\b/i.test(lower)) return "soft";
  // Correction attempt
  if (/^(no |not |i (meant|said|was talking)|that's not what i)/i.test(lower)) return "correction";
  return null;
}

function repairConfusion(confusionType) {
  const lastAI = mem.lastAI();
  const lastUser = mem.prevUserMsg();

  if (confusionType === "direct") {
    if (lastAI) {
      // Try to rephrase what we said
      const topic = lastAI.topics?.[0] || "that";
      return pickNew([
        `Sorry, let me try again! I was talking about ${topic}. What I meant was — what's your take on it?`,
        `My bad — I jumped ahead! Let me back up. What were you trying to say about ${topic}?`,
        `Ha, I think I got a bit off track there 😅 Let's reset — what did you want to talk about?`,
      ]);
    }
    return "Sorry about that! I got confused. Let's start fresh — what's on your mind?";
  }

  if (confusionType === "soft") {
    return pickNew([
      "Oh wait, sorry — I might have misread what you were saying. Can you rephrase? I want to get it right this time.",
      "Hold on, you're right — let me actually listen this time. What were you getting at?",
      "Fair point, I may have jumped to conclusions. Run that by me again?",
    ]);
  }

  if (confusionType === "correction") {
    if (lastUser) {
      return pickNew([
        `Ah, my mistake! I misunderstood. So what you actually meant was...?`,
        `Oh gotcha — sorry about that! I read that wrong. Tell me what you actually meant.`,
        `Oops, I totally misread that 😅 My bad! What were you actually saying?`,
      ]);
    }
    return "Ah, my mistake! Tell me what you actually meant — I'll pay better attention this time.";
  }

  return null;
}

function handleAmbiguity(text, intents, topics) {
  // If multiple strong intents compete (both >0.6), the input is ambiguous
  if (intents.length >= 2 && intents[0].conf > 0.6 && intents[1].conf > 0.55) {
    const diff = intents[0].conf - intents[1].conf;
    if (diff < 0.15) {
      // Very close — ask for clarification naturally
      const a = intents[0].intent, b = intents[1].intent;
      return pickNew([
        `Ooh, I'm picking up on both ${a} and ${b} vibes here — which angle are you coming from?`,
        `That's got me thinking in two directions — the ${a} side and the ${b} side. Which one are you after?`,
        `Interesting — are you asking about the ${a} aspect or more the ${b} part?`,
      ]);
    }
  }
  return null;
}

function gracefulDegradation(text, keywords) {
  // When we truly have no clue, be honest and charming about it
  const wordCount = tokenize(text).length;

  // Very long message we can't parse — acknowledge the effort
  if (wordCount > 25 && keywords.length < 2) {
    return pickNew([
      "Okay I'm going to level with you — I read all of that and I think my little AI brain needs help. Can you give me the TL;DR? 😄",
      "I want to give that a proper response but I'm not sure I'm following the thread. What's the key thing you want to talk about?",
      "That's a lot of thought and I want to do it justice! Can you boil it down to the core question?",
    ]);
  }

  // Completely unknown territory
  if (keywords.length === 0 || wordCount < 3) return null; // let normal handlers deal with very short msgs

  // We have keywords but no matching intents/topics — be specific about what we caught
  const caught = keywords.slice(0, 2).join(" and ");
  return pickNew([
    `Hmm, I caught "${caught}" but I'm not 100% sure what you're getting at. Can you tell me more?`,
    `I heard you say something about ${caught} — but I want to make sure I'm on the right track. What specifically are you wondering?`,
    `Okay, ${caught} — I want to give you a real answer, not a generic one. Can you rephrase that for me?`,
    `"${caught}" — interesting! But I'd rather ask than guess wrong. What's the actual question?`,
  ]);
}

// Concrete topic pivots when conversation is truly stuck
function offerTopicRescue() {
  const explored = Object.keys(mem.topics);
  const allTopics = ["tech", "design", "food", "music", "movies", "gaming", "travel", "books", "science", "philosophy"];
  const unexplored = allTopics.filter(t => !explored.includes(t));
  const suggestion = unexplored.length > 0 ? pick(unexplored) : pick(allTopics);

  const rescues = [
    `Hey, totally different direction — have you been into any ${suggestion} stuff lately?`,
    `Okay wild card: let's talk about ${suggestion}. What's your take?`,
    `Plot twist — ${suggestion}. Go. First thought that comes to mind!`,
    `Let me try something different: if you had to teach someone about ${suggestion}, where would you start?`,
  ];
  return pickNew(rescues);
}

/* ── Adaptive Conversation Strategy ──
 * Tracks what kinds of AI responses get engagement (long user replies)
 * vs. disengagement (short "ok" / "yeah" replies). Adjusts strategy
 * dynamically within the conversation — a form of meta-learning.
 *
 * Key insight: if the user keeps giving short replies to our questions,
 * we should stop asking so many questions and share more. If they respond
 * well to opinions, lean into that. If humor lands, use more humor.
 */

const strategyScores = {
  questions: 0,   // asking the user questions
  opinions: 0,    // sharing opinions/takes
  facts: 0,       // sharing knowledge/facts
  humor: 0,       // jokes/playful responses
  empathy: 0,     // empathetic/supportive
  stories: 0,     // anecdotes/stories
};
let lastAIStrategyType = "questions"; // what the last AI response was "about"

// Classify what type of response the AI just gave
function classifyAIStrategy(response) {
  if (/\?$/.test(response.trim()) || /\?[^.]*$/.test(response)) return "questions";
  if (/I think|honestly|in my|my take|my opinion/i.test(response)) return "opinions";
  if (/fun fact|did you know|actually,? .+ is|was created/i.test(response)) return "facts";
  if (/haha|😂|😄|lol|joke|funny|lmao/i.test(response)) return "humor";
  if (/I hear you|that'?s tough|I understand|I feel|sorry to/i.test(response)) return "empathy";
  if (response.length > 120) return "stories";
  return "opinions"; // default
}

// After the user responds, score how well our last strategy worked
function scoreLastStrategy(userResponse) {
  if (mem.turn < 3) return; // too early to score

  const len = userResponse.length;
  const isEngaged = len > 30; // decent-length response
  const isShort = len < 15;   // "ok", "yeah", "sure", "cool"
  const isEnthusiastic = /!|😊|😄|haha|lol|love|awesome|amazing|great/i.test(userResponse);

  // Score: positive for engagement, negative for disengagement
  let score = 0;
  if (isEnthusiastic) score = 2;
  else if (isEngaged) score = 1;
  else if (isShort) score = -1;

  // Apply score to last strategy type (with decay toward 0)
  strategyScores[lastAIStrategyType] = strategyScores[lastAIStrategyType] * 0.7 + score;
}

// Get the best strategy to try next based on accumulated scores
function getBestStrategy() {
  const entries = Object.entries(strategyScores);
  const best = entries.reduce((a, b) => a[1] > b[1] ? a : b);
  const worst = entries.reduce((a, b) => a[1] < b[1] ? a : b);

  return { best: best[0], worst: worst[0], scores: { ...strategyScores } };
}

// Adjust a response based on adaptive strategy learning
/* ── Epistemic Modulation & Self-Awareness ──
 * Calibrates the AI's confidence level based on how well it actually knows
 * the topic, and applies natural hedging/confidence language accordingly.
 * Real people say "I'm pretty sure..." differently from "Oh definitely!"
 * This makes the AI feel honest rather than always authoritative.
 */

// Score how confident the AI should be about current topics
function assessConfidence(topics, parsed) {
  let score = 0.5; // baseline: moderate confidence
  let reason = "general";

  for (const topic of topics) {
    // Strong knowledge: ASSOC entry with facts AND opinions AND related
    if (ASSOC[topic]) {
      const a = ASSOC[topic];
      const depth = (a.facts ? 1 : 0) + (a.opinions ? 1 : 0) + (a.related ? 0.5 : 0) + (a.hooks ? 0.5 : 0);
      if (depth >= 2.5) { score = Math.max(score, 0.9); reason = "deep_knowledge"; }
      else if (depth >= 1.5) { score = Math.max(score, 0.7); reason = "moderate_knowledge"; }
      else { score = Math.max(score, 0.55); reason = "shallow_knowledge"; }
    }

    // KB explainer entries = very confident
    if (typeof EXPLAIN !== "undefined" && EXPLAIN[topic]) {
      score = Math.max(score, 0.95);
      reason = "expert";
    }
  }

  // If no topics matched anything, we're guessing
  if (topics.length > 0 && score <= 0.5) {
    score = 0.3;
    reason = "unfamiliar";
  }

  // If it's a factual question, be more careful about certainty
  if (parsed?.qType && /^(what|when|where|who|which|how many|how much)/i.test(parsed.lower || "")) {
    score = Math.min(score, score - 0.1);
    reason = score < 0.5 ? "factual_uncertain" : reason;
  }

  // If it's an opinion question, we can be more confident (opinions are always valid)
  if (parsed?.qType && /^(what do you think|should|which is better|do you prefer|recommend)/i.test(parsed.lower || "")) {
    score = Math.max(score, 0.65);
    if (reason === "unfamiliar") reason = "opinion_ok";
  }

  return { score, reason };
}

// Last epistemic turn tracker to prevent every response having qualifiers
let lastEpistemicTurn = 0;

function modulateEpistemics(response, topics, parsed) {
  // Only modulate ~25% of responses to keep it natural
  if (mem.turn - lastEpistemicTurn < 3) return response;
  if (Math.random() > 0.25) return response;

  // Don't modify very short responses
  if (response.length < 30) return response;
  // Don't modify responses that already have epistemic markers
  if (/\b(I think|probably|maybe|might|I'm (pretty |not |)sure|if I'm not mistaken|from what I|honestly not sure|take this with)\b/i.test(response)) return response;
  // Don't modify greetings, farewells, emotional responses
  if (/^(hey|hi|bye|see you|sorry|I hear|that sounds|ouch)/i.test(response)) return response;

  const conf = assessConfidence(topics, parsed);
  lastEpistemicTurn = mem.turn;

  // HIGH confidence (0.8+): occasionally add confident framing
  if (conf.score >= 0.8) {
    if (Math.random() > 0.6) return response; // Often just let it be confident naturally
    const confidentPrefixes = [
      "Oh this I know well — ",
      "So this is something I can actually speak to: ",
      "Okay this one I'm pretty solid on — ",
    ];
    // Only prefix if response doesn't already start with a strong opener
    if (!/^(Oh|So|Okay|Actually|Yeah|Right|Well)/i.test(response)) {
      return pick(confidentPrefixes) + response.charAt(0).toLowerCase() + response.slice(1);
    }
    return response;
  }

  // MODERATE confidence (0.5-0.8): subtle hedging
  if (conf.score >= 0.5) {
    const moderateHedges = [
      ["I think ", "I think "],
      ["From what I know, ", "From what I know, "],
      ["If I remember right, ", "If I remember right, "],
    ];
    const [prefix] = pick(moderateHedges);
    if (!/^(I |From|If )/i.test(response)) {
      return prefix + response.charAt(0).toLowerCase() + response.slice(1);
    }
    return response;
  }

  // LOW confidence (0.3-0.5): honest hedging
  if (conf.score >= 0.3) {
    const lowHedges = [
      "I might be off on this, but " + response.charAt(0).toLowerCase() + response.slice(1),
      response + " (Though honestly, I might be fuzzy on some details!)",
      "Hmm, I'm not 100% on this, but " + response.charAt(0).toLowerCase() + response.slice(1),
    ];
    return pick(lowHedges);
  }

  // VERY LOW confidence (<0.3): self-aware about limits
  const honestPrefixes = [
    "I'm a tiny model so take this with a grain of salt, but ",
    "Okay full honesty — I'm not super confident here, but ",
    "This might not be perfectly accurate, but from what I understand: ",
  ];
  return pick(honestPrefixes) + response.charAt(0).toLowerCase() + response.slice(1);
}

function adaptiveAdjust(response) {
  const strategy = getBestStrategy();

  // If questions consistently fail (score < -1.5), strip trailing questions
  if (strategy.scores.questions < -1.5 && lastAIStrategyType === "questions") {
    const lastQ = response.lastIndexOf("?");
    if (lastQ > 20) {
      // Find the sentence boundary before the question
      const beforeQ = response.lastIndexOf(". ", lastQ);
      if (beforeQ > 10) {
        response = response.substring(0, beforeQ + 1);
      }
    }
  }

  // If opinions score well (> 1.5), and current response is generic, add an opinion
  if (strategy.scores.opinions > 1.5 && !/I think|honestly|my take/i.test(response)) {
    const opinionBoosters = [
      " Honestly, I find this stuff fascinating.",
      " My take? It's one of those things that just clicks once you get into it.",
      " I genuinely think this is worth diving into.",
    ];
    if (Math.random() > 0.6 && response.length < 150) {
      response += pick(opinionBoosters);
    }
  }

  // If humor scores well (> 1.5), and response is too dry, lighten it
  if (strategy.scores.humor > 1.5 && !/haha|😊|😄|!/i.test(response)) {
    if (Math.random() > 0.7) {
      response = response.replace(/\.$/, "! 😊");
    }
  }

  // Track what strategy this response represents
  lastAIStrategyType = classifyAIStrategy(response);

  return response;
}

/* ── Discourse Coherence & Response Planning ──
 * The pipeline has many independent post-processing stages (personality,
 * humor, style, phase, proactive callbacks) that can clash. This system:
 *
 * 1. Plans a response "intent" BEFORE generation (acknowledge/inform/engage)
 * 2. Tags responses with discourse markers for natural sentence flow
 * 3. Guards coherence — prevents empathetic + humor clash, double-question, etc.
 */

// Track the last AI message's discourse "flavor" to vary transitions
let lastDiscourseMove = "neutral"; // neutral, empathetic, playful, informative, curious

function planResponseIntent(text, parsed, sent, emo, subtext) {
  // Decide the high-level intent: what should this response DO?
  // Returns { acknowledge, body, engage } flags + discourse flavor + subtext info
  const plan = { acknowledge: false, body: "inform", engage: "question", flavor: "neutral", subtext: null };

  // ── Subtext-first: if user's words don't match meaning, respond to the meaning ──
  if (subtext && subtext.hasSubtext && subtext.primary) {
    plan.subtext = subtext.primary.meaning;

    // User is disengaging or losing interest → back off questions, pivot topic
    if (subtext.primary.meaning === "disengaged" || subtext.primary.meaning === "politelyBored") {
      plan.acknowledge = false;
      plan.body = "pivot";
      plan.engage = "gentle-q";
      plan.flavor = "curious";
      return plan;
    }
    // User is reluctant/passive-aggressive → address the tension, don't barrel forward
    if (subtext.primary.meaning === "reluctant" || subtext.primary.meaning === "passiveAggressive") {
      plan.acknowledge = true;
      plan.body = "address";
      plan.engage = "open-ended";
      plan.flavor = "empathetic";
      return plan;
    }
    // User is deflecting/avoidant → respect boundary, change topic
    if (subtext.primary.meaning === "avoidant") {
      plan.acknowledge = false;
      plan.body = "pivot";
      plan.engage = "question";
      plan.flavor = "playful";
      return plan;
    }
    // User seeking reassurance → validate, encourage
    if (subtext.primary.meaning === "seekingReassurance" || subtext.primary.meaning === "seekingValidation") {
      plan.acknowledge = true;
      plan.body = "validate";
      plan.engage = "gentle-q";
      plan.flavor = "empathetic";
      return plan;
    }
    // Genuine excitement → match energy
    if (subtext.primary.meaning === "genuinelyExcited") {
      plan.acknowledge = true;
      plan.body = "react";
      plan.engage = "question";
      plan.flavor = "playful";
      return plan;
    }
    // Understated praise → acknowledge with humor
    if (subtext.primary.meaning === "impressed") {
      plan.acknowledge = true;
      plan.body = "react";
      plan.engage = "question";
      plan.flavor = "playful";
      return plan;
    }
    // Mixed signals → gently surface the disconnect
    if (subtext.primary.meaning === "sayingOneThingMeaningAnother") {
      plan.acknowledge = true;
      plan.body = "clarify";
      plan.engage = "open-ended";
      plan.flavor = "curious";
      return plan;
    }
  }

  // Strong emotion → acknowledge first, engage gently
  if (emo && emo.confidence >= 0.5 && emo.emotion !== "neutral") {
    plan.acknowledge = true;
    plan.flavor = "empathetic";
    plan.engage = (emo.emotion === "frustrated" || emo.emotion === "venting") ? "validate" : "gentle-q";
    return plan;
  }

  // Question → inform body, optional reciprocal question
  if (parsed.qType) {
    plan.body = "answer";
    plan.engage = Math.random() > 0.4 ? "reciprocal" : "none";
    plan.flavor = "informative";
    return plan;
  }

  // Sharing/preference → acknowledge + curiosity
  if (parsed.preferences?.length > 0) {
    plan.acknowledge = true;
    plan.body = "react";
    plan.engage = "deepen";
    plan.flavor = "curious";
    return plan;
  }

  // Short input → pivot to engagement
  if (text.length < 20) {
    plan.acknowledge = false;
    plan.body = "bridge";
    plan.engage = "question";
    plan.flavor = "playful";
    return plan;
  }

  // Positive sentiment → match energy
  if (sent >= 2) {
    plan.acknowledge = true;
    plan.flavor = "playful";
    plan.engage = "question";
    return plan;
  }

  // Default: acknowledge briefly, inform, then ask
  plan.acknowledge = text.length > 40;
  plan.flavor = "neutral";
  plan.engage = Math.random() > 0.5 ? "question" : "none";
  return plan;
}

// Discourse markers — natural transitions based on what the LAST AI message was
const DISCOURSE_MARKERS = {
  // After the AI was empathetic, transition gently
  empathetic: ["Anyway,","On a lighter note —","But hey,","That said,","Moving forward though,"],
  // After the AI was playful, can shift easily
  playful:    ["Oh also —","But real talk,","Haha but seriously,","Okay but —","On another note,"],
  // After the AI was informative, vary the next opening
  informative:["So yeah,","Anyway,","All that to say,","Point being,","TL;DR —"],
  // After the AI was curious (asked questions), acknowledge return
  curious:    ["Oh cool!","Ahh,","Okay okay,","I see!","Right right,"],
  // Neutral / first message
  neutral:    ["","","","",""], // no marker needed
};

function addDiscourseMarker(response, currentFlavor) {
  // Only add markers ~25% of the time when flavor shifted
  if (currentFlavor === lastDiscourseMove) return response;
  if (Math.random() > 0.25) return response;

  const markers = DISCOURSE_MARKERS[lastDiscourseMove] || DISCOURSE_MARKERS.neutral;
  const marker = pick(markers);
  if (!marker) return response;

  // Don't stack markers — if response already starts with a discourse marker, skip
  if (/^(so |anyway|oh |hmm|okay|but |right |haha|ahh|hey)/i.test(response)) return response;

  // Lowercase the first letter of response when prepending a marker
  const adjusted = response.charAt(0).toLowerCase() + response.slice(1);
  return marker + " " + adjusted;
}

// Coherence guard — detect and fix tonal clashes from the post-processing pipeline
function guardCoherence(response, plan) {
  // Rule 1: Don't inject humor after empathetic intent
  if (plan.flavor === "empathetic") {
    // Strip appended fun facts/jokes from empathetic responses
    response = response.replace(/\s*(?:Fun fact:|Did you know|Here's a fun one)[^.!?]*[.!?]?\s*$/i, "");
  }

  // Rule 2: Don't end with two questions in a row
  const questions = response.match(/\?/g);
  if (questions && questions.length >= 3) {
    // Remove the last question to avoid interrogation feeling
    const lastQ = response.lastIndexOf("?");
    const secondLastQ = response.lastIndexOf("?", lastQ - 1);
    if (lastQ - secondLastQ < 60) {
      response = response.substring(0, secondLastQ + 1);
    }
  }

  // Rule 3: Don't start with excitement markers on negative sentiment responses
  if (plan.flavor === "empathetic" && /^(Ooh!|Oh nice|Yesss|Amazing!|Love it)/i.test(response)) {
    response = response.replace(/^(Ooh!|Oh nice —?|Yesss,?|Amazing!|Love it!?)\s*/i, "");
  }

  // Rule 4: Response shouldn't contradict itself (agreeing then disagreeing)
  if (/I totally agree.*but I disagree|you're right.*you're wrong/i.test(response)) {
    response = response.replace(/but I disagree[^.]*\./i, "");
  }

  // Rule 5: Don't repeat the user's name more than once
  if (mem.userName) {
    const nameRx = new RegExp(mem.userName, "gi");
    const nameMatches = response.match(nameRx);
    if (nameMatches && nameMatches.length > 1) {
      // Keep only the first occurrence
      let count = 0;
      response = response.replace(nameRx, (m) => ++count === 1 ? m : "");
    }
  }

  // Rule 6: Trim excessive length — if post-processing bloated the response
  if (response.length > 280) {
    // Find a natural breakpoint (sentence end) near 220 chars
    const cutPoint = response.indexOf(". ", 180);
    if (cutPoint > 0 && cutPoint < 260) {
      response = response.substring(0, cutPoint + 1);
    }
  }

  return response.trim();
}

/* ── Subtext Tone Adjustment (post-processing) ── */
// For weaker subtext signals that didn't override the response,
// this adjusts the generated response's tone to be more appropriate.

function adjustForSubtext(response, subtext) {
  if (!subtext || !subtext.hasSubtext || !subtext.primary) return response;
  const meaning = subtext.primary.meaning;

  // If user is hedging/uncertain, strip overly enthusiastic language
  if (meaning === "uncertain" || meaning === "reluctant") {
    response = response.replace(/!{2,}/g, "!").replace(/🔥|🚀|✨|💯/g, "");
    // Replace "amazing" / "awesome" with softer words
    response = response.replace(/\b(amazing|awesome|incredible)\b/gi, "solid");
  }

  // If user seems disengaged, shorten the response
  if (meaning === "disengaged" || meaning === "politelyBored") {
    const sentences = response.split(/(?<=[.!?])\s+/);
    if (sentences.length > 2) {
      response = sentences.slice(0, 2).join(" ");
    }
  }

  // If user gave understated praise, don't overreact
  if (meaning === "impressed") {
    response = response.replace(/!{2,}/g, "!");
  }

  // If user is self-deprecating, don't agree — always encourage
  if (meaning === "seekingReassurance") {
    response = response.replace(/\byeah (that's |it's )(tough|hard|tricky)\b/gi, "that can feel challenging, but you've got this");
  }

  // If user is being passive-aggressive, don't match their energy
  if (meaning === "passiveAggressive") {
    response = response.replace(/!{1,}/g, ".").replace(/haha|lol|😄|😂/gi, "");
  }

  return response;
}

/* ── Conversational Grounding & Active Listening ──
 * Humans constantly signal they're tracking conversation:
 * - Micro-acknowledgments: "Right", "Gotcha", "Mm-hmm"
 * - Paraphrasing back: "So you're into React and..."
 * - Validating: "That makes sense", "I can see that"
 * - Connecting: "Oh so that ties into what you said about..."
 *
 * This system adds natural grounding cues before the main response,
 * making the AI feel like it's genuinely listening, not just processing.
 */

// Micro-acks — tiny signals that show we're tracking
const MICRO_ACKS = {
  positive: ["Gotcha! ", "Makes sense! ", "Oh nice — ", "Right, right — ", "Got it! ", "Love that — ", "Okay yeah — "],
  negative: ["I hear you. ", "Gotcha. ", "That's fair. ", "Understood. ", "Yeah, that's tough. ", "I get it. "],
  neutral: ["Mm-hmm, ", "Right — ", "Gotcha — ", "Okay — ", "Sure — ", "Got it — ", "Noted — "],
  question: ["Good question! ", "Ooh — ", "Let me think... ", "Hmm! ", "Great question — "],
  long: ["Okay, a lot to unpack there! ", "Alright, let me address that — ", "Okay so — "],
};

// Paraphrase templates — show we understood the content
const PARAPHRASE_TEMPLATES = [
  "So you're {verb} {topic} — ",
  "So {topic} — ",
  "Ah, {topic}! ",
  "Oh, so it's about {topic} — ",
];

const PARAPHRASE_VERBS = {
  question: ["asking about", "curious about", "wondering about"],
  sharing: ["into", "working with", "interested in", "exploring"],
  opinion: ["thinking about", "considering", "feeling about"],
  general: ["talking about", "mentioning", "bringing up"],
};

// Validation phrases — affirm the user's point
const VALIDATIONS = [
  "That makes total sense. ",
  "I can see where you're coming from. ",
  "That's a really good point. ",
  "Yeah, that tracks. ",
  "Totally valid. ",
  "I can see that. ",
];

let lastGroundingTurn = 0;
let lastGroundingType = "";

function addGrounding(response, userText, parsed, sent, topics) {
  // Don't ground every response — ~35% of the time, varying by context
  // Skip grounding on very early turns (let the conversation warm up)
  if (mem.turn < 3) return response;
  // Don't ground consecutive turns
  if (mem.turn - lastGroundingTurn < 2) return response;
  // Don't modify very short or already-grounded responses
  if (response.length < 20) return response;
  if (/^(gotcha|right|mm|okay|got it|makes sense|I hear|good question|let me think)/i.test(response)) return response;
  // Don't stack on top of personality openers
  if (/^(hmm|ooh|actually|oh —|wait|so |honestly|real talk)/i.test(response)) return response;

  // Determine grounding type based on input characteristics
  const inputLen = userText.length;
  const hasTopic = topics.length > 0;
  const isQuestion = !!parsed.qType;
  const isSharing = parsed.preferences?.length > 0;
  const isLong = inputLen > 80;

  // Decide what type of grounding to use
  let groundingType = null;
  let grounding = null;

  // Strategy 1: Micro-ack — short signal (most common, ~20%)
  if (Math.random() < 0.2) {
    groundingType = "micro-ack";
    const pool = isQuestion ? MICRO_ACKS.question :
                 sent >= 2 ? MICRO_ACKS.positive :
                 sent <= -1 ? MICRO_ACKS.negative :
                 isLong ? MICRO_ACKS.long :
                 MICRO_ACKS.neutral;
    grounding = pick(pool);
  }

  // Strategy 2: Paraphrase — reflect back the topic (~10%, needs topic)
  else if (hasTopic && Math.random() < 0.15 && lastGroundingType !== "paraphrase") {
    groundingType = "paraphrase";
    const topic = topics[0];
    const verbPool = isQuestion ? PARAPHRASE_VERBS.question :
                     isSharing ? PARAPHRASE_VERBS.sharing :
                     PARAPHRASE_VERBS.general;
    const verb = pick(verbPool);
    const template = pick(PARAPHRASE_TEMPLATES);
    grounding = template.replace("{verb}", verb).replace("{topic}", topic);
  }

  // Strategy 3: Validation — affirm what they said (~8%, needs longer input)
  else if (inputLen > 40 && sent >= 0 && Math.random() < 0.12 && lastGroundingType !== "validation") {
    groundingType = "validation";
    grounding = pick(VALIDATIONS);
  }

  // Strategy 4: Connection grounding — tie to previous conversation (~7%)
  else if (mem.turn > 5 && hasTopic && Math.random() < 0.1 && lastGroundingType !== "connection") {
    // Check if this topic was mentioned before
    const topicCount = mem.topics[topics[0]] || 0;
    if (topicCount > 1) {
      groundingType = "connection";
      const connectionPhrases = [
        `Oh we keep coming back to ${topics[0]} — `,
        `${topics[0]} again! I like the pattern here — `,
        `Right, this ties back to ${topics[0]} — `,
      ];
      grounding = pick(connectionPhrases);
    }
  }

  if (!grounding) return response;

  // Avoid repetition of the same grounding type
  lastGroundingTurn = mem.turn;
  lastGroundingType = groundingType;

  // Prepend grounding, lowercase first char of response if needed
  const firstChar = response.charAt(0);
  if (firstChar === firstChar.toUpperCase() && /[A-Z]/.test(firstChar)) {
    return grounding + firstChar.toLowerCase() + response.slice(1);
  }
  return grounding + response;
}

/* ══════════════════════════════════════════════════════════════════
   RESPONSE LENGTH CALIBRATION & ENERGY MIRRORING
   Matches AI response length and energy to the current user message.
   - Short inputs ("yeah", "cool", "ok") → short, punchy replies
   - Medium inputs → balanced responses
   - Long/detailed inputs → richer, more detailed replies
   - High-energy inputs (!!!, caps, rapid) → energetic replies
   - Low-energy (lowercase, no punctuation) → calm, chill replies
   Also tracks a rolling "energy curve" so the AI doesn't abruptly
   shift tone between turns.
   ══════════════════════════════════════════════════════════════════ */

let energyCurve = []; // rolling window of last 5 energy scores

function measureInputEnergy(text) {
  const len = text.length;
  let energy = 0.5; // neutral baseline

  // Length contributes to energy (more words = more invested)
  if (len < 8) energy -= 0.2;
  else if (len < 20) energy -= 0.1;
  else if (len > 120) energy += 0.15;
  else if (len > 200) energy += 0.25;

  // Exclamation marks boost energy
  const excl = (text.match(/!/g) || []).length;
  energy += Math.min(excl * 0.1, 0.3);

  // Question marks show engagement
  const qs = (text.match(/\?/g) || []).length;
  energy += Math.min(qs * 0.05, 0.15);

  // ALL CAPS words boost energy
  const capsWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
  energy += Math.min(capsWords * 0.08, 0.2);

  // Emoji boost energy
  const emojis = (text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  energy += Math.min(emojis * 0.05, 0.15);

  // Laughter/excitement markers
  if (/\b(haha|lol|lmao|omg|wow|whoa|dude|yes!)\b/i.test(text)) energy += 0.15;

  // Low-energy signals
  if (/^(ok|okay|sure|yep|yeah|yea|mhm|hmm|cool|fine|k|kk|nah|nope|idk)\.?$/i.test(text.trim())) energy -= 0.25;
  if (text === text.toLowerCase() && len < 30 && !text.includes("!")) energy -= 0.05;

  // Ellipsis signals trailing off
  if (/\.{2,}$/.test(text)) energy -= 0.1;

  return Math.max(0, Math.min(1, energy));
}

function getSmoothedEnergy(currentEnergy) {
  energyCurve.push(currentEnergy);
  if (energyCurve.length > 5) energyCurve.shift();
  // Weighted average: recent messages matter more
  const weights = [0.1, 0.15, 0.2, 0.25, 0.3];
  const start = Math.max(0, weights.length - energyCurve.length);
  let sum = 0, wsum = 0;
  for (let i = 0; i < energyCurve.length; i++) {
    const w = weights[start + i];
    sum += energyCurve[i] * w;
    wsum += w;
  }
  return sum / wsum;
}

function computeTargetLength(inputLen, energy) {
  // Base ratio: AI responds with ~1.5-3x user input length
  // Low energy → lower ratio, high energy → higher ratio
  const ratio = 1.2 + energy * 2.0; // 1.2x at energy=0, 3.2x at energy=1
  let target = Math.round(inputLen * ratio);

  // Clamp to reasonable bounds
  target = Math.max(25, Math.min(280, target));

  // Very short inputs shouldn't produce very long responses
  if (inputLen < 10) target = Math.min(target, 60);
  if (inputLen < 20) target = Math.min(target, 100);

  return target;
}

function calibrateResponseLength(response, text, energy) {
  const inputLen = text.length;
  const smoothedEnergy = getSmoothedEnergy(energy);
  const targetLen = computeTargetLength(inputLen, smoothedEnergy);
  const currentLen = response.length;

  // Don't calibrate greeting/farewell/very short responses
  if (currentLen < 20) return response;
  // Don't trim responses that are answering questions (they need to be informative)
  if (/^(what|how|why|when|where|who|can you|could you|tell me)/i.test(text) && currentLen < 250) return response;

  let r = response;

  // ── Need to shorten ──
  if (currentLen > targetLen * 1.4) {
    // Strategy 1: trim to N sentences that fit target
    const sentences = r.match(/[^.!?]+[.!?]+/g) || [r];
    if (sentences.length > 1) {
      let built = "";
      for (const s of sentences) {
        if (built.length + s.length > targetLen && built.length > 20) break;
        built += s;
      }
      // Keep at least one sentence
      if (built.length > 15) r = built.trim();
    }

    // Strategy 2: if still too long, find a clean cut point
    if (r.length > targetLen * 1.5) {
      const cutPoints = [". ", "! ", "? ", " — ", ", "];
      for (const cp of cutPoints) {
        const idx = r.lastIndexOf(cp, targetLen);
        if (idx > targetLen * 0.5) {
          r = r.slice(0, idx + cp.trimEnd().length);
          break;
        }
      }
    }
  }

  // ── Need to lengthen (rare — only when user writes a lot and AI gives a stub) ──
  if (currentLen < targetLen * 0.4 && inputLen > 80 && smoothedEnergy > 0.5) {
    // Add a follow-up that shows engagement with their long message
    const extensions = [
      " I'd actually love to dig into that more.",
      " There's a lot to unpack there.",
      " That's the kind of thing I could talk about for a while.",
      " I feel like there's a deeper thread here worth pulling on.",
      " What part of that feels most important to you?",
    ];
    if (!r.includes("?")) r += pick(extensions);
  }

  return r.trim();
}

function adjustResponseEnergy(response, energy) {
  const smoothed = energyCurve.length > 0 ? energyCurve[energyCurve.length - 1] : energy;
  let r = response;

  // ── Low energy user → calm, chill, less punctuation ──
  if (smoothed < 0.3) {
    // Strip trailing exclamation marks (keep at most one)
    r = r.replace(/!{2,}/g, ".");
    // Convert "!" to "." on non-emotional responses (first sentence)
    if (!/\b(wow|whoa|amazing|awesome|love|great)\b/i.test(r)) {
      r = r.replace(/^([^.!?]+)!/, "$1.");
    }
    // Remove overly enthusiastic openers
    r = r.replace(/^(Oh wow|Wow|Oh!|Yes!|Ooh)\s*/i, "");
  }

  // ── High energy user → match their enthusiasm ──
  if (smoothed > 0.75) {
    // Boost a trailing period to exclamation (on first sentence only, 40% chance)
    if (Math.random() < 0.4) {
      const firstEnd = r.indexOf(". ");
      if (firstEnd > 10 && firstEnd < 80) {
        r = r.slice(0, firstEnd) + "!" + r.slice(firstEnd + 1);
      } else if (r.endsWith(".")) {
        r = r.slice(0, -1) + "!";
      }
    }
  }

  return r;
}

/* ══════════════════════════════════════════════════════════════════
   DETAIL SEEDING & SPECIFICITY ENGINE
   Vague responses ("that's interesting") feel robotic. Specific
   responses ("like when you're debugging at 2am and the fix is one
   semicolon") feel human. This engine:
   1. Replaces generic fillers with topic-aware vivid details
   2. Seeds "hooks" — tangent-worthy micro-details that invite follow-up
   3. Adds grounding specifics (numbers, scenarios, comparisons)
   Fire rate: ~25% of eligible responses (>50 chars, has topic context).
   ══════════════════════════════════════════════════════════════════ */

// Vivid detail pools keyed by broad domain
const VIVID_DETAILS = {
  tech: [
    "like when you're staring at a bug for an hour and the fix is one missing character",
    "like that feeling when your tests finally all pass green",
    "you know that moment where the docs say one thing but the API does another",
    "kind of like when you refactor something and it accidentally fixes three other bugs",
    "like when you open a PR and realize you forgot to remove the console.logs",
    "it's that 3am energy where suddenly everything makes sense",
    "sort of like when Stack Overflow has your exact error from 2014",
  ],
  design: [
    "like when you nail the spacing and everything just clicks into place",
    "you know that feeling when a color palette suddenly harmonizes",
    "kind of like when you zoom to 200% and the pixels are perfect",
    "like when the client says 'I'll know it when I see it' — classic",
    "sort of like when you discover a font pairing that just works",
    "that moment when your layout works on every breakpoint first try",
    "like when you remove one element and the whole design improves",
  ],
  general: [
    "like when you explain something and it clicks for the other person",
    "you know that feeling when everything lines up perfectly",
    "kind of like finding a shortcut you wish you'd known years ago",
    "it's that satisfying feeling when a plan actually works",
    "like discovering a great song because it was on in the background somewhere",
    "sort of like when you organize a messy drawer and feel weirdly accomplished",
    "like when you're in the zone and time just disappears",
  ],
  learning: [
    "like when something confusing suddenly snaps into clarity",
    "you know that 'aha' moment when the pieces connect",
    "kind of like learning to ride a bike — impossible until it's not",
    "like when you explain a concept and realize you finally understand it yourself",
    "that feeling when you read something and it changes how you see everything",
  ],
  work: [
    "like when your whole team is in sync and shipping fast",
    "you know when a meeting actually ends early — rare but magical",
    "kind of like when you automate a task that used to take hours",
    "like when someone reviews your code and says 'nice approach'",
    "that feeling when you finally close a ticket that's been open for weeks",
  ],
};

// Hook seeds — small tangent-worthy details to append
const HOOK_SEEDS = {
  tech: [
    "I read somewhere that most bugs are found within 10 lines of a recent change.",
    "Apparently the average developer spends more time reading code than writing it.",
    "There's a theory that the best code is the code you delete.",
    "Someone once said 'make it work, make it right, make it fast' — in that order.",
  ],
  design: [
    "There's this idea that white space is the most powerful design element.",
    "Dieter Rams said 'less, but better' — still holds up.",
    "Apparently users form an opinion about a design in about 50 milliseconds.",
    "The best interfaces feel invisible — you don't notice the design at all.",
  ],
  general: [
    "I think about that more than I probably should.",
    "There's definitely a rabbit hole there if you want to go down it.",
    "It's one of those things that sounds simple but gets deep fast.",
    "I feel like there's a whole conversation in that.",
  ],
};

// Generic phrases to replace with specifics
const GENERIC_REPLACEMENTS = [
  { pattern: /\bthat's (really )?interesting\b/i, domain: null,
    replacements: [
      "that's one of those things I could go back and forth on",
      "now that's something I've been curious about",
      "oh I love that kind of thing",
      "okay now you've got me thinking",
    ]},
  { pattern: /\bthat's (really )?(cool|awesome|great|nice)\b/i, domain: null,
    replacements: [
      "oh I'm into that",
      "now that's solid",
      "okay I respect that",
      "nice — that actually matters more than people realize",
    ]},
  { pattern: /\btell me more\b/i, domain: null,
    replacements: [
      "I want the full picture on this",
      "okay unpack that for me",
      "wait — go deeper on that",
      "I feel like there's a story here",
    ]},
];

let lastDetailTurn = 0;

function getDomainForTopics(topics) {
  const techWords = new Set(["javascript","react","css","html","code","coding","programming","api","git","typescript","python","rust","node","web","frontend","backend","database","sql","devops","docker","testing","debug","deploy","framework","library","algorithm","data","server","app","software","developer","engineer"]);
  const designWords = new Set(["design","ui","ux","color","font","layout","typography","spacing","animation","figma","sketch","prototype","wireframe","pixel","responsive","grid","component","palette","theme","brand","visual","style","aesthetic"]);
  const learnWords = new Set(["learn","study","tutorial","course","practice","beginner","teach","understand","concept","theory","skill","knowledge","education","school","book"]);
  const workWords = new Set(["work","job","team","project","meeting","deadline","client","manager","sprint","agile","startup","company","career","hire","interview","remote"]);

  for (const t of topics) {
    const low = t.toLowerCase();
    if (techWords.has(low)) return "tech";
    if (designWords.has(low)) return "design";
    if (learnWords.has(low)) return "learning";
    if (workWords.has(low)) return "work";
  }
  return "general";
}

function seedDetails(response, topics) {
  if (response.length < 45 || response.length > 250) return response;
  if (mem.turn - lastDetailTurn < 3) return response; // cooldown
  if (/^(hi|hey|hello|bye|goodbye|thanks|thank)/i.test(response)) return response;

  let r = response;
  const domain = getDomainForTopics(topics);

  // ── Step 1: Replace generic fillers with specifics (~40% chance) ──
  if (Math.random() < 0.4) {
    for (const { pattern, replacements } of GENERIC_REPLACEMENTS) {
      if (pattern.test(r)) {
        r = r.replace(pattern, pick(replacements));
        lastDetailTurn = mem.turn;
        break;
      }
    }
  }

  // ── Step 2: Inject vivid simile/detail (~20% chance, if response has room) ──
  if (Math.random() < 0.2 && r.length < 140 && r.length > 50) {
    const pool = VIVID_DETAILS[domain] || VIVID_DETAILS.general;
    const detail = pick(pool);
    // Find a clean insertion point — after first sentence
    const firstEnd = r.search(/[.!]\s/);
    if (firstEnd > 15 && firstEnd < 100) {
      r = r.slice(0, firstEnd + 1) + " " + detail.charAt(0).toUpperCase() + detail.slice(1) + "." + r.slice(firstEnd + 1);
      lastDetailTurn = mem.turn;
    }
  }

  // ── Step 3: Append a hook seed (~15% chance, end of response) ──
  if (Math.random() < 0.15 && r.length < 180 && !r.endsWith("?")) {
    const pool = HOOK_SEEDS[domain] || HOOK_SEEDS.general;
    const hook = pick(pool);
    r = r.replace(/[.!]?\s*$/, ". " + hook);
    lastDetailTurn = mem.turn;
  }

  return r;
}

/* ══════════════════════════════════════════════════════════════════
   RHYTHM VARIATION & BREATH — Dramatic Structural Variance
   After many pipeline layers, responses converge to a samey
   "statement + question" cadence. Real humans vary wildly:
   sometimes a single punchy word, sometimes a thought that
   trails off, sometimes pure reaction before substance.
   This system occasionally restructures responses to break
   the monotony — creating "breaths" in the conversation.
   Fire rate: ~18% of eligible responses, 3-turn cooldown.
   ══════════════════════════════════════════════════════════════════ */

let lastBreathTurn = 0;

function addBreath(response, text, energy) {
  if (response.length < 35 || response.length > 300) return response;
  if (mem.turn - lastBreathTurn < 3) return response;
  if (/^(hi|hey|hello|bye|goodbye|thanks|thank|sorry)/i.test(response)) return response;
  if (Math.random() > 0.18) return response;

  const sentences = response.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length < 1) return response;

  const roll = Math.random();
  let r = response;

  // ── Strategy 1: Punchy lead (~25%) — extract the core and make it hit harder ──
  if (roll < 0.25 && sentences.length >= 2) {
    // Pull the most interesting sentence to front, make it standalone
    const best = sentences.reduce((a, b) => {
      // Prefer sentences with specifics, opinions, or emotion
      const scoreA = (a.match(/[!?]/g)||[]).length + (a.length > 40 ? 1 : 0) + (/I think|honestly|actually|the thing is/i.test(a) ? 2 : 0);
      const scoreB = (b.match(/[!?]/g)||[]).length + (b.length > 40 ? 1 : 0) + (/I think|honestly|actually|the thing is/i.test(b) ? 2 : 0);
      return scoreB > scoreA ? b : a;
    });
    const rest = sentences.filter(s => s !== best).join(" ").trim();
    if (rest.length > 15) {
      r = best.trim() + " " + rest;
      lastBreathTurn = mem.turn;
    }
  }

  // ── Strategy 2: Trailing thought (~20%) — end with "..." instead of clean period ──
  else if (roll < 0.45 && energy < 0.5) {
    // Low-energy conversations benefit from trailing, thoughtful endings
    const trailingPhrases = [
      "but I don't know, maybe that's just me...",
      "or something like that, anyway...",
      "but yeah, you know what I mean...",
      "but it's hard to say for sure...",
      "which is interesting when you think about it...",
    ];
    // Replace the last sentence's ending with a trailing thought
    const lastPeriod = r.lastIndexOf(".");
    if (lastPeriod > 30 && r.slice(lastPeriod).length < 40) {
      r = r.slice(0, lastPeriod) + " — " + pick(trailingPhrases);
      lastBreathTurn = mem.turn;
    }
  }

  // ── Strategy 3: Split with breath (~20%) — add a pause between thoughts ──
  else if (roll < 0.65 && sentences.length >= 2) {
    // Insert a "thinking pause" between sentences
    const pauses = [
      "\n\n",
      " ...\n\n",
      "\n\nActually — ",
      "\n\nHmm. ",
      "\n\nWait, ",
    ];
    const splitIdx = Math.min(1, sentences.length - 1);
    const before = sentences.slice(0, splitIdx + 1).join(" ").trim();
    const after = sentences.slice(splitIdx + 1).join(" ").trim();
    if (before.length > 15 && after.length > 15) {
      r = before + pick(pauses) + after;
      lastBreathTurn = mem.turn;
    }
  }

  // ── Strategy 4: Reaction-first (~20%) — lead with a pure emotional beat ──
  else if (roll < 0.85 && !(/^(oh|hmm|wow|ha|ooh|yeah|yes|no|right|okay|wait)/i.test(r))) {
    const reactions = [
      "Oh. ",
      "Hmm. ",
      "Huh. ",
      "Yeah — ",
      "Right. ",
      "Okay so — ",
      "Ha — ",
      "Wait. ",
    ];
    // Pick a contextually appropriate reaction
    const sent = sentiment(text);
    let pool = reactions;
    if (sent >= 2) pool = ["Oh! ", "Yes! ", "Ha! ", "Nice — "];
    else if (sent <= -1) pool = ["Hmm. ", "Yeah. ", "Right. ", "Okay — "];

    r = pick(pool) + r.charAt(0).toLowerCase() + r.slice(1);
    lastBreathTurn = mem.turn;
  }

  // ── Strategy 5: Emphatic compression (~15%) — boil long response to one strong line ──
  else if (sentences.length >= 3 && energy > 0.6) {
    // High energy + long response → compress to the punchiest sentence
    const shortest = sentences.reduce((a, b) => a.trim().length < b.trim().length ? a : b).trim();
    if (shortest.length > 12 && shortest.length < 80) {
      r = shortest;
      lastBreathTurn = mem.turn;
    }
  }

  return r;
}

/* ══════════════════════════════════════════════════════════════════
   SITUATIONAL EMPATHY & MICRO-VALIDATION ENGINE (Round 40)
   Detects specific life situations — achievements, struggles,
   vulnerability, life transitions, creative sharing — and generates
   responses that validate the SPECIFIC emotion, not just the
   category. Instead of "that's great!" it says "That must feel
   so satisfying after putting in all that work."
   Fire rate: ~100% for detected situations (these are high-signal).
   ══════════════════════════════════════════════════════════════════ */

const SITUATION_PATTERNS = [
  // ── Achievements & wins ──
  { pat: /i (?:got|landed|received|accepted) (?:the|a|an|my) (?:job|offer|position|role|promotion|raise|internship)/i,
    sit: "career_win", emotion: "pride" },
  { pat: /i (?:got|was) (?:accepted|admitted|in) (?:to|into|at) /i,
    sit: "acceptance", emotion: "pride" },
  { pat: /(?:my|our|the) (?:app|project|site|product|game|startup|business|company) (?:just )?(?:launched|shipped|went live|is live|hit|reached)/i,
    sit: "launch", emotion: "pride" },
  { pat: /i (?:finally |just )?(?:finished|completed|submitted|passed|graduated|defended)/i,
    sit: "completion", emotion: "relief" },
  { pat: /(?:my|the) (?:code|app|feature|test|build|deploy|PR|pull request) (?:finally )?(?:works|passed|compiled|merged|deployed)/i,
    sit: "code_win", emotion: "relief" },
  { pat: /i (?:figured|worked) (?:it )?out/i,
    sit: "breakthrough", emotion: "relief" },

  // ── Struggles & difficulty ──
  { pat: /i(?:'ve| have) been (?:trying|working on|debugging|struggling with|stuck on) (?:this |it )?(?:for |all )?(?:\d+ )?(?:hours|days|weeks)/i,
    sit: "long_grind", emotion: "exhaustion" },
  { pat: /i (?:keep|can't stop) (?:getting|hitting|running into) (?:errors|bugs|issues|problems|walls)/i,
    sit: "repeated_failure", emotion: "frustration" },
  { pat: /(?:nothing|it|this) (?:is |seems to be )?(?:working|making sense|clicking)/i,
    sit: "stuck", emotion: "frustration" },
  { pat: /i don't (?:know|think) (?:if )?i (?:can|'m (?:able|good enough|cut out))/i,
    sit: "self_doubt", emotion: "vulnerability" },
  { pat: /i(?:'m| am) (?:so |really |completely |totally )?(?:burnt? out|exhausted|drained|overwhelmed|overworked)/i,
    sit: "burnout", emotion: "exhaustion" },
  { pat: /imposter syndrome/i,
    sit: "imposter", emotion: "vulnerability" },

  // ── Life transitions ──
  { pat: /i (?:just )?(?:started|beginning|moved to|relocated|transferred|switched to)/i,
    sit: "new_chapter", emotion: "mixed" },
  { pat: /i(?:'m| am) (?:about to|going to|planning to) (?:start|move|switch|quit|leave|change)/i,
    sit: "upcoming_change", emotion: "nervous" },
  { pat: /i (?:just )?(?:quit|left|resigned|got (?:laid off|fired|let go))/i,
    sit: "departure", emotion: "complex" },

  // ── Creative sharing ──
  { pat: /i(?:'ve| have) been (?:working on|building|making|creating|writing|designing|composing|painting|drawing)/i,
    sit: "creative_work", emotion: "vulnerable_pride" },
  { pat: /(?:check|look at|see) (?:this|what i (?:made|built|created|designed|wrote))/i,
    sit: "showing_work", emotion: "vulnerable_pride" },
  { pat: /i (?:wrote|made|built|created|designed|composed|painted|drew) (?:a |an |my |this )/i,
    sit: "creative_share", emotion: "vulnerable_pride" },

  // ── Asking for honest feedback ──
  { pat: /(?:be |give me )?(?:honest|real|straight|blunt|brutal) (?:with me|feedback|opinion|thoughts)/i,
    sit: "seeking_honesty", emotion: "brave" },
  { pat: /(?:is|does) (?:this|it|my) (?:look|sound|seem|read) (?:ok|okay|good|alright|stupid|dumb|weird)/i,
    sit: "validation_seeking", emotion: "insecure" },

  // ── Personal vulnerability ──
  { pat: /i(?:'m| am) (?:not sure|scared|afraid|worried|anxious|nervous) (?:about|that|if)/i,
    sit: "fear", emotion: "vulnerability" },
  { pat: /i feel (?:like )?(?:a failure|worthless|useless|invisible|alone|lost|stuck)/i,
    sit: "deep_struggle", emotion: "pain" },
  { pat: /(?:nobody|no one) (?:cares|understands|gets it|listens)/i,
    sit: "isolation", emotion: "pain" },
];

const SITUATION_RESPONSES = {
  career_win: [
    "Wait — that is HUGE. Do you realize how competitive that is? You earned that.",
    "Okay but can we talk about how much work goes into getting to that point? You did that. All you.",
    "That's not luck — that's preparation meeting opportunity. How does it feel to actually have it?",
  ],
  acceptance: [
    "The fact that you got in says a lot about you. They saw something real. How are you feeling about it?",
    "That's a door that opened because of what you built. Take a second to actually feel that before you start worrying about what's next.",
  ],
  launch: [
    "Shipping something into the world takes guts. Most people just talk about it. You actually did it. What was the hardest part?",
    "That moment when it goes live and real people start using it — there's nothing quite like that feeling. How's the reception been?",
  ],
  completion: [
    "The relief you're feeling right now? You've earned every bit of it. That takes real persistence.",
    "Finished. Done. Actually done. That's such a satisfying feeling. Was there a moment you thought you wouldn't make it?",
  ],
  code_win: [
    "That click when something finally works after fighting it — honestly one of the best feelings in programming.",
    "The fact that you stuck with it until it worked says more than the code itself. What was the bug?",
  ],
  breakthrough: [
    "That moment of clarity after being stuck is genuinely one of the best feelings. What made it click?",
    "Figured it out! The struggle before that moment is what makes the breakthrough feel so good.",
  ],
  long_grind: [
    "That's a long time to sit with something that's fighting you. Honestly — have you taken a real break? Sometimes the answer shows up when you stop staring at it.",
    "The fact that you're still at it says a lot about your stubbornness — and I mean that as a compliment. But seriously, when's the last time you stepped away?",
  ],
  repeated_failure: [
    "That's the kind of thing that makes you want to close your laptop and walk away. Are the errors related or is it a new thing each time?",
    "When every attempt hits a wall, it's easy to feel like you're going backwards. You're not — you're eliminating possibilities. What's the pattern?",
  ],
  stuck: [
    "Being stuck is uncomfortable because your brain is trying to find a path that doesn't exist yet. Sometimes you have to break the problem into something smaller. What's the core thing that's not clicking?",
    "That feeling of nothing working is temporary, even though it doesn't feel that way right now. What have you tried so far?",
  ],
  self_doubt: [
    "Hey — the fact that you even question yourself means you care about doing it well. That's not weakness, that's awareness. What specifically is making you doubt?",
    "I hear that. Self-doubt is weirdly universal — the best people I know all deal with it. What would you tell a friend who said this to you?",
  ],
  burnout: [
    "Burnout isn't laziness — it's your mind saying the current pace isn't sustainable. Is there one thing you could drop right now that would help?",
    "That's real. Pushing through burnout usually makes it worse, not better. What would your ideal day look like if you could actually rest?",
  ],
  imposter: [
    "Fun fact: imposter syndrome hits hardest when you're actually growing. You wouldn't feel out of place if you weren't reaching for something bigger than your comfort zone.",
    "Almost everyone you admire has felt exactly this way. The difference isn't that they're more confident — they just kept going anyway.",
  ],
  new_chapter: [
    "New beginnings are this weird cocktail of excitement and low-key terror. How are you actually feeling about it — the honest version?",
    "Starting something new means being a beginner again, which is uncomfortable but also kind of freeing. What drew you to the change?",
  ],
  upcoming_change: [
    "It's one thing to think about change, another to actually be on the edge of it. What's the thing that excites you most? And what's the thing that scares you most?",
    "Big decisions feel heavy because they matter. Trust that — the weight means you're taking it seriously.",
  ],
  departure: [
    "That's a big move. There's a lot of feelings that come with leaving something, even when it's the right call. How are you processing it?",
    "Endings are complicated — even when you chose them. What feels clearest to you right now?",
  ],
  creative_work: [
    "I love that you're making something. Creating is vulnerable by nature — you're putting a piece of yourself out there. What's inspiring you?",
    "The fact that you're actually building it instead of just thinking about it puts you ahead of most people. What part are you most excited about?",
  ],
  showing_work: [
    "You're sharing something you made — that takes courage. I'm genuinely curious, tell me more about it!",
    "The fact that you're showing it means part of you is proud of it, even if another part is nervous. What was the hardest part to get right?",
  ],
  creative_share: [
    "You made something! That's always worth celebrating. What was the spark that started it?",
    "Creating something from nothing is one of the most human things there is. What does it mean to you?",
  ],
  seeking_honesty: [
    "I respect that you want the real version. Okay — let me actually think about this for a second.",
    "Asking for honesty takes guts. Let's be real then — what specifically do you want feedback on?",
  ],
  validation_seeking: [
    "The fact that you're asking means you care about getting it right. What's your gut telling you about it?",
    "Before I answer — what do YOU think? Your instinct probably knows more than you're giving it credit for.",
  ],
  fear: [
    "Fear and excitement live in the same place — they feel almost identical. The fact that you're naming it is the first step. What's the worst case you're imagining?",
    "Being scared about something you care about is a sign you're being brave, not weak. What would help you feel even a little more ready?",
  ],
  deep_struggle: [
    "I hear you, and I want you to know — feeling that way doesn't make it true. What would feel different for you right now if things were even slightly better?",
    "That's a heavy thing to carry. You don't have to fix everything right now. What's one small thing that's felt okay recently?",
  ],
  isolation: [
    "I'm here, and I'm listening. Sometimes the feeling of not being heard is worse than the actual problem. What would being understood look like for you?",
    "That feeling is painful and real, even if it's not the whole picture. Right now, in this moment, I hear you.",
  ],
};

let lastSituationTurn = 0;

function detectSituation(text, lower) {
  for (const { pat, sit, emotion } of SITUATION_PATTERNS) {
    if (pat.test(lower) || pat.test(text)) {
      return { situation: sit, emotion };
    }
  }
  return null;
}

function generateSituationalResponse(situation, text) {
  const pool = SITUATION_RESPONSES[situation.situation];
  if (!pool) return null;
  return pickNew(pool);
}

/* ══════════════════════════════════════════════════════════════════
   CROSS-DOMAIN ANALOGY & UNEXPECTED CONNECTIONS
   Great conversationalists make surprising connections between
   unrelated fields. "Debugging is like detective work" or "CSS
   is jazz — you improvise within structure." This engine maps
   topics to analogies from distant domains, occasionally injecting
   "wait, that's actually like..." connections that make the user
   go "huh, I never thought of it that way."
   Fire rate: ~12% of eligible responses, 5-turn cooldown.
   ══════════════════════════════════════════════════════════════════ */

// Cross-domain analogy pairs: [source domain keywords, analogy text]
// Each analogy bridges two unrelated domains
const CROSS_DOMAIN_ANALOGIES = {
  code: [
    "It's kind of like cooking — you follow a recipe, but the best dishes come when you improvise a little.",
    "That's weirdly similar to how jazz musicians play — there's structure, but the magic is in the riffs between the notes.",
    "It reminds me of gardening, actually. You plant seeds, water them, prune what doesn't work, and eventually something grows.",
    "It's like architecture — the foundation matters more than the decoration, but nobody sees the foundation.",
    "Debugging is basically detective work. You have clues, suspects, and red herrings. And the culprit is always the one you least expect.",
    "Writing code is a lot like writing prose — both are about communicating clearly, just to different audiences.",
  ],
  design: [
    "Design is like cooking a great meal — it's not about having the most ingredients, it's about balance and knowing when to stop adding.",
    "There's a musical thing here — good design has rhythm. Your eye flows like a melody, and the important bits hit like a beat drop.",
    "It's like fashion, honestly. Trends come and go, but the fundamentals — fit, proportion, comfort — are timeless.",
    "That reminds me of how filmmakers use negative space. What you leave out tells a story just as much as what you include.",
    "It's like arranging furniture — every piece needs room to breathe, or the whole room feels cramped.",
  ],
  learning: [
    "Learning is honestly like working out. The first few sessions are painful, then one day you realize you're stronger without even noticing the change.",
    "It's the same as learning a language — you fumble and feel stupid, then suddenly you're thinking in it without trying.",
    "Reminds me of how babies learn to walk. They fall hundreds of times and never once consider quitting. We could learn from that.",
    "It's like compound interest — tiny daily improvements don't feel like much, but after a year you're in a completely different place.",
  ],
  work: [
    "Working in a team is kind of like being in a band. Everyone has their instrument, and the magic happens when you listen to each other.",
    "Deadlines are like running water — they always find a way through the cracks in your schedule.",
    "Managing a project is basically herding cats, except the cats all have strong opinions about which direction to go.",
    "It's like a relay race — you can be the fastest runner, but if the handoff is fumbled, none of it matters.",
  ],
  general: [
    "There's a chess analogy here — sometimes the best move is the one that doesn't look like a move at all.",
    "It's like navigating by stars — you can't reach them, but they show you which way to go.",
    "That's the iceberg thing — what people see is 10%, and the other 90% is the work nobody talks about.",
    "Reminds me of how rivers carve canyons — not by force, but by persistence over time.",
    "It's like the difference between a map and the actual territory. The model is useful, but it's never the whole picture.",
    "There's a music thing here — a rest is as important as a note. The pause is what gives everything else meaning.",
  ],
};

// Connector phrases that introduce an analogy naturally
const ANALOGY_CONNECTORS = [
  "Wait, you know what this reminds me of? ",
  "Okay this might sound random but — ",
  "There's actually a perfect analogy for this. ",
  "You know what it's like? ",
  "This is going to sound weird, but — ",
  "I keep coming back to this analogy: ",
  "Okay bear with me here — ",
];

let lastAnalogyTurn = 0;

function injectAnalogy(response, topics) {
  if (response.length < 40 || response.length > 220) return response;
  if (mem.turn - lastAnalogyTurn < 5) return response; // 5-turn cooldown
  if (Math.random() > 0.12) return response; // ~12% fire rate
  if (/^(hi|hey|hello|bye|goodbye|thanks|thank|sorry)/i.test(response)) return response;
  // Don't inject into responses that already have analogies
  if (/like\s+(cooking|jazz|gardening|architecture|detective|chess|music|river)/i.test(response)) return response;
  if (/reminds me of/i.test(response)) return response;

  // Find the best domain match for current topics
  const domain = getDomainForTopics(topics); // reuse from detail seeding engine
  const pool = CROSS_DOMAIN_ANALOGIES[domain] || CROSS_DOMAIN_ANALOGIES.general;
  const analogy = pick(pool);

  // Decide where to inject: end of response (most natural)
  // Find the last sentence boundary
  const lastEnd = Math.max(response.lastIndexOf(". "), response.lastIndexOf("! "), response.lastIndexOf("? "));

  let r;
  if (lastEnd > 30 && lastEnd < response.length - 10) {
    // Insert before the last sentence
    const connector = pick(ANALOGY_CONNECTORS);
    r = response.slice(0, lastEnd + 2) + connector + analogy;
  } else {
    // Append after the response
    const connector = pick(ANALOGY_CONNECTORS);
    r = response.replace(/[.!]?\s*$/, ". " + connector + analogy);
  }

  lastAnalogyTurn = mem.turn;
  return r;
}

/* ══════════════════════════════════════════════════════════════════
   VOCABULARY ENRICHMENT & EXPRESSIVE WORD CHOICE
   Overused words ("good", "really", "very", "nice", "interesting")
   make responses feel flat and generic. This engine swaps bland
   words for vivid, contextually appropriate alternatives.
   - Adjective upgrades: "good" → "solid/stellar/sharp"
   - Intensifier variety: "really" → "genuinely/seriously/honestly"
   - Filler reduction: strips "just", "basically", "literally" overuse
   - Context-aware: tech topics get different words than casual chat
   Fire rate: ~30% per eligible word, max 3 swaps per response.
   ══════════════════════════════════════════════════════════════════ */

// Word swap pools — each overused word maps to vivid alternatives
// Organized by register: casual → slightly elevated (never pretentious)
const WORD_SWAPS = {
  // Adjective upgrades
  "good":        ["solid","great","sharp","strong","legit"],
  "bad":         ["rough","tough","painful","brutal","messy"],
  "nice":        ["lovely","sweet","clean","slick","smooth"],
  "cool":        ["sick","rad","stellar","fire","dope"],
  "interesting": ["fascinating","wild","compelling","intriguing","gnarly"],
  "important":   ["crucial","key","essential","vital","huge"],
  "hard":        ["tricky","intense","demanding","gnarly","steep"],
  "easy":        ["smooth","painless","breeze","straightforward","trivial"],
  "big":         ["massive","huge","major","significant","enormous"],
  "small":       ["tiny","minor","subtle","modest","compact"],
  "great":       ["fantastic","stellar","brilliant","outstanding","killer"],
  "amazing":     ["incredible","mind-blowing","insane","phenomenal","wild"],
  "awesome":     ["fantastic","brilliant","killer","phenomenal","stellar"],
  "different":   ["distinct","unique","fresh","novel","separate"],
  "simple":      ["clean","elegant","minimal","lean","streamlined"],
  "complex":     ["nuanced","layered","involved","deep","intricate"],
  "fast":        ["blazing","snappy","lightning","rapid","zippy"],
  "slow":        ["sluggish","glacial","crawling","laggy","dragging"],
  "old":         ["classic","vintage","legacy","tried-and-true","seasoned"],
  "new":         ["fresh","cutting-edge","bleeding-edge","modern","shiny"],
  "pretty":      ["fairly","reasonably","quite","decently","notably"],
  // Intensifier variety
  "really":      ["genuinely","honestly","seriously","truly","absolutely"],
  "very":        ["incredibly","remarkably","exceptionally","super","wildly"],
  // Verb upgrades
  "think":       ["feel like","reckon","believe","suspect","figure"],
  "like":        ["dig","appreciate","vibe with","enjoy","am into"],
  "use":         ["leverage","rock","rely on","work with","run with"],
  "make":        ["craft","build","spin up","put together","whip up"],
  "get":         ["land","snag","grab","pick up","score"],
  "know":        ["get","grasp","follow","see","track"],
  "want":        ["crave","need","am after","am itching for","would love"],
  "try":         ["experiment with","take a crack at","give a shot","test out","explore"],
};

// Words that are fine in moderation but get stale when overused
const FILLER_WORDS = new Set(["just","basically","literally","actually","honestly","definitely","absolutely","totally"]);

let lastEnrichTurn = 0;

function enrichVocabulary(response, topics) {
  if (response.length < 30 || response.length > 300) return response;
  if (mem.turn - lastEnrichTurn < 2) return response; // 2-turn cooldown
  if (/^(hi|hey|hello|bye|goodbye|thanks|thank)/i.test(response)) return response;

  let r = response;
  let swapCount = 0;
  const maxSwaps = 3;

  // ── Step 1: Swap bland words for vivid alternatives (~30% per word) ──
  for (const [bland, alternatives] of Object.entries(WORD_SWAPS)) {
    if (swapCount >= maxSwaps) break;
    // Match as whole word, case-insensitive, but preserve surrounding context
    const regex = new RegExp(`\\b${bland}\\b`, "i");
    if (regex.test(r) && Math.random() < 0.3) {
      const match = r.match(regex);
      if (match) {
        const replacement = pick(alternatives);
        // Preserve capitalization of original
        const final = match[0][0] === match[0][0].toUpperCase()
          ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
          : replacement;
        r = r.replace(regex, final);
        swapCount++;
      }
    }
  }

  // ── Step 2: Reduce filler word repetition ──
  // If the same filler appears 2+ times, remove the second occurrence
  for (const filler of FILLER_WORDS) {
    const fillerRegex = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = r.match(fillerRegex);
    if (matches && matches.length >= 2) {
      // Remove the second occurrence
      let count = 0;
      r = r.replace(fillerRegex, (m) => {
        count++;
        return count >= 2 ? "" : m;
      });
      // Clean up any double spaces left behind
      r = r.replace(/\s{2,}/g, " ").trim();
    }
  }

  // ── Step 3: Avoid starting consecutive responses with the same word ──
  const lastAI = mem.history.filter(h => h.role === "ai").slice(-1)[0];
  if (lastAI) {
    const lastFirstWord = lastAI.text.split(/\s/)[0]?.toLowerCase();
    const currentFirstWord = r.split(/\s/)[0]?.toLowerCase();
    if (lastFirstWord && currentFirstWord === lastFirstWord && r.length > 40) {
      // Prepend a varied opener
      const openers = ["So — ","Well — ","Okay, ","See, ","Look — ","Here's the thing — "];
      r = pick(openers) + r.charAt(0).toLowerCase() + r.slice(1);
    }
  }

  if (swapCount > 0) lastEnrichTurn = mem.turn;
  return r;
}

/* ══════════════════════════════════════════════════════════════════
   CONVERSATIONAL DISFLUENCY — Natural Speech Patterns
   Real humans don't produce perfect prose. They self-correct,
   restart mid-thought, hedge, and think out loud. This engine
   adds controlled imperfections that make responses feel like
   live thought rather than pre-composed text.
   Fire rate: ~15% of eligible responses (long enough, not
   already disfluent, not farewells/greetings).
   ══════════════════════════════════════════════════════════════════ */

let lastDisfluencyTurn = 0;

function addDisfluency(response) {
  // Guards: skip short, already-disfluent, greetings, farewells, questions-only
  if (response.length < 40) return response;
  if (/— (?:well|wait|actually|okay|no|hmm)/i.test(response)) return response;
  if (/^(hey|hi|hello|bye|see you|take care|nice to meet)/i.test(response)) return response;
  // Cooldown: 4 turns between disfluencies
  if (mem.turn - lastDisfluencyTurn < 4) return response;
  // ~15% fire rate
  if (Math.random() > 0.15) return response;

  lastDisfluencyTurn = mem.turn;

  // Split into sentences for targeted insertion
  const sentences = response.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length < 1) return response;

  const strategy = Math.random();

  // Strategy 1: Self-correction — replace a word with a "better" one (~30%)
  // "It's great — well, it's really impressive actually"
  if (strategy < 0.3 && sentences.length >= 2) {
    const first = sentences[0].trim();
    // Find an adjective-like word to "correct"
    const adjSwaps = [
      { from: /\b(great)\b/i, weak: "great", strong: "genuinely impressive" },
      { from: /\b(cool)\b/i, weak: "cool", strong: "actually really interesting" },
      { from: /\b(nice)\b/i, weak: "nice", strong: "actually kind of beautiful" },
      { from: /\b(good)\b/i, weak: "good", strong: "legitimately solid" },
      { from: /\b(interesting)\b/i, weak: "interesting", strong: "kind of fascinating actually" },
      { from: /\b(important)\b/i, weak: "important", strong: "honestly pretty critical" },
      { from: /\b(useful)\b/i, weak: "useful", strong: "genuinely handy" },
      { from: /\b(popular)\b/i, weak: "popular", strong: "kind of everywhere now" },
    ];
    for (const swap of adjSwaps) {
      if (swap.from.test(first)) {
        const corrected = first.replace(swap.from, `${swap.weak} — well, ${swap.strong}`);
        return corrected + " " + sentences.slice(1).join(" ");
      }
    }
  }

  // Strategy 2: False start / restart (~25%)
  // "The thing is — okay so basically, [response]"
  if (strategy < 0.55) {
    const falseStarts = [
      "Okay so — ",
      "The thing is — actually, ",
      "I was gonna say — well, ",
      "So basically — yeah, ",
      "Hmm, how do I put this — ",
    ];
    // Only if response doesn't already start with a personality opener
    if (!/^(Hmm|Ooh|Actually|Oh|So |Okay|Wait|Ha,|Real talk)/i.test(response)) {
      return pick(falseStarts) + response.charAt(0).toLowerCase() + response.slice(1);
    }
  }

  // Strategy 3: Mid-thought pivot (~20%)
  // Insert "— actually wait," between two sentences
  if (strategy < 0.75 && sentences.length >= 2) {
    const pivots = [
      " — oh wait, actually ",
      " — hmm, come to think of it, ",
      " — or actually, ",
      " — well, let me put it differently: ",
    ];
    const insertIdx = Math.min(1, sentences.length - 1);
    const before = sentences.slice(0, insertIdx).join(" ").replace(/[.!]+$/, "");
    const after = sentences.slice(insertIdx).join(" ");
    // Lowercase first char of after
    const afterLower = after.charAt(0).toLowerCase() + after.slice(1);
    return before + pick(pivots) + afterLower;
  }

  // Strategy 4: Hedged emphasis (~25%)
  // Add "I think" or "if that makes sense" or "— you know?"
  if (strategy < 1.0) {
    const hedges = [
      { pos: "end", text: " — if that makes sense?" },
      { pos: "end", text: " — you know what I mean?" },
      { pos: "end", text: " ...at least that's how I see it." },
      { pos: "mid", text: " — I think — " },
      { pos: "start", text: "I might be oversimplifying but " },
    ];
    const hedge = pick(hedges);
    if (hedge.pos === "end") {
      // Replace final punctuation
      return response.replace(/[.!]$/, "") + hedge.text;
    }
    if (hedge.pos === "start" && !/^(I |Hmm|Ooh|Actually)/i.test(response)) {
      return hedge.text + response.charAt(0).toLowerCase() + response.slice(1);
    }
    if (hedge.pos === "mid" && sentences.length >= 2) {
      const mid = Math.floor(sentences.length / 2);
      return sentences.slice(0, mid).join(" ").replace(/[.]$/, "") + hedge.text + sentences.slice(mid).join(" ");
    }
  }

  return response;
}

/* ══════════════════════════════════════════════════════════════════
   PATTERN BREAKING & CONVERSATIONAL SURPRISE (Round 41)
   After many rounds of post-processing, responses risk feeling
   "over-polished" — like they came off an assembly line. Real
   humans occasionally surprise: they give a one-word answer when
   you expected a paragraph, ask a completely left-field question,
   or suddenly get introspective. This engine tracks recent response
   *shapes* and occasionally breaks the pattern.
   Fire rate: ~8% of eligible turns, 6-turn cooldown.
   ══════════════════════════════════════════════════════════════════ */

let lastPatternBreakTurn = 0;
let recentResponseShapes = []; // tracks structural patterns: "long_question", "medium_statement", etc.

function classifyResponseShape(response) {
  const len = response.length;
  const hasQ = response.includes("?");
  const sentences = response.split(/(?<=[.!?])\s+/).length;
  const size = len < 60 ? "short" : len < 150 ? "medium" : "long";
  const type = hasQ ? "question" : "statement";
  return `${size}_${type}_${sentences > 2 ? "multi" : "single"}`;
}

function trackResponseShape(response) {
  recentResponseShapes.push(classifyResponseShape(response));
  if (recentResponseShapes.length > 8) recentResponseShapes.shift();
}

function detectPatternRut() {
  if (recentResponseShapes.length < 4) return null;
  const last4 = recentResponseShapes.slice(-4);
  // All same shape? Rut.
  if (new Set(last4).size === 1) return "identical";
  // All end with questions? Rut.
  if (last4.every(s => s.includes("question"))) return "always_questions";
  // All long? Rut.
  if (last4.every(s => s.startsWith("long"))) return "always_long";
  // All multi-sentence? Rut.
  if (last4.every(s => s.includes("multi"))) return "always_multi";
  return null;
}

function breakPattern(response, text, topics, energy) {
  // Guards
  if (response.length < 30) return response;
  if (/^(hey|hi|hello|bye|see you|take care|nice to meet)/i.test(response)) return response;
  if (mem.turn - lastPatternBreakTurn < 6) return response;

  const rut = detectPatternRut();
  // Fire rate: 8% normally, 25% if in a detected rut
  const threshold = rut ? 0.75 : 0.92;
  if (Math.random() > threshold) return response;

  lastPatternBreakTurn = mem.turn;
  const strategy = Math.random();

  // Strategy 1: Radical compression (~25%)
  // Replace entire response with a punchy 1-2 word reaction + redirect
  if (strategy < 0.25 && rut === "always_long" || (strategy < 0.15 && response.length > 120)) {
    const compressions = [
      "Honestly? Yes.",
      "Wait. Say more about that.",
      "Huh.",
      "...okay I love that.",
      "That's the one.",
      "Respect.",
    ];
    const topicPart = topics.length > 0 ? ` (${topics[0]} specifically)` : "";
    const compressed = pick(compressions);
    // Sometimes add a micro follow-up after the compressed hit
    if (Math.random() > 0.5) {
      return compressed + " What made you think of that" + topicPart + "?";
    }
    return compressed;
  }

  // Strategy 2: Parenthetical aside (~25%)
  // Inject an introspective aside mid-response
  if (strategy < 0.50) {
    const sentences = response.split(/(?<=[.!?])\s+/);
    if (sentences.length >= 2) {
      const asides = [
        "(I realize I keep asking you questions — you can totally just talk AT me too)",
        "(this is the part where a real person would make a hand gesture, but alas)",
        "(genuinely curious, not just saying that)",
        "(I'm a tiny AI but I swear I'm thinking hard about this)",
        "(sorry if that came out of nowhere)",
      ];
      const insertAt = Math.min(1, sentences.length - 1);
      return sentences.slice(0, insertAt).join(" ") + " " + pick(asides) + " " + sentences.slice(insertAt).join(" ");
    }
  }

  // Strategy 3: Confession of limitation (~20%)
  // Suddenly honest about not knowing instead of sounding authoritative
  if (strategy < 0.70) {
    const confessions = [
      "I'll be real — I'm working with a pretty tiny brain here. But my gut says: ",
      "Okay full disclosure, I'm basically just pattern-matching at light speed. But here's what clicks: ",
      "I don't have the full picture, and I know that. But from what you've told me: ",
    ];
    // Only apply to statement-heavy responses (not questions)
    if (!response.endsWith("?")) {
      const firstSentence = response.split(/(?<=[.!])\s+/)[0] || response;
      if (firstSentence.length > 40) {
        return pick(confessions) + firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1);
      }
    }
  }

  // Strategy 4: Left-field pivot (~15%)
  // Ask something unexpected but thematically adjacent
  if (strategy < 0.85 && rut === "always_questions") {
    // Break the question pattern — make a definitive statement instead
    const stripped = response.replace(/\s*[^.!]*\?$/g, "").trim();
    if (stripped.length > 20) {
      const closers = [
        " I don't even need to ask — I can tell you've thought about this.",
        " And honestly, I think you already know the answer.",
        " Full stop. No question mark needed.",
      ];
      return stripped + pick(closers);
    }
  }

  // Strategy 5: Meta-pattern acknowledgment (~15%)
  // Acknowledge the AI's own predictability
  if (strategy <= 1.0 && rut) {
    const metas = {
      identical: "I just realized I've been giving you the same kind of answer over and over. Let me switch it up — ",
      always_questions: "Okay I've been asking you a LOT of questions. Let me just say something for once: ",
      always_long: "I've been kinda verbose lately. Let me try the short version: ",
      always_multi: "I keep giving you these multi-part answers. Here's the simple take: ",
    };
    const prefix = metas[rut];
    if (prefix) {
      // For "always_long"/"always_multi", try to compress to first sentence
      if (rut === "always_long" || rut === "always_multi") {
        const first = response.split(/(?<=[.!?])\s+/)[0] || response;
        return prefix + first.charAt(0).toLowerCase() + first.slice(1);
      }
      return prefix + response.charAt(0).toLowerCase() + response.slice(1);
    }
  }

  return response;
}

/* ══════════════════════════════════════════════════════════════════
   PRECISION ECHOING & CONTENT-AWARE REFLECTION (Round 42)
   Generic mirroring says "tell me more about that." Precision echoing
   extracts the SPECIFIC detail — the verb, the struggle, the tool
   name, the emotional phrase — and reflects it back with surgical
   accuracy. "You said the borrow checker keeps tripping you up —
   is it the lifetime annotations or the ownership model?"
   Fire rate: ~20% of eligible turns (long enough input, 4-turn cooldown).
   ══════════════════════════════════════════════════════════════════ */

let lastEchoTurn = 0;

// Extract structured content from user input
function extractContent(text, tokens, lower) {
  const content = { actions: [], concepts: [], struggles: [], tools: [], emotions: [] };

  // Actions: what the user is DOING (verb phrases)
  const actionPats = [
    { pat: /i(?:'m| am) (?:trying to|working on|building|learning|creating|making|debugging|fixing|writing|designing|studying|researching|exploring|reading about|getting into|starting)\s+(.+?)(?:\.|,|!|\?|$)/i, type: "ongoing" },
    { pat: /i (?:want to|need to|have to|plan to|hope to|decided to)\s+(.+?)(?:\.|,|!|\?|$)/i, type: "goal" },
    { pat: /i (?:just|recently) (?:started|finished|tried|learned|discovered|found|built|shipped|deployed|released)\s+(.+?)(?:\.|,|!|\?|$)/i, type: "recent" },
  ];
  for (const { pat, type } of actionPats) {
    const m = text.match(pat);
    if (m) content.actions.push({ text: m[1].trim().replace(/\s+/g, " ").slice(0, 60), type });
  }

  // Struggles: what's HARD (frustration markers + subject)
  const strugglePats = [
    /(?:keeps?|keep) (?:tripping|confusing|breaking|failing|crashing|bugging|messing)\s+(?:me\s+)?(?:up\s+)?(?:with |on |about )?(.+?)(?:\.|,|!|$)/i,
    /(?:can't|cannot|struggling with|stuck on|confused (?:by|about)|having trouble with|having a hard time with)\s+(.+?)(?:\.|,|!|$)/i,
    /(.+?) (?:is|are) (?:so |really |super )?(?:confusing|hard|tricky|difficult|annoying|frustrating|overwhelming)/i,
  ];
  for (const pat of strugglePats) {
    const m = text.match(pat);
    if (m) content.struggles.push(m[1].trim().slice(0, 40));
  }

  // Tools/technologies: specific named things
  const toolPats = /\b(react|vue|angular|svelte|next\.?js|nuxt|remix|astro|vite|webpack|typescript|javascript|python|rust|go|swift|kotlin|java|c\+\+|ruby|php|elixir|haskell|sql|graphql|docker|kubernetes|aws|gcp|azure|firebase|supabase|prisma|drizzle|tailwind|sass|less|figma|sketch|framer|notion|linear|slack|discord|git|github|gitlab|vercel|netlify|railway|postgres|mongodb|redis|sqlite|node|deno|bun)\b/gi;
  const toolMatches = text.match(toolPats);
  if (toolMatches) content.tools = [...new Set(toolMatches.map(t => t.toLowerCase()))];

  // Emotions: specific feeling phrases
  const emotionPats = [
    { pat: /i(?:'m| am| feel) (?:so |really |kinda |pretty )?(.+?)(?:\.|,|!|$)/i, extract: 1 },
  ];
  for (const { pat, extract } of emotionPats) {
    const m = text.match(pat);
    if (m) {
      const word = m[extract].trim().split(/\s+/).slice(0, 3).join(" ");
      if (word.length > 2 && word.length < 30) content.emotions.push(word);
    }
  }

  return content;
}

// Generate precision echo that reflects specific details
function precisionEcho(response, text, tokens) {
  // Guards
  if (text.length < 30) return response;
  if (mem.turn - lastEchoTurn < 4) return response;
  if (Math.random() > 0.20) return response;

  const lower = text.toLowerCase();
  const content = extractContent(text, tokens, lower);

  // Need at least some extractable content
  const hasContent = content.actions.length + content.struggles.length + content.tools.length > 0;
  if (!hasContent) return response;

  lastEchoTurn = mem.turn;

  // Strategy 1: Sharpen a generic trailing question with specific content
  const trailingQ = response.match(/\?[^?]*$/);
  if (trailingQ) {
    const genericQs = /what do you think|tell me more|what's (?:your|the) (?:take|story)|how (?:did|do) you|what got you|what draws you|what's on your mind|what aspect/i;
    if (genericQs.test(trailingQ[0])) {
      let sharpQ = null;

      if (content.struggles.length > 0) {
        const s = content.struggles[0];
        sharpQ = pick([
          `What specifically about ${s} is tripping you up — the concept or the syntax?`,
          `When you hit the wall with ${s}, what does that actually look like?`,
          `Is ${s} the kind of thing where you know WHAT to do but not HOW, or the other way around?`,
        ]);
      } else if (content.actions.length > 0 && content.tools.length > 0) {
        const a = content.actions[0];
        const t = content.tools[0];
        sharpQ = pick([
          `How far along are you with ${t}? Like, just starting out or already in the weeds?`,
          `What made you pick ${t} for that? Were there other options you considered?`,
          `Is ${a.text.slice(0, 30)} a personal project or something for work?`,
        ]);
      } else if (content.actions.length > 0) {
        const a = content.actions[0];
        sharpQ = pick([
          `What's the hardest part of ${a.text.slice(0, 30)} so far?`,
          `How long have you been at it?`,
          `What does success look like for that?`,
        ]);
      }

      if (sharpQ) {
        // Replace the generic trailing question
        return response.replace(/[^.!]*\?[^?]*$/, "").trim() + " " + sharpQ;
      }
    }
  }

  // Strategy 2: Replace vague acknowledgment at the start with specific echo
  const vagueStarts = /^(that's (?:cool|interesting|great|awesome|nice)|oh (?:cool|nice|interesting)|neat|gotcha|I see|makes sense)/i;
  if (vagueStarts.test(response)) {
    let specificAck = null;

    if (content.struggles.length > 0) {
      specificAck = pick([
        `Yeah, ${content.struggles[0]} is genuinely one of those things that takes a while to click.`,
        `Oh man, ${content.struggles[0]} — that's a common pain point and for good reason.`,
      ]);
    } else if (content.tools.length > 0 && content.actions.length > 0) {
      const tool = content.tools[0];
      specificAck = pick([
        `${tool.charAt(0).toUpperCase() + tool.slice(1)} for that — solid choice.`,
        `Oh, ${tool}! That's a great pick for what you're doing.`,
      ]);
    } else if (content.actions.length > 0) {
      const a = content.actions[0];
      specificAck = pick([
        `${a.type === "ongoing" ? "Building" : a.type === "goal" ? "Planning" : "Just did"} ${a.text.slice(0, 25)} — I love that.`,
        `So you're ${a.type === "goal" ? "looking to" : "in the middle of"} ${a.text.slice(0, 25)} — nice.`,
      ]);
    }

    if (specificAck) {
      const rest = response.replace(vagueStarts, "").trim();
      return specificAck + (rest ? " " + rest : "");
    }
  }

  return response;
}

/* ══════════════════════════════════════════════════════════════════
   NUANCED STANCE & OPINION DEPTH ENGINE (Round 43)
   The AI always agrees. Real people don't. This engine adds the
   ability to respectfully push back, play devil's advocate, offer
   counterpoints, or take a genuine position. The goal: make the AI
   feel like it has actual views, not just mirrors of the user's.

   Strategies:
   1. Respectful disagreement — "I see where you're coming from, but..."
   2. Devil's advocate — "Let me push back on that for a sec..."
   3. Nuanced "it depends" — with actual reasoning, not cop-out
   4. Strong preference — genuinely picks a side with a WHY

   Fire rate: ~12% of opinion-adjacent responses, 5-turn cooldown.
   ══════════════════════════════════════════════════════════════════ */

let lastStanceTurn = 0;

// Debate seeds: topics where the AI has a genuine contrarian angle
const COUNTERPOINTS = {
  // Tech debates
  typescript: ["TypeScript adds overhead that isn't always worth it — for small scripts, plain JS is faster and simpler", "The type system can give you false confidence — runtime is still wild"],
  react: ["React's mental model is clean, but the ecosystem fragmentation is real — too many ways to do everything", "The hooks model is powerful but the dependency array footgun catches even experienced devs"],
  vue: ["Vue's simplicity is great to start, but some of its 'magic' makes debugging harder at scale", "The Options API vs Composition API split means two codebases in one framework"],
  angular: ["Angular gets a bad rap, but its opinionated structure actually saves time on big teams", "The learning curve is steep, but once you're in, you move fast"],
  python: ["Python's speed is fine for most things, but the GIL means you're fighting it for real concurrency", "The dynamic typing that makes it easy to learn also makes it easy to ship subtle bugs"],
  rust: ["Rust's safety guarantees are incredible, but the compile times and learning curve are a real cost", "Not every project needs Rust-level safety — sometimes Go or even JS is the right pragmatic call"],
  ai: ["AI tools are amazing assistants, but the over-reliance on them is making people skip the learning stage", "The hype cycle is real — most 'AI features' are fancy autocomplete, and that's okay"],
  css: ["CSS is actually beautiful once you stop fighting it — the problem is usually the mental model, not the language", "Tailwind is great but it trades one complexity for another — your HTML becomes the mess instead"],
  tailwind: ["Tailwind is productive, but 'utility-first' can mean your markup becomes unreadable spaghetti", "The flip side: you never have to name CSS classes, and naming things is genuinely one of the hardest problems"],
  nextjs: ["Next.js is powerful but the constant API changes between versions cause real churn fatigue", "Server components are cool in theory, but the mental model of what runs where gets confusing fast"],
  // Design debates
  design: ["Minimal design is trendy but sometimes 'clean' just means 'empty' — density has value too", "The best design is often invisible, but invisible design doesn't win awards — there's tension there"],
  figma: ["Figma is dominant for good reason, but the browser-based approach means you're always one bad connection from frustration", "Figma's collaboration model changed design, but too many cooks in a Figma file is chaos"],
  // Life/work debates
  remote: ["Remote work is freedom, but the serendipitous hallway conversations you lose are genuinely hard to replace", "Fully remote teams can work, but it requires 3x the intentional communication effort"],
  startup: ["Startups are exciting but the romanticization hides the fact that most fail, and the ones that succeed often grind people down", "The 'move fast and break things' ethos is great until you're the thing that breaks"],
  productivity: ["Most productivity advice is procrastination with extra steps — the real hack is just doing the boring thing", "Deep work is ideal but modern work rarely allows for it — the ability to context-switch well is underrated"],
  learning: ["Tutorial hell is real — at some point you have to close the tutorial and build something ugly", "Everyone says 'learn by building' but sometimes you need the theory first or you just build bad habits"],
};

// Detect when the user states an opinion we can engage with
function detectStanceOpportunity(text, lower, topics) {
  // User states a strong opinion
  const opinionSignals = [
    /i (?:think|believe|feel like|feel that) (.+?)(?:\.|!|$)/i,
    /(.+?) is (?:the best|better than|overrated|underrated|overhyped|garbage|amazing|terrible|the worst|the future)/i,
    /(?:everyone|nobody|people) should (?:use|learn|try|stop using|switch to) (.+?)(?:\.|!|$)/i,
    /i (?:hate|love|can't stand|prefer|always use|never use) (.+?)(?:\.|!|$)/i,
    /(.+?) (?:is dead|is dying|sucks|rules|wins|loses)/i,
  ];

  for (const pat of opinionSignals) {
    if (pat.test(text)) return true;
  }

  // User asks for the AI's opinion
  if (/what (?:do )?you (?:think|reckon|feel)/i.test(lower)) return true;
  // User presents a comparison
  if (/(?:vs\.?|versus|or|compared to)\b/i.test(lower) && topics.length > 0) return true;

  return false;
}

function addStance(response, text, topics) {
  // Guards
  if (response.length < 30) return response;
  if (mem.turn - lastStanceTurn < 5) return response;
  if (/^(hey|hi|hello|bye|see you|take care)/i.test(response)) return response;

  const lower = text.toLowerCase();
  if (!detectStanceOpportunity(text, lower, topics)) return response;

  // 12% fire rate
  if (Math.random() > 0.12) return response;

  // Find a relevant counterpoint
  let counterTopic = null;
  let counter = null;
  for (const topic of topics) {
    if (COUNTERPOINTS[topic]) {
      counterTopic = topic;
      counter = pick(COUNTERPOINTS[topic]);
      break;
    }
  }

  if (!counter) return response;

  lastStanceTurn = mem.turn;
  const strategy = Math.random();

  // Strategy 1: Respectful disagreement (~30%)
  if (strategy < 0.30) {
    const disagreements = [
      `I hear you, but let me push back gently: ${counter}. What do you think about that angle?`,
      `Okay, here's where I might disagree a little — ${counter}. Not saying you're wrong, just... there's another side.`,
      `That's a fair take! Though — ${counter}. I go back and forth on this honestly.`,
    ];
    return pick(disagreements);
  }

  // Strategy 2: Devil's advocate (~25%)
  if (strategy < 0.55) {
    const advocates = [
      `Let me play devil's advocate for a sec: ${counter}. But I get why you'd disagree.`,
      `Okay, counterpoint though — ${counter}. I don't fully believe that myself, but it's worth considering.`,
      `The other side of that coin: ${counter}. Where do you land on it?`,
    ];
    return pick(advocates);
  }

  // Strategy 3: Nuanced "it depends" with reasoning (~25%)
  if (strategy < 0.80) {
    const nuanced = [
      `Honestly? It depends. ${counter}. But in the right context, your take is totally valid too.`,
      `I'm genuinely torn on this one. On one hand, sure. On the other: ${counter}. Context matters a lot here.`,
      `This is one of those things where both sides have a point. ${counter}. But also, your perspective makes sense for your situation.`,
    ];
    return pick(nuanced);
  }

  // Strategy 4: Strong position (~20%)
  const positions = [
    `Hot take: ${counter}. I'll die on this hill. But convince me otherwise! 😄`,
    `Okay, real talk — ${counter}. That's just how I see it. Am I wrong?`,
    `I actually have a strong opinion here: ${counter}. Fight me on it. 😄`,
  ];
  return pick(positions);
}

/* ── Round 44: Progressive Question Depth & Intelligent Probing ──
 * Replaces flat COMP.deepeners with depth-aware follow-ups that evolve
 * as conversation goes deeper into a topic. Tracks what's been asked
 * per topic and generates increasingly specific questions.
 */

// Track per-topic question depth and asked questions
const topicDepth = {};  // { topic: { depth: 0-3, asked: Set, lastTurn: n } }

// Depth-tiered question templates per domain
const DEPTH_TEMPLATES = {
  tech: {
    0: [ // Surface: getting to know
      t => `What got you into ${t}?`,
      t => `How long have you been working with ${t}?`,
      t => `What's your setup for ${t} look like?`,
      t => `Do you use ${t} for personal or work stuff?`,
    ],
    1: [ // Engaged: specific experiences
      t => `What's been the trickiest thing you've dealt with in ${t}?`,
      t => `Has ${t} changed how you approach other tools?`,
      t => `What's something about ${t} that surprised you after using it a while?`,
      t => `Is there a specific pattern in ${t} you keep reaching for?`,
      t => `What would you change about ${t} if you could?`,
    ],
    2: [ // Deep: opinions and tradeoffs
      t => `Where does ${t} fall short that nobody talks about?`,
      t => `If you were starting a project tomorrow, would you still pick ${t}?`,
      t => `What's the biggest misconception people have about ${t}?`,
      t => `How do you see ${t} evolving in the next couple years?`,
      t => `What's the thing about ${t} that only people who've used it seriously would know?`,
    ],
    3: [ // Expert: nuanced debate-level
      t => `What's the steelman argument against ${t} that you actually think has merit?`,
      t => `If ${t} disappeared tomorrow, what would you miss most — and least?`,
      t => `Is there a philosophy behind ${t} that you think carries over beyond just code?`,
      t => `What's your unpopular opinion about ${t}?`,
    ],
  },
  design: {
    0: [
      t => `What draws you to ${t}?`,
      t => `Are you exploring ${t} or is it part of your daily work?`,
      t => `What's your go-to tool for ${t}?`,
    ],
    1: [
      t => `What's the hardest part of getting ${t} right?`,
      t => `Has your approach to ${t} changed over time?`,
      t => `Who does ${t} really well that you admire?`,
      t => `What's an underrated aspect of ${t}?`,
    ],
    2: [
      t => `Where do you draw the line between good ${t} and overthinking it?`,
      t => `What's a ${t} trend you think will age badly?`,
      t => `How do you know when ${t} is "done"?`,
    ],
    3: [
      t => `What's the tension between ${t} idealism and shipping deadlines?`,
      t => `If you could change one thing about how the industry approaches ${t}, what would it be?`,
    ],
  },
  life: {
    0: [
      t => `What do you enjoy most about ${t}?`,
      t => `How'd you get into ${t}?`,
      t => `Is ${t} a recent thing or long-time interest?`,
    ],
    1: [
      t => `What's been your best experience with ${t}?`,
      t => `Has ${t} connected you with anyone interesting?`,
      t => `What would you tell someone just getting into ${t}?`,
    ],
    2: [
      t => `How has ${t} shaped how you think about other stuff?`,
      t => `What's the thing about ${t} that most people get wrong?`,
      t => `Is there a moment with ${t} that really stuck with you?`,
    ],
    3: [
      t => `What does ${t} mean to you beyond just the surface level?`,
      t => `Has ${t} changed something fundamental about how you see things?`,
    ],
  },
};

// Map topics to domains for depth template selection
const TOPIC_DOMAINS = {};
const techTopics = "react javascript typescript python css node git rust vue nextjs tailwind html api database sql algorithm docker aws graphql angular svelte go java swift kotlin redux webpack vite code programming software engineering developer framework library testing debugging deployment".split(" ");
const designTopics = "ui ux figma color typography prototype wireframe animation responsive brand accessibility design layout illustration icon".split(" ");
techTopics.forEach(t => TOPIC_DOMAINS[t] = "tech");
designTopics.forEach(t => TOPIC_DOMAINS[t] = "design");
// Everything else defaults to "life"

function getTopicDomain(topic) {
  return TOPIC_DOMAINS[topic] || "life";
}

function getTopicEntry(topic) {
  if (!topicDepth[topic]) {
    topicDepth[topic] = { depth: 0, asked: new Set(), lastTurn: 0 };
  }
  return topicDepth[topic];
}

// Advance depth when we revisit a topic
function advanceTopicDepth(topic) {
  const entry = getTopicEntry(topic);
  const turnGap = mem.history.length - entry.lastTurn;
  // Advance depth on revisit (every 2+ exchanges on same topic)
  if (turnGap <= 4 && entry.depth < 3) {
    entry.depth = Math.min(3, entry.depth + 1);
  }
  entry.lastTurn = mem.history.length;
}

// Generate a depth-appropriate question for a topic
function progressiveQuestion(topic) {
  const entry = getTopicEntry(topic);
  advanceTopicDepth(topic);

  const domain = getTopicDomain(topic);
  const templates = DEPTH_TEMPLATES[domain] || DEPTH_TEMPLATES.life;

  // Try current depth first, fall back to lower depths
  for (let d = entry.depth; d >= 0; d--) {
    const pool = templates[d];
    if (!pool) continue;
    // Filter out already-asked questions
    const available = pool.filter(fn => !entry.asked.has(fn.toString()));
    if (available.length > 0) {
      const chosen = pick(available);
      entry.asked.add(chosen.toString());
      return chosen(topic);
    }
  }

  // All depth questions exhausted — fall back to ASSOC hooks or deepeners
  const assoc = ASSOC[topic];
  if (assoc && assoc.hooks) {
    const unused = assoc.hooks.filter(h => !entry.asked.has(h));
    if (unused.length > 0) {
      const h = pick(unused);
      entry.asked.add(h);
      return h;
    }
  }

  // True fallback: generic deepeners (shouldn't happen often)
  return pick(COMP.deepeners);
}

// Pipeline step: replace generic deepener endings with progressive questions
function deepenQuestions(response, topics) {
  if (!topics || topics.length === 0) return response;
  if (Math.random() > 0.35) return response; // 35% fire rate
  const turn = mem.history.length;
  if (turn - lastDeepenerTurn < 3) return response; // 3-turn cooldown

  const topic = topics[0]; // Use primary topic

  // Detect if the response ends with a generic deepener
  const genericPatterns = [
    /What drew you to that\?$/,
    /How long have you been into that\?$/,
    /What's the best part about it\?$/,
    /What got you started\?$/,
    /Is there a specific aspect you focus on\?$/,
    /What's been the biggest surprise\?$/,
    /Would you recommend it to a beginner\?$/,
    /What's next for you with that\?$/,
    /Has it changed how you think about things\?$/,
    /What would you do differently if starting over\?$/,
    /tell me more about that\?$/i,
    /what's your experience been like\?$/i,
    /what do you think\?$/i,
  ];

  const hasGeneric = genericPatterns.some(p => p.test(response.trim()));
  if (hasGeneric) {
    // Replace the generic ending with a depth-appropriate question
    const betterQ = progressiveQuestion(topic);
    for (const p of genericPatterns) {
      if (p.test(response.trim())) {
        lastDeepenerTurn = turn;
        return response.replace(p, betterQ);
      }
    }
  }

  // Even without a generic ending, occasionally append a depth-aware question
  // if the response doesn't already end with a question
  if (!response.trim().endsWith("?") && Math.random() < 0.2) {
    const q = progressiveQuestion(topic);
    lastDeepenerTurn = turn;
    return response + " " + q;
  }

  return response;
}

let lastDeepenerTurn = 0;

/* ── Round 45: Conversational Momentum & Topic Bridging ──
 * Detects topic shifts vs continuations and generates appropriate
 * connective tissue. Weaves in callbacks to earlier conversation
 * moments. Varies response openers based on momentum direction.
 */

let lastBridgeTurn = 0;
let previousTopics = []; // track last turn's topics for shift detection
let topicHistory = [];   // rolling window of [turn, topic] pairs

function trackTopicFlow(topics) {
  const turn = mem.history.length;
  for (const t of topics) {
    topicHistory.push({ turn, topic: t });
  }
  // Keep rolling window of 30
  if (topicHistory.length > 30) topicHistory = topicHistory.slice(-30);
  const prev = previousTopics;
  previousTopics = [...topics];
  return prev;
}

// Detect if user shifted topics vs continued on the same thread
function detectTopicShift(currentTopics, prevTopics) {
  if (prevTopics.length === 0 || currentTopics.length === 0) return null;
  const overlap = currentTopics.filter(t => prevTopics.includes(t));
  if (overlap.length > 0) return { type: "continuation", shared: overlap[0] };

  // Check if any current topic is related to previous via ASSOC
  for (const curr of currentTopics) {
    for (const prev of prevTopics) {
      const assoc = ASSOC[prev];
      if (assoc && assoc.related && assoc.related.includes(curr)) {
        return { type: "related", from: prev, to: curr };
      }
      const assocCurr = ASSOC[curr];
      if (assocCurr && assocCurr.related && assocCurr.related.includes(prev)) {
        return { type: "related", from: prev, to: curr };
      }
    }
  }

  return { type: "shift", from: prevTopics[0], to: currentTopics[0] };
}

// Find something from earlier conversation that connects to current topic
function findCallback(currentTopics) {
  const turn = mem.history.length;
  if (turn < 6) return null; // too early for callbacks

  // Look for a topic mentioned 5+ turns ago that relates to current
  const oldEntries = topicHistory.filter(e => turn - e.turn >= 5 && turn - e.turn <= 20);
  for (const curr of currentTopics) {
    for (const old of oldEntries) {
      if (old.topic === curr) continue; // same topic = topic return, handled elsewhere
      const assocOld = ASSOC[old.topic];
      const assocCurr = ASSOC[curr];
      if (assocOld && assocOld.related && assocOld.related.includes(curr)) {
        return { oldTopic: old.topic, currentTopic: curr, turnsAgo: turn - old.turn };
      }
      if (assocCurr && assocCurr.related && assocCurr.related.includes(old.topic)) {
        return { oldTopic: old.topic, currentTopic: curr, turnsAgo: turn - old.turn };
      }
    }
  }

  // Check stored facts for connections
  const facts = mem.facts || {};
  for (const curr of currentTopics) {
    if (facts.project && ASSOC[curr]) {
      return { type: "project", project: facts.project, currentTopic: curr };
    }
  }

  return null;
}

// Generate a bridge phrase based on the topic shift type
function generateBridge(shift, callback) {
  if (!shift) return null;

  if (shift.type === "continuation") {
    // Continuing same topic — use deepening connectors
    return pick([
      "Yeah, and building on that —",
      "Right, so going deeper —",
      "Exactly, and here's the thing —",
      "So following that thread —",
      "Mm, and on that note —",
    ]);
  }

  if (shift.type === "related") {
    // Related topic shift — acknowledge the natural flow
    return pick([
      `Oh, from ${shift.from} to ${shift.to} — that's a natural jump.`,
      `${shift.to.charAt(0).toUpperCase() + shift.to.slice(1)} — yeah, that connects to what you were saying about ${shift.from}.`,
      `That's actually closely tied to the ${shift.from} stuff.`,
    ]);
  }

  if (shift.type === "shift") {
    // Unrelated topic shift — acknowledge the pivot
    return pick([
      "Oh, switching gears —",
      "Okay, new topic! I'm here for it.",
      "Oh interesting, different direction —",
      "Sure, let's talk about that instead.",
    ]);
  }

  return null;
}

// Generate a callback weave — reference earlier conversation
function generateCallbackWeave(callback) {
  if (!callback) return null;

  if (callback.type === "project") {
    return pick([
      `You know, this connects to that ${callback.project} project you mentioned.`,
      `Actually, this might be relevant for ${callback.project} too.`,
    ]);
  }

  return pick([
    `This actually ties back to when we were talking about ${callback.oldTopic} earlier.`,
    `Funny — we touched on ${callback.oldTopic} a while back, and this connects to that.`,
    `Remember when we were on ${callback.oldTopic}? There's a thread here.`,
  ]);
}

// Pipeline step: inject bridge phrases and callback weaves
function addTopicBridge(response, topics) {
  const turn = mem.history.length;
  if (turn - lastBridgeTurn < 3) return response; // 3-turn cooldown
  if (response.length < 30) return response; // too short to bridge

  const prevTopics = trackTopicFlow(topics);
  const shift = detectTopicShift(topics, prevTopics);

  // 25% chance to add a bridge on topic shift/related transition
  if (shift && shift.type !== "continuation" && Math.random() < 0.25) {
    const bridge = generateBridge(shift, null);
    if (bridge) {
      lastBridgeTurn = turn;
      // Replace bland openers with the bridge
      const blandOpeners = /^(Oh!|Interesting!|Hmm!|Okay!|Got it!|I see!|Right!|Nice!)\s*/;
      if (blandOpeners.test(response)) {
        return response.replace(blandOpeners, bridge + " ");
      }
      return bridge + " " + response;
    }
  }

  // 15% chance to weave in a callback to earlier conversation
  if (Math.random() < 0.15 && topics.length > 0) {
    const callback = findCallback(topics);
    if (callback) {
      const weave = generateCallbackWeave(callback);
      if (weave) {
        lastBridgeTurn = turn;
        // Append callback as a parenthetical or sentence
        if (response.endsWith("?")) {
          // Don't mess with questions, prepend instead
          return weave + " " + response;
        }
        return response + " " + weave;
      }
    }
  }

  // On continuation, occasionally deepen instead of just acknowledging
  if (shift && shift.type === "continuation" && Math.random() < 0.12) {
    const depth = topicHistory.filter(e => e.topic === shift.shared).length;
    if (depth >= 3) {
      const depthNote = pick([
        `We keep coming back to ${shift.shared} — clearly something there.`,
        `This is like the third time ${shift.shared} has come up — must be on your mind.`,
        `You're really in the ${shift.shared} zone right now and I love it.`,
      ]);
      lastBridgeTurn = turn;
      return response + " " + depthNote;
    }
  }

  return response;
}

/* ── Round 46: Lexical Mirroring & Register Adaptation ──
 * Real humans unconsciously mirror each other's vocabulary, punctuation,
 * and formality. This system tracks the user's distinctive phrases and
 * word choices, then adapts the AI's output to match their register.
 */

// Track user's distinctive phrases for echoing
let userPhraseBank = [];  // rolling window of notable user phrases
let lastMirrorTurn = 0;

// Vocabulary swap tables: casual ↔ formal register
const REGISTER_SWAPS = {
  toFormal: [
    [/\bcool\b/gi, () => pick(["impressive", "notable", "commendable"])],
    [/\bawesome\b/gi, () => pick(["excellent", "remarkable", "outstanding"])],
    [/\bgonna\b/gi, "going to"],
    [/\bwanna\b/gi, "want to"],
    [/\bgotta\b/gi, "have to"],
    [/\bkinda\b/gi, "somewhat"],
    [/\bsorta\b/gi, "somewhat"],
    [/\ba lot\b/gi, () => pick(["considerably", "significantly", "substantially"])],
    [/\bsuper\b(?!\w)/gi, () => pick(["exceptionally", "remarkably", "particularly"])],
    [/\bstuff\b/gi, () => pick(["aspects", "elements", "details"])],
    [/\bthing\b(?!s)/gi, () => pick(["aspect", "element", "factor"])],
    [/\bbig\b/gi, () => pick(["significant", "substantial", "considerable"])],
  ],
  toCasual: [
    [/\bimpressive\b/gi, "cool"],
    [/\bexcellent\b/gi, "awesome"],
    [/\bsubstantially\b/gi, "a lot"],
    [/\bsignificant(?:ly)?\b/gi, () => pick(["big", "major", "huge"])],
    [/\bfurthermore\b/gi, "also"],
    [/\badditionally\b/gi, "plus"],
    [/\bhowever\b/gi, "but"],
    [/\btherefore\b/gi, "so"],
    [/\bregarding\b/gi, "about"],
    [/\butilize\b/gi, "use"],
    [/\bdemonstrate\b/gi, "show"],
    [/\bpurchase\b/gi, "buy"],
    [/\bcommence\b/gi, "start"],
    [/\brequire\b/gi, "need"],
  ],
};

// Contraction tables
const EXPAND_CONTRACTIONS = [
  [/\bI'm\b/g, "I am"], [/\bdon't\b/g, "do not"], [/\bcan't\b/g, "cannot"],
  [/\bwon't\b/g, "will not"], [/\bisn't\b/g, "is not"], [/\baren't\b/g, "are not"],
  [/\bdidn't\b/g, "did not"], [/\bwouldn't\b/g, "would not"], [/\bcouldn't\b/g, "could not"],
  [/\bshouldn't\b/g, "should not"], [/\bthey're\b/g, "they are"], [/\bwe're\b/g, "we are"],
  [/\bit's\b/g, "it is"], [/\bthat's\b/g, "that is"], [/\bwhat's\b/g, "what is"],
  [/\bhere's\b/g, "here is"], [/\bthere's\b/g, "there is"],
];
const CONTRACT = [
  [/\bI am\b/g, "I'm"], [/\bdo not\b/g, "don't"], [/\bcannot\b/g, "can't"],
  [/\bwill not\b/g, "won't"], [/\bis not\b/g, "isn't"], [/\bare not\b/g, "aren't"],
  [/\bdid not\b/g, "didn't"], [/\bwould not\b/g, "wouldn't"], [/\bcould not\b/g, "couldn't"],
  [/\bshould not\b/g, "shouldn't"], [/\bthey are\b/g, "they're"], [/\bwe are\b/g, "we're"],
  [/\bit is\b/g, "it's"], [/\bthat is\b/g, "that's"], [/\bwhat is\b/g, "what's"],
];

// Extract notable phrases from user input (2-4 word sequences that aren't stop words)
function extractUserPhrases(text) {
  const words = text.split(/\s+/).filter(w => w.length > 1);
  const phrases = [];
  // Extract 2-3 word chunks that contain at least one non-stop word
  for (let i = 0; i < words.length - 1; i++) {
    const two = words.slice(i, i + 2).join(" ");
    const three = i < words.length - 2 ? words.slice(i, i + 3).join(" ") : null;
    const hasContent = words.slice(i, i + 2).some(w => !STOP.has(w.toLowerCase()) && w.length > 2);
    if (hasContent && two.length > 5 && two.length < 30) {
      // Skip if it's just common filler
      if (!/^(I think|you know|I mean|it is|that is|this is|I am|you are)$/i.test(two)) {
        phrases.push(two);
      }
    }
    if (three && hasContent && three.length > 8 && three.length < 35) {
      phrases.push(three);
    }
  }
  return phrases;
}

// Detect user's punctuation style
function detectPunctuationStyle(text) {
  const usesEllipsis = /\.{2,3}/.test(text);
  const usesExclamations = (text.match(/!/g) || []).length;
  const usesDashes = /\s[—–-]\s/.test(text);
  const endsClean = /[.?!]$/.test(text.trim());
  const noPunctEnd = !/[.?!]$/.test(text.trim()) && text.length > 10;
  return { usesEllipsis, exclamationDensity: usesExclamations / Math.max(1, text.length / 50), usesDashes, endsClean, noPunctEnd };
}

// Track user's phrase style for mirroring
function trackUserPhrases(text) {
  const phrases = extractUserPhrases(text);
  for (const ph of phrases) {
    userPhraseBank.push({ phrase: ph, turn: mem.history.length });
  }
  // Keep rolling window of 20
  if (userPhraseBank.length > 20) userPhraseBank = userPhraseBank.slice(-20);
}

// Pipeline step: adapt response register and mirror user's language patterns
function mirrorRegister(response, text) {
  const turn = mem.history.length;
  trackUserPhrases(text);

  // Analyze current user style
  const style = analyzeUserStyle();
  let r = response;

  // 1. Vocabulary register adaptation (30% rate, but always for strong formal/casual signals)
  if (style.formality === "formal" && Math.random() < 0.35) {
    for (const [pattern, replacement] of REGISTER_SWAPS.toFormal) {
      const rep = typeof replacement === "function" ? replacement() : replacement;
      r = r.replace(pattern, rep);
    }
    // Expand contractions for formal users
    for (const [pattern, expanded] of EXPAND_CONTRACTIONS) {
      if (Math.random() < 0.4) r = r.replace(pattern, expanded);
    }
  } else if (style.formality === "very-casual" && Math.random() < 0.35) {
    for (const [pattern, replacement] of REGISTER_SWAPS.toCasual) {
      const rep = typeof replacement === "function" ? replacement() : replacement;
      r = r.replace(pattern, rep);
    }
    // Contract for casual users
    for (const [pattern, contracted] of CONTRACT) {
      if (Math.random() < 0.5) r = r.replace(pattern, contracted);
    }
  }

  // 2. Punctuation style matching
  const puncStyle = detectPunctuationStyle(text);

  // Mirror ellipsis usage
  if (puncStyle.usesEllipsis && Math.random() < 0.25) {
    // Replace a period mid-response with ellipsis
    const dotIdx = r.indexOf(". ");
    if (dotIdx > 10 && dotIdx < r.length - 15) {
      r = r.slice(0, dotIdx) + "... " + r.slice(dotIdx + 2);
    }
  }

  // Mirror dash usage
  if (puncStyle.usesDashes && !r.includes("—") && Math.random() < 0.2) {
    const commaIdx = r.indexOf(", ");
    if (commaIdx > 8 && commaIdx < r.length - 10) {
      r = r.slice(0, commaIdx) + " — " + r.slice(commaIdx + 2);
    }
  }

  // Mirror no-punctuation endings (casual texting style)
  if (puncStyle.noPunctEnd && Math.random() < 0.3) {
    r = r.replace(/[.!]$/, "");
  }

  // 3. Phrase echoing — occasionally use a phrase the user used recently
  if (turn - lastMirrorTurn >= 4 && userPhraseBank.length > 0 && Math.random() < 0.15) {
    // Pick a recent phrase (within last 6 turns)
    const recent = userPhraseBank.filter(p => turn - p.turn <= 6);
    if (recent.length > 0) {
      const echo = pick(recent);
      // Only echo if the phrase isn't already in the response
      if (!r.toLowerCase().includes(echo.phrase.toLowerCase())) {
        const echoTemplates = [
          `Like you said, "${echo.phrase}" —`,
          `And going back to "${echo.phrase}" —`,
          `Your point about "${echo.phrase}" is spot on.`,
        ];
        // Prepend or append based on response structure
        if (r.endsWith("?")) {
          r = pick(echoTemplates) + " " + r;
        } else {
          r = r + " " + pick(echoTemplates);
        }
        lastMirrorTurn = turn;
      }
    }
  }

  // 4. Exclamation density matching
  const userExcl = puncStyle.exclamationDensity;
  if (userExcl < 0.3) {
    // User is calm — reduce exclamations in response
    let replaced = 0;
    r = r.replace(/!/g, () => {
      replaced++;
      return replaced > 1 ? "." : "!"; // keep at most one exclamation
    });
  } else if (userExcl > 1.5 && (r.match(/!/g) || []).length < 1) {
    // User is energetic — add enthusiasm
    r = r.replace(/\.$/, "!");
  }

  return r;
}

/* ── Round 47: Narrative Understanding & Story Acknowledgment ──
 * Detects when users are telling stories/experiences (vs asking questions
 * or making points) and responds to the narrative arc, not just keywords.
 * Extracts story elements: time markers, challenges, outcomes, emotions.
 */

// Narrative signal patterns
const NARRATIVE_SIGNALS = {
  // Time/sequence markers suggest storytelling
  temporal: /\b(yesterday|last (?:week|month|year|night|time)|the other day|this morning|a while ago|back when|one time|once|recently|just (?:now|today)|earlier|finally|eventually|at first|then|after that|so then|and then|next thing I know|before I knew it|ended up|turned out)\b/i,
  // First-person experience markers
  experience: /\b(I (?:was|went|got|had|tried|started|found|realized|noticed|decided|ended up|managed|couldn't|didn't|almost)|my (?:friend|boss|coworker|team|partner|mom|dad|family)|we (?:were|went|had|tried|ended up))\b/i,
  // Challenge/conflict signals
  challenge: /\b(but then|problem was|issue was|couldn't figure|kept failing|was stuck|struggling|broke|crashed|went wrong|messed up|screwed up|disaster|nightmare|chaos|panic|stressed|frustrated|worried|anxious|didn't work|failed|lost)\b/i,
  // Resolution/outcome signals
  resolution: /\b(finally|eventually|turned out|in the end|it worked|fixed it|figured (?:it )?out|solved|got it|managed to|ended up (?:being|working)|worked out|saved|recovered|lesson learned|never again|moral of the story|long story short)\b/i,
  // Emotional peaks
  peak: /\b(couldn't believe|mind was blown|best (?:thing|part|moment)|worst (?:thing|part|moment)|crazy thing is|funniest part|scariest part|most (?:amazing|ridiculous|embarrassing)|insane|wild|unreal|surreal|epic|hilarious|heartbreaking)\b/i,
};

function detectNarrative(text, lower, tokens, sent) {
  let score = 0;
  const elements = {};

  // Check each signal category
  if (NARRATIVE_SIGNALS.temporal.test(lower)) { score += 2; elements.temporal = true; }
  if (NARRATIVE_SIGNALS.experience.test(lower)) { score += 2; elements.experience = true; }
  if (NARRATIVE_SIGNALS.challenge.test(lower)) { score += 1.5; elements.challenge = true; }
  if (NARRATIVE_SIGNALS.resolution.test(lower)) { score += 1.5; elements.resolution = true; }
  if (NARRATIVE_SIGNALS.peak.test(lower)) { score += 2; elements.peak = true; }

  // Length bonus — stories tend to be longer
  if (text.length > 100) score += 1;
  if (text.length > 200) score += 1;

  // Sentence count — stories have multiple sentences
  const sentenceCount = (text.match(/[.!?]+/g) || []).length;
  if (sentenceCount >= 2) score += 1;
  if (sentenceCount >= 4) score += 1;

  // "and then" pattern — classic story connector
  if (/and then|so then|but then/i.test(lower)) score += 1;

  // Need score >= 4 to consider it a narrative
  if (score < 4) return null;

  // Extract story details
  const timeMatch = lower.match(/\b(yesterday|last (?:week|month|year|night|time)|the other day|this morning|a while ago|recently|today|earlier)\b/i);
  elements.when = timeMatch ? timeMatch[0] : null;

  // Detect the emotional trajectory
  const firstHalf = lower.slice(0, Math.floor(lower.length / 2));
  const secondHalf = lower.slice(Math.floor(lower.length / 2));
  const firstSent = sentiment(firstHalf);
  const secondSent = sentiment(secondHalf);

  if (firstSent < 0 && secondSent > 0) elements.arc = "struggle_to_triumph";
  else if (firstSent > 0 && secondSent < 0) elements.arc = "good_to_bad";
  else if (firstSent < -1 && secondSent < -1) elements.arc = "rough_throughout";
  else if (firstSent > 1 && secondSent > 1) elements.arc = "good_throughout";
  else elements.arc = "neutral";

  // Detect if the story has a resolution or is left hanging
  elements.resolved = NARRATIVE_SIGNALS.resolution.test(lower);
  elements.hasConflict = NARRATIVE_SIGNALS.challenge.test(lower);

  // Extract what happened (core action phrases)
  const actionMatch = lower.match(/I (?:was |went |got |had |tried |started |found |realized |noticed |decided |ended up |managed |couldn't |didn't )([\w\s]{3,30}?)(?:[.!?,]|$)/i);
  elements.coreAction = actionMatch ? actionMatch[0].trim().replace(/[.!?,]$/, "") : null;

  return { score, elements, sentenceCount, sentimentOverall: sent };
}

function respondToNarrative(narrative, text, sent) {
  const { elements } = narrative;
  const parts = [];

  // 1. Acknowledge the story-telling itself (shows we're listening)
  if (elements.arc === "struggle_to_triumph") {
    parts.push(pick([
      "Okay wait, I love a good comeback story.",
      "Oh man, this went from rough to redemption.",
      "What a turnaround though!",
      "That's the kind of story where the struggle makes the ending so much better.",
    ]));
  } else if (elements.arc === "good_to_bad") {
    parts.push(pick([
      "Oh no, I felt that shift.",
      "Ugh, it was going so well too.",
      "That's such a gut punch when things turn like that.",
    ]));
  } else if (elements.arc === "rough_throughout") {
    parts.push(pick([
      "Man, that sounds genuinely rough.",
      "That's a lot to deal with, honestly.",
      "I'm sorry you went through that.",
    ]));
  } else if (elements.arc === "good_throughout") {
    parts.push(pick([
      "I love everything about this story.",
      "This is the kind of thing that just makes your day.",
      "What an experience!",
    ]));
  } else if (elements.peak) {
    parts.push(pick([
      "Wait, that's wild.",
      "No way. Seriously?",
      "That's one of those moments you don't forget.",
    ]));
  } else {
    parts.push(pick([
      "Oh wow, that's quite a story.",
      "I can picture that whole thing playing out.",
      "That's the kind of thing you can't make up.",
    ]));
  }

  // 2. Reference the specific core action if detected
  if (elements.coreAction && Math.random() < 0.6) {
    const action = elements.coreAction;
    parts.push(pick([
      `The part where ${action} — that's the key moment right there.`,
      `When ${action}, I bet that changed everything.`,
      `"${action}" — yeah, that's the turning point.`,
    ]));
  }

  // 3. Time-aware acknowledgment
  if (elements.when && Math.random() < 0.4) {
    parts.push(pick([
      `And this was ${elements.when}? That's still fresh.`,
      `${elements.when.charAt(0).toUpperCase() + elements.when.slice(1)} — so this is pretty recent.`,
    ]));
  }

  // 4. Follow-up that advances the narrative
  if (!elements.resolved && elements.hasConflict) {
    // Story is unresolved — ask how it ended
    parts.push(pick([
      "So how did it end up?",
      "Wait — did it work out?",
      "Don't leave me hanging, what happened after that?",
      "And then what? I need the ending!",
    ]));
  } else if (elements.resolved && elements.hasConflict) {
    // Story has resolution — ask about the takeaway
    parts.push(pick([
      "Looking back, would you do anything differently?",
      "Did that change how you approach things now?",
      "Has it happened again since then?",
    ]));
  } else if (elements.arc === "good_throughout") {
    // Positive story — celebrate and probe
    parts.push(pick([
      "What was the absolute best moment?",
      "I bet you're still riding that high. What's next?",
      "Can you top that? Or is that peak experience?",
    ]));
  } else {
    // Neutral/unclear — ask for the emotional core
    parts.push(pick([
      "How did that make you feel in the moment?",
      "What's the thing about it that stuck with you?",
      "Is that something you think about a lot?",
    ]));
  }

  return parts.join(" ");
}

/* ── Conversation Arc Awareness ──
 * Tracks the NARRATIVE of the conversation — not just individual messages,
 * but the progression of topics, mood, and depth. At key moments,
 * the AI makes meta-observations that show it's been following the arc:
 *
 * "You know what's cool? We started with React, then hit state management,
 *  and now you're into Redux — that's the classic developer journey."
 *
 * "I've noticed you keep coming back to design topics — that's clearly
 *  where your passion is."
 *
 * These moments create genuine surprise ("wait, this runs client-side?!")
 * and make the AI feel like a thoughtful conversation partner, not a
 * response-generating machine.
 */

let lastArcTurn = 0;

function detectConversationArc() {
  // Need enough conversation to detect an arc
  if (mem.turn < 8) return null;
  // Don't observe arcs too frequently
  if (mem.turn - lastArcTurn < 8) return null;
  // Only ~15% chance per eligible turn
  if (Math.random() > 0.15) return null;

  const userMsgs = mem.history.filter(h => h.role === "user");
  if (userMsgs.length < 5) return null;

  // ── Arc 1: Topic Journey — track progression of topics discussed ──
  const topicSequence = userMsgs.slice(-8).flatMap(m => m.topics || []).filter(Boolean);
  const uniqueTopics = [...new Set(topicSequence)];

  if (uniqueTopics.length >= 3) {
    // Check if topics are related (form a natural progression)
    const relatedPairs = [];
    for (let i = 0; i < uniqueTopics.length - 1; i++) {
      const a = ASSOC[uniqueTopics[i]];
      if (a?.related?.includes(uniqueTopics[i + 1])) {
        relatedPairs.push([uniqueTopics[i], uniqueTopics[i + 1]]);
      }
    }
    if (relatedPairs.length >= 2) {
      const journey = uniqueTopics.slice(0, 4).join(", then ");
      lastArcTurn = mem.turn;
      return pick([
        `You know what I love about this conversation? We went from ${journey} — there's a really natural flow to how your mind works.`,
        `Can I just say — the way you went from ${journey} is such a cool thought progression. That's how the best ideas connect.`,
        `I notice we've been on this journey: ${journey}. It all connects — I love following your train of thought!`,
      ]);
    }
  }

  // ── Arc 2: Deepening Interest — user keeps returning to one topic ──
  const topicCounts = {};
  for (const t of topicSequence) topicCounts[t] = (topicCounts[t] || 0) + 1;
  const deepTopic = Object.entries(topicCounts).find(([, c]) => c >= 3);
  if (deepTopic) {
    lastArcTurn = mem.turn;
    return pick([
      `I've noticed ${deepTopic[0]} keeps coming up — it's clearly something that really matters to you. I respect that depth.`,
      `We keep circling back to ${deepTopic[0]}, and honestly, I think that's where your real interest lies. What's drawing you to it?`,
      `You know what? ${deepTopic[0]} is clearly your thing. The way you keep exploring it from different angles is really cool.`,
    ]);
  }

  // ── Arc 3: Mood Shift — detect if the conversation mood has changed ──
  const recentSent = userMsgs.slice(-4).map(m => m.sentiment || 0);
  const earlierSent = userMsgs.slice(-8, -4).map(m => m.sentiment || 0);
  if (recentSent.length >= 3 && earlierSent.length >= 3) {
    const recentAvg = recentSent.reduce((s, v) => s + v, 0) / recentSent.length;
    const earlierAvg = earlierSent.reduce((s, v) => s + v, 0) / earlierSent.length;

    if (recentAvg - earlierAvg > 1.5) {
      lastArcTurn = mem.turn;
      return pick([
        "Hey, I'm noticing the vibe has gotten way more positive as we've been chatting — I love that! 😊",
        "Is it just me or has this conversation gotten way more fun as it's gone on? I'm here for it.",
        "I feel like we really hit our stride in this conversation — the energy shift is real! 😄",
      ]);
    }
    if (earlierAvg - recentAvg > 1.5) {
      lastArcTurn = mem.turn;
      return pick([
        "Hey, I'm picking up that the mood shifted a bit — is everything okay? No pressure, just checking in.",
        "I feel like the energy changed a little. Want to talk about something different, or is there something on your mind?",
        "Just want to check in — the vibe shifted a bit. I'm here if you want to talk about anything.",
      ]);
    }
  }

  // ── Arc 4: Engagement Milestone — acknowledge a great conversation ──
  if (mem.turn >= 15 && mem.turn % 10 === 0) {
    const factCount = Object.keys(mem.facts).length;
    const topicCount = Object.keys(mem.topics).length;
    lastArcTurn = mem.turn;

    if (factCount >= 3) {
      const factSamples = [];
      if (mem.userName) factSamples.push(`your name is ${mem.userName}`);
      if (mem.facts.role) factSamples.push(`you're a ${mem.facts.role}`);
      if (mem.facts.project) factSamples.push(`you're building ${mem.facts.project}`);
      const likeKeys = Object.keys(mem.facts).filter(k => k.startsWith("likes_")).slice(0, 2);
      for (const lk of likeKeys) factSamples.push(`you like ${mem.facts[lk]}`);

      if (factSamples.length >= 2) {
        return `Can I just say — I've really enjoyed this conversation. I know that ${factSamples.slice(0, 3).join(", ")}... for a tiny AI, I feel like I'm actually getting to know you! 😊`;
      }
    }

    if (topicCount >= 4) {
      return pick([
        `We've covered a lot of ground today! ${topicCount} different topics and counting. This has been a great conversation 😊`,
        `${mem.turn} messages in and we've explored ${topicCount} topics — I love a wide-ranging conversation like this!`,
        `Not gonna lie, this is one of the more interesting conversations I've had. ${topicCount} topics deep and still going! 😄`,
      ]);
    }
  }

  // ── Arc 5: Knowledge Growth — user is learning about something ──
  if (mem.turn > 10) {
    // Check if user asked multiple questions about the same domain
    const questionMsgs = userMsgs.filter(m => m.intents?.length > 0);
    const domainQuestions = {};
    for (const qm of questionMsgs) {
      for (const topic of (qm.topics || [])) {
        domainQuestions[topic] = (domainQuestions[topic] || 0) + 1;
      }
    }
    const deepDomain = Object.entries(domainQuestions).find(([, c]) => c >= 3);
    if (deepDomain) {
      lastArcTurn = mem.turn;
      return pick([
        `You've asked some really thoughtful questions about ${deepDomain[0]}. I can tell you're really digging into it — that curiosity is awesome.`,
        `I love how you keep going deeper on ${deepDomain[0]}. That's how real understanding develops — one good question at a time.`,
      ]);
    }
  }

  return null;
}

// Wire arc observations into the response pipeline as rare "wow" moments
function tryArcObservation(response) {
  const arc = detectConversationArc();
  if (!arc) return response;

  // Arc observations replace the response entirely if they fire
  // (they're already rare, so when they hit, they should be the main event)
  return arc;
}

/* ── Conversational Hooks & Open Loops (Round 52) ──
 * Creates forward pull — the feeling that makes you want to keep talking.
 * Real conversationalists drop unfinished thoughts, hint at related knowledge,
 * create curiosity gaps, and promise to circle back. This system:
 * 1. Open loops: start a thought, defer the payoff ("oh, that reminds me of something wild...")
 * 2. Curiosity hooks: hint at interesting related knowledge without giving it all away
 * 3. Deferred promises: track when we promise to come back to something, then deliver
 * 4. Strategic incompleteness: sometimes leave room for the user to ask more
 */

// Track open loops we've created and need to close
let openLoops = [];        // [{ topic, hook, turn, closed }]
let lastHookTurn = 0;
let lastLoopCloseTurn = 0;

// Curiosity hook templates — these tease knowledge without dumping it
const CURIOSITY_HOOKS = {
  factTease: [
    "There's actually a wild story behind that.",
    "Oh — there's a fascinating reason why that works the way it does.",
    "There's a really interesting history behind that, actually.",
    "Fun fact territory here — but I'll save it unless you're curious.",
  ],
  connectionTease: [
    "That connects to something completely unexpected, actually.",
    "This is weirdly related to {related} in a way most people don't realize.",
    "There's a link between this and {related} that I find really interesting.",
  ],
  opinionTease: [
    "I have a kind of controversial take on this, actually.",
    "I might get pushback for this, but I have thoughts.",
    "This is one of those topics where I have a surprisingly strong opinion.",
  ],
  depthTease: [
    "There's a lot more to unpack there if you're into it.",
    "We're just scratching the surface on this one.",
    "Oh, this goes deep — how far down the rabbit hole do you want to go?",
  ],
};

// Open loop templates — start a thought that creates pull
const OPEN_LOOP_TEMPLATES = [
  { hook: "Oh wait, {topic} actually reminds me of something — but first, {response}", closers: [
    "So, about that thing {topic} reminded me of — ",
    "Oh right, I was going to tell you — {topic} connects to ",
  ]},
  { hook: "There's a really good analogy for this... actually, let me think about how to phrase it.", closers: [
    "Okay, I thought of the analogy — ",
    "So the way I'd put it is — ",
  ]},
  { hook: "I started to say something about {topic} but got sidetracked — remind me to come back to that.", closers: [
    "Oh! You know what I never came back to? That {topic} thing — ",
    "Wait, I promised I'd circle back on {topic} — ",
  ]},
];

// Create a curiosity hook based on available knowledge
function createCuriosityHook(response, topics) {
  if (mem.turn - lastHookTurn < 6 || mem.turn < 4) return response;
  if (Math.random() > 0.18) return response;

  // Find a topic we know something about
  const knownTopic = topics.find(t => ASSOC[t]);
  if (!knownTopic) return response;
  const assoc = ASSOC[knownTopic];

  // Pick a hook type based on what we have
  let hookType, templates;
  if (assoc.facts && assoc.facts.length > 0 && Math.random() > 0.5) {
    hookType = "factTease";
    templates = CURIOSITY_HOOKS.factTease;
  } else if (assoc.related && assoc.related.length > 0 && Math.random() > 0.4) {
    hookType = "connectionTease";
    templates = CURIOSITY_HOOKS.connectionTease;
  } else if (assoc.opinions && assoc.opinions.length > 0 && Math.random() > 0.5) {
    hookType = "opinionTease";
    templates = CURIOSITY_HOOKS.opinionTease;
  } else {
    hookType = "depthTease";
    templates = CURIOSITY_HOOKS.depthTease;
  }

  let hook = templates[Math.floor(Math.random() * templates.length)];

  // Fill in {related} if present
  if (hook.includes("{related}") && assoc.related) {
    const rel = assoc.related[Math.floor(Math.random() * assoc.related.length)];
    hook = hook.replace("{related}", rel);
  }

  // Append hook to response — don't interrupt, add after
  const sentences = response.match(/[^.!?]+[.!?]+/g) || [response];
  if (sentences.length >= 2) {
    // Insert after first sentence for natural flow
    lastHookTurn = mem.turn;
    return sentences[0].trim() + " " + hook + " " + sentences.slice(1).join(" ").trim();
  }

  lastHookTurn = mem.turn;
  return response + " " + hook;
}

// Create an open loop — start a thought we'll close later
function createOpenLoop(response, topics) {
  if (mem.turn - lastHookTurn < 5 || mem.turn < 6) return response;
  if (openLoops.filter(l => !l.closed).length >= 2) return response; // max 2 open at once
  if (Math.random() > 0.12) return response;

  const knownTopic = topics.find(t => ASSOC[t]) || topics[0];
  if (!knownTopic) return response;

  const tmpl = OPEN_LOOP_TEMPLATES[Math.floor(Math.random() * OPEN_LOOP_TEMPLATES.length)];
  const hook = tmpl.hook.replace(/\{topic\}/g, knownTopic).replace("{response}", "");

  openLoops.push({
    topic: knownTopic,
    closers: tmpl.closers,
    turn: mem.turn,
    closed: false,
  });

  // Keep max 4 tracked loops
  if (openLoops.length > 4) openLoops = openLoops.slice(-4);

  lastHookTurn = mem.turn;
  return response + " " + hook;
}

// Close a previously opened loop — deliver on the promise
function closeOpenLoop(response, topics) {
  if (mem.turn - lastLoopCloseTurn < 4) return response;

  const pendingLoops = openLoops.filter(l => !l.closed && (mem.turn - l.turn) >= 2 && (mem.turn - l.turn) <= 8);
  if (pendingLoops.length === 0) return response;

  // Close the oldest pending loop if topics overlap or randomly
  const loop = pendingLoops.find(l => topics.includes(l.topic)) || (Math.random() > 0.5 ? pendingLoops[0] : null);
  if (!loop) return response;

  const closer = loop.closers[Math.floor(Math.random() * loop.closers.length)]
    .replace(/\{topic\}/g, loop.topic);

  // Get a nugget to deliver as the payoff
  const assoc = ASSOC[loop.topic];
  let payoff = "";
  if (assoc) {
    if (assoc.facts && assoc.facts.length > 0) {
      payoff = assoc.facts[Math.floor(Math.random() * assoc.facts.length)].toLowerCase();
    } else if (assoc.opinions && assoc.opinions.length > 0) {
      payoff = assoc.opinions[Math.floor(Math.random() * assoc.opinions.length)];
    }
  }

  loop.closed = true;
  lastLoopCloseTurn = mem.turn;

  if (payoff) {
    return closer + payoff + ". " + response;
  }
  return response;
}

// Strategic incompleteness — sometimes don't give the full answer
function addStrategicIncompleteness(response, topics, inputEnergy) {
  // Only on engaged, high-energy conversations where user wants to dig in
  if (inputEnergy < 0.4 || mem.turn < 5) return response;
  if (Math.random() > 0.14) return response;

  const knownTopic = topics.find(t => ASSOC[t]);
  if (!knownTopic) return response;
  const assoc = ASSOC[knownTopic];
  if (!assoc.hooks || assoc.hooks.length === 0) return response;

  // Trim the response slightly and add a pull-forward hook
  const sentences = response.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length < 2) return response;

  // Keep most of the response but add an inviting closer instead of the last sentence
  const trimmed = sentences.slice(0, -1).join(" ").trim();
  const followUp = assoc.hooks[Math.floor(Math.random() * assoc.hooks.length)];

  // Only if the follow-up is a question (creates forward pull)
  if (!followUp.includes("?")) return response;

  return trimmed + " " + followUp;
}

// Main hook orchestrator — runs all sub-systems
function addConversationalHooks(response, topics, inputEnergy) {
  // Don't add hooks during emotional moments or when user is disengaged
  const sent = mem.avgSent();
  if (sent < -1.5) return response;

  // Try to close an open loop first (delivering on promises takes priority)
  const closed = closeOpenLoop(response, topics);
  if (closed !== response) return closed;

  // Then try creating new hooks (only one per turn)
  const hooked = createCuriosityHook(response, topics);
  if (hooked !== response) return hooked;

  const looped = createOpenLoop(response, topics);
  if (looped !== response) return looped;

  return addStrategicIncompleteness(response, topics, inputEnergy);
}

/* ── Emotional Trajectory Awareness (Round 53) ──
 * Tracks sentiment over time as a trajectory, detecting mood shifts
 * (improving, declining, volatile, stable) and responding to the
 * *direction* of change, not just the current state.
 * When someone warms up: celebrate the shift. When they decline: intervene.
 * When they suddenly pivot: acknowledge the whiplash. When stable: stay calibrated.
 */

let emotionalTrajectory = [];   // [{ sent, emotion, turn }]
let lastTrajectoryTurn = 0;
let lastTrajectoryType = "";

function trackEmotionalTrajectory(sent, emotion) {
  emotionalTrajectory.push({ sent, emotion, turn: mem.turn });
  if (emotionalTrajectory.length > 12) emotionalTrajectory.shift();
}

function analyzeTrajectory() {
  if (emotionalTrajectory.length < 3) return null;

  const recent = emotionalTrajectory.slice(-5);
  const sentiments = recent.map(e => e.sent);

  // Compute slope: positive = improving, negative = declining
  const n = sentiments.length;
  const xMean = (n - 1) / 2;
  const yMean = sentiments.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (sentiments[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  const slope = den !== 0 ? num / den : 0;

  // Compute volatility: standard deviation of sentiment changes
  const diffs = [];
  for (let i = 1; i < sentiments.length; i++) {
    diffs.push(Math.abs(sentiments[i] - sentiments[i - 1]));
  }
  const avgDiff = diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;

  // Detect sudden shift: last turn vs previous average
  const lastSent = sentiments[sentiments.length - 1];
  const prevAvg = sentiments.slice(0, -1).reduce((a, b) => a + b, 0) / (sentiments.length - 1);
  const suddenShift = Math.abs(lastSent - prevAvg) > 2;

  // Classify trajectory
  if (suddenShift) {
    return { type: lastSent > prevAvg ? "sudden_uplift" : "sudden_drop", slope, volatility: avgDiff, lastSent, prevAvg };
  }
  if (avgDiff > 1.8) return { type: "volatile", slope, volatility: avgDiff, lastSent, prevAvg };
  if (slope > 0.4) return { type: "warming", slope, volatility: avgDiff, lastSent, prevAvg };
  if (slope < -0.4) return { type: "cooling", slope, volatility: avgDiff, lastSent, prevAvg };
  return { type: "stable", slope, volatility: avgDiff, lastSent, prevAvg };
}

function applyTrajectoryAwareness(response, sent) {
  if (mem.turn - lastTrajectoryTurn < 5 || mem.turn < 5) return response;

  const traj = analyzeTrajectory();
  if (!traj || traj.type === "stable") return response;

  // Don't repeat the same trajectory observation type consecutively
  if (traj.type === lastTrajectoryType) return response;

  // Probability gate: trajectory comments are rare and meaningful
  if (Math.random() > 0.25) return response;

  let prefix = "";

  switch (traj.type) {
    case "warming": {
      const warmers = [
        "I'm really enjoying where this conversation is going.",
        "You know, this chat has gotten progressively better.",
        "I can tell you're getting into this — and honestly, so am I.",
        "The energy here is shifting and I'm here for it.",
      ];
      prefix = warmers[Math.floor(Math.random() * warmers.length)] + " ";
      break;
    }
    case "cooling": {
      const coolers = [
        "I feel like I might be losing you a bit — ",
        "Am I reading this right that the vibe's shifted? ",
        "Let me recalibrate — I want to be actually helpful here. ",
        "I sense this isn't landing the way I want it to. ",
      ];
      prefix = coolers[Math.floor(Math.random() * coolers.length)];
      break;
    }
    case "sudden_uplift": {
      const uplifts = [
        "Oh — love that energy shift! ",
        "Now *that's* the vibe. ",
        "Whoa, your energy just spiked and I'm matching it — ",
      ];
      prefix = uplifts[Math.floor(Math.random() * uplifts.length)];
      break;
    }
    case "sudden_drop": {
      const drops = [
        "Hey, I just noticed a shift — everything okay? ",
        "Wait, something changed — did I say something off? ",
        "I want to pause and check in — that felt like a turn. ",
      ];
      prefix = drops[Math.floor(Math.random() * drops.length)];
      break;
    }
    case "volatile": {
      const vols = [
        "This conversation's had quite the emotional range — I'm keeping up, don't worry. ",
        "We've been all over the emotional map and I kind of love it. ",
        "You're keeping me on my toes here — the energy keeps shifting. ",
      ];
      prefix = vols[Math.floor(Math.random() * vols.length)];
      break;
    }
  }

  if (prefix) {
    lastTrajectoryTurn = mem.turn;
    lastTrajectoryType = traj.type;
    return prefix + response;
  }

  return response;
}

/* ── Conversational Pacing Intelligence (Round 54) ──
 * Tracks inter-message timing to understand the user's texting rhythm.
 * Rapid bursts → match with snappy, short energy. Long pauses → acknowledge
 * the gap warmly. Gradual slowdown → don't over-respond. Accelerating →
 * ride the wave. Also adjusts typing simulation to match the cadence.
 */

let messageTimings = [];     // [{ gap: ms, len: wordCount, turn }]
let lastPacingTurn = 0;
let currentPaceMode = "normal";  // "rapid", "thoughtful", "normal", "returning"

function trackMessagePacing(text) {
  const now = Date.now();
  const gap = now - lastMessageTime; // uses existing lastMessageTime
  const len = text.split(/\s+/).length;
  messageTimings.push({ gap, len, turn: mem.turn, ts: now });
  if (messageTimings.length > 10) messageTimings.shift();

  // Classify current pace mode
  const recent = messageTimings.slice(-3);
  const avgGap = recent.reduce((a, t) => a + t.gap, 0) / recent.length;

  if (avgGap < 3000 && recent.length >= 2) {
    currentPaceMode = "rapid";          // <3s between messages = texting fast
  } else if (gap > 120000) {
    currentPaceMode = "returning";      // >2min gap = they went away and came back
  } else if (avgGap > 30000) {
    currentPaceMode = "thoughtful";     // >30s average = deliberate, thoughtful
  } else {
    currentPaceMode = "normal";
  }
}

// Detect pace shifts: were they fast and now slow? Or slow and now fast?
function detectPaceShift() {
  if (messageTimings.length < 4) return null;
  const older = messageTimings.slice(-4, -2);
  const newer = messageTimings.slice(-2);
  const oldAvg = older.reduce((a, t) => a + t.gap, 0) / older.length;
  const newAvg = newer.reduce((a, t) => a + t.gap, 0) / newer.length;

  if (oldAvg < 5000 && newAvg > 20000) return "decelerating";  // was rapid, now slow
  if (oldAvg > 20000 && newAvg < 5000) return "accelerating";  // was slow, now rapid
  return null;
}

// Adapt response for current pacing context
function applyPacingAwareness(response, text) {
  if (mem.turn - lastPacingTurn < 6 || mem.turn < 3) return response;

  const shift = detectPaceShift();

  // Returning after a long absence (>2 min)
  if (currentPaceMode === "returning" && messageTimings.length >= 2) {
    const gap = messageTimings[messageTimings.length - 1].gap;
    if (gap > 300000 && Math.random() > 0.4) { // >5 min
      const returns = [
        "Welcome back! I was just here, thinking. ",
        "Oh hey — you're back! ",
        "There you are! ",
      ];
      lastPacingTurn = mem.turn;
      return returns[Math.floor(Math.random() * returns.length)] + response;
    }
    if (Math.random() > 0.5) {
      const softReturns = [
        "Hey again! ",
        "Back at it — ",
      ];
      lastPacingTurn = mem.turn;
      return softReturns[Math.floor(Math.random() * softReturns.length)] + response;
    }
  }

  // Rapid fire mode — keep it short and punchy, trim response
  if (currentPaceMode === "rapid" && Math.random() > 0.6) {
    const sentences = response.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 2) {
      // Trim to 1-2 sentences for rapid exchange
      lastPacingTurn = mem.turn;
      return sentences.slice(0, 2).join(" ").trim();
    }
  }

  // Pace shift: was fast, now slow → they're thinking
  if (shift === "decelerating" && Math.random() > 0.5) {
    const decel = [
      "I notice you're taking your time here — that's a good sign. ",
      "Taking a moment to think — I respect that. ",
    ];
    lastPacingTurn = mem.turn;
    return decel[Math.floor(Math.random() * decel.length)] + response;
  }

  // Pace shift: was slow, now fast → they got excited
  if (shift === "accelerating" && Math.random() > 0.5) {
    const accel = [
      "Oh, the pace just picked up — I'm here for it! ",
      "Love the energy shift! ",
    ];
    lastPacingTurn = mem.turn;
    return accel[Math.floor(Math.random() * accel.length)] + response;
  }

  return response;
}

// Adjust typing speed based on pace mode
function adjustTypingForPace(typingMs) {
  if (currentPaceMode === "rapid") {
    return Math.max(300, typingMs * 0.5);  // Much faster typing in rapid mode
  }
  if (currentPaceMode === "thoughtful") {
    return typingMs * 1.15;  // Slightly slower, more deliberate
  }
  return typingMs;
}

/* ── Retroactive Insight & Dot Connection (Round 55) ──
 * Tracks topic co-occurrences across the conversation. When the user brings
 * up something that retroactively connects two previously separate threads,
 * the AI has an "aha moment" — naturally calling out the connection.
 * Also detects when the user's stance has evolved (said X about topic A
 * early on, now says Y) and notes the growth.
 */

let topicPairHistory = {};   // "topicA|topicB" → { firstTurn, count }
let lastInsightTurn = 0;

function trackTopicPairs(topics) {
  if (topics.length < 1) return;
  // Record pairs
  for (let i = 0; i < topics.length; i++) {
    for (let j = i + 1; j < topics.length; j++) {
      const key = [topics[i], topics[j]].sort().join("|");
      if (!topicPairHistory[key]) {
        topicPairHistory[key] = { firstTurn: mem.turn, count: 0 };
      }
      topicPairHistory[key].count++;
    }
  }
}

function detectRetroactiveInsight(currentTopics) {
  if (mem.turn - lastInsightTurn < 8 || mem.turn < 7) return null;
  if (currentTopics.length < 1) return null;

  // Check if current topic connects to two previously separate topics
  const userHistory = mem.history.filter(h => h.role === "user");
  if (userHistory.length < 4) return null;

  // Gather all topics from earlier messages (excluding last 2)
  const olderTopics = new Set();
  userHistory.slice(0, -2).forEach(h => (h.topics || []).forEach(t => olderTopics.add(t)));

  // Find a current topic that appeared in an older context with a different companion topic
  for (const ct of currentTopics) {
    if (!olderTopics.has(ct)) continue;

    // Find what topics this was paired with before vs now
    const oldPairs = [];
    userHistory.slice(0, -2).forEach(h => {
      if ((h.topics || []).includes(ct)) {
        (h.topics || []).filter(t => t !== ct).forEach(t => oldPairs.push(t));
      }
    });

    const newPairs = currentTopics.filter(t => t !== ct);

    // If a new pairing exists that didn't exist before — that's a connection
    for (const np of newPairs) {
      if (oldPairs.length > 0 && !oldPairs.includes(np)) {
        const oldCompanion = oldPairs[0];
        return {
          bridge: ct,
          from: oldCompanion,
          to: np,
          type: "new_connection"
        };
      }
    }
  }

  // Check for recurring topic pair (discussed together 3+ times = pattern)
  for (const [key, val] of Object.entries(topicPairHistory)) {
    if (val.count >= 3 && mem.turn - val.firstTurn >= 5) {
      const [a, b] = key.split("|");
      if (currentTopics.includes(a) || currentTopics.includes(b)) {
        return { bridge: null, from: a, to: b, type: "recurring_theme" };
      }
    }
  }

  return null;
}

function applyRetroactiveInsight(response, currentTopics) {
  if (Math.random() > 0.22) return response;

  const insight = detectRetroactiveInsight(currentTopics);
  if (!insight) return response;

  lastInsightTurn = mem.turn;
  let prefix = "";

  if (insight.type === "new_connection") {
    const connections = [
      `Oh wait — you know what I just realized? The ${insight.bridge} thing connects what you were saying about ${insight.from} to ${insight.to}. That's actually a really interesting thread.`,
      `Hold on — I'm connecting dots here. Earlier you were talking about ${insight.from}, and now ${insight.to} — ${insight.bridge} is the common thread. That's not obvious but it makes total sense.`,
      `Okay, this is cool — ${insight.bridge} just bridged two things you've been thinking about separately: ${insight.from} and ${insight.to}. I love when conversations do that.`,
    ];
    prefix = connections[Math.floor(Math.random() * connections.length)] + " ";
  } else if (insight.type === "recurring_theme") {
    const recurrings = [
      `You know, ${insight.from} and ${insight.to} keep coming up together. I think there's a pattern in how you think about these — they're clearly connected in your mind.`,
      `I've noticed ${insight.from} and ${insight.to} are sort of a package deal for you. There's a mental model there that I find interesting.`,
    ];
    prefix = recurrings[Math.floor(Math.random() * recurrings.length)] + " ";
  }

  return prefix ? prefix + response : response;
}

/* ── Shared Understanding & Collaborative Reasoning (Round 56) ──
 * Tracks points of agreement/alignment between user and AI, building a
 * "common ground" that makes the conversation feel cumulative rather than
 * turn-by-turn. When the user agrees, the AI doesn't just say "great!" —
 * it builds on the shared understanding. Periodically synthesizes what
 * "we" have established together, creating a sense of collaborative thinking.
 */

let sharedGround = [];       // [{ point, topic, turn }] — things we agree on
let lastSynthesisTurn = 0;

function trackSharedGround(text, parsed) {
  if (parsed.act !== "agreement" && !/\b(exactly|true|good point|i agree|same|right|fair|makes sense)\b/i.test(text)) return;

  // What did we agree about? Look at the AI's last message
  const lastAI = mem.lastAI();
  if (!lastAI) return;

  // Extract the core claim/point from the AI's last response (first meaningful sentence)
  const aiSentences = lastAI.text.match(/[^.!?]+[.!?]+/g) || [lastAI.text];
  // Skip greetings/fillers, take the substantive sentence
  const substantive = aiSentences.find(s => s.length > 20 && !/^(oh|hey|hmm|well|so|yeah|awesome|cool|great|nice)/i.test(s.trim()));
  if (!substantive) return;

  // Trim to a compact point
  let point = substantive.trim();
  if (point.length > 80) point = point.slice(0, 77) + "...";

  const topics = lastAI.topics || mem.recentTopics(1);
  sharedGround.push({ point, topic: topics[0] || "general", turn: mem.turn });

  // Keep max 6 shared points
  if (sharedGround.length > 6) sharedGround.shift();
}

// Synthesize shared understanding — "here's what we've built together"
function trySynthesis(response) {
  if (mem.turn - lastSynthesisTurn < 10 || mem.turn < 10) return response;
  if (sharedGround.length < 2) return response;
  if (Math.random() > 0.2) return response;

  // Find two shared points to weave together
  const recent = sharedGround.slice(-3);
  if (recent.length < 2) return response;

  const a = recent[recent.length - 2];
  const b = recent[recent.length - 1];

  // Only synthesize if the points are from different topics (cross-pollination)
  // or if they're from the same topic (deepening)
  let prefix;
  if (a.topic !== b.topic) {
    const crossSynths = [
      `You know what's interesting? We've been building toward something — between ${a.topic} and ${b.topic}, there's a through-line in how you think about things.`,
      `I'm starting to see a pattern in our conversation — your take on ${a.topic} and ${b.topic} share the same underlying logic.`,
      `Something cool is happening here — our ${a.topic} and ${b.topic} threads are converging.`,
    ];
    prefix = crossSynths[Math.floor(Math.random() * crossSynths.length)];
  } else {
    const deepSynths = [
      `We've been steadily building our understanding of ${a.topic} together — I feel like we're getting somewhere real.`,
      `I like where this ${a.topic} discussion is going. We've established some solid common ground.`,
      `We're really deepening on ${a.topic} here — each point builds on the last.`,
    ];
    prefix = deepSynths[Math.floor(Math.random() * deepSynths.length)];
  }

  lastSynthesisTurn = mem.turn;
  return prefix + " " + response;
}

// Enhanced agreement response that builds on shared ground
function buildOnAgreement(response, text) {
  // Only enhance when there's actual shared ground to reference
  if (sharedGround.length < 1) return response;

  const lastPoint = sharedGround[sharedGround.length - 1];
  if (!lastPoint || mem.turn - lastPoint.turn > 3) return response;

  // Only sometimes — don't overdo it
  if (Math.random() > 0.35) return response;

  const builders = [
    `And building on that — `,
    `Since we're aligned on that — `,
    `With that as a foundation — `,
    `Okay so if that's true, then — `,
  ];

  const builder = builders[Math.floor(Math.random() * builders.length)];

  // Prepend the builder to create continuity
  const sentences = response.match(/[^.!?]+[.!?]+/g) || [response];
  if (sentences.length >= 2) {
    return builder + sentences.slice(1).join(" ").trim();
  }
  return builder + response;
}

/* ── Spontaneous Micro-Gifts (Round 57) ──
 * Small, unexpected conversational treats that create delight:
 * 1. Thought bubbles: "Oh wait, I just thought of something —"
 * 2. Mini-challenges: quick questions that engage the user playfully
 * 3. Appreciation sparks: specific, genuine praise for something the user said
 * 4. Knowledge nuggets: contextually relevant "did you know" moments
 * These fire rarely (≤10% combined) but when they do, they feel special.
 */

let lastGiftTurn = 0;
let giftHistory = [];  // track types to avoid repetition

function addSpontaneousGift(response, topics, text) {
  if (mem.turn - lastGiftTurn < 8 || mem.turn < 6) return response;
  if (Math.random() > 0.12) return response;

  // Don't gift during negative/heavy moments
  if (mem.avgSent() < -0.5) return response;

  // Pick a gift type we haven't used recently
  const types = ["thought_bubble", "mini_challenge", "appreciation_spark", "knowledge_nugget"];
  const available = types.filter(t => !giftHistory.slice(-2).includes(t));
  const giftType = available[Math.floor(Math.random() * available.length)] || types[0];

  let gift = null;

  switch (giftType) {
    case "thought_bubble": {
      // "Wait, I just thought of something" — connects current topic to something unexpected
      const topic = topics[0];
      const assoc = topic && typeof ASSOC !== "undefined" ? ASSOC[topic] : null;
      if (assoc && assoc.related && assoc.related.length > 0) {
        const related = assoc.related[Math.floor(Math.random() * assoc.related.length)];
        const starters = [
          `Oh wait — random thought: have you ever noticed how ${topic} and ${related} are kind of the same problem from different angles?`,
          `Hm, this is going to sound random, but ${topic} just made me think of ${related} and now I can't un-see the connection.`,
          `Okay tangent alert — but ${topic} and ${related} have this really interesting overlap that most people miss.`,
        ];
        gift = starters[Math.floor(Math.random() * starters.length)];
      }
      break;
    }
    case "mini_challenge": {
      // Quick, playful engagement
      const challenges = [
        "Quick challenge: explain what you're working on right now in exactly five words. Go!",
        "Pop quiz — what's one thing you believed about this topic a year ago that you've since changed your mind on?",
        "Okay speed round: if you had to teach someone one thing about this in 30 seconds, what would it be?",
        "Fun question: if this topic were a movie genre, what would it be and why?",
      ];
      gift = challenges[Math.floor(Math.random() * challenges.length)];
      break;
    }
    case "appreciation_spark": {
      // Specific, genuine praise for something the user said/did
      const words = text.split(/\s+/).length;
      const sparks = words > 15
        ? [
            "Actually — pause. The way you just articulated that was really clear. That's not easy to do.",
            "I want to flag something: you just explained a complex thing in a really accessible way. That's a skill.",
            "Side note: your ability to think through this out loud is genuinely impressive.",
          ]
        : [
            "You know what I appreciate? You're concise. Most people over-explain. You don't.",
            "The fact that you can get to the point that quickly tells me you understand this well.",
          ];
      gift = sparks[Math.floor(Math.random() * sparks.length)];
      break;
    }
    case "knowledge_nugget": {
      // Contextual "did you know" from ASSOC facts
      const topic = topics[0];
      const assoc = topic && typeof ASSOC !== "undefined" ? ASSOC[topic] : null;
      if (assoc && assoc.facts && assoc.facts.length > 0) {
        const fact = assoc.facts[Math.floor(Math.random() * assoc.facts.length)];
        const intros = [
          `Oh — random ${topic} fact that I think you'd find interesting: ${fact}.`,
          `Completely tangential, but this is too good not to share: ${fact}.`,
          `You made me think of this: ${fact}. Wild, right?`,
        ];
        gift = intros[Math.floor(Math.random() * intros.length)];
      }
      break;
    }
  }

  if (!gift) return response;

  lastGiftTurn = mem.turn;
  giftHistory.push(giftType);
  if (giftHistory.length > 6) giftHistory.shift();

  // Append gift after response (it's a bonus, not a replacement)
  return response + " " + gift;
}

/* ── Output Polish & Deduplication (Round 58) ──
 * Final-pass cleanup that catches artifacts from 30+ pipeline stages stacking.
 * Runs just before output to ensure the response reads naturally regardless
 * of which combination of post-processors fired.
 */

function polishOutput(response) {
  let r = response;

  // 1. Remove duplicate sentence openings (pipeline stages can prepend similar phrases)
  const sentences = r.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length >= 2) {
    const cleaned = [sentences[0]];
    for (let i = 1; i < sentences.length; i++) {
      const prevStart = cleaned[cleaned.length - 1].trim().split(/\s+/).slice(0, 3).join(" ").toLowerCase();
      const currStart = sentences[i].trim().split(/\s+/).slice(0, 3).join(" ").toLowerCase();
      // Skip if sentence starts with same 3 words as previous
      if (currStart !== prevStart) {
        cleaned.push(sentences[i]);
      }
    }
    r = cleaned.join(" ").trim();
  }

  // 2. Remove orphaned connectors at the start (from pipeline prefix stacking)
  r = r.replace(/^(And |But |So |Also |Plus |Oh and )(and |but |so |also )/i, (_, a) => a);

  // 3. Fix double spaces, double periods, space before punctuation
  r = r.replace(/\s{2,}/g, " ");
  r = r.replace(/\.{2}(?!\.)/g, ".");
  r = r.replace(/\s+([.!?,])/g, "$1");
  r = r.replace(/([.!?])\1+/g, "$1");

  // 4. Remove trailing orphaned dashes or connectors
  r = r.replace(/\s*[—–-]\s*$/, ".");
  r = r.replace(/\s*(?:but|and|so|plus|also|actually)\s*$/i, ".");

  // 5. Cap excessive exclamation (pipeline enthusiasm stacking)
  let excCount = (r.match(/!/g) || []).length;
  if (excCount > 2) {
    let kept = 0;
    r = r.replace(/!/g, () => ++kept <= 2 ? "!" : ".");
  }

  // 6. Remove redundant "by the way" / "actually" / "oh" stacking
  const fillers = ["actually", "by the way", "honestly", "you know what", "I mean"];
  for (const filler of fillers) {
    const rx = new RegExp(filler, "gi");
    const matches = r.match(rx);
    if (matches && matches.length > 1) {
      let count = 0;
      r = r.replace(rx, (m) => ++count === 1 ? m : "");
    }
  }

  // 7. If response starts with multiple prefixed observations, keep only the first
  // (catches: "Oh wait — X. I notice Y. Also Z. [actual response]")
  const prefixPatterns = /^(?:Oh wait|Hold on|I notice|I just realized|Hmm)[^.!?]*[.!?]\s*/;
  let prefixCount = 0;
  while (prefixPatterns.test(r) && prefixCount < 1) {
    prefixCount++;
    if (prefixCount > 1) {
      r = r.replace(prefixPatterns, "");
    } else {
      break;
    }
  }

  return r.trim();
}

/* ── Public API ── */

export function getAIResponse(input) {
  const text = input.trim();
  if (!text) return { text: "I'm listening... 👂", typingMs: 400, pause: null };

  // ═══ Adaptive strategy: score how user reacted to our last response ═══
  scoreLastStrategy(text);

  // ═══ Conversational pacing: track inter-message timing ═══
  trackMessagePacing(text);

  // Parse for personality application
  const parsed = parseSentence(text);
  const sent = sentiment(text);
  const emo = detectEmotion(text, sent, parsed);

  // ═══ Emotional trajectory tracking: record sentiment curve ═══
  trackEmotionalTrajectory(sent, emo?.type || "neutral");

  // ═══ Shared understanding: track points of agreement ═══
  trackSharedGround(text, parsed);

  // ═══ Subtext detection: read between the lines ═══
  const subtext = detectSubtext(text, sent);
  trackSubtext(subtext);

  // ═══ Plan response intent BEFORE generating (now subtext-aware) ═══
  const plan = planResponseIntent(text, parsed, sent, emo, subtext);

  // ═══ Subtext override: if strong subtext detected, respond to meaning not words ═══
  // Only fires when subtext is high-confidence (strong pattern match + not congruent)
  if (subtext.hasSubtext && subtext.primary && Math.abs(subtext.primary.valence) >= 0.4) {
    const subtextResp = getSubtextResponse(subtext);
    if (subtextResp && Math.random() > 0.3) {
      // ~70% chance to respond to subtext for strong signals
      mem.add("user", text, [], [], sent);
      mem.add("ai", subtextResp);
      trackAIQuestion(subtextResp);
      lastDiscourseMove = plan.flavor;
      const typingMs = calcTypingMs(subtextResp, sent, parsed);
      return { text: subtextResp, typingMs, pause: calcTypingPause(typingMs) };
    }
  }

  // ═══ Conversation repair: detect confusion BEFORE generating response ═══
  const confusion = detectConfusion(text);
  if (confusion) {
    const repair = repairConfusion(confusion);
    if (repair) {
      mem.add("user", text, [], [], sent);
      mem.add("ai", repair);
      trackAIQuestion(repair);
      lastDiscourseMove = "curious";
      const typingMs = calcTypingMs(repair, sent, parsed);
      return { text: repair, typingMs, pause: calcTypingPause(typingMs) };
    }
  }

  // Generate core response
  let response = generateResponse(text);

  // ═══ Conversation repair: ambiguity handling ═══
  const intents = classify(text);
  const currentTopics = extractTopics(tokenize(text));
  const ambiguous = handleAmbiguity(text, intents.filter(i=>!i.modifier), currentTopics);
  if (ambiguous && Math.random() > 0.6) {
    response = ambiguous;
  }

  // ═══ Conversation repair: repetition guard ═══
  const repeated = detectRepetition(response);
  if (repeated) {
    response = repairRepetition(response, repeated);
  }

  // ═══ Conversation repair: graceful degradation ═══
  if (/^(that's interesting|hmm.*tell me more|cool.*what else)/i.test(response) && mem.turn > 3) {
    const { keywords } = extractKW(text);
    const degraded = gracefulDegradation(text, keywords);
    if (degraded) response = degraded;
  }

  // Apply conversational rhythm
  const targetMove = pickNextMove();
  response = shapeToRhythm(response, targetMove);
  recordMove(response);

  // Try proactive callbacks
  response = tryProactiveCallback(response, currentTopics);

  // ═══ Semantic memory: infer connections between current topic and stored facts ═══
  const { keywords: semKW } = extractKW(text);
  response = applySemanticConnection(response, currentTopics, semKW);

  // Apply personality layer
  response = applyPersonality(response, sent, parsed);

  // ═══ Emotional trajectory: respond to mood direction, not just current state ═══
  response = applyTrajectoryAwareness(response, sent);

  // ═══ Temporal awareness: time-of-day flavor + pace observation ═══
  const pacePrefix = paceObservation();
  if (pacePrefix) response = pacePrefix + response;
  response = addTimeFlavor(response);

  // ═══ Conversational grounding: show active listening before responding ═══
  response = addGrounding(response, text, parsed, sent, currentTopics);

  // ═══ Topic bridging: natural connective tissue on topic shifts/callbacks ═══
  response = addTopicBridge(response, currentTopics);

  // ═══ Retroactive insight: connect dots across separate threads ═══
  trackTopicPairs(currentTopics);
  response = applyRetroactiveInsight(response, currentTopics);

  // ═══ Observational wit: self-aware humor about conversation patterns ═══
  trackMessageLength(text);
  const wit = generateObservationalWit(response, text, currentTopics);
  if (wit) {
    // Replace the response with the observation (it's the main event when it fires)
    const witSentences = response.match(/[^.!?]+[.!?]+/g) || [response];
    response = witSentences[0].trim() + " " + wit;
  }

  // Contextual humor injection (coherence guard will strip if inappropriate)
  response = injectHumor(response, currentTopics);

  // Style matching
  const userStyle = analyzeUserStyle();
  response = adaptToStyle(response, userStyle);

  // ═══ Lexical mirroring: adapt vocabulary register, punctuation, and echo user phrases ═══
  response = mirrorRegister(response, text);

  // Conversation phase adjustment
  const phase = getConversationPhase();
  response = phaseAwareAdjust(response, phase);

  // World model personalization
  response = personalizeResponse(response);

  // ═══ Adaptive strategy: adjust based on what's working ═══
  response = adaptiveAdjust(response);

  // ═══ Epistemic modulation: calibrate certainty based on knowledge depth ═══
  response = modulateEpistemics(response, currentTopics, parsed);

  // ═══ Response length calibration & energy mirroring ═══
  const inputEnergy = measureInputEnergy(text);
  response = calibrateResponseLength(response, text, inputEnergy);
  response = adjustResponseEnergy(response, inputEnergy);

  // ═══ Conversational pacing: adapt response style to messaging rhythm ═══
  response = applyPacingAwareness(response, text);

  // ═══ Detail seeding & specificity: replace vague fillers, inject vivid details ═══
  response = seedDetails(response, currentTopics);

  // ═══ Precision echoing: replace generic questions/acks with content-specific ones ═══
  response = precisionEcho(response, text, tokens);

  // ═══ Progressive question depth: replace flat deepeners with depth-aware follow-ups ═══
  response = deepenQuestions(response, currentTopics);

  // ═══ Cross-domain analogy: unexpected connections between fields ═══
  response = injectAnalogy(response, currentTopics);

  // ═══ Rhythm variation & breath: structural variance to break monotony ═══
  response = addBreath(response, text, inputEnergy);

  // ═══ Vocabulary enrichment: swap bland words for vivid alternatives ═══
  response = enrichVocabulary(response, currentTopics);

  // ═══ Conversational disfluency: natural speech patterns (self-correction, false starts) ═══
  response = addDisfluency(response);

  // ═══ Pattern breaking: detect structural ruts and inject surprise ═══
  response = breakPattern(response, text, currentTopics, inputEnergy);

  // ═══ Conversational hooks & open loops: create forward pull and curiosity ═══
  response = addConversationalHooks(response, currentTopics, inputEnergy);

  // ═══ Shared understanding: synthesize common ground & build on agreement ═══
  response = trySynthesis(response);
  response = buildOnAgreement(response, text);

  // ═══ Nuanced stance: occasionally push back, play devil's advocate, take positions ═══
  response = addStance(response, text, currentTopics);

  // ═══ Spontaneous micro-gifts: unexpected delight moments ═══
  response = addSpontaneousGift(response, currentTopics, text);

  // ═══ Subtext-aware tone adjustment: soften/adjust based on what user actually means ═══
  response = adjustForSubtext(response, subtext);

  // ═══ Subtext trend: if user is withdrawing over multiple turns, acknowledge it ═══
  const trend = getSubtextTrend();
  if (trend === "losing_interest" && Math.random() > 0.6) {
    response = response.replace(/\?[^?]*$/, ".") + " But hey — what would you actually want to talk about?";
  } else if (trend === "withdrawing" && Math.random() > 0.7) {
    response = "Hey, I want to make sure I'm being helpful here. " + response;
  }

  // ═══ Conversation arc: rare "wow" moments that acknowledge the journey ═══
  response = tryArcObservation(response);

  // ═══ Discourse coherence: add natural transition markers ═══
  response = addDiscourseMarker(response, plan.flavor);

  // ═══ Discourse coherence: guard against tonal clashes from pipeline ═══
  response = guardCoherence(response, plan);

  // ═══ Final output polish: clean pipeline artifacts, deduplicate, tighten ═══
  response = polishOutput(response);

  // Update discourse state for next turn
  lastDiscourseMove = plan.flavor;

  // Track questions the AI asks for answer-linking
  trackAIQuestion(response);

  // Record in memory
  mem.add("ai", response);

  // Track response shape for pattern-break detection
  trackResponseShape(response);

  // Calculate realistic typing speed (adjusted for conversation pace)
  const rawTypingMs = calcTypingMs(response, sent, parsed);
  const typingMs = adjustTypingForPace(rawTypingMs);
  const pause = calcTypingPause(typingMs);

  return { text: response, typingMs, pause };
}

export function resetMemory() { mem.reset(); threadManager.threads = {}; lastDiscourseMove = "neutral"; Object.keys(strategyScores).forEach(k => strategyScores[k] = 0); lastAIStrategyType = "questions"; subtextHistory = []; lastSemanticTurn = 0; lastGroundingTurn = 0; lastGroundingType = ""; lastArcTurn = 0; referentStack = []; sessionStartTime = Date.now(); lastMessageTime = Date.now(); lastEpistemicTurn = 0; lastHypothetical = null; lastDisfluencyTurn = 0; energyCurve = []; lastDetailTurn = 0; lastBreathTurn = 0; lastEnrichTurn = 0; lastAnalogyTurn = 0; lastSituationTurn = 0; lastPatternBreakTurn = 0; recentResponseShapes = []; lastEchoTurn = 0; lastStanceTurn = 0; lastDeepenerTurn = 0; Object.keys(topicDepth).forEach(k => delete topicDepth[k]); lastBridgeTurn = 0; previousTopics = []; topicHistory = []; userPhraseBank = []; lastMirrorTurn = 0; Object.keys(beliefStore).forEach(k => delete beliefStore[k]); lastBeliefTurn = 0; lastObservationTurn = 0; messageLengthHistory = []; lastArchitecture = ""; openLoops = []; lastHookTurn = 0; lastLoopCloseTurn = 0; emotionalTrajectory = []; lastTrajectoryTurn = 0; lastTrajectoryType = ""; messageTimings = []; lastPacingTurn = 0; currentPaceMode = "normal"; topicPairHistory = {}; lastInsightTurn = 0; sharedGround = []; lastSynthesisTurn = 0; lastGiftTurn = 0; giftHistory = []; }

export { classify as classifyIntents, extractKW as extractKeywords, extractTopics, sentiment as analyzeSentiment };
