import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import TicketMode from "./TicketMode";
import AdminMode from "./AdminMode";
import ViewerMode from "./ViewerMode";
import BarcodeScanner from "./BarcodeScanner";
// import Quagga from "quagga"; // Only needed in AdminMode

/* ── CONSTANTS ─────────────────────────────────────────────────────────────── */
const SOCKET_URL = "http://localhost:4001";
const COUNTERS  = ["A1","A2","A3","B1","B2","C1"];
const parseTicketNumber = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "";
  const prefixed = value.match(/MATCHFIT-(\d+)/i);
  if (prefixed) return prefixed[1];
  const digits = value.match(/\d+/);
  return digits ? digits[0] : "";
};

let _seq = 1000 + Math.floor(Math.random() * 200);
const mkNum     = () => String(++_seq);
const mkCounter = () => COUNTERS[Math.floor(Math.random() * COUNTERS.length)];
const mkTime    = () => new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
const mkId      = () => Math.random().toString(36).slice(2, 9);
const mkTicket  = (num) => ({
  id: mkId(), number: num,
  counter: mkCounter(), status: "waiting",
  time: mkTime(), createdAt: Date.now()
});

/* ── GLOBAL CSS ─────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @keyframes printIn   { 0%{clip-path:inset(0 0 100% 0);opacity:0;transform:translateY(-10px)} 100%{clip-path:inset(0 0 0% 0);opacity:1;transform:translateY(0)} }
  @keyframes fadeUp    { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scaleIn   { from{transform:scale(0.75);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes goldPulse { 0%,100%{box-shadow:0 0 18px rgba(212,160,23,.3),0 0 40px rgba(212,160,23,.1)} 50%{box-shadow:0 0 40px rgba(212,160,23,.65),0 0 90px rgba(212,160,23,.25)} }
  @keyframes trashWig  { 0%,100%{transform:rotate(0) scale(1)} 20%{transform:rotate(-12deg) scale(1.12)} 40%{transform:rotate(12deg) scale(1.18)} 60%{transform:rotate(-7deg) scale(1.1)} 80%{transform:rotate(6deg) scale(1.05)} }
  @keyframes digitSlot { from{transform:translateY(-55%) scale(.9);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
  @keyframes swayL     { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
  @keyframes shimmer   { 0%{background-position:200% center} 100%{background-position:-200% center} }
  @keyframes floatUp   { from{transform:translateY(0) rotate(0deg);opacity:.75} to{transform:translateY(-110vh) rotate(600deg);opacity:0} }
  @keyframes ping      { 0%{transform:scale(1);opacity:.85} 100%{transform:scale(2.8);opacity:0} }
  @keyframes throb     { 0%,100%{opacity:.4} 50%{opacity:.8} }
  @keyframes verifiedIn{ 0%{transform:scale(0) rotate(-10deg);opacity:0} 60%{transform:scale(1.15) rotate(3deg)} 100%{transform:scale(1) rotate(0);opacity:1} }

  .printing  { animation: printIn 1.3s cubic-bezier(.22,.61,.36,1) forwards; }
  .scaleIn   { animation: scaleIn .38s cubic-bezier(.34,1.56,.64,1) forwards; }
  .goldPulse { animation: goldPulse 2.2s ease-in-out infinite; }
  .trashWig  { animation: trashWig .55s ease !important; }
  .digitSlot { animation: digitSlot .42s cubic-bezier(.34,1.56,.64,1) both; }
  .shimmerTx {
    background: linear-gradient(90deg, #D4A017 0%, #F0C040 28%, #FFF5EB 50%, #F0C040 72%, #D4A017 100%);
    background-size: 220% auto;
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 3.2s linear infinite;
  }
  .fadeUp    { animation: fadeUp .45s ease forwards; }
  .drag      { cursor: grab; touch-action: none; user-select: none; }
  .drag:active { cursor: grabbing; }
  ::-webkit-scrollbar { width: 4px; background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(212,160,23,.25); border-radius: 2px; }

  input::placeholder { color: rgba(255,245,235,.25); }
  input:focus, select:focus { outline: none; border-color: rgba(212,160,23,.45) !important; }
  button { font-family: 'Noto Sans SC', 'Microsoft YaHei', SimSun, sans-serif; }
  * { box-sizing: border-box; }
`;

const FONTS_URL = "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap";

/* ── QR CODE ──────────────────────────────────────────────────────────────── */
const QR = ({ value, size = 88 }) => (
  <img
    src={`https://api.qrserver.com/v1/create-qr-code/?size=${size*2}x${size*2}&data=${encodeURIComponent(value)}&color=2D0010&bgcolor=FFF5EB&margin=4`}
    width={size} height={size} alt="QR"
    style={{ display:"block", imageRendering:"crisp-edges", borderRadius:4 }}
  />
);

