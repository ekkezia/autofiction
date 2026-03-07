import { useState, useEffect, useRef, useCallback } from "react";

/* ── CONSTANTS ─────────────────────────────────────────────────────────────── */
const MQTT_URL  = "wss://broker.emqx.io:8084/mqtt";
const T_NEW     = "lovequeue_v4/new";
const T_VERIFY  = "lovequeue_v4/verify";
const CLIENT_ID = "lq_" + Math.random().toString(36).slice(2, 10);
const COUNTERS  = ["A1","A2","A3","B1","B2","C1"];

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
  button { font-family: 'DM Sans', sans-serif; }
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
            <QR value={`LOVEQUEUE-${ticket.number}`} size={74} />
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
  const [mqttClient,  setMqttClient]  = useState(null);
  const [connected,   setConnected]   = useState(false);
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

  /* ── Load MQTT.js from CDN ──────────────────────────── */
  useEffect(() => {
    let client = null;
    const script = document.createElement("script");
    script.src = "https://unpkg.com/mqtt@5/dist/mqtt.min.js";
    script.onload = () => {
      try {
        client = window.mqtt.connect(MQTT_URL, { clientId:CLIENT_ID, clean:true, reconnectPeriod:4000 });
        client.on("connect", () => setConnected(true));
        client.on("close",   () => setConnected(false));
        client.on("error",   () => setConnected(false));
        client.on("message", (topic, msg) => {
          try {
            const p = JSON.parse(msg.toString());
            if (topic === T_NEW)    handleNewTicket(p.number || mkNum());
            if (topic === T_VERIFY) handleVerify(String(p.number), p.counter || "A1");
          } catch {}
        });
        client.subscribe([T_NEW, T_VERIFY]);
        setMqttClient(client);
      } catch(e) { console.warn("MQTT init failed:", e); }
    };
    script.onerror = () => console.log("MQTT script blocked – offline mode active");
    document.head.appendChild(script);
    return () => { client?.end(); };
  }, []);

  /* ── Ticket Actions ─────────────────────────────────── */
  const handleNewTicket = useCallback((num) => {
    const t = mkTicket(String(num));
    setTickets(prev => [t, ...prev]);
    setCurTicket(t);
    setPos({x:0,y:0});
    setPrinting(true);
    setTimeout(() => setPrinting(false), 1400);
  }, []);

  const handleVerify = useCallback((number, counter) => {
    setTickets(prev => prev.map(t =>
      t.number === number ? {...t, status:"verified", counter: counter||t.counter} : t
    ));
    setCurTicket(prev =>
      prev?.number === number ? {...prev, status:"verified", counter: counter||prev.counter} : prev
    );
    setPetals(Array.from({length:14},(_,i) => ({
      id:Date.now()+i, x:Math.random()*window.innerWidth, delay:Math.random()*.9
    })));
    setTimeout(() => setPetals([]), 6000);
    showToast(`✓ Ticket ${number} verified → Counter ${counter}`);
  }, []);

  const simulateArduino = useCallback(() => {
    const num = mkNum();
    if (mqttClient?.connected) {
      mqttClient.publish(T_NEW, JSON.stringify({number:num}));
    } else {
      handleNewTicket(num);
    }
  }, [mqttClient, handleNewTicket]);

  const adminVerify = useCallback(() => {
    const n = adminInput.trim();
    if (!n) return;
    if (mqttClient?.connected) {
      mqttClient.publish(T_VERIFY, JSON.stringify({number:n, counter:adminCtr}));
    } else {
      handleVerify(n, adminCtr);
    }
    setAdminInput("");
  }, [adminInput, adminCtr, mqttClient, handleVerify]);

  const verifyFromList = useCallback((ticket, counter) => {
    if (mqttClient?.connected) {
      mqttClient.publish(T_VERIFY, JSON.stringify({number:ticket.number, counter}));
    } else {
      handleVerify(ticket.number, counter);
    }
  }, [mqttClient, handleVerify]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(()=>setToast(null), 3800);
  };

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

  const waiting  = tickets.filter(t=>t.status==="waiting");
  const verified = tickets.filter(t=>t.status==="verified");

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
            {connected ? "MQTT LIVE" : "OFFLINE"}
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
            pos={pos} isThrow={isThrow} isDragging={isDragging}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onSimulate={simulateArduino}
            connected={connected}
          />
        )}
        {mode==="admin" && (
          <AdminMode
            tickets={tickets}
            adminInput={adminInput} setAdminInput={setAdminInput}
            adminCtr={adminCtr} setAdminCtr={setAdminCtr}
            onVerify={adminVerify}
            onVerifyList={verifyFromList}
            counters={COUNTERS}
          />
        )}
        {mode==="viewer" && <ViewerMode tickets={tickets}/>}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MODE 1 — TICKET                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
