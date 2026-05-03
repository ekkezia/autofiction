import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { io } from 'socket.io-client';
import archiveData from '../archive-assets.json';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Center } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const SUPABASE     = import.meta.env.VITE_SUPABASE_STORAGE;
const ASSET_SOURCE = (import.meta.env.VITE_ASSET_SOURCE || 'local').trim().toLowerCase();
const LOGO_SRC = `${import.meta.env.BASE_URL}logo/logo.png`;
const TEXT_LOGO_SRC = `${import.meta.env.BASE_URL}logo/text-logo-1.png`;
const DEFAULT_QUEUE_SERVER = typeof window === 'undefined'
  ? 'http://localhost:4002'
  : `${window.location.protocol}//${window.location.hostname}:4002`;
const QUEUE_SERVER = import.meta.env.VITE_QUEUE_SERVER || DEFAULT_QUEUE_SERVER;

function localPathFromSource(src) {
  if (!src) return src;
  const clean = String(src).replace(/^\/+/, '');
  const path = clean.startsWith('public/') ? clean.slice('public/'.length) : clean;
  return `/${path}`;
}

// Convert local asset path → storage URL when configured; otherwise fall back to local path.
function storageUrl(src) {
  if (!src || src.startsWith('http')) return src;

  const localPath = localPathFromSource(src);
  if (ASSET_SOURCE !== 'remote') return localPath;

  const base = (SUPABASE || '').trim().replace(/\/+$/, '');
  const hasValidRemoteBase = /^https?:\/\/[^/\s]+/i.test(base);
  if (!hasValidRemoteBase) return localPath;

  const clean = String(src).replace(/^\/+/, '');
  const rawPath = clean.startsWith('public/assets/') ? clean.slice('public/assets/'.length)
    : clean.startsWith('assets/') ? clean.slice('assets/'.length)
    : clean.startsWith('public/') ? clean.slice('public/'.length)
    : clean;

  return `${base}/${rawPath}`;
}

const assetExistsCache = new Map();

function shouldTreatAsMissingByContentType(url, contentType) {
  const ct = (contentType || '').toLowerCase();
  if (!ct) return false;
  const lowerUrl = String(url || '').toLowerCase();
  // Vite dev server fallback for missing files is text/html (index.html).
  return ct.includes('text/html') && !lowerUrl.endsWith('.html');
}

function useAssetExists(url) {
  const [exists, setExists] = useState(() => (url ? assetExistsCache.get(url) : true));

  useEffect(() => {
    if (!url) {
      setExists(false);
      return;
    }

    // Avoid false negatives for cross-origin sources that may block HEAD via CORS.
    if (/^https?:\/\//i.test(url)) {
      setExists(true);
      return;
    }

    const cached = assetExistsCache.get(url);
    if (cached !== undefined) {
      setExists(cached);
      return;
    }

    let alive = true;
    const verify = async () => {
      try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        const contentType = res.headers.get('content-type') || '';
        const ok = res.ok && !shouldTreatAsMissingByContentType(url, contentType);
        assetExistsCache.set(url, ok);
        if (alive) setExists(ok);
      } catch {
        assetExistsCache.set(url, false);
        if (alive) setExists(false);
      }
    };

    verify();
    return () => {
      alive = false;
    };
  }, [url]);

  return exists;
}

function GlbModel({ src }) {
  const [scene, setScene] = useState(null);

  useEffect(() => {
    let alive = true;
    const loader = new GLTFLoader();

    loader.load(
      src,
      (gltf) => {
        if (!alive) return;
        setScene(gltf.scene);
      },
      undefined,
      () => {
        if (!alive) return;
        setScene(null);
      },
    );

    return () => {
      alive = false;
    };
  }, [src]);

  if (!scene) return null;
  return <Center><primitive object={scene} /></Center>;
}

