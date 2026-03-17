import React from "react";
import { HighlightLine } from "./tokenizer";
import { getTextureStyle } from "../../utils";

export default function CodeReview({ b, fsize = 1, texture }) {
  const mono = "'JetBrains Mono',monospace";
  const cfs = (n) => Math.round(n * fsize);
  const code = [
    "async function fetchUser(id) {",
    "  const res = await fetch(`/api/users/${id}`);",
    "  const data = await res.json();",
    "  return data;",
    "}",
    "",
    "export default fetchUser;",
  ];
  const annotations = {
    2: {
      user: "A",
      color: "#f9e2af",
      text: "Should we handle non-200 status codes here?",
    },
    4: {
      user: "B",
      color: "#89b4fa",
      text: "Consider adding TypeScript return type",
    },
  };
  const [expanded, setExpanded] = React.useState({ 2: true, 4: false });
  const [hovBtn, setHovBtn] = React.useState(null);
  const [hovLine, setHovLine] = React.useState(null);
  const stop = (e) => e.stopPropagation();

  const p = 1;
  const texStyle = getTextureStyle(texture, p);

  const transition = "all 0.2s cubic-bezier(.4,0,.2,1)";

  return (
    <div
      style={{
        ...b,
        background: "#1e1e2e",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: mono,
        transition,
        ...texStyle,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "6px 12px",
          borderBottom: "1px solid #ffffff10",
          gap: 8,
          transition,
        }}
      >
        <span style={{ fontSize: 10, color: "#cdd6f4", fontWeight: 500 }}>
          fetchUser.js
        </span>
        <span style={{ fontSize: 8, color: "#f9e2af", marginLeft: "auto" }}>
          2 comments
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {/* Approve button */}
          <button
            onMouseDown={stop}
            onMouseEnter={() => setHovBtn("approve")}
            onMouseLeave={() => setHovBtn(null)}
            style={{
              background:
                hovBtn === "approve" ? "#27c93f38" : "#27c93f22",
              color: "#27c93f",
              border: "none",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 8,
              cursor: "pointer",
              fontFamily: mono,
              transition,
              transform: hovBtn === "approve" ? "scale(1.06)" : "scale(1)",
            }}
          >
            Approve
          </button>
          {/* Request button */}
          <button
            onMouseDown={stop}
            onMouseEnter={() => setHovBtn("request")}
            onMouseLeave={() => setHovBtn(null)}
            style={{
              background:
                hovBtn === "request" ? "#f38ba838" : "#f38ba822",
              color: "#f38ba8",
              border: "none",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 8,
              cursor: "pointer",
              fontFamily: mono,
              transition,
              transform: hovBtn === "request" ? "scale(1.06)" : "scale(1)",
            }}
          >
            Request
          </button>
        </div>
      </div>

      {/* Code lines */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "4px 0",
          scrollbarWidth: "thin",
        }}
      >
        {code.map((l, i) => (
          <React.Fragment key={i}>
            <div
              onMouseEnter={() => setHovLine(i)}
              onMouseLeave={() => setHovLine(null)}
              style={{
                display: "flex",
                padding: "1px 12px",
                background:
                  hovLine === i && annotations[i]
                    ? "#f9e2af12"
                    : annotations[i]
                    ? "#f9e2af06"
                    : hovLine === i
                    ? "#ffffff04"
                    : "transparent",
                cursor: annotations[i] ? "pointer" : "default",
                transition,
              }}
              onMouseDown={annotations[i] ? stop : undefined}
              onClick={() => {
                if (annotations[i])
                  setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
              }}
            >
              <span
                style={{
                  fontSize: cfs(9),
                  color: annotations[i] ? "#f9e2af" : "#444",
                  width: 20,
                  textAlign: "right",
                  marginRight: 8,
                  userSelect: "none",
                  transition,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontSize: cfs(10),
                  lineHeight: 1.7,
                  whiteSpace: "pre",
                  flex: 1,
                }}
              >
                <HighlightLine text={l} />
              </span>
              {annotations[i] && (
                <span
                  style={{
                    fontSize: 8,
                    color: "#f9e2af",
                    opacity: hovLine === i ? 0.8 : 0.5,
                    transition,
                  }}
                >
                  {"\uD83D\uDCAC"}
                </span>
              )}
            </div>
            {/* Comment bubble */}
            {annotations[i] && expanded[i] && (
              <div
                style={{
                  margin: "2px 12px 4px 40px",
                  padding: "6px 10px",
                  background: "#16162a",
                  borderRadius: 6,
                  border: "1px solid #ffffff10",
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  animation: "fadeSlideIn 0.2s ease-out",
                  transition,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: annotations[i].color + "30",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 600,
                      color: annotations[i].color,
                    }}
                  >
                    {annotations[i].user}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      fontSize: 9,
                      color: "#a6adc8",
                      lineHeight: 1.5,
                    }}
                  >
                    {annotations[i].text}
                  </span>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
