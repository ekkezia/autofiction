import { useState, useEffect, useRef, useCallback } from "react";

const CODE128_PATTERNS = {
  START_B: "11010010000",
  STOP: "1100011101011",
  CHARS: [
    " ","!",'"',"#","$","%","&","'","(",")","*","+",",","-",".","/",
    "0","1","2","3","4","5","6","7","8","9",":",";","<","=",">","?",
    "@","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O",
    "P","Q","R","S","T","U","V","W","X","Y","Z","[","\\","]","^","_",
    "`","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o",
    "p","q","r","s","t","u","v","w","x","y","z","{","|","}","~","DEL"
  ],
  VALUES: [
    "11011001100","11001101100","11001100110","10010011000","10010001100",
    "10001001100","10011001000","10011000100","10001100100","11001001000",
    "11001000100","11000100100","10110011100","10011011100","10011001110",
    "10111001100","10011101100","10011100110","11001110010","11001011100",
    "11001001110","11011100100","11001110100","11101101110","11101001100",
    "11100101100","11100100110","11101100100","11100110100","11100110010",
    "11011011000","11011000110","11000110110","10100011000","10001011000",
    "10001000110","10110001000","10001101000","10001100010","11010001000",
    "11000101000","11000100010","10110111000","10110001110","10001101110",
    "10111011000","10111000110","10001110110","11101110110","11010001110",
    "11000101110","11011101000","11011100010","11011101110","11101011000",
    "11101000110","11100010110","11101101000","11101100010","11100011010",
    "11101111010","11001000010","11110001010","10100110000","10100001100",
    "10010110000","10010000110","10000101100","10000100110","10110010000",
    "10110000100","10011010000","10011000010","10000110100","10000110010",
    "11000010010","11001010000","11110111010","11000010100","10001111010",
    "10100111100","10010111100","10010011110","10111100100","10011110100",
    "10011110010","11110100100","11110010100","11110010010","11011011110",
    "11011110110","11110110110","10101111000","10100011110","10001011110"
  ]
};

function encodeCode128(text) {
  if (!text) return null;
  let checksum = 104;
  let binary = CODE128_PATTERNS.START_B;
  for (let i = 0; i < text.length; i++) {
    const charIndex = CODE128_PATTERNS.CHARS.indexOf(text[i]);
    if (charIndex === -1) return null;
    checksum += (charIndex + 1) * (i + 1);
    binary += CODE128_PATTERNS.VALUES[charIndex];
  }
  const checksumIndex = (checksum - 104) % 103;
  binary += CODE128_PATTERNS.VALUES[checksumIndex];
  binary += CODE128_PATTERNS.STOP;
  return binary;
}

function decodeCode128(binary) {
  if (!binary) return null;
  if (!binary.startsWith(CODE128_PATTERNS.START_B)) return null;
  if (!binary.endsWith(CODE128_PATTERNS.STOP)) return null;
  let pos = CODE128_PATTERNS.START_B.length;
  // dataEnd excludes stop (13 bits). Last 11-bit symbol before stop is the checksum — skip it.
  const dataEnd = binary.length - CODE128_PATTERNS.STOP.length - 11;
  const valueToChar = {};
  CODE128_PATTERNS.VALUES.forEach((v, i) => {
    if (i < CODE128_PATTERNS.CHARS.length) valueToChar[v] = CODE128_PATTERNS.CHARS[i];
  });
  let decoded = "";
  while (pos + 11 <= dataEnd) {
    const chunk = binary.slice(pos, pos + 11);
    const ch = valueToChar[chunk];
    if (ch !== undefined) decoded += ch;
    pos += 11;
  }
  return decoded;
}