function GlbViewer({ src, title }) {
  const path = storageUrl(src);
  const [isBroken, setIsBroken] = useState(false);

  useEffect(() => {
    setIsBroken(false);
  }, [path]);

  useEffect(() => {
    let alive = true;
    const verify = async () => {
      try {
        const res = await fetch(path, { method: 'HEAD' });
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (!alive) return;
        // Vite dev fallback serves index.html for unknown files (text/html), which breaks GLTF parsing.
        if (!res.ok || contentType.includes('text/html')) setIsBroken(true);
      } catch {
        if (alive) setIsBroken(true);
      }
    };
    verify();
    return () => {
      alive = false;
    };
  }, [path]);

  if (isBroken) {
    return (
      <div className="glb-viewer glb-viewer--missing">
        <div className="glb-missing">3D model unavailable</div>
        <div className="glb-label">{title}</div>
      </div>
    );
  }

  return (
    <div className="glb-viewer">
      <Canvas camera={{ position: [0, 6, 6], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} />
          <GlbModel src={path} />
          <OrbitControls autoRotate autoRotateSpeed={0.6} enableZoom enablePan />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
      <div className="glb-label">{title}</div>
    </div>
  );
}

function ArchiveImageCard({ item, t, onOpenImage }) {
  const [broken, setBroken] = useState(false);
  const src = storageUrl(item.src);
  const exists = useAssetExists(src);
  if (broken || exists === false) return null;

  return (
    <div className="archive-card">
      <img
        src={src}
        className="archive-thumb"
        alt={item.title}
        style={{ cursor: 'zoom-in' }}
        onClick={() => onOpenImage({ src, title: item.title })}
        onError={() => setBroken(true)}
      />
      <div className="archive-card-body">
        <div className="archive-card-title">{item.title}</div>
        {item.author && <div className="archive-card-author">{t.by}: {item.author}</div>}
        <div className="archive-card-desc">{item.description}</div>
      </div>
    </div>
  );
}

function ArchiveVideoCard({ item, t, onOpenVideo }) {
  const [broken, setBroken] = useState(false);
  const src = storageUrl(item.src);
  const exists = useAssetExists(src);
  if (broken || exists === false) return null;

  return (
    <div className="archive-card" style={{flexDirection:'column',gap:4}}>
      <div
        className="video-thumb"
        onClick={() => onOpenVideo({ src, title: item.title })}
      >
        <video
          src={src}
          muted
          preload="metadata"
          style={{width:'100%',height:'100%',objectFit:'cover',display:'block',pointerEvents:'none'}}
          onError={() => setBroken(true)}
        />
        <div className="video-play-btn">▶</div>
      </div>
      <div className="archive-card-body">
        <div className="archive-card-title">{item.title}</div>
        {item.author && <div className="archive-card-author">{t.by}: {item.author}</div>}
        <div className="archive-card-desc">{item.description}</div>
      </div>
    </div>
  );
}

function ArchiveModelCard({ item, t }) {
  const src = storageUrl(item.src);
  const exists = useAssetExists(src);
  if (exists === false) return null;

  return (
    <div className="archive-glb-card">
      <GlbViewer src={item.src} title={item.title} />
      <div className="archive-card-body">
        <div className="archive-card-title">{item.title}</div>
        {item.author && <div className="archive-card-author">{t.by}: {item.author}</div>}
        <div className="archive-card-desc">{item.description}</div>
      </div>
    </div>
  );
}

function ArchiveDocCard({ doc, t, onOpenPdf }) {
  const isPdf = doc.directory?.toLowerCase().endsWith('.pdf');
  const pdfSrc = isPdf ? storageUrl(doc.directory) : null;
  const pdfExists = useAssetExists(pdfSrc);

  return (
    <div className="archive-doc">
      <div className="archive-card-title">{doc.title}</div>
      {doc.author && <div className="archive-card-author">{t.by}: {doc.author}</div>}
      <div className="archive-card-desc">{doc.description}</div>
      {doc.excerpt && <div className="archive-excerpt">"{doc.excerpt}"</div>}
      {isPdf && pdfExists !== false && (
        <button className="view-pdf-btn" onClick={() => onOpenPdf({ src: pdfSrc, title: doc.title })}>
          📄 {t.viewPdf}
        </button>
      )}
    </div>
  );
}

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
  zh: {
    username: '用户名',
    password: '密码',
    login: '登录',
    forgot: '忘记密码',
    cardLabel: '认可服务卡：',
    recharge: '充值赞美余额',
    buyOnline: '购买夸奖套餐',
    tagline1: '在这里，你的努力会被认真看见',
    tagline2: 'Here, your efforts are seen, praised, and validated.',
    greeting: '欢迎光临',
    navItems: ['认可首页', '顾问团队', '今日赞词', '鼓励电台', '服务方案', '团队介绍', '在线客服', '帮助中心', '我的档案', '关于我们'],
    heroPrefix: '欢迎来到',
    femaleCol: '本周值班赞美顾问',
    maleCol: '今日高光客户',
    burgerStat: '认可度 100%',
    burgerPromo: ['今天也很棒', '请收下夸奖'],
    burgerBtn: '领取赞词',
    archiveTitle: 'AUTOFICTION // 项目档案',
    all: '全部',
    by: '作者',
    sections: {
      physicalResearch: '物理研究',
      floorPlan: '平面图',
      supportSites: '外链框架',
      liveShow: '演出文档',
      setDocs: '场景文档',
      script: '脚本',
      creativeDirection: '创意方向',
      digitalResearch: '数字研究',
    },
    svc1Title: '情绪认可 · 即时反馈',
    svc1: ['', '把你的努力说成可被看见的价值', '针对低落时刻提供情绪托举'],
    svc2Title: '会员尊享服务',
    svc2: ['成就复盘与高光提炼', '定制“夸奖脚本”音频', '阶段性自信维护计划'],
    popupBrand: 'Recognition Lounge 今日菜单',
    popupSub: '赞词服务 · 即时生效',
    close: '关闭',
    popupDish: '赞美类型',
    popupBenefit: '服务内容',
    popupMenu: [
      ['情绪安抚夸奖', '15分钟暖心肯定'],
      ['成就放大夸奖', '提炼你的3个高光点'],
      ['职场认可夸奖', '会议前自信加成'],
      ['关系修复夸奖', '温柔但坚定的价值确认'],
    ],
    storiesTitle: '他们在这里重新看见自己',
    stories: [
      '我原本只是抱着试试看的心态来做“被夸咨询”。没想到顾问没有敷衍，而是把我说不出口的辛苦一点点整理成清晰的价值。那次结束后我第一次觉得，原来我不是“还不够好”，而是一直没人认真肯定我。',
      '连续做了三周服务后，我的状态变化非常明显。每次顾问都会先听我说，再用具体例子指出我做得好的地方。它不是空话，而是有证据的认可。现在我在工作汇报和人际沟通里都更有底气了。',
    ],
    viewPdf: '查看 PDF',
    toggleBtn: 'EN',
  },
  en: {
    username: 'Username',
    password: 'Password',
    login: 'Login',
    forgot: 'Forgot Password',
    cardLabel: 'Recognition Service Card:',
    recharge: 'Top Up Praise Credits',
    buyOnline: 'Buy Compliment Packages',
    tagline1: 'Your effort is seen and celebrated here',
    tagline2: 'Consultants validate your feelings and achievements in real time.',
    greeting: 'Welcome Back',
    navItems: ['Home', 'Consultants On-Duty', 'Daily Praises', 'Meet the Team', 'Help Center', 'Learn More'],
    heroPrefix: 'Welcome to',
    femaleCol: 'Our Consultants & Experts',
    maleCol: "Today's Celebrated Clients",
    burgerStat: 'Recognition Meter 100%',
    burgerPromo: ['YOU ARE DOING', 'BETTER THAN YOU THINK'],
    burgerBtn: 'CLAIM PRAISE',
    archiveTitle: 'AUTOFICTION // PROJECT ARCHIVE',
    all: 'All',
    by: 'By',
    sections: {
      physicalResearch: 'Physical Research',
      floorPlan: 'Floor Plan',
      supportSites: 'Support Sites',
      liveShow: 'Live Show',
      setDocs: 'Set Documents',
      script: 'Script',
      creativeDirection: 'Creative Direction',
      digitalResearch: 'Digital Research',
    },
    svc1Title: 'Emotional Validation · Instant Feedback',
    svc1: ['1:1 compliment consulting sessions', 'Translate effort into visible value', 'Supportive reframing for low-mood moments'],
    svc2Title: 'Members-Only Recognition Services',
    svc2: ['Achievement recap and highlight extraction', 'Custom "praise script" audio', 'Confidence maintenance plans'],
    storiesTitle: 'How Clients Felt Seen Again',
    stories: [
      'I signed up for a compliment session expecting generic pep talk. Instead, the consultant listened carefully and reflected my progress with concrete language. I left feeling emotionally steadier and genuinely proud of what I had done that week.',
      'After a month of weekly sessions, I stopped minimizing my achievements. The consultant helped me name my strengths, practice accepting praise, and speak about my work with confidence. It felt like being validated in a way I had needed for years.',
    ],
    popupBrand: 'Recognition Lounge Services',
    popupSub: 'Compliment packages · delivered live',
    close: 'Close',
    popupDish: 'Praise Style',
    popupBenefit: 'What You Receive',
    popupMenu: [
      ['Calming Validation', '15-min reassuring session'],
      ['Achievement Spotlight', 'Top 3 wins articulated clearly'],
      ['Work Confidence Boost', 'Pre-meeting compliment prep'],
      ['Relationship Repair Praise', 'Gentle but firm value affirmation'],
    ],
    viewPdf: 'View PDF',
    toggleBtn: '中文',
  },
};

