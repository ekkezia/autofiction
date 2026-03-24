// TicketMode.js
import React from "react";
import TicketCard from "./TicketCard";


export default function TicketMode({ curTicket, printing, statusMsg, pos, isThrow, isDragging, onPointerDown, onPointerMove, onPointerUp, onSimulate, connected }) {
  return (
    <div style={{
      height: "calc(100vh - 62px)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", position: "relative"
    }}>
      {/* Star/auspicious pattern bg */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", opacity: .032,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='70' height='70' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23D4A017' d='M35 8l3.5 10.5H50l-8.8 6.4 3.5 10.5L35 29l-9.7 6.4 3.5-10.5L20 18.5h11.5z'/%3E%3C/svg%3E")`,
        backgroundSize: "70px 70px"
      }} />
      {!curTicket ? (
        /* Empty state */
        <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 20px" }}>
          <div style={{
            fontFamily: "'Noto Serif SC',serif", fontSize: 13, letterSpacing: 4,
            color: "rgba(212,160,23,.45)", marginBottom: 8
          }}>等候取号</div>
          <div style={{
            fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900,
            color: "rgba(255,245,235,.2)", marginBottom: 8, letterSpacing: 2
          }}>WAITING FOR TICKET</div>
          <div style={{
            fontSize: 12, color: "rgba(255,245,235,.22)", marginBottom: 44,
            letterSpacing: 1.5, fontFamily: "'Noto Serif SC',serif"
          }}>请按下按钮取号，或等待 Arduino 信号</div>

          <div style={{
            width: 90, height: 90, borderRadius: "50%", margin: "0 auto 40px",
            background: "linear-gradient(135deg,rgba(196,30,58,.18),rgba(212,160,23,.08))",
            border: "1px dashed rgba(212,160,23,.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 40, animation: "throb 2.5s ease-in-out infinite"
          }}>🎫</div>

          <button onClick={onSimulate} style={{
            padding: "13px 36px",
            borderRadius: 100,
            background: connected
              ? "linear-gradient(135deg,#2AAA8A,#1A7A6A)"
              : "linear-gradient(135deg,#C41E3A,#8B0000)",
            color: "#FFF5EB",
            border: `1px solid rgba(${connected ? "42,170,138" : "212,160,23"},.35)`,
            fontSize: 11.5, fontWeight: 700, letterSpacing: 2,
            cursor: "pointer", textTransform: "uppercase",
            boxShadow: `0 5px 22px rgba(${connected ? "42,170,138" : "196,30,58"},.35)`,
            transition: "all .2s ease"
          }}>{connected ? "📡  ARDUINO SIGNAL" : "🎫  TAKE A NUMBER"}</button>
          <div style={{
            marginTop: 14, fontSize: 9, letterSpacing: 2,
            color: "rgba(255,245,235,.15)"
          }}>
            {connected ? "CONNECTED · SOCKET.IO · http://localhost:4001" : "OFFLINE — CLICK TO SIMULATE ARDUINO"}
          </div>
        </div>
      ) : (
        /* Ticket in view */
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Verified banner */}
          {curTicket.status === "verified" && (
            <div className="scaleIn" style={{
              textAlign: "center", marginBottom: 22,
              fontFamily: "'Noto Serif SC',serif", fontSize: 13, fontWeight: 600,
              color: "#2AAA8A", letterSpacing: 2.5
            }}>
              ✨ 您的号码已验证！请前往柜台 <span style={{
                fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 16
              }}>{curTicket.counter}</span> ✨
            </div>
          )}

          {/* Draggable ticket */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
              transform: `translate(${pos.x}px,${pos.y}px)`,
              transition: isThrow
                ? "transform .52s cubic-bezier(.22,.61,.36,1),opacity .52s ease"
                : isDragging ? "none" : "transform .35s ease",
              opacity: isThrow ? 0 : 1,
              filter: isDragging ? "drop-shadow(0 30px 40px rgba(0,0,0,.7))" : undefined
            }}
          >
            <TicketCard ticket={curTicket} isPrinting={printing} dragProps={{}} />
          </div>

          {/* Hint text */}
          <div style={{
            marginTop: 22, fontSize: 9, letterSpacing: 2, textAlign: "center",
            color: "rgba(255,245,235,.22)", lineHeight: 1.8
          }}>
            {curTicket.status === "verified"
              ? "DRAG & FLICK TO DISMISS  ·  拖拽并抛出以关闭"
              : "DRAG TICKET FREELY  ·  等待验证中"
            }
          </div>
        </div>
      )}

      {statusMsg && (
        <div style={{
          marginTop: 16, fontSize: 10.5, letterSpacing: 1.2, textAlign: "center",
          color: "rgba(212,160,23,.72)", fontFamily: "'DM Sans', sans-serif",
          maxWidth: 360, zIndex: 2
        }}>
          {statusMsg}
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: 30,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10, zIndex: 1
      }}>
        {curTicket && (
          <button onClick={onSimulate} style={{
            padding: "8px 22px",
            borderRadius: 100,
            background: "linear-gradient(135deg,#C41E3A,#8B0000)",
            color: "#FFF5EB",
            border: "1px solid rgba(212,160,23,.35)",
            fontSize: 10, fontWeight: 700, letterSpacing: 2,
            cursor: "pointer", textTransform: "uppercase",
            boxShadow: "0 5px 22px rgba(196,30,58,.35)",
            transition: "all .2s ease"
          }}>+ NEW TICKET</button>
        )}
      </div>
    </div>
  );
}