function BarcodeDisplay({ binary, width = 600, height = 120 }) {
  if (!binary) return null;
  const bars = binary.split("").map(Number);
  const quietZone = 20;
  const barWidth = (width - quietZone * 2) / bars.length;
  let x = quietZone;
  const rects = [];
  bars.forEach((b, i) => {
    if (b === 1) rects.push(<rect key={i} x={x} y={10} width={barWidth} height={height - 20} fill="currentColor" />);
    x += barWidth;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", color: "var(--color-text-primary)" }}>
      {rects}
    </svg>
  );
}

function PixelRowViz({ grayscale, threshold }) {
  if (!grayscale || grayscale.length === 0) return null;
  const W = 560, H = 44;
  const step = W / grayscale.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block", borderRadius: 4, border: "0.5px solid var(--color-border-tertiary)" }}>
      {grayscale.map((v, i) => (
        <rect key={i} x={i * step} y={0} width={Math.max(step, 1)} height={H}
          fill={v < threshold ? "#111" : `rgb(${v},${v},${v})`} />
      ))}
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgba(29,158,117,0.7)" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={4} y={H - 5} fontSize={9} fill="rgba(29,158,117,0.9)">threshold={Math.round(threshold)}</text>
    </svg>
  );
}

function DebugPanel({ dbg }) {
  if (!dbg) {
    return (
      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0 }}>start camera to see debug info</p>
    );
  }

  const ok = (v) => ({ color: v ? "var(--color-text-success)" : "var(--color-text-danger)" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 5px", letterSpacing: "0.06em" }}>binarised pixel row (center scan line)</p>
        <PixelRowViz grayscale={dbg.grayscaleSample} threshold={dbg.thresholdVal} />
      </div>

      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <tbody>
          {[
            ["frame", `${dbg.frameW} × ${dbg.frameH} px`],
            ["avg luma (threshold)", dbg.threshold],
            ["dark run count", dbg.darkRunCount],
            ["narrow module (px)", dbg.narrowMod],
            ["encoded bits", dbg.encodedLen],
            ["start marker", dbg.hasStart ? "✓ found" : "✗ missing"],
            ["stop marker",  dbg.hasStop  ? "✓ found" : "✗ missing"],
            ["chunk matches", dbg.chunkTotal > 0 ? `${dbg.chunkMatched} / ${dbg.chunkTotal}` : "—"],
            ["decoded",      dbg.decoded  ?? "—"],
          ].map(([label, val], i) => {
            let color = "var(--color-text-primary)";
            if (label === "start marker") color = ok(dbg.hasStart).color;
            if (label === "stop marker")  color = ok(dbg.hasStop).color;
            if (label === "chunk matches" && dbg.chunkTotal > 0)
              color = dbg.chunkMatched / dbg.chunkTotal >= 0.8 ? "var(--color-text-success)" : "var(--color-text-warning)";
            if (label === "decoded" && dbg.decoded) color = "var(--color-text-success)";
            return (
              <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "5px 0 5px 0", color: "var(--color-text-secondary)", width: "52%" }}>{label}</td>
                <td style={{ padding: "5px 0", color, fontWeight: label === "decoded" && dbg.decoded ? 500 : 400 }}>{String(val)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div>
        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 5px", letterSpacing: "0.06em" }}>first 80 encoded bits</p>
        <p style={{ fontSize: 10, color: "var(--color-text-secondary)", margin: 0, wordBreak: "break-all", lineHeight: 2, fontFamily: "var(--font-mono)" }}>
          {dbg.encodedSnippet || "—"}
        </p>
      </div>

      {dbg.hint && (
        <p style={{ fontSize: 12, color: "var(--color-text-warning)", margin: 0, padding: "8px 10px", background: "var(--color-background-warning)", borderRadius: "var(--border-radius-md)" }}>
          hint: {dbg.hint}
        </p>
      )}
    </div>
  );
}

function ScannerOverlay({ onDecode, onDebug }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanLine, setScanLine] = useState(50);
  const dirRef = useRef(1);

  const decodeFromCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const knownSet = new Set(CODE128_PATTERNS.VALUES);

    // Helper: RLE-encode one pixel row into runs
    function rowToRuns(y) {
      const imageData = ctx.getImageData(0, y, canvas.width, 1);
      const px = imageData.data;
      const gray = [];
      for (let i = 0; i < px.length; i += 4)
        gray.push(Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]));
      const thresh = gray.reduce((a, b) => a + b, 0) / gray.length;
      const bin = gray.map(v => (v < thresh ? 1 : 0));
      const runs = [];
      let cur = bin[0], cnt = 1;
      for (let i = 1; i < bin.length; i++) {
        if (bin[i] === cur) cnt++;
        else { runs.push({ val: cur, len: cnt }); cur = bin[i]; cnt = 1; }
      }
      runs.push({ val: cur, len: cnt });
      return { runs, gray, thresh };
    }

    // Helper: given runs + a narrowMod width, return bit string + match stats
    function tryModuleWidth(runs, narrowMod) {
      const enc = runs.map(r => {
        const m = Math.max(1, Math.round(r.len / narrowMod));
        return (r.val === 1 ? "1" : "0").repeat(m);
      }).join("");
      const si = enc.indexOf(CODE128_PATTERNS.START_B);
      if (si === -1) return null;
      const hasStop = enc.includes(CODE128_PATTERNS.STOP);
      const payload = enc.slice(si + CODE128_PATTERNS.START_B.length);
      let matched = 0, total = 0;
      for (let i = 0; i + 11 <= payload.length; i += 11) {
        total++;
        if (knownSet.has(payload.slice(i, i + 11))) matched++;
      }
      return { enc, si, hasStop, matched, total, narrowMod };
    }

    // Helper: attempt decode, optionally without requiring stop
    function attemptDecode(enc, si, requireStop) {
      const slice = enc.slice(si);
      if (requireStop) return decodeCode128(slice);
      // Reconstruct a fake stop so decodeCode128 can proceed
      // Strip stop check temporarily by inlining the logic
      if (!slice.startsWith(CODE128_PATTERNS.START_B)) return null;
      let pos = CODE128_PATTERNS.START_B.length;
      const valueToChar = {};
      CODE128_PATTERNS.VALUES.forEach((v, i) => {
        if (i < CODE128_PATTERNS.CHARS.length) valueToChar[v] = CODE128_PATTERNS.CHARS[i];
      });
      // Collect all valid 11-bit chunks until we run out, drop the last (checksum)
      const chars = [];
      while (pos + 11 <= slice.length) {
        const chunk = slice.slice(pos, pos + 11);
        if (!knownSet.has(chunk)) break; // stop at first bad chunk
        const ch = valueToChar[chunk];
        if (ch !== undefined) chars.push(ch);
        pos += 11;
      }
      // Last valid chunk is the checksum symbol — drop it
      chars.pop();
      return chars.length > 0 ? chars.join("") : null;
    }

    // Scan 7 rows evenly spread across the middle 60% of the frame
    const H = canvas.height;
    const scanYs = [0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65].map(f => Math.floor(f * H));

    let globalBest = null; // { matched, total, enc, si, hasStop, narrowMod, gray, thresh }

    for (const y of scanYs) {
      const { runs, gray, thresh } = rowToRuns(y);
      const allLens = runs.map(r => r.len).sort((a, b) => a - b);
      const p5  = allLens[Math.max(0, Math.floor(allLens.length * 0.05))];
      const p25 = allLens[Math.max(0, Math.floor(allLens.length * 0.25))];
      for (let w = Math.max(1, p5 - 1); w <= p25 + 2; w++) {
        const res = tryModuleWidth(runs, w);
        if (!res) continue;
        // Prefer stop found; within same stop status prefer more matches
        const score = (res.hasStop ? 1000 : 0) + res.matched;
        const bestScore = globalBest ? ((globalBest.hasStop ? 1000 : 0) + globalBest.matched) : -1;
        if (score > bestScore) globalBest = { ...res, gray, thresh, rowY: y };
      }
    }

    // Extract debug info from best row
    const dbgGray = globalBest?.gray ?? [];
    const dbgThresh = globalBest?.thresh ?? 128;
    const darkRunCount = globalBest
      ? globalBest.enc.match(/1+/g)?.length ?? 0
      : 0;

    const hasStart = !!globalBest;
    const hasStop  = globalBest?.hasStop ?? false;
    const chunkMatched = globalBest?.matched ?? 0;
    const chunkTotal   = globalBest?.total ?? 0;
    const encoded      = globalBest?.enc ?? "";
    const narrowMod    = globalBest?.narrowMod ?? 1;

    let decoded = null;
    if (globalBest) {
      // Try with stop first; fall back to stopless decode if high confidence
      decoded = attemptDecode(encoded, globalBest.si, hasStop);
      if (!decoded && chunkTotal > 0 && chunkMatched / chunkTotal >= 0.8) {
        decoded = attemptDecode(encoded, globalBest.si, false);
      }
    }

    let hint = null;
    if (!hasStart)                       hint = "no start marker — keep barcode horizontal and fill the frame";
    else if (hasStart && !hasStop && chunkMatched / chunkTotal < 0.8)
                                         hint = "partial read — move barcode so the full width is visible";
    else if (hasStart && !hasStop)       hint = "stop clipped — slight decode attempted from high-confidence chunks";
    else if (chunkMatched / chunkTotal < 0.7)
                                         hint = `only ${chunkMatched}/${chunkTotal} chunks matched — try better lighting or hold steady`;


    onDebug({
      frameW: canvas.width, frameH: canvas.height,
      threshold: Math.round(dbgThresh), thresholdVal: dbgThresh,
      darkRunCount, narrowMod,
      encodedLen: encoded.length,
      hasStart, hasStop, decoded,
      chunkMatched, chunkTotal,
      encodedSnippet: encoded.slice(0, 80),
      grayscaleSample: dbgGray.filter((_, i) => i % Math.ceil((dbgGray.length || 1) / 200) === 0),
      hint,
    });

    if (decoded && decoded.length > 0) onDecode(decoded);
  }, [onDecode, onDebug]);

  const loop = useCallback(() => {
    decodeFromCanvas();
    setScanLine(prev => {
      let next = prev + dirRef.current * 1.5;
      if (next > 90) { dirRef.current = -1; next = 90; }
      if (next < 10) { dirRef.current =  1; next = 10; }
      return next;
    });
    animRef.current = requestAnimationFrame(loop);
  }, [decodeFromCanvas]);

  useEffect(() => {
    if (!scanning) return;
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          animRef.current = requestAnimationFrame(loop);
        }
      } catch {
        setError("Camera access denied. Please allow camera permissions.");
        setScanning(false);
      }
    })();
    return () => {
      cancelAnimationFrame(animRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [scanning, loop]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!scanning ? (
        <button onClick={() => { setError(null); setScanning(true); }}
          style={{ padding: "10px 20px", fontSize: 14, cursor: "pointer", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-primary)" }}>
          start camera scan
        </button>
      ) : (
        <div style={{ position: "relative", borderRadius: "var(--border-radius-lg)", overflow: "hidden", background: "#000", aspectRatio: "4/3", maxHeight: 280 }}>
          <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", left: "5%", right: "5%", top: `${scanLine}%`, height: 2, background: "rgba(29,158,117,0.9)", transition: "top 0.05s linear" }} />
          <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(29,158,117,0.6)", borderRadius: "var(--border-radius-lg)", pointerEvents: "none" }} />
          <button onClick={() => setScanning(false)}
            style={{ position: "absolute", top: 8, right: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer", borderRadius: "var(--border-radius-md)", background: "rgba(0,0,0,0.55)", border: "0.5px solid rgba(255,255,255,0.2)", color: "#fff" }}>
            stop
          </button>
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      )}
      {error && <p style={{ fontSize: 13, color: "var(--color-text-danger)", margin: 0 }}>{error}</p>}
    </div>
  );
}

export default function BarcodeScanner() {
  const [mode, setMode] = useState("encode");
  const [input, setInput] = useState("");
  const [encoded, setEncoded] = useState(null);
  const [decodeInput, setDecodeInput] = useState("");
  const [decoded, setDecoded] = useState(null);
  const [decodeError, setDecodeError] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [debug, setDebug] = useState(null);
  const [showDebug, setShowDebug] = useState(true);

  const handleEncode = () => {
    if (!input.trim()) return;
    setEncoded(encodeCode128(input.trim()));
  };

  const handleDecode = () => {
    const clean = decodeInput.trim().replace(/[^01]/g, "");
    if (!clean) return;
    const result = decodeCode128(clean);
    if (result === null) { setDecodeError(true); setDecoded(null); }
    else { setDecoded(result); setDecodeError(false); }
  };

  const lastScanned = useRef(null);

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(1480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
      osc.onended = () => ctx.close();
    } catch {}
  }, []);

  const handleScanResult = useCallback((r) => {
    if (r === lastScanned.current) return;
    lastScanned.current = r;
    setScanResult(r);
    playBeep();
    // reset dedup after 3s so re-scanning same barcode works
    setTimeout(() => { lastScanned.current = null; }, 3000);
  }, [playBeep]);
  const handleDebug      = useCallback((d) => setDebug(d), []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const tabs = ["encode", "decode", "scan"];

  return (
    <div style={{ fontFamily: "var(--font-mono)", padding: "1.5rem 0", maxWidth: 680, margin: "0 auto" }}>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 1.5rem", letterSpacing: "0.04em" }}>
        CODE128 — encode · decode · scan
      </p>

      <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", background: "var(--color-background-secondary)", padding: 4, borderRadius: "var(--border-radius-md)", width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setMode(t)} style={{
            padding: "6px 18px", fontSize: 13, cursor: "pointer",
            borderRadius: "var(--border-radius-md)", border: "none",
            background: mode === t ? "var(--color-background-primary)" : "transparent",
            color: mode === t ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            fontFamily: "var(--font-mono)",
            boxShadow: mode === t ? "0 0 0 0.5px var(--color-border-secondary)" : "none",
          }}>{t}</button>
        ))}
      </div>

      {mode === "encode" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleEncode()}
              placeholder="text to encode…" style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 14 }} />
            <button onClick={handleEncode} style={{ padding: "0 20px", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-mono)" }}>encode</button>
          </div>
          {encoded && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem" }}>
              <BarcodeDisplay binary={encoded} />
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{encoded.length} modules · {input.length} chars</span>
                <button onClick={() => copyToClipboard(encoded)} style={{ fontSize: 12, cursor: "pointer", padding: "4px 12px", fontFamily: "var(--font-mono)", borderRadius: "var(--border-radius-md)", background: "transparent", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>
                  {copied ? "copied" : "copy binary"}
                </button>
              </div>
              <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 4px", letterSpacing: "0.06em" }}>binary string</p>
                <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0, wordBreak: "break-all", lineHeight: 1.8 }}>{encoded}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "decode" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Paste a CODE128 binary string (1s and 0s) to decode it.</p>
          <textarea value={decodeInput} onChange={e => setDecodeInput(e.target.value)} placeholder="11010010000…" rows={4}
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, resize: "vertical", padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" }} />
          <button onClick={handleDecode} style={{ alignSelf: "flex-start", padding: "8px 20px", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-mono)" }}>decode</button>
          {decoded !== null && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 6px", letterSpacing: "0.06em" }}>decoded text</p>
              <p style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>{decoded}</p>
            </div>
          )}
          {decodeError && <p style={{ fontSize: 13, color: "var(--color-text-danger)", margin: 0 }}>could not decode — check the binary string format</p>}
        </div>
      )}

      {mode === "scan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            Point your camera at a CODE128 barcode. Keep it horizontal and well-lit.
          </p>

          <ScannerOverlay onDecode={handleScanResult} onDebug={handleDebug} />

          {scanResult && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 6px", letterSpacing: "0.06em" }}>scan result</p>
              <p style={{ fontSize: 22, fontWeight: 500, margin: "0 0 10px", color: "var(--color-text-primary)" }}>{scanResult}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => copyToClipboard(scanResult)} style={{ fontSize: 12, cursor: "pointer", padding: "4px 12px", fontFamily: "var(--font-mono)", borderRadius: "var(--border-radius-md)", background: "transparent", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>
                  {copied ? "copied" : "copy"}
                </button>
                <button onClick={() => { setInput(scanResult); setMode("encode"); }} style={{ fontSize: 12, cursor: "pointer", padding: "4px 12px", fontFamily: "var(--font-mono)", borderRadius: "var(--border-radius-md)", background: "transparent", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>
                  encode this ↗
                </button>
                <button onClick={() => setScanResult(null)} style={{ fontSize: 12, cursor: "pointer", padding: "4px 12px", fontFamily: "var(--font-mono)", borderRadius: "var(--border-radius-md)", background: "transparent", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-tertiary)" }}>
                  clear
                </button>
              </div>
            </div>
          )}

          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
            <button onClick={() => setShowDebug(v => !v)}
              style={{ width: "100%", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-background-secondary)", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-secondary)" }}>
              <span>debug</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>{showDebug ? "▲ hide" : "▼ show"}</span>
            </button>
            {showDebug && (
              <div style={{ padding: "12px 14px" }}>
                <DebugPanel dbg={debug} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}