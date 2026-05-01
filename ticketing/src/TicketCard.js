// TicketCard.js
import React from "react";

const DashLine = () => (
  <div style={{
    height:1,
    background:"repeating-linear-gradient(90deg,transparent,transparent 5px,rgba(196,30,58,.2) 5px,rgba(196,30,58,.2) 11px)"
  }} />
);

const QR = ({ value, size = 88 }) => (
  <img
    src={`https://api.qrserver.com/v1/create-qr-code/?size=${size*2}x${size*2}&data=${encodeURIComponent(value)}&color=2D0010&bgcolor=FFF5EB&margin=4`}
    width={size} height={size} alt="QR"
    style={{ display:"block", imageRendering:"crisp-edges", borderRadius:4 }}
  />
);

const TRow = ({l,v,vs}) => (
  <div style={{marginBottom:7}}>
    <div style={{fontSize:7,letterSpacing:2,color:"#9B8880",textTransform:"uppercase"}}>{l}</div>
    <div style={{fontSize:13,fontWeight:600,color:"#1A0A0E",...vs}}>{v}</div>
  </div>
);

export default function TicketCard({ ticket, isPrinting, dragProps, style }) {
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
            <QR value={`THE RECOGNITION OFFICE-${ticket.number}`} size={74} />
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
}
