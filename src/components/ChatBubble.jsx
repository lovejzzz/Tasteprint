import React, { useState, useRef, useEffect, useCallback } from "react";
import { getAIResponse } from "./chatAI";

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
    setMessages(prev => [...prev, myMsg]);
    setInputVal("");

    // Get AI response + typing speed
    const ai = getAIResponse(text);
    const aiText = typeof ai === "string" ? ai : ai.text;
    const typingMs = typeof ai === "object" ? ai.typingMs : (800 + Math.random() * 1200);
    const pause = typeof ai === "object" ? ai.pause : null;

    setTimeout(() => {
      setSending(null);
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
      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 4px 2px" }}>
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
