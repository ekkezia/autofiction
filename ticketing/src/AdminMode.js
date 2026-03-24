// AdminMode.js
import React, { useState, useRef, useEffect } from "react";

export default function AdminMode({ tickets, adminInput, setAdminInput, adminCtr, setAdminCtr, onVerify, onScanVerify, onVerifyList, counters, connected }) {
  const waiting  = tickets.filter(t=>t.status==="waiting");
  const verified = tickets.filter(t=>t.status==="verified");
  const [scannerOn, setScannerOn] = React.useState(false);
  const [scannerState, setScannerState] = React.useState("Camera idle");
  const [scannerError, setScannerError] = React.useState("");
  const scannerDivRef = React.useRef(null);
  const lastScannedRef = React.useRef({ value: "", at: 0 });

  React.useEffect(() => {
    if (!scannerOn) return undefined;
    let mounted = true;
    setScannerError("");
    setScannerState("Initializing camera...");

    // Quagga is only needed in AdminMode, so require it here
    let Quagga;
    import("quagga").then(module => {
      Quagga = module.default;
      const onDetected = (data) => {
        if (!mounted) return;
        const raw = data.codeResult.code;
        const number = raw && String(raw).match(/\d+/)?.[0];
        if (!number) {
          setScannerState("Barcode detected but ticket number not recognized");
          return;
        }
        const now = Date.now();
        if (lastScannedRef.current.value === number && now - lastScannedRef.current.at < 2000) {
          return;
        }
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate([100]);
        }
        lastScannedRef.current = { value: number, at: now };
        setScannerState(`✅ Scanned ticket ${number}, verifying...`);
        setAdminInput(number);
        onScanVerify(number);
      };
      Quagga.init({
        inputStream: {
          type: "LiveStream",
          target: scannerDivRef.current,
          constraints: {
            facingMode: "environment"
          },
          area: {
            top: "20%",
            right: "20%",
            left: "20%",
            bottom: "20%"
          }
        },
        decoder: {
          readers: ["code_128_reader"]
        },
        locate: true
      }, (err) => {
        if (err) {
          setScannerError("Unable to open camera: " + err.message);
          setScannerState("Use manual input fallback");
          return;
        }
        Quagga.start();
        setScannerState("Camera live. Align barcode in the box.");
      });
      Quagga.onDetected(onDetected);
    });

    return () => {
      mounted = false;
      if (Quagga) {
        Quagga.offDetected && Quagga.offDetected();
        Quagga.stop && Quagga.stop();
      }
    };
  }, [onScanVerify, scannerOn, setAdminInput]);

  return (
    <div style={{height:"calc(100vh - 62px)",overflowY:"auto",padding:"26px 22px"}}>
      <div style={{maxWidth:720, margin:"0 auto"}}>
        <div style={{marginBottom:26}}>
          <div style={{
            fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:900,
            color:"#FFF5EB", marginBottom:3
          }}>验证号码</div>
          <div style={{fontSize:9,letterSpacing:3.5,color:"rgba(212,160,23,.55)"}}>
            ADMIN VERIFICATION PANEL · 管理员操作台
          </div>
        </div>
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
          <div style={{
            marginTop:14, background:"rgba(255,245,235,.03)",
            border:"1px solid rgba(212,160,23,.16)", borderRadius:10, padding:12
          }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
              <div style={{fontSize:9,letterSpacing:1.5,color:"rgba(212,160,23,.7)"}}>
                QR CAMERA SCANNER
              </div>
              <button
                onClick={() => setScannerOn((v) => !v)}
                style={{
                  padding:"7px 12px",
                  borderRadius:8,
                  border:"1px solid rgba(42,170,138,.35)",
                  background: scannerOn
                    ? "linear-gradient(135deg,#3D1A1A,#250E0E)"
                    : "linear-gradient(135deg,#2AAA8A,#1A7A6A)",
                  color:"#FFF5EB",
                  fontSize:10,
                  fontWeight:700,
                  letterSpacing:1,
                  cursor:"pointer"
                }}
              >
                {scannerOn ? "STOP CAMERA" : "START CAMERA"}
              </button>
            </div>
            <div style={{marginTop:8,fontSize:10,color:"rgba(255,245,235,.5)"}}>
              {scannerError || scannerState}
            </div>
            <div style={{
              marginTop:10, borderRadius:8, overflow:"hidden",
              border:"1px solid rgba(212,160,23,.2)", background:"rgba(0,0,0,.3)"
            }}>
              <div
                ref={scannerDivRef}
                style={{
                  width: "100%",
                  minHeight: 220,
                  display: scannerOn ? "block" : "none",
                  background: "#222",
                  borderRadius: 8,
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                {/* Scanning area overlay */}
                {scannerOn && (
                  <div style={{
                    position: "absolute",
                    top: "20%",
                    left: "20%",
                    width: "60%",
                    height: "60%",
                    border: "3px solid #2AAA8A",
                    borderRadius: 12,
                    boxSizing: "border-box",
                    zIndex: 10,
                    pointerEvents: "none",
                    background: "rgba(42,170,138,0.05)",
                    transition: "border-color 0.2s",
                    overflow: "hidden"
                  }}>
                    {/* Scanner animation line */}
                    <div style={{
                      position: "absolute",
                      left: 0,
                      width: "100%",
                      height: 3,
                      background: "linear-gradient(90deg,#2AAA8A 60%,#FFF5EB 100%)",
                      boxShadow: "0 0 12px 2px #2AAA8A88",
                      animation: "scanline-move 1.6s linear infinite"
                    }} />
                    {/* Animation keyframes */}
                    <style>{`
                      @keyframes scanline-move {
                        0% { top: 0; }
                        100% { top: calc(100% - 3px); }
                      }
                    `}</style>
                    <div style={{
                      position: "absolute",
                      top: -18,
                      left: 0,
                      width: "100%",
                      textAlign: "center",
                      color: "#2AAA8A",
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: 1.5,
                      textShadow: "0 2px 8px #0008"
                    }}>
                      Align barcode inside the box
                    </div>
                  </div>
                )}
              </div>
              {!scannerOn && (
                <div style={{
                  padding:"16px 12px", textAlign:"center", fontSize:10,
                  color:"rgba(255,245,235,.35)", letterSpacing:1
                }}>
                  Camera preview will appear here.
                </div>
              )}
            </div>
            <div style={{marginTop:8,fontSize:9,color:"rgba(255,245,235,.38)"}}>
              Scans `MATCHFIT-1234` QR codes and auto-verifies with selected counter ({adminCtr}).
              {!connected && " Socket is offline."}
            </div>
          </div>
        </div>
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
