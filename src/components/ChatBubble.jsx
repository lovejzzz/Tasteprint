import React, { useState, useRef, useEffect, useCallback } from "react";

/* ── Tiny client-side AI ── */
const GREETINGS = /^(hi|hey|hello|yo|sup|howdy|hola|what'?s up)/i;
const THANKS = /^(thanks|thank you|thx|ty|cheers|appreciate)/i;
const HOW_ARE = /(how are you|how('?s| is) it going|how do you do|what'?s good)/i;
const HELP = /(help|assist|support|how do i|how can i|can you)/i;
const JOKE = /(joke|funny|laugh|humor|make me laugh)/i;
const BYE = /^(bye|goodbye|see ya|later|cya|peace|ttyl)/i;
const WEATHER = /(weather|temperature|rain|sunny|cold|hot|forecast)/i;
const CODE = /(code|programming|javascript|react|python|css|html|bug|error)/i;
const DESIGN = /(design|ui|ux|color|font|layout|style|figma)/i;
const TIME = /(time|date|today|tomorrow|clock|schedule)/i;
const FOOD = /(food|eat|restaurant|cook|recipe|hungry|lunch|dinner)/i;
const MUSIC = /(music|song|playlist|spotify|listen|band|album)/i;

const RESPONSES = {
  greeting: [
    "Hey there! 👋 How can I help?",
    "Hi! What's on your mind?",
    "Hello! Ready to chat 😊",
    "Hey! Good to hear from you!",
  ],
  thanks: [
    "You're welcome! 😊",
    "Anytime! Happy to help.",
    "No problem at all!",
    "Glad I could help! ✨",
  ],
  howAre: [
    "I'm doing great, thanks for asking! How about you?",
    "Pretty good! Just here helping out. What's up?",
    "All good on my end! 🚀 What can I do for you?",
  ],
  help: [
    "Of course! I'd love to help. What do you need?",
    "Sure thing! Tell me more about what you're working on.",
    "I'm here for you! What's the challenge?",
  ],
  joke: [
    "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
    "I told my computer I needed a break... now it won't stop sending me vacation ads 🏖️",
    "Why did the CSS developer go broke? Because they lost their margin! 😄",
    "A SQL query walks into a bar, sees two tables and asks... Can I JOIN you?",
  ],
  bye: [
    "See you later! 👋",
    "Take care! Come back anytime.",
    "Bye! Have a great one! ✌️",
  ],
  weather: [
    "I wish I could check the weather for you! ☀️ Try looking out the window? 😄",
    "I'm an indoor AI — I never see the weather! But I hope it's nice out there 🌤️",
  ],
  code: [
    "Oh nice, coding talk! 🧑‍💻 What are you building?",
    "I love talking code! What language are you working with?",
    "Code is my favorite topic! Tell me about the project.",
    "Debugging? My condolences 😅 What's the error?",
  ],
  design: [
    "Design is everything! 🎨 What are you working on?",
    "Oh I love design discussions! Tell me more about the project.",
    "Great taste in topics! What's the design challenge?",
  ],
  time: [
    `It's ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} right now! ⏰`,
    "Time flies when you're chatting! What do you need to plan?",
  ],
  food: [
    "Now you're talking! 🍕 What are you in the mood for?",
    "Food is always a good topic! What's your go-to meal?",
    "I can't eat, but I can definitely recommend trying something new! 🍜",
  ],
  music: [
    "Great taste! 🎵 What genre are you into?",
    "Music makes everything better! What are you listening to?",
    "I'd recommend some lo-fi beats for coding sessions! 🎧",
  ],
  fallback: [
    "That's interesting! Tell me more about that.",
    "Hmm, I'm thinking about that... 🤔 Can you elaborate?",
    "Cool! What else is on your mind?",
    "I hear you! What would you like to explore?",
    "That's a great point. What do you think about it?",
    "Interesting thought! I'd love to hear more.",
  ],
};

function getAIResponse(input) {
  const text = input.trim();
  if (!text) return "I'm listening... 👂";
  if (GREETINGS.test(text)) return pick(RESPONSES.greeting);
  if (THANKS.test(text)) return pick(RESPONSES.thanks);
  if (BYE.test(text)) return pick(RESPONSES.bye);
  if (HOW_ARE.test(text)) return pick(RESPONSES.howAre);
  if (JOKE.test(text)) return pick(RESPONSES.joke);
  if (HELP.test(text)) return pick(RESPONSES.help);
  if (WEATHER.test(text)) return pick(RESPONSES.weather);
  if (CODE.test(text)) return pick(RESPONSES.code);
  if (DESIGN.test(text)) return pick(RESPONSES.design);
  if (TIME.test(text)) return pick(RESPONSES.time);
  if (FOOD.test(text)) return pick(RESPONSES.food);
  if (MUSIC.test(text)) return pick(RESPONSES.music);

  /* Echo-aware fallback — reference what they said */
  const words = text.split(/\s+/);
  if (words.length > 3) {
    const topic = words.slice(0, 3).join(" ");
    const extras = [
      `"${topic}..." — that's fascinating! Tell me more.`,
      `Interesting you mention "${topic}"! What made you think of that?`,
      `I like where this is going with "${topic}" — keep going!`,
    ];
    return pick(extras);
  }
  return pick(RESPONSES.fallback);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ── Typing indicator component ── */
function TypingDots({ color }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 6, height: 6, borderRadius: 999,
            background: color,
            opacity: 0.5,
            animation: `tp-typing-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main ChatBubble component ── */
export default function ChatBubble({ v = 0, p, editable, texts, onText, font, fsize, b, onAc }) {
  const [messages, setMessages] = useState([
    { from: "ai", text: "Hey! 👋 How can I help you today?", id: 0 },
    { from: "me", text: "Hi! Just checking out this chat.", id: 1 },
    { from: "ai", text: "Nice! Feel free to ask me anything 😊", id: 2 },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(null); // id of message being sent
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const idRef = useRef(3);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, typing, scrollToBottom]);

  const sendMessage = useCallback(() => {
    const text = inputVal.trim();
    if (!text) return;

    const myId = idRef.current++;
    const myMsg = { from: "me", text, id: myId };
    setSending(myId);
    setMessages(prev => [...prev, myMsg]);
    setInputVal("");

    /* Animate send, then show typing, then AI responds */
    setTimeout(() => {
      setSending(null);
      setTyping(true);
      setTimeout(() => {
        const aiText = getAIResponse(text);
        const aiId = idRef.current++;
        setMessages(prev => [...prev, { from: "ai", text: aiText, id: aiId }]);
        setTyping(false);
      }, 800 + Math.random() * 1200);
    }, 300);
  }, [inputVal]);

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  /* ── Bubble variant (v===0) — iMessage style ── */
  if (v === 0) return (
    <div style={{ ...b, background: p.card, borderRadius: 16, border: `1px solid ${p.bd}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header — draggable */}
      <div data-ide-drag style={{ padding: "8px 14px", borderBottom: `1px solid ${p.bd}`, display: "flex", alignItems: "center", gap: 8, cursor: "grab" }}>
        <div style={{ width: 8, height: 8, borderRadius: 999, background: "#4CAF50", boxShadow: "0 0 6px #4CAF5060" }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: p.tx }}>Tasteprint AI</span>
        <span style={{ fontSize: 9, color: p.mu, marginLeft: "auto" }}>online</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", minHeight: 0 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              justifyContent: m.from === "me" ? "flex-end" : "flex-start",
              animation: sending === m.id
                ? "tp-msg-send .35s cubic-bezier(.2,.8,.3,1.2) both"
                : "tp-msg-appear .3s ease-out both",
            }}
          >
            <div style={{
              maxWidth: "78%",
              padding: "7px 11px",
              borderRadius: m.from === "me" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.from === "me" ? p.ac : p.su,
              boxShadow: m.from === "me" ? `0 2px 8px ${p.ac}20` : "none",
            }}>
              <span style={{ fontSize: 11, color: m.from === "me" ? onAc : p.tx, lineHeight: "1.45", wordBreak: "break-word" }}>
                {m.text}
              </span>
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex", justifyContent: "flex-start", animation: "tp-msg-appear .2s ease-out" }}>
            <div style={{ padding: "8px 14px", borderRadius: "14px 14px 14px 4px", background: p.su }}>
              <TypingDots color={p.mu} />
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ padding: "6px 10px", borderTop: `1px solid ${p.bd}`, display: "flex", gap: 6, alignItems: "center" }}>
        <input
          ref={inputRef}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onMouseDown={e => e.stopPropagation()}
          placeholder="Type a message..."
          style={{
            flex: 1, height: 32, borderRadius: 999, border: `1px solid ${p.bd}`,
            background: p.su, padding: "0 12px", fontSize: 11, color: p.tx,
            fontFamily: "inherit", outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          onMouseDown={e => e.stopPropagation()}
          style={{
            width: 32, height: 32, borderRadius: 999, border: "none",
            background: inputVal.trim() ? p.ac : p.mu + "30",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: inputVal.trim() ? "pointer" : "default",
            transition: "all .2s ease",
            transform: inputVal.trim() ? "scale(1)" : "scale(0.9)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={inputVal.trim() ? onAc : p.mu} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>
    </div>
  );

  /* ── Thread variant (v===1) — Slack/Discord style ── */
  if (v === 1) return (
    <div style={{ ...b, display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}>
      {/* Drag handle */}
      <div data-ide-drag style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 6, cursor: "grab", borderBottom: `1px solid ${p.bd}` }}>
        <div style={{ width: 6, height: 6, borderRadius: 999, background: "#4CAF50" }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: p.tx }}>Thread</span>
        <span style={{ fontSize: 9, color: p.mu, marginLeft: "auto" }}>3+ messages</span>
      </div>
      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", minHeight: 0, padding: "4px 0" }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 2px",
              animation: sending === m.id ? "tp-msg-send .35s cubic-bezier(.2,.8,.3,1.2) both" : "tp-fadein .25s ease-out both",
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 999, flexShrink: 0,
              background: m.from === "me" ? p.ac + "20" : p.mu + "20",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 600, color: m.from === "me" ? p.ac : p.mu,
            }}>
              {m.from === "me" ? "Y" : "A"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: p.tx }}>
                {m.from === "me" ? "You" : "Tasteprint AI"}
              </span>
              <span style={{ fontSize: 9, color: p.mu, marginLeft: 6, opacity: 0.5 }}>now</span>
              <div style={{ fontSize: 11, color: p.mu, marginTop: 1, lineHeight: "1.45", wordBreak: "break-word" }}>
                {m.text}
              </div>
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 2px", animation: "tp-fadein .2s ease-out" }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, background: p.mu + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: p.mu }}>A</div>
            <TypingDots color={p.mu} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 0 2px" }}>
        <input
          ref={inputRef}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onMouseDown={e => e.stopPropagation()}
          placeholder="Reply..."
          style={{
            flex: 1, height: 30, borderRadius: 8, border: `1px solid ${p.bd}`,
            background: "transparent", padding: "0 10px", fontSize: 11, color: p.tx,
            fontFamily: "inherit", outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          onMouseDown={e => e.stopPropagation()}
          style={{
            width: 28, height: 28, borderRadius: 8, border: "none",
            background: inputVal.trim() ? p.ac : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: inputVal.trim() ? "pointer" : "default", transition: "all .2s",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={inputVal.trim() ? onAc : p.mu + "50"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>
    </div>
  );

  /* ── Terminal variant (v===2) — CLI style ── */
  return (
    <div style={{ ...b, background: "#0c0c0e", borderRadius: 2, border: `1px solid ${p.ac}20`, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'JetBrains Mono',monospace" }}>
      {/* Header — draggable */}
      <div data-ide-drag style={{ padding: "4px 10px", borderBottom: `1px solid ${p.ac}15`, display: "flex", alignItems: "center", gap: 6, cursor: "grab" }}>
        <div style={{ width: 5, height: 5, borderRadius: 999, background: p.ac, animation: "tp-pulse 2s ease infinite" }} />
        <span style={{ fontSize: 9, color: p.ac, opacity: 0.6, letterSpacing: "0.06em" }}>TASTEPRINT_AI v1.0</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, padding: "6px 10px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto", minHeight: 0 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex", gap: 8,
              animation: sending === m.id ? "tp-msg-send .3s ease both" : "tp-fadein .2s ease-out both",
            }}
          >
            <span style={{ fontSize: 9, color: m.from === "me" ? p.ac : "#666", opacity: 0.6, flexShrink: 0 }}>
              {m.from === "me" ? "YOU>" : "AI >"}
            </span>
            <span style={{ fontSize: 10, color: m.from === "me" ? p.ac : "#999", lineHeight: "1.45", wordBreak: "break-word" }}>
              {m.text}
            </span>
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex", gap: 8, animation: "tp-fadein .2s ease-out" }}>
            <span style={{ fontSize: 9, color: "#666", opacity: 0.6 }}>AI &gt;</span>
            <span style={{ fontSize: 10, color: p.ac, animation: "tp-blink 1s step-end infinite" }}>█</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "4px 10px 6px", display: "flex", gap: 6, alignItems: "center", borderTop: `1px solid ${p.ac}10` }}>
        <span style={{ fontSize: 9, color: p.ac, opacity: 0.5 }}>CMD&gt;</span>
        <input
          ref={inputRef}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onMouseDown={e => e.stopPropagation()}
          placeholder="type here..."
          style={{
            flex: 1, height: 22, border: "none", background: "transparent",
            padding: 0, fontSize: 10, color: p.ac,
            fontFamily: "'JetBrains Mono',monospace", outline: "none",
            caretColor: p.ac,
          }}
        />
        <span style={{ fontSize: 9, color: p.ac + "30" }}>⏎</span>
      </div>
    </div>
  );
}