// ─── PROFILE DATA ─────────────────────────────────────────────────────────────
const FEMALE_PROFILES = [
  { img: 47, nameZh: 'Amy', ageZh: '23岁', cityZh: '纽约市', nameEn: 'Amy', ageEn: '23', cityEn: 'New York', desc: 'Specializes in turning small wins into clear, confidence-building praise.' },
  { img: 5,  nameZh: '无问西东', ageZh: '28岁', cityZh: '上海市', nameEn: 'Wuwen Xidong', ageEn: '28', cityEn: 'Shanghai', desc: 'Calm validation expert focused on emotional grounding and self-worth language.' },
  { img: 32, nameZh: 'Amy', ageZh: '23岁', cityZh: '纽约市', nameEn: 'Amy', ageEn: '23', cityEn: 'New York', desc: 'Helps clients prepare for high-stakes moments with targeted affirmation scripts.' },
  { img: 9,  nameZh: '无问西东', ageZh: '28岁', cityZh: '上海市', nameEn: 'Wuwen Xidong', ageEn: '28', cityEn: 'Shanghai', desc: 'Known for warm, specific compliments that make clients feel truly seen.' },
  { img: 23, nameZh: 'Amy', ageZh: '23岁', cityZh: '纽约市', nameEn: 'Amy', ageEn: '23', cityEn: 'New York', desc: 'Transforms burnout narratives into achievement-focused personal storytelling.' },
  { img: 44, nameZh: '无问西东', ageZh: '28岁', cityZh: '上海市', nameEn: 'Wuwen Xidong', ageEn: '28', cityEn: 'Shanghai', desc: 'Guides clients through self-doubt with structured praise and practical encouragement.' },
  { img: 38, nameZh: 'Amy', ageZh: '26岁', cityZh: '纽约市', nameEn: 'Amy', ageEn: '26', cityEn: 'New York', desc: 'Confidence coach for career and life milestones, delivered through bespoke compliments.' },
];

const MALE_PROFILES = [
  { img: 12, nameZh: 'Andy', ageZh: '26岁', cityZh: '纽约市', nameEn: 'Andy', ageEn: '26', cityEn: 'New York', desc: 'Regained presentation confidence after three guided praise sessions.' },
  { img: 15, nameZh: '道知我心', ageZh: '28岁', cityZh: '上海市', nameEn: 'Dao Zhiwoxin', ageEn: '28', cityEn: 'Shanghai', desc: 'Used validation coaching to recover from burnout and restart creative work.' },
  { img: 18, nameZh: 'Andy', ageZh: '26岁', cityZh: '纽约市', nameEn: 'Andy', ageEn: '26', cityEn: 'New York', desc: 'Learned to articulate achievements without guilt through weekly compliment practice.' },
  { img: 22, nameZh: '道知我心', ageZh: '28岁', cityZh: '上海市', nameEn: 'Dao Zhiwoxin', ageEn: '28', cityEn: 'Shanghai', desc: 'Built stronger boundaries after hearing consistent value-based affirmation.' },
  { img: 33, nameZh: 'Andy', ageZh: '26岁', cityZh: '纽约市', nameEn: 'Andy', ageEn: '26', cityEn: 'New York', desc: 'Turned imposter syndrome into progress tracking with consultant-led praise reviews.' },
  { img: 52, nameZh: '道知我心', ageZh: '28岁', cityZh: '上海市', nameEn: 'Dao Zhiwoxin', ageEn: '28', cityEn: 'Shanghai', desc: 'Now books monthly sessions to stay emotionally validated during intense workloads.' },
  { img: 57, nameZh: 'Andy', ageZh: '26岁', cityZh: '纽约市', nameEn: 'Andy', ageEn: '26', cityEn: 'New York', desc: 'Reported better communication at home after practicing appreciation language.' },
];

