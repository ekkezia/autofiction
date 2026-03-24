// ViewerMode.js
import React from "react";

export default function ViewerMode({ tickets }) {
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