function TicketMode({ curTicket, printing, pos, isThrow, isDragging, onPointerDown, onPointerMove, onPointerUp, onSimulate, connected }) {
  return (
    <div style={{
      height:"calc(100vh - 62px)", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", position:"relative"
    }}>
      {/* Star/auspicious pattern bg */}
      <div style={{
        position:"absolute", inset:0, zIndex:0, pointerEvents:"none", opacity:.032,
        backgroundImage:`url("data:image/svg+xml,%3Csvg width='70' height='70' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23D4A017' d='M35 8l3.5 10.5H50l-8.8 6.4 3.5 10.5L35 29l-9.7 6.4 3.5-10.5L20 18.5h11.5z'/%3E%3C/svg%3E")`,
        backgroundSize:"70px 70px"
      }}/>

      {!curTicket ? (
        /* Empty state */
        <div style={{textAlign:"center",position:"relative",zIndex:1,padding:"0 20px"}}>
          <div style={{
            fontFamily:"'Noto Serif SC',serif", fontSize:13, letterSpacing:4,
            color:"rgba(212,160,23,.45)", marginBottom:8
          }}>等候取号</div>
          <div style={{
            fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:900,
            color:"rgba(255,245,235,.2)", marginBottom:8, letterSpacing:2
          }}>WAITING FOR TICKET</div>
          <div style={{
            fontSize:12, color:"rgba(255,245,235,.22)", marginBottom:44,
            letterSpacing:1.5, fontFamily:"'Noto Serif SC',serif"
          }}>请按下按钮取号，或等待 Arduino 信号</div>

          <div style={{
            width:90, height:90, borderRadius:"50%", margin:"0 auto 40px",
            background:"linear-gradient(135deg,rgba(196,30,58,.18),rgba(212,160,23,.08))",
            border:"1px dashed rgba(212,160,23,.28)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:40, animation:"throb 2.5s ease-in-out infinite"
          }}>🎫</div>

          <SimBtn onClick={onSimulate} label={connected ? "📡  ARDUINO SIGNAL" : "🎫  TAKE A NUMBER"}/>
          <div style={{
            marginTop:14, fontSize:9, letterSpacing:2,
            color:"rgba(255,245,235,.15)"
          }}>
            {connected ? "CONNECTED · broker.emqx.io · " + T_NEW : "OFFLINE — CLICK TO SIMULATE ARDUINO"}
          </div>
        </div>
      ) : (
        /* Ticket in view */
        <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
          {/* Verified banner */}
          {curTicket.status==="verified" && (
            <div className="scaleIn" style={{
              textAlign:"center", marginBottom:22,
              fontFamily:"'Noto Serif SC',serif", fontSize:13, fontWeight:600,
              color:"#2AAA8A", letterSpacing:2.5
            }}>
              ✨ 您的号码已验证！请前往柜台 <span style={{
                fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:16
              }}>{curTicket.counter}</span> ✨
            </div>
          )}

          {/* Draggable ticket */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
              transform:`translate(${pos.x}px,${pos.y}px)`,
              transition: isThrow
                ? "transform .52s cubic-bezier(.22,.61,.36,1),opacity .52s ease"
                : isDragging ? "none" : "transform .35s ease",
              opacity: isThrow ? 0 : 1,
              filter: isDragging ? "drop-shadow(0 30px 40px rgba(0,0,0,.7))" : undefined
            }}
          >
            <TicketCard ticket={curTicket} isPrinting={printing} dragProps={{}}/>
          </div>

          {/* Hint text */}
          <div style={{
            marginTop:22, fontSize:9, letterSpacing:2, textAlign:"center",
            color:"rgba(255,245,235,.22)", lineHeight:1.8
          }}>
            {curTicket.status==="verified"
              ? "DRAG & FLICK TO DISMISS  ·  拖拽并抛出以关闭"
              : "DRAG TICKET FREELY  ·  等待验证中"
            }
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position:"absolute", bottom:30,
        display:"flex", flexDirection:"column", alignItems:"center", gap:10, zIndex:1
      }}>
        {curTicket && (
          <SimBtn onClick={onSimulate} label="+ NEW TICKET" small/>
        )}
        {!curTicket && null}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MODE 2 — ADMIN                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
function AdminMode({ tickets, adminInput, setAdminInput, adminCtr, setAdminCtr, onVerify, onVerifyList, counters }) {
  const waiting  = tickets.filter(t=>t.status==="waiting");
  const verified = tickets.filter(t=>t.status==="verified");

  return (
    <div style={{height:"calc(100vh - 62px)",overflowY:"auto",padding:"26px 22px"}}>
      <div style={{maxWidth:720, margin:"0 auto"}}>

        {/* Header */}
        <div style={{marginBottom:26}}>
          <div style={{
            fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:900,
            color:"#FFF5EB", marginBottom:3
          }}>验证号码</div>
          <div style={{fontSize:9,letterSpacing:3.5,color:"rgba(212,160,23,.55)"}}>
            ADMIN VERIFICATION PANEL · 管理员操作台
          </div>
        </div>

        {/* Manual input card */}
        <div style={{
          background:"rgba(255,245,235,.04)", border:"1px solid rgba(212,160,23,.14)",
          borderRadius:14, padding:"20px 22px", marginBottom:24
        }}>
          <div style={{fontSize:9,letterSpacing:2.5,color:"rgba(212,160,23,.65)",marginBottom:13,textTransform:"uppercase"}}>
            Scan QR or Enter Ticket Number
          </div>
          <div style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"center"}}>
            <input
              value={adminInput}
              onChange={e=>setAdminInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&onVerify()}
              placeholder="e.g. 1042"
              style={{
                flex:1, minWidth:120, padding:"11px 16px",
                background:"rgba(255,245,235,.06)", border:"1px solid rgba(212,160,23,.2)",
                borderRadius:9, color:"#FFF5EB", fontSize:18,
                fontFamily:"'Playfair Display',serif", fontWeight:700,
              }}
            />
            <select value={adminCtr} onChange={e=>setAdminCtr(e.target.value)} style={{
              padding:"11px 14px", background:"rgba(255,245,235,.06)",
              border:"1px solid rgba(212,160,23,.2)", borderRadius:9,
              color:"#FFF5EB", fontSize:12, fontFamily:"'DM Sans',sans-serif",
              cursor:"pointer"
            }}>
              {counters.map(c=><option key={c} value={c} style={{background:"#1C0A10"}}>Counter {c}</option>)}
            </select>
            <button onClick={onVerify} style={{
              padding:"11px 22px",
              background:"linear-gradient(135deg,#C41E3A,#8B0000)",
              color:"#FFF5EB", border:"1px solid rgba(212,160,23,.3)",
              borderRadius:9, fontSize:11, fontWeight:700, letterSpacing:2,
              cursor:"pointer", textTransform:"uppercase"
            }}>VERIFY ✓</button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{display:"flex",gap:10,marginBottom:24,flexWrap:"wrap"}}>
          {[{l:"WAITING",n:waiting.length,c:"#D4A017"},{l:"VERIFIED",n:verified.length,c:"#2AAA8A"},{l:"TOTAL",n:tickets.length,c:"rgba(255,245,235,.4)"}].map(s=>(
            <div key={s.l} style={{
              flex:1, minWidth:100,
              background:"rgba(255,245,235,.03)", border:`1px solid ${s.c}22`,
              borderRadius:12, padding:"14px 16px", textAlign:"center"
            }}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:900,color:s.c}}>{s.n}</div>
              <div style={{fontSize:8,letterSpacing:2,color:"rgba(255,245,235,.3)",marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Waiting tickets list */}
        <div style={{fontSize:9,letterSpacing:2.5,color:"rgba(212,160,23,.55)",marginBottom:12,textTransform:"uppercase"}}>
          WAITING TICKETS ({waiting.length})
        </div>
        {waiting.length===0 && (
          <div style={{
            textAlign:"center",padding:"40px",fontSize:12,
            color:"rgba(255,245,235,.18)",letterSpacing:2,
            border:"1px dashed rgba(212,160,23,.1)", borderRadius:12
          }}>暂无等待号码 · NO WAITING TICKETS</div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:26}}>
          {waiting.map(t=>(
            <div key={t.id} style={{
              display:"flex", alignItems:"center",
              background:"rgba(255,245,235,.035)",
              border:"1px solid rgba(212,160,23,.12)",
              borderRadius:11, padding:"12px 16px", gap:16, flexWrap:"wrap"
            }}>
              <div style={{
                fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:900,
                color:"#FFF5EB", minWidth:68
              }}>{t.number}</div>
              <div style={{flex:1,minWidth:80}}>
                <div style={{fontSize:7.5,letterSpacing:2,color:"rgba(212,160,23,.55)"}}>ISSUED · TIME</div>
                <div style={{fontSize:12,color:"rgba(255,245,235,.65)"}}>{t.time}</div>
              </div>
              <div style={{marginRight:8}}>
                <div style={{fontSize:7.5,letterSpacing:2,color:"rgba(212,160,23,.55)"}}>AUTO COUNTER</div>
                <div style={{
                  fontFamily:"'Playfair Display',serif", fontSize:18,
                  fontWeight:900, color:"#C41E3A"
                }}>{t.counter}</div>
              </div>
              {/* Counter buttons */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {counters.map(c=>(
                  <button key={c} onClick={()=>onVerifyList(t,c)} style={{
                    padding:"6px 13px",
                    background: t.counter===c
                      ? "linear-gradient(135deg,#2AAA8A,#1A7A6A)"
                      : "rgba(42,170,138,.1)",
                    color: t.counter===c ? "#FFF5EB" : "rgba(42,170,138,.7)",
                    border:`1px solid rgba(42,170,138,${t.counter===c?".5":".2"})`,
                    borderRadius:7, fontSize:10, fontWeight:700, letterSpacing:.8,
                    cursor:"pointer"
                  }}>{c} ✓</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Recently verified */}
        {verified.length > 0 && (<>
          <div style={{fontSize:9,letterSpacing:2.5,color:"rgba(42,170,138,.55)",marginBottom:12,textTransform:"uppercase"}}>
            RECENTLY VERIFIED ({verified.length})
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {verified.slice(0,8).map(t=>(
              <div key={t.id} style={{
                display:"flex",alignItems:"center",gap:14,
                background:"rgba(42,170,138,.05)",
                border:"1px solid rgba(42,170,138,.12)",
                borderRadius:9, padding:"10px 16px", opacity:.8
              }}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:"rgba(42,170,138,.8)",minWidth:55}}>
                  {t.number}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:"rgba(255,245,235,.35)"}}>Verified · {t.time}</div>
                </div>
                <div style={{
                  fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:900,color:"#2AAA8A"
                }}>→ {t.counter}</div>
                <div style={{
                  fontSize:9,fontWeight:700,letterSpacing:1,
                  color:"#2AAA8A",opacity:.75
                }}>✓ DONE</div>
              </div>
            ))}
          </div>
        </>)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MODE 3 — VIEWER                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
function ViewerMode({ tickets }) {
  const waiting  = tickets.filter(t=>t.status==="waiting");
  const verified = tickets.filter(t=>t.status==="verified");
  const trashed  = tickets.filter(t=>t.status==="trashed");
  const nowServing = verified[0];

  return (
    <div style={{height:"calc(100vh - 62px)",overflowY:"auto",padding:"24px 22px"}}>
      <div style={{maxWidth:820, margin:"0 auto"}}>

        {/* Now Serving hero */}
        {nowServing ? (
          <div className="goldPulse" style={{
            background:"linear-gradient(135deg,rgba(196,30,58,.14),rgba(212,160,23,.07))",
            border:"1px solid rgba(212,160,23,.28)", borderRadius:18,
            padding:"24px 32px", marginBottom:24, textAlign:"center"
          }}>
            <div style={{
              fontSize:9, letterSpacing:5, color:"rgba(212,160,23,.6)",
              marginBottom:6, textTransform:"uppercase"
            }}>NOW SERVING · 现在服务</div>
            <div style={{
              fontFamily:"'Playfair Display',serif", fontSize:68, fontWeight:900,
              color:"#FFF5EB", lineHeight:1
            }}>{nowServing.number}</div>
            <div style={{marginTop:8, display:"flex", alignItems:"center", justifyContent:"center", gap:16}}>
              <div style={{
                fontFamily:"'Noto Serif SC',serif", fontSize:13,
                color:"rgba(255,245,235,.55)"
              }}>请前往柜台</div>
              <div style={{
                fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:900,
                color:"#D4A017"
              }}>{nowServing.counter}</div>
              <div style={{
                fontFamily:"'Noto Serif SC',serif", fontSize:13,
                color:"rgba(255,245,235,.55)"
              }}>Please proceed</div>
            </div>
          </div>
        ) : (
          <div style={{
            background:"rgba(255,245,235,.02)", border:"1px dashed rgba(212,160,23,.15)",
            borderRadius:18, padding:"28px", marginBottom:24, textAlign:"center"
          }}>
            <div style={{
              fontFamily:"'Noto Serif SC',serif",fontSize:13,
              color:"rgba(255,245,235,.22)",letterSpacing:3
            }}>等候服务 · WAITING TO SERVE</div>
          </div>
        )}

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:28}}>
          {[
            {icon:"⏳",l:"WAITING · 等待",n:waiting.length,c:"#D4A017",bg:"rgba(212,160,23,.06)"},
            {icon:"✅",l:"VERIFIED · 已验证",n:verified.length,c:"#2AAA8A",bg:"rgba(42,170,138,.06)"},
            {icon:"🎫",l:"TOTAL ISSUED",n:tickets.length,c:"rgba(255,245,235,.45)",bg:"rgba(255,245,235,.03)"}
          ].map(s=>(
            <div key={s.l} style={{
              background:s.bg, border:`1px solid ${s.c}22`,
              borderRadius:14, padding:"18px 12px", textAlign:"center"
            }}>
              <div style={{fontSize:26,marginBottom:5}}>{s.icon}</div>
              <div style={{
                fontFamily:"'Playfair Display',serif",fontSize:36,
                fontWeight:900,color:s.c,lineHeight:1
              }}>{s.n}</div>
              <div style={{fontSize:7.5,letterSpacing:2,color:"rgba(255,245,235,.3)",marginTop:4}}>
                {s.l}
              </div>
            </div>
          ))}
        </div>

        {/* Full queue */}
        <div style={{fontSize:9,letterSpacing:2.5,color:"rgba(212,160,23,.55)",marginBottom:13,textTransform:"uppercase"}}>
          FULL QUEUE · 完整队列
        </div>
        {tickets.length===0 && (
          <div style={{
            textAlign:"center",padding:"55px",fontSize:12,
            color:"rgba(255,245,235,.16)",letterSpacing:2,
            border:"1px dashed rgba(212,160,23,.1)",borderRadius:14
          }}>暂无号码 · NO TICKETS YET</div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {tickets.map((t,i)=>{
            const sc = {waiting:"#D4A017",verified:"#2AAA8A",trashed:"#4A4A4A"}[t.status];
            const sb = {waiting:"rgba(212,160,23,.07)",verified:"rgba(42,170,138,.07)",trashed:"rgba(0,0,0,.15)"}[t.status];
            return (
              <div key={t.id} className="fadeUp" style={{
                display:"flex", alignItems:"center",
                background:sb, border:`1px solid ${sc}20`,
                borderRadius:11, padding:"11px 16px",
                opacity:t.status==="trashed"?.38:1,
                transition:"all .3s ease"
              }}>
                {/* Position no. */}
                <div style={{
                  width:32, textAlign:"right", paddingRight:12,
                  fontSize:10, color:"rgba(255,245,235,.25)", fontWeight:500, flexShrink:0
                }}>{String(i+1).padStart(2,"0")}</div>

                {/* Ticket number */}
                <div style={{
                  fontFamily:"'Playfair Display',serif", fontSize:28,
                  fontWeight:900, color:t.status==="trashed"?"#444":"#FFF5EB",
                  minWidth:84, lineHeight:1
                }}>{t.number}</div>

                {/* Vertical divider */}
                <div style={{width:1,height:32,background:"rgba(255,245,235,.06)",margin:"0 14px 0 4px",flexShrink:0}}/>

                {/* Counter */}
                <div style={{minWidth:68}}>
                  <div style={{fontSize:7,letterSpacing:2,color:"rgba(255,245,235,.28)"}}>COUNTER</div>
                  <div style={{
                    fontFamily:"'Playfair Display',serif",fontSize:20,
                    fontWeight:900,color:sc,lineHeight:1.1
                  }}>{t.counter}</div>
                </div>

                {/* Time */}
                <div style={{flex:1, paddingLeft:10}}>
                  <div style={{fontSize:7,letterSpacing:2,color:"rgba(255,245,235,.28)"}}>ISSUED</div>
                  <div style={{fontSize:12,color:"rgba(255,245,235,.5)"}}>{t.time}</div>
                </div>

                {/* Status badge */}
                <div style={{
                  padding:"5px 13px",
                  background:`${sc}1A`, border:`1px solid ${sc}44`,
                  borderRadius:100, fontSize:9, fontWeight:700,
                  color:sc, letterSpacing:1.2, minWidth:92, textAlign:"center"
                }}>
                  {t.status==="waiting"?"⏳ WAITING":t.status==="verified"?"✓ VERIFIED":"✗ DONE"}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{height:40}}/>
      </div>
    </div>
  );
}