const CONSULTANT_PROFILES = [
  // {
  //   name: 'Tara N',
  //   role: 'Movement + Observation Specialist',
  //   blurb: 'Tara leads movement-and-observation sessions where body language, pacing, and tiny behavior patterns are translated into specific, confidence-building recognition.',
  // },
  {
    name: 'Yimeng',
    role: 'Music Therapy + Movement + Observation Specialist',
    blurb: 'Yimeng combines music-therapy structure with warm validation coaching to lower anxiety, regulate mood, and help clients receive compliments with calm self-trust.',
  },
];

const TEAM_MEMBERS = [
  {
    name: 'Kezia Widjaja',
    photo: '/profiles/kezia.jpeg',
    role: 'Operation Manager',
    blurb: 'Leads daily service quality, scheduling, and client journey design. Kezia has a reputation for turning complex operations into warm, consistent client experiences.',
  },
  {
    name: 'Kurt Qian',
    photo: '/profiles/kurt.jpeg',
    role: 'Technical Intern',
    blurb: 'Supports queue tooling, diagnostics, and rapid UI fixes. Kurt focuses on reliability and smooth handoffs so consultants can stay present with clients.',
  },
  {
    name: 'Leo Zheng',
    photo: '/profiles/leo.jpeg',
    role: 'Designer',
    blurb: 'Shapes the visual language for praise sessions, dashboards, and client touchpoints. Leo designs for emotional clarity, confidence, and ease of use.',
  },
  {
    name: 'Shihan Tan',
    photo: '/profiles/shihan.jpeg',
    role: 'Human Resource Manager',
    blurb: 'Oversees consultant training, onboarding, and team wellbeing. Shihan builds a culture where empathy, feedback, and professionalism scale together.',
  },
];

// ─── useQueue hook ─────────────────────────────────────────────────────────────
function useQueue() {
  const [queue, setQueue]      = useState([]);
  const [connected, setConn]   = useState(false);
  const [queueError, setError] = useState(null);
  const socketRef              = useRef(null);

  useEffect(() => {
    const s = io(QUEUE_SERVER, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
    });
    socketRef.current = s;
    s.on('connect',       () => {
      setConn(true);
      console.log('[queue] connected', s.id);
      s.emit('get_queue');
    });
    s.on('disconnect',    () => { setConn(false); console.log('[queue] disconnected'); });
    s.on('connect_error', (e) => { setConn(false); console.error('[queue] connect error:', e.message); });
    s.on('queue_snapshot', setQueue);
    s.on('call_error',  ({ reason }) => { setError(reason); setTimeout(() => setError(null), 3000); });
    s.on('enter_error', ({ reason }) => { setError(reason); setTimeout(() => setError(null), 3000); });
    s.on('complete_error', ({ reason }) => { setError(reason); setTimeout(() => setError(null), 3000); });
    s.on('admit_error', ({ reason }) => { setError(reason); setTimeout(() => setError(null), 3000); });
    return () => s.disconnect();
  }, []);

  const register = (name) => new Promise((resolve) => {
    const s = socketRef.current;
    if (!s) {
      resolve(null);
      return;
    }
    s.once('register_ack', resolve);
    s.emit('register_user', { name });
  });

  const callNext = () => {
    console.log('[queue] callNext — connected:', socketRef.current?.connected, 'id:', socketRef.current?.id);
    socketRef.current?.emit('call_next');
  };

  const enterSession = () => {
    console.log('[queue] enterSession — connected:', socketRef.current?.connected);
    socketRef.current?.emit('enter_session');
  };

  const completeSession = () => {
    console.log('[queue] completeSession — connected:', socketRef.current?.connected);
    socketRef.current?.emit('complete_session');
  };

  return { queue, connected, queueError, register, callNext, enterSession, completeSession };
}

// ─── RegisterPage ──────────────────────────────────────────────────────────────
const NEXT_TIMEOUT = 10; // seconds before auto-reset to new registration