/* ── DASH LINE ─────────────────────────────────────────────────────────────── */
const DashLine = () => (
  <div style={{
    height:1,
    background:"repeating-linear-gradient(90deg,transparent,transparent 5px,rgba(196,30,58,.2) 5px,rgba(196,30,58,.2) 11px)"
  }} />
);

/* ── TICKET CARD ───────────────────────────────────────────────────────────── */
const TicketCard = ({ ticket, isPrinting, dragProps, style }) => {
  const sv = ticket.status;
  const clr = sv==="verified"?"#2AAA8A": sv==="trashed"?"#5A5A5A":"#D4A017";
  const lbl = sv==="verified"?"✓ VERIFIED · 已验证": sv==="trashed"?"✗ DONE · 已完成":"● WAITING · 等候中";

  return (
    <div
      className={`${isPrinting?"printing":""} ${dragProps?"drag":""}`}
      style={{
        width:272,
        background:"linear-gradient(160deg,#FFFEF8 0%,#FFF6EC 65%,#FFF1E2 100%)",
        borderRadius:14, position:"relative",
        boxShadow: sv==="verified"
          ? "0 28px 80px rgba(42,170,138,.28),0 6px 24px rgba(0,0,0,.6)"
          : "0 28px 80px rgba(0,0,0,.55),0 6px 24px rgba(0,0,0,.5)",
        transition:"box-shadow .5s ease",
        ...style
      }}
      {...dragProps}
    >
      {/* Gold corner marks */}
      {[{t:7,l:7,bt:1,bl:1},{t:7,r:7,bt:1,br:1},{b:7,l:7,bb:1,bl:1},{b:7,r:7,bb:1,br:1}].map((c,i)=>(
        <div key={i} style={{
          position:"absolute", zIndex:5, width:11, height:11, pointerEvents:"none",
          top:c.t, bottom:c.b, left:c.l, right:c.r,
          borderTop:    c.bt?"1.5px solid rgba(212,160,23,.8)":undefined,
          borderBottom: c.bb?"1.5px solid rgba(212,160,23,.8)":undefined,
          borderLeft:   c.bl?"1.5px solid rgba(212,160,23,.8)":undefined,
          borderRight:  c.br?"1.5px solid rgba(212,160,23,.8)":undefined,
        }}/>
      ))}
      {/* Outer border ring */}
      <div style={{
        position:"absolute", inset:0, borderRadius:14, zIndex:4, pointerEvents:"none",
        border: sv==="verified"?"1.5px solid rgba(42,170,138,.45)":"1.5px solid rgba(212,160,23,.3)",
        transition:"border .4s ease"
      }}/>

      {/* Header band */}
      <div style={{
        background:"linear-gradient(135deg,#C41E3A 0%,#8B0000 100%)",
        padding:"10px 14px 8px", borderRadius:"13px 13px 0 0"
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"'Noto Serif SC',serif",fontSize:10,letterSpacing:2.5,color:"rgba(255,245,235,.92)",fontWeight:600}}>
            缘份等候系统
          </span>
          <span style={{fontSize:16}}>🧧</span>
        </div>
        <div style={{fontSize:7.5,letterSpacing:3,color:"rgba(212,160,23,.8)",marginTop:1.5,textTransform:"uppercase"}}>
          Destiny Queue · Love Matchmaking
        </div>
      </div>

      <DashLine />

      {/* Body */}
      <div style={{padding:"15px 15px 9px",position:"relative",overflow:"hidden"}}>
        {/* 福 watermark */}
        <div style={{
          position:"absolute", top:-8, left:"50%", transform:"translateX(-50%)",
          fontFamily:"'Noto Serif SC',serif", fontSize:108, fontWeight:700,
          color:"rgba(196,30,58,.04)", pointerEvents:"none", lineHeight:1, userSelect:"none", zIndex:0
        }}>福</div>

        {/* Number */}
        <div style={{textAlign:"center",marginBottom:13,position:"relative",zIndex:1}}>
          <div style={{fontSize:7.5,letterSpacing:3,color:"#8B0000",textTransform:"uppercase",marginBottom:1}}>YOUR NUMBER</div>
          <div className="digitSlot" key={ticket.number} style={{
            fontFamily:"'Playfair Display',serif", fontWeight:900,
            fontSize:72, lineHeight:1, color:"#160810",
            textShadow:"2px 3px 0 rgba(196,30,58,.1)"
          }}>
            {ticket.number}
          </div>
        </div>

        {/* QR + Info grid */}
        <div style={{display:"flex",gap:12,alignItems:"center",position:"relative",zIndex:1}}>
          <div style={{
            background:"#FFF5EB", border:"1px solid rgba(196,30,58,.12)",
            borderRadius:7, overflow:"hidden", flexShrink:0, padding:3
          }}>
            <QR value={`MATCHFIT-${ticket.number}`} size={74} />
          </div>
          <div style={{flex:1,minWidth:0}}>
            <TRow l="COUNTER" v={ticket.counter} vs={{
              fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:"#C41E3A",lineHeight:1.1
            }}/>
            <TRow l="TIME" v={ticket.time} vs={{fontSize:12,color:"#5A3030"}}/>
            <TRow l="STATUS" v={lbl} vs={{fontSize:8.5,fontWeight:600,color:clr,letterSpacing:.4,lineHeight:1.3}}/>
          </div>
        </div>
      </div>

      <DashLine />

      {/* Footer */}
      <div style={{padding:"7px 15px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontFamily:"'Noto Serif SC',serif",fontSize:8,color:"#8B0000",letterSpacing:1}}>
          请保管好您的号码牌
        </span>
        <span style={{fontSize:8,color:"#9B8880"}}>{new Date().toLocaleDateString("zh-CN")}</span>
      </div>

      {/* Verified shimmer overlay */}
      {sv==="verified" && (
        <div className="goldPulse" style={{
          position:"absolute",inset:0,borderRadius:14,pointerEvents:"none",zIndex:3
        }}/>
      )}
      {/* Verified stamp */}
      {sv==="verified" && (
        <div style={{
          position:"absolute", top:54, right:12,
          animation:"verifiedIn .55s cubic-bezier(.34,1.56,.64,1) both",
          zIndex:6, transform:"rotate(12deg)",
          border:"2px solid rgba(42,170,138,.7)", borderRadius:4,
          padding:"2px 7px"
        }}>
          <div style={{
            fontFamily:"'DM Sans',sans-serif", fontSize:9, fontWeight:700,
            letterSpacing:2, color:"rgba(42,170,138,.85)"
          }}>VERIFIED</div>
        </div>
      )}
    </div>
  );
};

const TRow = ({l,v,vs}) => (
  <div style={{marginBottom:7}}>
    <div style={{fontSize:7,letterSpacing:2,color:"#9B8880",textTransform:"uppercase"}}>{l}</div>
    <div style={{fontSize:13,fontWeight:600,color:"#1A0A0E",...vs}}>{v}</div>
  </div>
);

/* ── LANTERN ───────────────────────────────────────────────────────────────── */
const Lantern = ({x, delay=0}) => (
  <div style={{
    position:"fixed", top:0, left:x, zIndex:0, pointerEvents:"none",
    transformOrigin:"top center",
    animation:`swayL ${3.5+Math.random()}s ${delay}s ease-in-out infinite`
  }}>
    <div style={{width:1.5,height:22,background:"rgba(212,160,23,.35)",margin:"0 auto"}}/>
    <div style={{
      width:22, height:34,
      background:"linear-gradient(180deg,#C41E3A 0%,#8B0000 100%)",
      borderRadius:"40% 40% 60% 60% / 18% 18% 82% 82%",
      boxShadow:"0 0 18px rgba(196,30,58,.55),inset 0 0 10px rgba(255,160,0,.15)",
      position:"relative", margin:"0 auto"
    }}>
      <div style={{
        position:"absolute", top:5, left:"50%", transform:"translateX(-50%)",
        fontFamily:"'Noto Serif SC',serif", fontSize:11, color:"rgba(212,160,23,.9)", fontWeight:700
      }}>福</div>
    </div>
    <div style={{width:1.5,height:12,background:"rgba(212,160,23,.35)",margin:"0 auto"}}/>
    <div style={{
      width:8,height:8,borderRadius:"50%",
      background:"rgba(212,160,23,.6)",margin:"0 auto",
      boxShadow:"0 0 6px rgba(212,160,23,.5)"
    }}/>
  </div>
);

/* ── PETAL ─────────────────────────────────────────────────────────────────── */
const Petal = ({x, delay}) => (
  <div style={{
    position:"fixed", left:x, bottom:-10, zIndex:200, pointerEvents:"none",
    width:9, height:9, borderRadius:"50% 0 50% 0",
    background:"linear-gradient(135deg,#FFB7C5,#FF69B4)",
    animation:`floatUp ${3.5+Math.random()*3}s ${delay}s linear forwards`
  }}/>
);

/* ── SIMULATE BUTTON ────────────────────────────────────────────────────────── */
const SimBtn = ({onClick,label,small,color="red"}) => (
  <button onClick={onClick} style={{
    padding: small?"8px 22px":"13px 36px",
    borderRadius:100,
    background: color==="green"
      ? "linear-gradient(135deg,#2AAA8A,#1A7A6A)"
      : "linear-gradient(135deg,#C41E3A,#8B0000)",
    color:"#FFF5EB",
    border:`1px solid rgba(${color==="green"?"42,170,138":"212,160,23"},.35)`,
    fontSize:small?10:11.5, fontWeight:700, letterSpacing:2,
    cursor:"pointer", textTransform:"uppercase",
    boxShadow:`0 5px 22px rgba(${color==="green"?"42,170,138":"196,30,58"},.35)`,
    transition:"all .2s ease"
  }}>{label}</button>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN APP                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [mode,        setMode]        = useState("ticket");
  const [tickets,     setTickets]     = useState([]);
  const [curTicket,   setCurTicket]   = useState(null);
  const [printing,    setPrinting]    = useState(false);
  const [connected,   setConnected]   = useState(false);
  const [statusMsg,   setStatusMsg]   = useState("Press the button to take a number.");
  const [pos,         setPos]         = useState({x:0,y:0});
  const [isThrow,     setIsThrow]     = useState(false);
  const [trashWig,    setTrashWig]    = useState(false);
  const [petals,      setPetals]      = useState([]);
  const [toast,       setToast]       = useState(null);
  const [isDragging,  setIsDragging]  = useState(false);
  const [adminInput,  setAdminInput]  = useState("");
  const [adminCtr,    setAdminCtr]    = useState("A1");

  const dragRef  = useRef({active:false,ox:0,oy:0,vx:0,vy:0,px:0,py:0,t:0});
  const trashRef = useRef(null);
  const socketRef = useRef(null);
  const currentTicketNumberRef = useRef(null);
  const printingTimeoutRef = useRef(null);
  const postPrintStateTimeoutRef = useRef(null);
  const idleStateTimeoutRef = useRef(null);

  /* ── Inject CSS & fonts ─────────────────────────────── */
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = GLOBAL_CSS;
    document.head.appendChild(s);
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = FONTS_URL;
    document.head.appendChild(l);
    return () => { s.remove(); l.remove(); };
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3800);
  }, []);

  const normalizeTicket = useCallback((ticketInfo, defaultStatus = "waiting") => {
    if (!ticketInfo) return null;
    const number = parseTicketNumber(ticketInfo.number ?? ticketInfo);
    if (!number) return null;
    return {
      id: ticketInfo.id || `ticket-${number}`,
      number,
      counter: ticketInfo.counter || "A1",
      status: ticketInfo.status || defaultStatus,
      time: ticketInfo.time || mkTime(),
      createdAt: ticketInfo.createdAt || Date.now(),
      verifiedAt: ticketInfo.verifiedAt
    };
  }, []);

  /* ── Ticket Actions ─────────────────────────────────── */
  const handleNewTicket = useCallback((ticketInfo, options = {}) => {
    const normalized = normalizeTicket(ticketInfo, "waiting");
    if (!normalized) return;
    const setAsCurrent = options.setAsCurrent !== false;

    setTickets((prev) => {
      const existingIndex = prev.findIndex((t) => t.number === normalized.number);
      if (existingIndex === -1) return [normalized, ...prev];
      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...normalized };
      return next;
    });

    if (setAsCurrent) {
      currentTicketNumberRef.current = normalized.number;
      setCurTicket(normalized);
      setPos({x:0,y:0});
    }
  }, [normalizeTicket]);

  const handleVerify = useCallback((number, counter) => {
    const target = parseTicketNumber(number);
    if (!target) return;
    setTickets(prev => prev.map(t =>
      t.number === target ? {...t, status:"verified", counter: counter||t.counter, verifiedAt: Date.now()} : t
    ));
    setCurTicket(prev =>
      prev?.number === target ? {...prev, status:"verified", counter: counter||prev.counter, verifiedAt: Date.now()} : prev
    );
    setPetals(Array.from({length:14},(_,i) => ({
      id:Date.now()+i, x:Math.random()*window.innerWidth, delay:Math.random()*.9
    })));
    setTimeout(() => setPetals([]), 6000);
    showToast(`✓ Ticket ${target} verified → Counter ${counter}`);
  }, [showToast]);

  const schedulePostPrintMessaging = useCallback((ticketNumber) => {
    if (postPrintStateTimeoutRef.current) clearTimeout(postPrintStateTimeoutRef.current);
    if (idleStateTimeoutRef.current) clearTimeout(idleStateTimeoutRef.current);

    postPrintStateTimeoutRef.current = setTimeout(() => {
      setStatusMsg(`Ticket ${ticketNumber} printed. Please sit down and wait.`);
      idleStateTimeoutRef.current = setTimeout(() => {
        setStatusMsg("Press the button to take a number.");
      }, 3000);
    }, 1400);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    window.socket = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit("get_current_ticket");
      socket.emit("get_tickets_snapshot");
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onCurrentTicketUpdated = (ticketInfo) => {
      handleNewTicket(ticketInfo, { setAsCurrent: true });
      const ticketNumber = parseTicketNumber(ticketInfo?.number);
      if (ticketNumber) setStatusMsg(`Current ticket updated: ${ticketNumber}`);
    };

    const onArduinoRequest = (ticketInfo) => {
      const ticketNumber = parseTicketNumber(ticketInfo?.number);
      if (ticketNumber) {
        handleNewTicket(ticketInfo, { setAsCurrent: true });
        setStatusMsg(`Guest requested ticket: ${ticketNumber}`);
      } else {
        setStatusMsg("Guest is requesting ticket...");
      }
    };

    const onPrintingTicket = (ticketInfo) => {
      setPrinting(true);
      if (printingTimeoutRef.current) clearTimeout(printingTimeoutRef.current);
      printingTimeoutRef.current = setTimeout(() => setPrinting(false), 1400);
      const ticketNumber = parseTicketNumber(ticketInfo?.number);
      if (ticketNumber) {
        handleNewTicket(ticketInfo, { setAsCurrent: true });
        setStatusMsg(`Printing ticket number ${ticketNumber}...`);
        schedulePostPrintMessaging(ticketNumber);
      }
    };

    const onTicketsSnapshot = (snapshot = []) => {
      const normalized = snapshot
        .map((t) => normalizeTicket(t, t?.status || "waiting"))
        .filter(Boolean)
        .sort((a, b) => Number(b.number) - Number(a.number));
      if (!normalized.length) return;
      setTickets(normalized);
      const latest = normalized[0];
      currentTicketNumberRef.current = latest.number;
      setCurTicket(latest);
    };

    const onTicketVerified = (ticketInfo) => {
      const normalized = normalizeTicket({ ...ticketInfo, status: "verified" }, "verified");
      if (!normalized) return;
      handleVerify(normalized.number, normalized.counter);
      setTickets((prev) => prev.map((t) =>
        t.number === normalized.number ? { ...t, ...normalized, status: "verified" } : t
      ));
      setStatusMsg(`Ticket ${normalized.number} verified at counter ${normalized.counter}`);
    };

    const onVerificationError = (err = {}) => {
      if (err.reason === "ticket_not_found") {
        showToast(`Ticket ${err.number || "?"} not found`);
      } else {
        showToast("Ticket verification failed");
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("current_ticket_updated", onCurrentTicketUpdated);
    socket.on("arduino_request", onArduinoRequest);
    socket.on("printing_ticket", onPrintingTicket);
    socket.on("tickets_snapshot", onTicketsSnapshot);
    socket.on("ticket_verified", onTicketVerified);
    socket.on("ticket_verification_error", onVerificationError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("current_ticket_updated", onCurrentTicketUpdated);
      socket.off("arduino_request", onArduinoRequest);
      socket.off("printing_ticket", onPrintingTicket);
      socket.off("tickets_snapshot", onTicketsSnapshot);
      socket.off("ticket_verified", onTicketVerified);
      socket.off("ticket_verification_error", onVerificationError);
      if (printingTimeoutRef.current) clearTimeout(printingTimeoutRef.current);
      if (postPrintStateTimeoutRef.current) clearTimeout(postPrintStateTimeoutRef.current);
      if (idleStateTimeoutRef.current) clearTimeout(idleStateTimeoutRef.current);
      socket.disconnect();
      if (window.socket === socket) {
        delete window.socket;
      }
      socketRef.current = null;
    };
  }, [handleNewTicket, handleVerify, normalizeTicket, schedulePostPrintMessaging, showToast]);

  const simulateArduino = useCallback(() => {
    socketRef.current?.emit("request_ticket");
  }, []);

  const emitVerifyTicket = useCallback((rawNumber, counter) => {
    const number = parseTicketNumber(rawNumber);
    if (!number) {
      showToast("Invalid ticket number from QR");
      return;
    }
    socketRef.current?.emit("verify_ticket", { number, counter });
  }, [showToast]);

  const adminVerify = useCallback(() => {
    const n = parseTicketNumber(adminInput);
    if (!n) return;
    emitVerifyTicket(n, adminCtr);
    setAdminInput("");
  }, [adminInput, adminCtr, emitVerifyTicket]);

  const verifyFromList = useCallback((ticket, counter) => {
    emitVerifyTicket(ticket.number, counter);
  }, [emitVerifyTicket]);

  const verifyFromScan = useCallback((rawNumber) => {
    const number = parseTicketNumber(rawNumber);
    if (!number) return;
    setAdminInput(number);
    emitVerifyTicket(number, adminCtr);
  }, [adminCtr, emitVerifyTicket]);

  /* ── Drag / Flick ───────────────────────────────────── */
  const onPointerDown = useCallback((e) => {
    if (isThrow) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { active:true, ox:e.clientX-pos.x, oy:e.clientY-pos.y, vx:0, vy:0, px:e.clientX, py:e.clientY, t:Date.now() };
    setIsDragging(true);
  }, [isThrow, pos]);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const now = Date.now(), dt = now - dragRef.current.t;
    if (dt > 0) {
      dragRef.current.vx = (e.clientX - dragRef.current.px) / dt * 16;
      dragRef.current.vy = (e.clientY - dragRef.current.py) / dt * 16;
    }
    dragRef.current.px = e.clientX; dragRef.current.py = e.clientY; dragRef.current.t = now;
    setPos({ x: e.clientX - dragRef.current.ox, y: e.clientY - dragRef.current.oy });
  }, []);

  const onPointerUp = useCallback((e) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setIsDragging(false);
    const speed = Math.hypot(dragRef.current.vx, dragRef.current.vy);
    if (speed > 13 && curTicket?.status === "verified") throwToTrash();
  }, [curTicket]);

  const throwToTrash = useCallback(() => {
    setIsThrow(true);
    const r = trashRef.current?.getBoundingClientRect();
    const tx = r ? r.left - 106 : window.innerWidth - 176;
    const ty = r ? r.top  - 160 : window.innerHeight - 210;
    setPos({x:tx, y:ty});
    setTimeout(() => {
      setIsThrow(false);
      setTrashWig(true);
      setTickets(prev => prev.map(t => t.id===curTicket?.id ? {...t,status:"trashed"} : t));
      setCurTicket(null);
      setTimeout(()=>setTrashWig(false), 650);
    }, 520);
  }, [curTicket]);

  /* ── RENDER ─────────────────────────────────────────── */
  return (
    <div style={{
      minHeight:"100vh", background:"#0D0508",
      fontFamily:"'DM Sans',sans-serif", color:"#FFF5EB",
      position:"relative", overflow:"hidden"
    }}>
      {/* Ambient glow */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 90% 55% at 50% -5%,rgba(196,30,58,.13) 0%,transparent 70%), radial-gradient(ellipse 55% 45% at 85% 100%,rgba(212,160,23,.08) 0%,transparent 65%)"
      }}/>
      {/* Subtle dot grid */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none", opacity:.018,
        backgroundImage:"radial-gradient(circle,#D4A017 1px,transparent 1px)",
        backgroundSize:"32px 32px"
      }}/>

      {/* Lanterns */}
      {["7%","22%","50%","78%","93%"].map((x,i)=><Lantern key={i} x={x} delay={i*.65}/>)}

      {/* Petals */}
      {petals.map(p=><Petal key={p.id} x={p.x} delay={p.delay}/>)}

      {/* Trash Can (mode 1 only) */}
      {mode==="ticket" && (
        <div
          ref={trashRef}
          className={trashWig?"trashWig":""}
          style={{
            position:"fixed", bottom:28, right:28, zIndex:100,
            display:"flex", flexDirection:"column", alignItems:"center",
            opacity: curTicket?.status==="verified" ? 1 : 0.3,
            transition:"opacity .45s ease, transform .2s ease",
            transform: curTicket?.status==="verified" ? "scale(1.05)":"scale(1)"
          }}
        >
          <div style={{
            fontSize:8, letterSpacing:1.5, textTransform:"uppercase",
            color:"rgba(255,245,235,.45)", marginBottom:5
          }}>
            {curTicket?.status==="verified" ? "FLICK TO DISMISS":"VERIFIED ONLY"}
          </div>
          <div style={{
            width:56, height:56,
            background: curTicket?.status==="verified"
              ? "linear-gradient(135deg,#2AAA8A,#1A7A6A)"
              : "linear-gradient(135deg,#3D1A1A,#250E0E)",
            borderRadius:11,
            display:"flex", alignItems:"center", justifyContent:"center",
            border:`1.5px solid ${curTicket?.status==="verified"?"rgba(42,170,138,.55)":"rgba(212,160,23,.15)"}`,
            boxShadow: curTicket?.status==="verified"
              ? "0 0 28px rgba(42,170,138,.45)"
              : "0 5px 18px rgba(0,0,0,.55)",
            transition:"all .4s ease", fontSize:26
          }}>
            {curTicket?.status==="verified" ? "✅" : "🗑️"}
          </div>
        </div>
      )}

      {/* ── NAV ── */}
      <nav style={{
        position:"relative", zIndex:50,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"13px 22px",
        background:"rgba(10,3,6,.85)", backdropFilter:"blur(14px)",
        borderBottom:"1px solid rgba(212,160,23,.11)"
      }}>
        {/* Brand */}
        <div>
          <div className="shimmerTx" style={{
            fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:900, letterSpacing:1.5
          }}>缘份号码</div>
          <div style={{fontSize:8,letterSpacing:3.5,color:"rgba(212,160,23,.55)",marginTop:1}}>
            DESTINY QUEUE SYSTEM
          </div>
        </div>

        {/* Mode selector */}
        <div style={{display:"flex",gap:6}}>
          {[["ticket","🎫","TICKET"],["admin","🔐","ADMIN"],["viewer","👁","QUEUE"]].map(([m,ic,lb])=>(
            <button key={m} onClick={()=>setMode(m)} style={{
              padding:"7px 16px", borderRadius:7, border:"none", cursor:"pointer",
              background: mode===m ? "linear-gradient(135deg,#C41E3A,#7A0000)" : "rgba(212,160,23,.07)",
              color: mode===m ? "#FFF5EB" : "rgba(255,245,235,.45)",
              fontSize:9.5, fontWeight:700, letterSpacing:2, textTransform:"uppercase",
              border: mode===m ? "1px solid rgba(212,160,23,.35)" : "1px solid rgba(212,160,23,.1)",
              transition:"all .2s ease", fontFamily:"'DM Sans',sans-serif"
            }}>
              {ic}&nbsp;{lb}
            </button>
          ))}
        </div>

        {/* MQTT Status */}
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{position:"relative",width:10,height:10}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:connected?"#2AAA8A":"#C41E3A"}}/>
            {connected && <div style={{
              position:"absolute",inset:0,borderRadius:"50%",background:"rgba(42,170,138,.5)",
              animation:"ping 1.6s ease-in-out infinite"
            }}/>} 
          </div>
          <span style={{fontSize:8.5,letterSpacing:1.5,color:"rgba(255,245,235,.35)"}}>
            {connected ? "SOCKET LIVE" : "OFFLINE"}
          </span>
        </div>
      </nav>

      {/* Toast */}
      {toast && (
        <div className="scaleIn" style={{
          position:"fixed", top:78, left:"50%", transform:"translateX(-50%)",
          background:"linear-gradient(135deg,#2AAA8A,#178A72)",
          color:"#FFF5EB", padding:"10px 28px", borderRadius:100,
          fontSize:11.5, fontWeight:700, letterSpacing:1.2, zIndex:500,
          boxShadow:"0 12px 45px rgba(42,170,138,.45)",
          border:"1px solid rgba(42,170,138,.55)", whiteSpace:"nowrap"
        }}>
          {toast}
        </div>
      )}

      {/* ── MAIN ── */}
      <main style={{position:"relative",zIndex:10}}>
        {mode==="ticket" && (
          <TicketMode
            curTicket={curTicket}
            printing={printing}
            statusMsg={statusMsg}
            pos={pos} isThrow={isThrow} isDragging={isDragging}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onSimulate={simulateArduino}
            connected={connected}
          />
        )}
        {mode==="admin" && (
          <BarcodeScanner />
        )}
        {mode==="viewer" && <ViewerMode tickets={tickets}/>}
      </main>
    </div>
  );
}

// ...existing code...
