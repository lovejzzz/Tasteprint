import React, { useState, useRef, useEffect, useCallback } from "react";
import { getAIResponse } from "./chatAI";

/* ── Emoji Picker ── */
const EMOJI_CATS = [
  { label: "😊", emojis: ["😊","😂","🥹","😍","🤣","😎","🥰","😭","🤔","😅","🙃","😇","🤩","😏","🫠","😬","🤗","🫡"] },
  { label: "👋", emojis: ["👋","👍","👎","🤝","✌️","🤞","🫶","💪","👏","🙌","🤙","👀","🫣","🤷","💅","🙏","✋","🖐️"] },
  { label: "❤️", emojis: ["❤️","🔥","✨","💯","⭐","💀","🎉","💡","🚀","🎯","💎","🏆","⚡","🌟","💫","🪄","🎪","🌈"] },
  { label: "🍕", emojis: ["🍕","☕","🍔","🌮","🍣","🍜","🎂","🍩","🥤","🍿","🥑","🍦","🧁","🥐","🍫","🍪","🌶️","🧀"] },
];

function EmojiPicker({ onPick, p }) {
  const [cat, setCat] = useState(0);
  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: "absolute", bottom: "100%", right: 0, marginBottom: 6,
        background: p.card, borderRadius: 12, border: `1px solid ${p.bd}`,
        boxShadow: `0 8px 24px ${p.tx}10`, padding: 8, width: 210,
        animation: "tp-tooltip-in .15s ease-out both", zIndex: 100,
      }}
    >
      {/* Category tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 6, borderBottom: `1px solid ${p.bd}`, paddingBottom: 4 }}>
        {EMOJI_CATS.map((c, i) => (
          <button key={i} onClick={() => setCat(i)}
            style={{ flex: 1, background: i === cat ? p.su : "transparent", border: "none", borderRadius: 6, padding: "3px 0", cursor: "pointer", fontSize: 13, transition: "background .15s" }}>
            {c.label}
          </button>
        ))}
      </div>
      {/* Emoji grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 2, maxHeight: 120, overflowY: "auto" }}>
        {EMOJI_CATS[cat].emojis.map((e, i) => (
          <button key={i} onClick={() => onPick(e)}
            style={{ background: "transparent", border: "none", borderRadius: 6, padding: 4, cursor: "pointer", fontSize: 16, lineHeight: 1, transition: "background .1s" }}
            onMouseEnter={ev => ev.currentTarget.style.background = p.su}
            onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Editable message bubble ── */
function EditableMsg({ text, style, onEdit }) {
  const ref = useRef(null);
  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={e => { const t = e.target.textContent; if (t !== text) onEdit(t); }}
      onMouseDown={e => e.stopPropagation()}
      onKeyDown={e => { if (e.key === "Backspace" || e.key === "Delete") e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }}
      style={{ ...style, outline: "none", cursor: "text", minWidth: 8 }}
    >
      {text}
    </span>
  );
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
  const [sending, setSending] = useState(null);
  const [sendBtnAnim, setSendBtnAnim] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const idRef = useRef(3);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, typing, scrollToBottom]);

  const editMessage = useCallback((id, newText) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text: newText } : m));
  }, []);

  const sendMessage = useCallback(() => {
    const text = inputVal.trim();
    if (!text) return;

    const myId = idRef.current++;
    const myMsg = { from: "me", text, id: myId };
    setSending(myId);
    setSendBtnAnim(true);
    setTimeout(() => setSendBtnAnim(false), 500);
    setMessages(prev => [...prev, myMsg]);
    setInputVal("");

    // Get AI response + typing speed
    const ai = getAIResponse(text);
    const aiText = typeof ai === "string" ? ai : ai.text;
    const typingMs = typeof ai === "object" ? ai.typingMs : (800 + Math.random() * 1200);
    const pause = typeof ai === "object" ? ai.pause : null;

    setTimeout(() => {
      setSending(null);
    }, 450);

    setTimeout(() => {
      setTyping(true);

      if (pause) {
        // Simulate typing correction: type, pause (dots disappear), restart, finish
        setTimeout(() => {
          setTyping(false); // dots disappear — "rethinking"
          setTimeout(() => {
            setTyping(true); // restart typing
            setTimeout(() => {
              const aiId = idRef.current++;
              setMessages(prev => [...prev, { from: "ai", text: aiText, id: aiId }]);
              setTyping(false);
            }, typingMs - pause.pauseAt);
          }, pause.pauseMs);
        }, pause.pauseAt);
      } else {
        // Normal typing flow
        setTimeout(() => {
          const aiId = idRef.current++;
          setMessages(prev => [...prev, { from: "ai", text: aiText, id: aiId }]);
          setTyping(false);
        }, typingMs);
      }
    }, 350);
  }, [inputVal]);

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const pickEmoji = useCallback((emoji) => {
    setInputVal(prev => prev + emoji);
    setEmojiOpen(false);
    inputRef.current?.focus();
  }, []);

  /* ── Bubble variant (v===0) — iMessage style ── */
  if (v === 0) return (
    <div style={{ ...b, background: p.card, borderRadius: 16, border: `1px solid ${p.bd}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header — draggable */}
      <div data-ide-drag style={{ padding: "8px 14px", borderBottom: `1px solid ${p.bd}`, display: "flex", alignItems: "center", gap: 8, cursor: "grab" }}>
        <div style={{ width: 8, height: 8, borderRadius: 999, background: "#4CAF50", boxShadow: "0 0 6px #4CAF5060" }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: p.tx }}>Chat</span>
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
              "--glow-color": `${p.ac}30`,
              animation: sending === m.id
                ? `tp-msg-send .4s cubic-bezier(.22,1,.36,1) both, tp-msg-glow .6s ease-out .15s both`
                : undefined,
            }}>
              <EditableMsg
                text={m.text}
                onEdit={t => editMessage(m.id, t)}
                style={{ fontSize: 11, color: m.from === "me" ? onAc : p.tx, lineHeight: "1.45", wordBreak: "break-word" }}
              />
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
      <div style={{ padding: "6px 10px", borderTop: `1px solid ${p.bd}`, display: "flex", gap: 6, alignItems: "center", position: "relative" }}>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setEmojiOpen(o => !o)}
            onMouseDown={e => e.stopPropagation()}
            style={{ width: 32, height: 32, borderRadius: 999, border: "none", background: emojiOpen ? p.su : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15, transition: "background .15s" }}
          >😊</button>
          {emojiOpen && <EmojiPicker onPick={pickEmoji} p={p} />}
        </div>
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
            transition: "background .2s, transform .15s",
            transform: inputVal.trim() ? "scale(1)" : "scale(0.9)",
            animation: sendBtnAnim ? "tp-send-fly .45s cubic-bezier(.34,1.56,.64,1) both" : "none",
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
        <span style={{ fontSize: 10, fontWeight: 600, color: p.tx }}>Chat</span>
        <span style={{ fontSize: 9, color: p.mu, marginLeft: "auto" }}>{messages.length} messages</span>
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
                {m.from === "me" ? "You" : "Chat AI"}
              </span>
              <span style={{ fontSize: 9, color: p.mu, marginLeft: 6, opacity: 0.5 }}>now</span>
              <div style={{ marginTop: 1 }}>
                <EditableMsg
                  text={m.text}
                  onEdit={t => editMessage(m.id, t)}
                  style={{ fontSize: 11, color: p.mu, lineHeight: "1.45", wordBreak: "break-word" }}
                />
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
      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 4px 2px", position: "relative" }}>
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
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setEmojiOpen(o => !o)}
            onMouseDown={e => e.stopPropagation()}
            style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: emojiOpen ? p.su : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, transition: "background .15s" }}
          >😊</button>
          {emojiOpen && <EmojiPicker onPick={pickEmoji} p={p} />}
        </div>
        <button
          onClick={sendMessage}
          onMouseDown={e => e.stopPropagation()}
          style={{
            width: 28, height: 28, borderRadius: 8, border: "none",
            background: inputVal.trim() ? p.ac : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: inputVal.trim() ? "pointer" : "default", transition: "background .2s",
            animation: sendBtnAnim ? "tp-send-fly .45s cubic-bezier(.34,1.56,.64,1) both" : "none",
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
  if (v === 2) return (
    <div style={{ ...b, background: "#0c0c0e", borderRadius: 2, border: `1px solid ${p.ac}20`, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'JetBrains Mono',monospace" }}>
      {/* Header — draggable */}
      <div data-ide-drag style={{ padding: "4px 10px", borderBottom: `1px solid ${p.ac}15`, display: "flex", alignItems: "center", gap: 6, cursor: "grab" }}>
        <div style={{ width: 5, height: 5, borderRadius: 999, background: p.ac, animation: "tp-pulse 2s ease infinite" }} />
        <span style={{ fontSize: 9, color: p.ac, opacity: 0.6, letterSpacing: "0.06em" }}>CHAT_AI v1.0</span>
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
            <EditableMsg
              text={m.text}
              onEdit={t => editMessage(m.id, t)}
              style={{ fontSize: 10, color: m.from === "me" ? p.ac : "#999", lineHeight: "1.45", wordBreak: "break-word" }}
            />
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
      <div style={{ padding: "4px 10px 6px", display: "flex", gap: 6, alignItems: "center", borderTop: `1px solid ${p.ac}10`, position: "relative" }}>
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
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setEmojiOpen(o => !o)}
            onMouseDown={e => e.stopPropagation()}
            style={{ width: 20, height: 20, borderRadius: 4, border: "none", background: emojiOpen ? p.ac + "20" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11, transition: "background .15s" }}
          >😊</button>
          {emojiOpen && <EmojiPicker onPick={pickEmoji} p={p} />}
        </div>
        <span style={{ fontSize: 9, color: p.ac + "30" }}>⏎</span>
      </div>
    </div>
  );

  /* ── Glass variant (v===3) — frosted glassmorphism AI chat ── */
  if (v === 3) return (
    <div style={{ ...b, background: `${p.card}55`, backdropFilter: "blur(20px) saturate(140%)", WebkitBackdropFilter: "blur(20px) saturate(140%)", borderRadius: 20, border: `1px solid ${p.ac}15`, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: `0 8px 32px ${p.tx}08, inset 0 1px 0 ${p.card}50`, position: "relative" }}>
      {/* Aurora orb */}
      <div style={{ position: "absolute", top: -40, right: -40, width: 100, height: 100, borderRadius: 999, background: `radial-gradient(circle, ${p.ac}18, ${p.ac2}10, transparent 70%)`, pointerEvents: "none", animation: "tp-pulse 5s ease infinite" }} />
      {/* Header */}
      <div data-ide-drag style={{ padding: "10px 16px", borderBottom: `1px solid ${p.ac}10`, display: "flex", alignItems: "center", gap: 8, cursor: "grab", position: "relative" }}>
        <div style={{ width: 28, height: 28, borderRadius: 999, background: `linear-gradient(135deg, ${p.ac}30, ${p.ac2}30)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 12px ${p.ac}15` }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={p.ac} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: p.tx }}>Chat AI</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: 999, background: "#4CAF50", boxShadow: "0 0 6px #4CAF5060", animation: "tp-pulse 2s ease infinite" }} />
            <span style={{ fontSize: 8, color: p.mu }}>Online</span>
          </div>
        </div>
      </div>
      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", minHeight: 0 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start", animation: sending === m.id ? "tp-msg-send .35s cubic-bezier(.2,.8,.3,1.2) both" : "tp-msg-appear .3s ease-out both" }}>
            <div style={{
              maxWidth: "80%", padding: "8px 13px", position: "relative",
              borderRadius: m.from === "me" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.from === "me" ? `linear-gradient(135deg, ${p.ac}, ${p.ac2 || p.ac})` : `${p.card}70`,
              backdropFilter: m.from === "me" ? "none" : "blur(8px)",
              WebkitBackdropFilter: m.from === "me" ? "none" : "blur(8px)",
              border: m.from === "me" ? "none" : `1px solid ${p.ac}12`,
              boxShadow: m.from === "me" ? `0 4px 16px ${p.ac}25` : `0 2px 8px ${p.tx}06, inset 0 1px 0 ${p.card}40`,
            }}>
              <EditableMsg text={m.text} onEdit={t => editMessage(m.id, t)} style={{ fontSize: 11, color: m.from === "me" ? onAc : p.tx, lineHeight: "1.5", wordBreak: "break-word" }} />
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex", justifyContent: "flex-start", animation: "tp-msg-appear .2s ease-out" }}>
            <div style={{ padding: "9px 16px", borderRadius: "16px 16px 16px 4px", background: `${p.card}70`, backdropFilter: "blur(8px)", border: `1px solid ${p.ac}12`, boxShadow: `inset 0 1px 0 ${p.card}40` }}>
              <TypingDots color={p.ac} />
            </div>
          </div>
        )}
      </div>
      {/* Input */}
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${p.ac}08`, display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
        <div style={{ position: "relative" }}>
          <button onClick={() => setEmojiOpen(o => !o)} onMouseDown={e => e.stopPropagation()} style={{ width: 32, height: 32, borderRadius: 999, border: "none", background: emojiOpen ? `${p.ac}15` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15, transition: "background .15s" }}>😊</button>
          {emojiOpen && <EmojiPicker onPick={pickEmoji} p={p} />}
        </div>
        <input ref={inputRef} value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={handleKeyDown} onMouseDown={e => e.stopPropagation()} placeholder="Message..." style={{ flex: 1, height: 34, borderRadius: 999, border: `1px solid ${p.ac}12`, background: `${p.card}40`, backdropFilter: "blur(8px)", padding: "0 14px", fontSize: 11, color: p.tx, fontFamily: "inherit", outline: "none" }} />
        <button onClick={sendMessage} onMouseDown={e => e.stopPropagation()} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: inputVal.trim() ? `linear-gradient(135deg, ${p.ac}, ${p.ac2 || p.ac})` : `${p.mu}20`, display: "flex", alignItems: "center", justifyContent: "center", cursor: inputVal.trim() ? "pointer" : "default", transition: "background .2s, box-shadow .2s", boxShadow: inputVal.trim() ? `0 2px 12px ${p.ac}30` : "none", transform: inputVal.trim() ? "scale(1)" : "scale(0.9)", animation: sendBtnAnim ? "tp-send-fly .45s cubic-bezier(.34,1.56,.64,1) both" : "none" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={inputVal.trim() ? onAc : p.mu} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
        </button>
      </div>
    </div>
  );

  /* ── Gradient variant (v===4) — modern gradient AI assistant ── */
  return (
    <div style={{ ...b, background: p.card, borderRadius: 18, border: `1px solid ${p.bd}`, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {/* Gradient header */}
      <div data-ide-drag style={{ padding: "10px 14px", background: `linear-gradient(135deg, ${p.ac}, ${p.ac2 || p.ac})`, display: "flex", alignItems: "center", gap: 10, cursor: "grab", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.12), transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ width: 26, height: 26, borderRadius: 999, background: onAc + "20", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={onAc} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: onAc, letterSpacing: "-0.01em" }}>AI Assistant</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
            <div style={{ width: 5, height: 5, borderRadius: 999, background: onAc, opacity: 0.7, animation: "tp-pulse 2s ease infinite" }} />
            <span style={{ fontSize: 8, color: onAc, opacity: 0.6 }}>Ready</span>
          </div>
        </div>
        <span style={{ fontSize: 8, color: onAc, opacity: 0.4 }}>{messages.length} msg</span>
      </div>
      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", minHeight: 0, background: p.bg }}>
        {messages.map((m, i) => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start", animation: sending === m.id ? "tp-msg-send .35s cubic-bezier(.2,.8,.3,1.2) both" : `tp-msg-appear .3s ease-out ${i * 0.03}s both` }}>
            {m.from !== "me" && <div style={{ width: 22, height: 22, borderRadius: 999, background: `linear-gradient(135deg, ${p.ac}30, ${p.ac2}30)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 6, marginTop: 2 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={p.ac} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /></svg>
            </div>}
            <div style={{
              maxWidth: "75%", padding: "8px 12px",
              borderRadius: m.from === "me" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.from === "me" ? `linear-gradient(135deg, ${p.ac}, ${p.ac2 || p.ac})` : p.su,
              boxShadow: m.from === "me" ? `0 2px 10px ${p.ac}20` : "none",
              border: m.from === "me" ? "none" : `1px solid ${p.bd}`,
            }}>
              <EditableMsg text={m.text} onEdit={t => editMessage(m.id, t)} style={{ fontSize: 11, color: m.from === "me" ? onAc : p.tx, lineHeight: "1.5", wordBreak: "break-word" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 3 }}>
                <span style={{ fontSize: 8, color: m.from === "me" ? onAc + "60" : p.mu, opacity: 0.5 }}>now</span>
                {m.from === "me" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={onAc + "60"} strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 3 }}><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex", justifyContent: "flex-start", animation: "tp-msg-appear .2s ease-out" }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, background: `linear-gradient(135deg, ${p.ac}30, ${p.ac2}30)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 6 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={p.ac} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /></svg>
            </div>
            <div style={{ padding: "9px 14px", borderRadius: "14px 14px 14px 4px", background: p.su, border: `1px solid ${p.bd}` }}>
              <TypingDots color={p.ac} />
            </div>
          </div>
        )}
      </div>
      {/* Input */}
      <div style={{ padding: "8px 10px", borderTop: `1px solid ${p.bd}`, display: "flex", gap: 6, alignItems: "center", position: "relative", background: p.card }}>
        <div style={{ position: "relative" }}>
          <button onClick={() => setEmojiOpen(o => !o)} onMouseDown={e => e.stopPropagation()} style={{ width: 30, height: 30, borderRadius: 999, border: "none", background: emojiOpen ? p.su : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, transition: "background .15s" }}>😊</button>
          {emojiOpen && <EmojiPicker onPick={pickEmoji} p={p} />}
        </div>
        <input ref={inputRef} value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={handleKeyDown} onMouseDown={e => e.stopPropagation()} placeholder="Ask anything..." style={{ flex: 1, height: 32, borderRadius: 999, border: `1px solid ${p.bd}`, background: p.su, padding: "0 12px", fontSize: 11, color: p.tx, fontFamily: "inherit", outline: "none" }} />
        <button onClick={sendMessage} onMouseDown={e => e.stopPropagation()} style={{ width: 32, height: 32, borderRadius: 999, border: "none", background: inputVal.trim() ? `linear-gradient(135deg, ${p.ac}, ${p.ac2 || p.ac})` : p.mu + "30", display: "flex", alignItems: "center", justifyContent: "center", cursor: inputVal.trim() ? "pointer" : "default", transition: "background .2s, box-shadow .2s", boxShadow: inputVal.trim() ? `0 2px 8px ${p.ac}25` : "none", transform: inputVal.trim() ? "scale(1)" : "scale(0.9)", animation: sendBtnAnim ? "tp-send-fly .45s cubic-bezier(.34,1.56,.64,1) both" : "none" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={inputVal.trim() ? onAc : p.mu} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
        </button>
      </div>
    </div>
  );
}