function RegisterPage({ onClose, onRegistered, onRegister }) {
  const [name, setName]       = useState('');
  const [done, setDone]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(NEXT_TIMEOUT);

  // Auto-countdown after successful registration
  useEffect(() => {
    if (!done) return;
    setCountdown(NEXT_TIMEOUT);
    const id = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) { clearInterval(id); resetForm(); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [done]);

  function resetForm() { setDone(null); setName(''); setLoading(false); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    const ticket = await onRegister(name.trim());
    if (!ticket) {
      setLoading(false);
      return;
    }
    setDone(ticket);
    setLoading(false);
  }

  return (
    <div className="register-overlay" onClick={onClose}>
      <div className="register-modal" onClick={e => e.stopPropagation()}>
        <div className="register-modal-bar">
          <span className="register-modal-title">
            <img className="register-modal-logo-icon" src={LOGO_SRC} alt="Recognition Office icon" />
            {/* <img className="recognition-wordmark-image" src={TEXT_LOGO_SRC} alt="The Recognition Office" /> */}
            {' · 赞美服务登记 / Session Registration'}
          </span>
          <button className="pdf-close-btn" onClick={onClose}>✕</button>
        </div>
        {done ? (
          <div className="register-done">
            <div className="register-done-code">{done.code}</div>
            <div className="register-done-name">{done.name}</div>
            <div className="register-done-sub">请等候顾问呼叫 · Please wait for your compliment session</div>
            <div className="register-done-meta">
              <span>Consultant Desk: <strong>{done.counter}</strong></span>
              <span>Time: <strong>{new Date(done.timestamp).toLocaleTimeString()}</strong></span>
            </div>
            {/* <button className="register-done-btn" onClick={() => { onRegistered(); onClose(); }}>
              查看排队 / View Queue →
            </button> */}
            <div className="register-done-actions">
              <button className="register-next-btn" onClick={resetForm}>
                + 再登记一位客户 / Register Another Client
              </button>
              <span className="register-countdown">
                自动重置 {countdown}s…
              </span>
            </div>
          </div>
        ) : (
          <form className="register-form" onSubmit={handleSubmit}>
            <label className="register-label">
              {'请输入您的姓名（用于赞美服务） / Enter your name for your '}
              <img className="register-label-wordmark" src={TEXT_LOGO_SRC} alt="The Recognition Office" />
              {' Session'}
            </label>
            <input
              className="register-input"
              type="text"
              autoFocus
              placeholder="Your name…"
              maxLength={11}
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={loading}
            />
            <button className="register-submit" type="submit" disabled={loading || !name.trim()}>
              {loading ? '处理中…' : '加入 / Join →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── QueueBoard ────────────────────────────────────────────────────────────────
function QueueBoard({ queue, isAdmin, callNext, enterSession, completeSession, connected, queueError }) {
  const calling  = queue.filter(t => t.status === 'calling');
  const waiting  = queue
    .filter(t => t.status === 'waiting')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const inSession = queue.filter(t => t.status === 'in_session');
  const completed = queue.filter(t => t.status === 'completed' || t.status === 'admitted');
  const currentCalling = calling[0] || null;
  const currentInSession = inSession[0] || null;
  const [nowTime, setNowTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const id = setInterval(() => {
      setNowTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="queue-board">
      {/* Admin controls */}
      {isAdmin && (
        <div className="queue-admin-bar">
          <span className="queue-admin-label">ADMIN</span>
          <span className={`queue-conn-dot${connected ? ' queue-conn-dot--on' : ''}`} title={connected ? 'Server connected' : 'Server disconnected'} />
          <button
            className="queue-admin-btn queue-admin-btn--call"
            onClick={callNext}
            disabled={!connected || !!currentCalling || waiting.length === 0}
          >
            📣 CALL NEXT CLIENT
          </button>
          <button
            className="queue-admin-btn queue-admin-btn--enter"
            onClick={enterSession}
            disabled={!connected || !currentCalling}
          >
            ➜ ENTER SESSION
          </button>
          <button
            className="queue-admin-btn queue-admin-btn--admit"
            onClick={completeSession}
            disabled={!connected || !currentInSession}
          >
            ✓ COMPLETE SESSION
          </button>
        </div>
      )}

      {queueError && <div className="queue-error-bar">{queueError}</div>}

      {/* Now Serving */}
      <div className="queue-now-serving">
        <div style={{ marginBottom: 12, background: '#ff00ff', padding: 12, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5em', fontSize: '0.9em', color: '#555' }}>
          <div className="queue-now-label">
            {'WELCOME TO '}
            <img className="recognition-wordmark-image" src={TEXT_LOGO_SRC} alt="The Recognition Office" />
            !
          </div>
          <div className="queue-now-clock">{nowTime}</div>
        </div>
        <div className="queue-now-label">NOW CALLING · 正在呼叫</div>
        {currentCalling ? (
          <>
            <div className="queue-now-code" style={{ fontSize: '6rem' }}>{currentCalling.code}</div>
            <div className="queue-now-name">{currentCalling.name}</div>
            <div className="queue-now-counter">Desk {currentCalling.counter}</div>
          </>
        ) : (
          <div className="queue-now-empty">— 暂无服务中 —</div>
        )}
      </div>

      {/* Four columns */}
      <div className="queue-columns">
        <QueueCol title="待 Waiting" tickets={waiting}  accent="waiting"  />
        <QueueCol title="呼叫中 Calling"          tickets={calling}   accent="calling"   />
        <QueueCol title="服务中 In Session"       tickets={inSession} accent="session"   />
        <QueueCol title="已完成 Completed"        tickets={completed} accent="completed" />
      </div>
    </div>
  );
}

function QueueCol({ title, tickets, accent }) {
  return (
    <div className={`queue-col queue-col--${accent}`}>
      <div className="queue-col-header">
        {title} <span className="queue-col-count">{tickets.length}</span>
      </div>
      <div className="queue-col-body">
        {tickets.length === 0
          ? <div className="queue-col-empty">—</div>
          : tickets.map(t => (
            <div key={t.code} className="queue-ticket-row">
              <div className="queue-ticket-code">{t.code}</div>
              <div className="queue-ticket-name">{t.name}</div>
              <div className="queue-ticket-time">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── LoginBar ─────────────────────────────────────────────────────────────────
function LoginBar({ t, onToggleLang, onRegister, onLogin, isAdmin, onOpenQueueFocus }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  function handleLogin(e) {
    e.preventDefault();
    onLogin(user, pass);
  }

  return (
    <div className="login-bar">
      <div className="login-left">
        <span>{t.username}</span>
        <input type="text"     className="login-input" value={user} onChange={e => setUser(e.target.value)} />
        <span>{t.password}</span>
        <input type="password" className="login-input" value={pass} onChange={e => setPass(e.target.value)} />
        <button className="login-btn" onClick={handleLogin}>{t.login}</button>
        {isAdmin && (
          <>
            <span className="admin-badge">ADMIN</span>
            <button className="queue-waitlist-btn" onClick={onOpenQueueFocus}>QUEUE WAITLIST</button>
          </>
        )}
        <span className="login-link">{t.forgot}</span>
        <button className="register-btn" onClick={onRegister}>BOOK SESSION / 预约服务</button>
      </div>
      <div className="login-right">
        <span>{t.cardLabel}</span>
        <span className="charge-link">{t.recharge}</span>
        <span className="charge-link">{t.buyOnline}</span>
        <button className="lang-toggle" onClick={onToggleLang}>{t.toggleBtn}</button>
      </div>
    </div>
  );
}

// ─── SiteHeader ───────────────────────────────────────────────────────────────
function SiteHeader({ t }) {
  return (
    <div className="site-header">
      <div className="logo">
        <img
          className="logo-image"
          src={LOGO_SRC}
          alt="THE RECOGNITION OFFICE logo"
        />
      </div>
      <div className="tagline">
        <div className="tagline-1">{t.tagline1}</div>
        <div className="tagline-2">{t.tagline2}</div>
      </div>
    </div>
  );
}

// ─── SiteNav ──────────────────────────────────────────────────────────────────
const NAV_QUEUE = 'queue';
const NAV_CONSULTANTS_PATH = '/consultants';
const NAV_TEAM_PATH = '/team';
const NAV_ABOUT_PATH = '/about';
const NAV_PATHS = [
  '/',
  '/consultants',
  '/daily-praises',
  '/team',
  '/support',
  '/about',
];

function normalizePath(pathname) {
  if (!pathname) return '/';
  const clean = pathname.replace(/\/+$/, '');
  return clean || '/';
}

function pathFromNav(nav) {
  if (nav === NAV_QUEUE) return '/queue';
  if (typeof nav === 'number' && NAV_PATHS[nav]) return NAV_PATHS[nav];
  return '/';
}

function navFromPath(pathname) {
  const clean = normalizePath(pathname);
  if (clean === '/queue') return NAV_QUEUE;
  const idx = NAV_PATHS.indexOf(clean);
  return idx >= 0 ? idx : 0;
}

function SiteNav({ t, activeNav, onNavClick }) {
  const navItems = t.navItems.slice(0, NAV_PATHS.length);
  return (
    <nav className="site-nav">
      <span className="greeting">{t.greeting}</span>
      {navItems.map((item, i) => (
        <a
          key={i}
          className={`nav-item${activeNav === i ? ' active' : ''}`}
          href="#"
          onClick={e => { e.preventDefault(); onNavClick(i); }}
        >{item}</a>
      ))}
      <a
        className={`nav-item nav-item--queue${activeNav === NAV_QUEUE ? ' active' : ''}`}
        href="#"
        onClick={e => { e.preventDefault(); onNavClick(NAV_QUEUE); }}
      >QUEUE</a>
    </nav>
  );
}

// ─── HeroBanner ───────────────────────────────────────────────────────────────
function HeroBanner({ t }) {
  return (
    <div className="hero-banner">
      <div className="hero-stack">
        <span className="hero-prefix">{t.heroPrefix}</span>
        <div className="hero-title-row">
          <img
            className="hero-title-logo"
            src={LOGO_SRC}
            alt="Recognition Office logo"
          />
          <img className="hero-brand recognition-wordmark-image" src={TEXT_LOGO_SRC} alt="The Recognition Office" />
        </div>
      </div>
    </div>
  );
}

// ─── BurgerAd ─────────────────────────────────────────────────────────────────
function BurgerAd({ t }) {
  return (
    <div className="outer-ad">
      <div className="burger-logo">Recognition Meter</div>
      <div className="burger-stat">
        <div className="burger-stat-label">{t.burgerStat}</div>
        <div className="burger-stat-bar"><div className="burger-stat-fill" /></div>
      </div>
      <div className="burger-emoji">🏆</div>
      <div className="burger-char">💬</div>
      <div className="burger-promo">
        {t.burgerPromo[0]}<br />{t.burgerPromo[1]}
      </div>
      <button className="burger-btn">{t.burgerBtn}</button>
    </div>
  );
}

// ─── ProfileCard ──────────────────────────────────────────────────────────────
function ProfileCard({ p, lang }) {
  const name = lang === 'zh' ? p.nameZh : p.nameEn;
  const age  = lang === 'zh' ? p.ageZh  : p.ageEn;
  const city = lang === 'zh' ? p.cityZh : p.cityEn;
  return (
    <div className="profile-card">
      <img src={`https://i.pravatar.cc/55?img=${p.img}`} className="profile-photo" alt="" />
      <div className="profile-info">
        <span className="profile-name">{name}&nbsp;&nbsp;{age}&nbsp;&nbsp;{city}</span>
        <p className="profile-desc">{p.desc}</p>
      </div>
    </div>
  );
}

// ─── MemberCol ────────────────────────────────────────────────────────────────
function MemberCol({ title, profiles, lang }) {
  return (
    <div className="member-col">
      <div className="member-col-header">{title}</div>
      {profiles.map((p, i) => <ProfileCard key={i} p={p} lang={lang} />)}
    </div>
  );
}

// ─── ImageModal ───────────────────────────────────────────────────────────────
function ImageModal({ src, title, onClose }) {
  return (
    <div className="pdf-overlay" onClick={onClose}>
      <div className="image-modal" onClick={e => e.stopPropagation()}>
        <div className="pdf-modal-bar">
          <span className="pdf-modal-title">{title}</span>
          <button className="pdf-close-btn" onClick={onClose}>关闭 / Close ✕</button>
        </div>
        <div className="image-modal-body">
          <img src={src} alt={title} style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', objectFit: 'contain' }} />
        </div>
      </div>
    </div>
  );
}

// ─── VideoModal ───────────────────────────────────────────────────────────────
function VideoModal({ src, title, onClose }) {
  return (
    <div className="pdf-overlay" onClick={onClose}>
      <div className="video-modal" onClick={e => e.stopPropagation()}>
        <div className="pdf-modal-bar">
          <span className="pdf-modal-title">🎬 {title}</span>
          <button className="pdf-close-btn" onClick={onClose}>关闭 / Close ✕</button>
        </div>
        <div className="video-modal-body">
          <video
            src={src}
            controls
            autoPlay
            style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', background: '#000' }}
          >
            <source src={src} type="video/mp4" />
            <source src={src} type="video/quicktime" />
          </video>
        </div>
      </div>
    </div>
  );
}

// ─── PdfModal ─────────────────────────────────────────────────────────────────
function PdfModal({ src, title, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const path = src.startsWith('http') ? src : src.startsWith('/') ? src : `/${src}`;

  return (
    <div className="pdf-overlay" onClick={onClose}>
      <div className="pdf-modal" onClick={e => e.stopPropagation()}>
        <div className="pdf-modal-bar">
          <span className="pdf-modal-title">{title}</span>
          <div className="pdf-nav">
            <button className="pdf-nav-btn" disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)}>◀</button>
            <span className="pdf-page-count">{pageNumber} / {numPages ?? '…'}</span>
            <button className="pdf-nav-btn" disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)}>▶</button>
          </div>
          <button className="pdf-close-btn" onClick={onClose}>关闭 / Close ✕</button>
        </div>
        <div className="pdf-body">
          <Document
            file={path}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
          >
            <Page pageNumber={pageNumber} width={720} renderTextLayer renderAnnotationLayer />
          </Document>
        </div>
      </div>
    </div>
  );
}

// ─── StoriesContent ───────────────────────────────────────────────────────────
const STORY_SEEDS = ['couple101', 'couple202', 'couple303', 'couple404'];

function StoriesContent({ t }) {
  const pairs = [t.stories[0], t.stories[1], t.stories[0], t.stories[1]];
  return (
    <div className="center-content">
      <div className="stories-box">
        <div className="stories-title">{t.storiesTitle}</div>
        {pairs.map((text, i) => (
          <div key={i} className="story-item">
            <img src={`https://picsum.photos/seed/${STORY_SEEDS[i]}/112/88`} className="story-photo" alt="" />
            <p className="story-text">{text}</p>
          </div>
        ))}
      </div>
      <div className="services-row">
        <div className="service-box">
          <div className="service-title">{t.svc1Title}</div>
          <ol>{t.svc1.map((item, i) => <li key={i}>{item}</li>)}</ol>
        </div>
        <div className="service-box">
          <div className="service-title">{t.svc2Title}</div>
          <ol>{t.svc2.map((item, i) => <li key={i}>{item}</li>)}</ol>
        </div>
      </div>
    </div>
  );
}

function ConsultantsContent() {
  return (
    <div className="center-content">
      <div className="stories-box">
        <div className="stories-title">Consultants</div>
        {CONSULTANT_PROFILES.map((consultant) => (
          <div key={consultant.name} className="story-item">
            <img
              src={`https://i.pravatar.cc/112?u=${encodeURIComponent(consultant.name)}`}
              className="story-photo"
              alt={consultant.name}
            />
            <p className="story-text">
              <strong>{consultant.name}</strong> · {consultant.role}
              <br />
              {consultant.blurb}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamContent() {
  return (
    <div className="center-content">
      <div className="stories-box">
        <div className="stories-title">Meet the Team</div>
        {TEAM_MEMBERS.map((member) => (
          <div key={member.name} className="story-item">
            <img
              src={member.photo}
              className="story-photo"
              alt={member.name}
              onError={(e) => { e.currentTarget.src = `https://i.pravatar.cc/112?u=${encodeURIComponent(member.name)}`; }}
            />
            <p className="story-text">
              <strong>{member.name}</strong> · {member.role}
              <br />
              {member.blurb}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ArchiveContent ───────────────────────────────────────────────────────────
function ArchiveContent({ t }) {
  const [activeTab, setActiveTab] = useState('all');
  const [pdfOpen, setPdfOpen] = useState(null);
  const [videoOpen, setVideoOpen] = useState(null);
  const [imageOpen, setImageOpen] = useState(null); // { src, title }

  const visibleSections = activeTab === 'all'
    ? archiveData.tabs
    : archiveData.tabs.filter(s => s.id === activeTab);

  return (
    <div className="center-content">
      {/* Archive header */}
      <div className="archive-header">
        <div className="archive-project-title">{t.archiveTitle}</div>
        <div className="archive-project-sub">{archiveData.project.subtitle}</div>
      </div>

      {/* Section tabs */}
      <div className="archive-tabs">
        <button
          className={`archive-tab${activeTab === 'all' ? ' active' : ''}`}
          onClick={() => setActiveTab('all')}
        >{t.all}</button>
        {archiveData.tabs.map(tab => (
          <button
            key={tab.id}
            className={`archive-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >{t.sections[tab.id] || tab.label}</button>
        ))}
      </div>

      {/* Asset content */}
      <div className="archive-body">
        {visibleSections.map(tab => {
          const images  = archiveData.imageAssets.filter(a => a.sectionId === tab.id);
          const videos  = (archiveData.videoAssets  || []).filter(a => a.sectionId === tab.id);
          const models  = (archiveData.modelAssets  || []).filter(a => a.sectionId === tab.id);
          const docs    = (archiveData.documents    || []).filter(a => a.sectionId === tab.id);
          const iframes = (archiveData.iframeAssets || []).filter(a => a.sectionId === tab.id);
          if (!images.length && !videos.length && !models.length && !docs.length && !iframes.length) return null;

          return (
            <div key={tab.id} className="archive-section">
              <div className="archive-section-header">
                {t.sections[tab.id] || tab.label}
                <span className="archive-section-desc"> — {tab.description}</span>
              </div>

              {images.length > 0 && (
                <div className="archive-grid">
                  {images.map(item => (
                    <ArchiveImageCard
                      key={item.id}
                      item={item}
                      t={t}
                      onOpenImage={setImageOpen}
                    />
                  ))}
                </div>
              )}

              {videos.length > 0 && (
                <div className="archive-grid">
                  {videos.map(item => (
                    <ArchiveVideoCard
                      key={item.id}
                      item={item}
                      t={t}
                      onOpenVideo={setVideoOpen}
                    />
                  ))}
                </div>
              )}

              {docs.map(doc => (
                <ArchiveDocCard key={doc.id} doc={doc} t={t} onOpenPdf={setPdfOpen} />
              ))}

              {models.length > 0 && (
                <div className="archive-glb-grid">
                  {models.map(item => (
                    <ArchiveModelCard key={item.id} item={item} t={t} />
                  ))}
                </div>
              )}

              {iframes.map(fr => (
                <div key={fr.id} className="archive-iframe-card">
                  <div className="archive-card-title">🔗 {fr.title}</div>
                  {fr.author && <div className="archive-card-author">{t.by}: {fr.author}</div>}
                  <div className="archive-card-desc">{fr.description}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Services footer */}
      <div className="services-row">
        <div className="service-box">
          <div className="service-title">{t.svc1Title}</div>
          <ol>{t.svc1.map((item, i) => <li key={i}>{item}</li>)}</ol>
        </div>
        <div className="service-box">
          <div className="service-title">{t.svc2Title}</div>
          <ol>{t.svc2.map((item, i) => <li key={i}>{item}</li>)}</ol>
        </div>
      </div>

      {pdfOpen && (
        <PdfModal
          src={pdfOpen.src}
          title={pdfOpen.title}
          onClose={() => setPdfOpen(null)}
        />
      )}

      {videoOpen && (
        <VideoModal
          src={videoOpen.src}
          title={videoOpen.title}
          onClose={() => setVideoOpen(null)}
        />
      )}

      {imageOpen && (
        <ImageModal
          src={imageOpen.src}
          title={imageOpen.title}
          onClose={() => setImageOpen(null)}
        />
      )}
    </div>
  );
}

// ─── Popup ────────────────────────────────────────────────────────────────────
function Popup({ t, onClose }) {
  return (
    <div className="popup">
      <button className="popup-close" onClick={onClose}>{t.close}</button>
      <div className="popup-head">
        <span className="popup-chef-icon">🏆</span>
        <div>
          <div className="popup-brand">{t.popupBrand}</div>
          <div className="popup-sub">{t.popupSub}</div>
        </div>
      </div>
      <table className="popup-table">
        <thead>
          <tr><th>{t.popupDish}</th><th>{t.popupBenefit}</th></tr>
        </thead>
        <tbody>
          {t.popupMenu.map(([dish, benefit], i) => (
            <tr key={i}><td>{dish}</td><td>{benefit}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
const ADMIN_USER = 'admin';
const ADMIN_PASS = '1111';

export default function App() {
  const [lang, setLang]             = useState('en');
  const [showPopup, setShowPopup]   = useState(true);
  const [activeNav, setActiveNav]   = useState(() => navFromPath(window.location.pathname));
  const [showRegister, setShowReg]  = useState(false);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [isQueueFocus, setIsQueueFocus] = useState(false);
  const prevNavRef = useRef(0);
  const { queue, connected, queueError, register, callNext, enterSession, completeSession } = useQueue();
  const t = T[lang];
  const toggleLang = () => setLang(l => (l === 'zh' ? 'en' : 'zh'));

  const activePath = pathFromNav(activeNav);
  const isConsultants  = activePath === NAV_CONSULTANTS_PATH;
  const isTeam         = activePath === NAV_TEAM_PATH;
  const isAbout        = activePath === NAV_ABOUT_PATH;
  const isRegistration = activeNav === NAV_QUEUE;

  function navigateTo(nav) {
    setActiveNav(nav);
    const nextPath = pathFromNav(nav);
    if (normalizePath(window.location.pathname) !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }

  function handleLogin(user, pass) {
    if (user === ADMIN_USER && pass === ADMIN_PASS) setIsAdmin(true);
  }

  const openQueueFocus = useCallback(() => {
    if (isQueueFocus) return;
    prevNavRef.current = activeNav;
    navigateTo(NAV_QUEUE);
    setIsQueueFocus(true);
  }, [activeNav, isQueueFocus]);

  const toggleQueueFocus = useCallback(() => {
    if (isQueueFocus) {
      setIsQueueFocus(false);
      if (prevNavRef.current !== NAV_QUEUE) navigateTo(prevNavRef.current);
      return;
    }

    openQueueFocus();
  }, [isQueueFocus, openQueueFocus]);

  useEffect(() => {
    function onPopState() {
      setActiveNav(navFromPath(window.location.pathname));
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (String(e.key).toLowerCase() !== 'r') return;
      const target = e.target;
      const tag = target?.tagName?.toLowerCase();
      const isTypingField = !!target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
      if (isTypingField) return;
      e.preventDefault();
      toggleQueueFocus();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleQueueFocus]);

  function centerContent() {
    if (isRegistration) return <QueueBoard queue={queue} isAdmin={isAdmin} callNext={callNext} enterSession={enterSession} completeSession={completeSession} connected={connected} queueError={queueError} />;
    if (isConsultants)  return <ConsultantsContent />;
    if (isTeam)         return <TeamContent />;
    if (isAbout)        return <ArchiveContent t={t} />;
    return <StoriesContent t={t} />;
  }

  if (isQueueFocus) {
    return (
      <div className="site site--queue-focus">
        <div className="queue-focus-screen">
          <QueueBoard queue={queue} isAdmin={isAdmin} callNext={callNext} enterSession={enterSession} completeSession={completeSession} connected={connected} queueError={queueError} />
        </div>
      </div>
    );
  }

  return (
    <div className="site">
      <LoginBar t={t} onToggleLang={toggleLang} onRegister={() => setShowReg(true)} onLogin={handleLogin} isAdmin={isAdmin} onOpenQueueFocus={openQueueFocus} />
      <SiteHeader t={t} />
      <SiteNav t={t} activeNav={activeNav} onNavClick={navigateTo} />
      <HeroBanner t={t} />
      <div className="main-layout">
        <BurgerAd t={t} />
        <MemberCol title={t.femaleCol} profiles={FEMALE_PROFILES} lang={lang} />
        {centerContent()}
        <MemberCol title={t.maleCol} profiles={MALE_PROFILES} lang={lang} />
        <BurgerAd t={t} />
      </div>
      {showPopup && <Popup t={t} onClose={() => setShowPopup(false)} />}
      {showRegister && (
        <RegisterPage
          onClose={() => setShowReg(false)}
          onRegistered={() => navigateTo(NAV_QUEUE)}
          onRegister={register}
        />
      )}
    </div>
  );
}
