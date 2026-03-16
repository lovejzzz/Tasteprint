/* ═══════════════════════════════════════════════════════════════════
   Tasteprint SLM — Small Language Model (client-side, zero dependencies)
   Round 22: Implicit meaning & subtext detection
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

  // Deep knowledge explainers — "what is X", "how does X work", "explain X"
  const explainer = lookupExplainer(text);
  if (explainer) {
    // Decide depth based on conversation context — curiosity gets the deep version
    const lastEmo = recentEmotions[recentEmotions.length - 1] || "neutral";
    const wantDeep = lastEmo === "curious" || /explain|how|detail|deep|thorough/i.test(lower) || parsed.qType;
    const explanation = wantDeep ? explainer.deep : explainer.brief;
    return explanation + " " + explainer.hook;
  }

  // General "what is" / "what does" questions (no explainer match)
  if (/^what (is|are|does|do)\b/i.test(lower)) {
    const subject = lower.replace(/^what (is|are|does|do)\s+/i, "").replace(/\?$/, "").trim();
    if (subject.length > 0 && subject.length < 30) {
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

  // Hypothetical/scenario request
  if (/hypothetical|what if|would you rather|scenario/i.test(lower)) {
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

// Contextual humor injection — adds humor to non-joke responses when appropriate
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

  // Feed topics into thread manager
  for (const topic of topics) {
    threadManager.touch(topic, mem.turn, text);
  }

  // ═══ -0.5. Topic return detection — "we're back on X!" ═══
  if (topics.length > 0 && mem.turn > 5) {
    const topicReturn = handleTopicReturn(topics);
    if (topicReturn) return topicReturn;
  }

  // ═══ -1. Remember/recall commands — "what do you remember about me?" ═══
  const rememberCmd = handleRememberCommand(text);
  if (rememberCmd) return rememberCmd;

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

/* ── Public API ── */

export function getAIResponse(input) {
  const text = input.trim();
  if (!text) return { text: "I'm listening... 👂", typingMs: 400, pause: null };

  // ═══ Adaptive strategy: score how user reacted to our last response ═══
  scoreLastStrategy(text);

  // Parse for personality application
  const parsed = parseSentence(text);
  const sent = sentiment(text);
  const emo = detectEmotion(text, sent, parsed);

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

  // Apply personality layer
  response = applyPersonality(response, sent, parsed);

  // Contextual humor injection (coherence guard will strip if inappropriate)
  response = injectHumor(response, currentTopics);

  // Style matching
  const userStyle = analyzeUserStyle();
  response = adaptToStyle(response, userStyle);

  // Conversation phase adjustment
  const phase = getConversationPhase();
  response = phaseAwareAdjust(response, phase);

  // World model personalization
  response = personalizeResponse(response);

  // ═══ Adaptive strategy: adjust based on what's working ═══
  response = adaptiveAdjust(response);

  // ═══ Subtext-aware tone adjustment: soften/adjust based on what user actually means ═══
  response = adjustForSubtext(response, subtext);

  // ═══ Subtext trend: if user is withdrawing over multiple turns, acknowledge it ═══
  const trend = getSubtextTrend();
  if (trend === "losing_interest" && Math.random() > 0.6) {
    response = response.replace(/\?[^?]*$/, ".") + " But hey — what would you actually want to talk about?";
  } else if (trend === "withdrawing" && Math.random() > 0.7) {
    response = "Hey, I want to make sure I'm being helpful here. " + response;
  }

  // ═══ Discourse coherence: add natural transition markers ═══
  response = addDiscourseMarker(response, plan.flavor);

  // ═══ Discourse coherence: guard against tonal clashes from pipeline ═══
  response = guardCoherence(response, plan);

  // Update discourse state for next turn
  lastDiscourseMove = plan.flavor;

  // Track questions the AI asks for answer-linking
  trackAIQuestion(response);

  // Record in memory
  mem.add("ai", response);

  // Calculate realistic typing speed
  const typingMs = calcTypingMs(response, sent, parsed);
  const pause = calcTypingPause(typingMs);

  return { text: response, typingMs, pause };
}

export function resetMemory() { mem.reset(); threadManager.threads = {}; lastDiscourseMove = "neutral"; Object.keys(strategyScores).forEach(k => strategyScores[k] = 0); lastAIStrategyType = "questions"; subtextHistory = []; }

export { classify as classifyIntents, extractKW as extractKeywords, extractTopics, sentiment as analyzeSentiment };
