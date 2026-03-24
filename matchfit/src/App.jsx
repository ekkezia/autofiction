import { useState, Suspense } from 'react';
import archiveData from '../archive-assets.json';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const SUPABASE = import.meta.env.VITE_SUPABASE_STORAGE;

// Convert local asset path → Supabase storage URL; pass external URLs through unchanged
function storageUrl(src) {
  if (!src || src.startsWith('http')) return src;
  const path = src.startsWith('public/assets/') ? src.slice('public/assets/'.length)
    : src.startsWith('/assets/')               ? src.slice('/assets/'.length)
    : src.startsWith('assets/')                ? src.slice('assets/'.length)
    : src;
  return `${SUPABASE}/${path}`;
}

function GlbModel({ src }) {
  const { scene } = useGLTF(src);
  return <Center><primitive object={scene} /></Center>;
}

function GlbViewer({ src, title }) {
  const path = storageUrl(src);
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

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
  zh: {
    username: '用户名',
    password: '密码',
    login: '登录',
    forgot: '忘记密码',
    cardLabel: '相亲一卡通：',
    recharge: '充值中心',
    buyOnline: '在线购买',
    tagline1: '让相遇不再偶然，让心动有迹可循',
    tagline2: 'Where meetings are no longer by chance, and every heartbeat finds its way.',
    greeting: '下午好',
    navItems: ['征婚首页', '征婚会员', '同城聊天', '同城相亲', '本地分站', '红娘介绍', '在线客服', '帮助中心', '个人信息', '关于我们'],
    heroPrefix: '找对象，就上',
    femaleCol: '全国推荐女性会员',
    maleCol: '全国推荐男性会员',
    vertLeft: '你走的路都在向某人靠近',
    vertRight: '缘分绝不会让你一直孤单',
    burgerStat: '美味值 100%',
    burgerPromo: ['全民撸堡', '自由加料'],
    burgerBtn: '暴击加料',
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
    svc1Title: '为您专属 · 专业测试',
    svc1: ['分析您的恋爱行为', '解析您的理想伴侣', '为您提供交往建议'],
    svc2Title: '会员专享服务专区',
    svc2: ['爱情顾问人工服务', '测试报告讲解服务', '人工推荐匹配'],
    popupBrand: 'Silky Kitchen 王者归来',
    close: '关闭',
    popupDish: '招牌菜品',
    popupBenefit: '到店福利',
    popupMenu: [
      ['丝滑鲍汁捞饭', '立减20元'],
      ['金牌乳鸡皇', '赠送例汤'],
      ['港式杨枝甘露', '第二份半价'],
      ['招牌烧腊拼盘', '满100减30'],
    ],
    storiesTitle: '那天，他们遇见了彼此',
    stories: [
      '一年前我是在朋友推荐下来到这个网站的，当时也没抱太大希望。后来红娘老师和我聊了很多，了解情况后，帮我介绍了现在的妻子。第一次见面是在一家咖啡店，我们都有点紧张，但很快就聊开了。这一年里我们一步步走到今天，直到领了结婚证，才真正意识到彼此已经成为对方生活的一部分。如果没有当时的那次介绍，也不会有现在的我们……',
      '我们是在这里认识的，但一开始其实并没有很快确定关系。更多的是断断续续的聊天，有时候忙起来也会几天不联系。后来红娘老师又帮我们重新牵了一次线，让我们再认真见了一面。那一次之后，才慢慢变得不一样，没有特别轰动的过程，就是从不太确定，到越来越习惯对方的存在。现在回头看，那次再试一次，刚好改变了后面的所有事情……',
    ],
    viewPdf: '查看 PDF',
    toggleBtn: 'EN',
  },
  en: {
    username: 'Username',
    password: 'Password',
    login: 'Login',
    forgot: 'Forgot Password',
    cardLabel: 'Matchmaking Card:',
    recharge: 'Top Up',
    buyOnline: 'Buy Online',
    tagline1: 'Where meetings are no longer by chance',
    tagline2: 'and every heartbeat finds its way.',
    greeting: 'Good Afternoon',
    navItems: ['Home', 'Members', 'Local Chat', 'Local Dating', 'City Branches', 'Matchmaker', 'Live Support', 'Help Center', 'My Profile', 'About Us'],
    heroPrefix: 'Find Your Match on',
    femaleCol: 'Recommended Female Members',
    maleCol: 'Recommended Male Members',
    vertLeft: 'Every path you walk leads toward someone',
    vertRight: 'Fate will never leave you alone',
    burgerStat: 'Delicious Level 100%',
    burgerPromo: ['BURGERS FOR', 'EVERYONE'],
    burgerBtn: 'CRITICAL HIT!',
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
    svc1Title: 'Exclusive · Professional Tests',
    svc1: ['Analyze your love patterns', 'Discover your ideal partner', 'Get personalized dating advice'],
    svc2Title: 'Members-Only Services',
    svc2: ['Personal love consultant', 'Test results walkthrough', 'Manual matchmaking'],
    storiesTitle: 'The Day They Found Each Other',
    stories: [
      "A year ago a friend recommended this site to me — I didn't have high hopes. But the matchmaker spent a long time understanding my situation and introduced me to my now-wife. Our first meeting was at a coffee shop; we were both nervous but quickly found our rhythm. Step by step across this year, right up until we signed the marriage certificate, I truly realised we had become part of each other's lives. Without that introduction, none of this would exist.",
      "We met here, but things didn't move quickly at first. Mostly scattered chats, sometimes going days without contact when life got busy. Then the matchmaker reconnected us for a more deliberate meeting. After that everything gradually became different — no dramatic turning point, just a slow shift from uncertainty to being completely comfortable in each other's presence. Looking back now, that one extra chance changed everything that came after.",
    ],
    popupBrand: 'Silky Kitchen Returns',
    close: 'Close',
    popupDish: 'Signature Dishes',
    popupBenefit: 'Dine-In Rewards',
    popupMenu: [
      ['Smooth Abalone Rice', '¥20 Off'],
      ['Premium Roast Chicken', 'Free Soup'],
      ['HK Mango Pomelo Sago', '2nd Half Price'],
      ['BBQ Platter', '¥30 Off ¥100+'],
    ],
    viewPdf: 'View PDF',
    toggleBtn: '中文',
  },
};

// ─── PROFILE DATA ─────────────────────────────────────────────────────────────
const FEMALE_PROFILES = [
  { img: 47, nameZh: 'Amy', ageZh: '23岁', cityZh: '纽约市', nameEn: 'Amy', ageEn: '23', cityEn: 'New York', desc: 'Outgoing and easy-going with great humor. Loves sports and music. Easy to get along with...' },
  { img: 5,  nameZh: '无问西东', ageZh: '28岁', cityZh: '上海市', nameEn: 'Wuwen Xidong', ageEn: '28', cityEn: 'Shanghai', desc: 'Emotional yet rational, imaginative yet grounded. A natural born storyteller...' },
  { img: 32, nameZh: 'Amy', ageZh: '23岁', cityZh: '纽约市', nameEn: 'Amy', ageEn: '23', cityEn: 'New York', desc: 'Outgoing and easy-going with great humor. Loves sports and music. Easy to get along with...' },
  { img: 9,  nameZh: '无问西东', ageZh: '28岁', cityZh: '上海市', nameEn: 'Wuwen Xidong', ageEn: '28', cityEn: 'Shanghai', desc: 'Emotional yet rational, imaginative yet grounded. A natural born storyteller...' },
  { img: 23, nameZh: 'Amy', ageZh: '23岁', cityZh: '纽约市', nameEn: 'Amy', ageEn: '23', cityEn: 'New York', desc: 'Outgoing and easy-going with great humor. Loves sports and music. Easy to get along with...' },
  { img: 44, nameZh: '无问西东', ageZh: '28岁', cityZh: '上海市', nameEn: 'Wuwen Xidong', ageEn: '28', cityEn: 'Shanghai', desc: 'Emotional yet rational, imaginative yet grounded. A natural born storyteller...' },
  { img: 38, nameZh: 'Amy', ageZh: '26岁', cityZh: '纽约市', nameEn: 'Amy', ageEn: '26', cityEn: 'New York', desc: 'Outgoing and easy-going with great humor. Loves sports and music. Easy to get along with...' },
];

const MALE_PROFILES = [
  { img: 12, nameZh: 'Andy', ageZh: '26岁', cityZh: '纽约市', nameEn: 'Andy', ageEn: '26', cityEn: 'New York', desc: 'Outgoing and easy-going with great humor. Loves sports and music. Easy to get along with...' },
  { img: 15, nameZh: '道知我心', ageZh: '28岁', cityZh: '上海市', nameEn: 'Dao Zhiwoxin', ageEn: '28', cityEn: 'Shanghai', desc: 'Emotional yet rational, imaginative yet grounded. A natural born storyteller...' },
  { img: 18, nameZh: 'Andy', ageZh: '26岁', cityZh: '纽约市', nameEn: 'Andy', ageEn: '26', cityEn: 'New York', desc: 'Outgoing and easy-going with great humor. Loves sports and music. Easy to get along with...' },
  { img: 22, nameZh: '道知我心', ageZh: '28岁', cityZh: '上海市', nameEn: 'Dao Zhiwoxin', ageEn: '28', cityEn: 'Shanghai', desc: 'Emotional yet rational, imaginative yet grounded. A natural born storyteller...' },
  { img: 33, nameZh: 'Andy', ageZh: '26岁', cityZh: '纽约市', nameEn: 'Andy', ageEn: '26', cityEn: 'New York', desc: 'Outgoing and easy-going with great humor. Loves sports and music. Easy to get along with...' },
  { img: 52, nameZh: '道知我心', ageZh: '28岁', cityZh: '上海市', nameEn: 'Dao Zhiwoxin', ageEn: '28', cityEn: 'Shanghai', desc: 'Emotional yet rational, imaginative yet grounded. A natural born storyteller...' },
  { img: 57, nameZh: 'Andy', ageZh: '26岁', cityZh: '纽约市', nameEn: 'Andy', ageEn: '26', cityEn: 'New York', desc: 'Outgoing and easy-going with great humor. Loves sports and music. Easy to get along with...' },
];

// ─── LoginBar ─────────────────────────────────────────────────────────────────
function LoginBar({ t, onToggleLang }) {
  return (
    <div className="login-bar">
      <div className="login-left">
        <span>{t.username}</span>
        <input type="text" className="login-input" readOnly />
        <span>{t.password}</span>
        <input type="password" className="login-input" readOnly />
        <button className="login-btn">{t.login}</button>
        <span className="login-link">{t.forgot}</span>
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
        <div className="logo-bars">
          <span className="bar b1" />
          <span className="bar b2" />
          <span className="bar b3" />
          <span className="bar b4" />
        </div>
        <span className="logo-text">Match Fit</span>
      </div>
      <div className="tagline">
        <div className="tagline-1">{t.tagline1}</div>
        <div className="tagline-2">{t.tagline2}</div>
      </div>
    </div>
  );
}

// ─── SiteNav ──────────────────────────────────────────────────────────────────
function SiteNav({ t, activeNav, onNavClick }) {
  return (
    <nav className="site-nav">
      <span className="greeting">{t.greeting}</span>
      {t.navItems.map((item, i) => (
        <a
          key={i}
          className={`nav-item${activeNav === i ? ' active' : ''}`}
          href="#"
          onClick={e => { e.preventDefault(); onNavClick(i); }}
        >{item}</a>
      ))}
    </nav>
  );
}

// ─── HeroBanner ───────────────────────────────────────────────────────────────
function HeroBanner({ t }) {
  return (
    <div className="hero-banner">
      <span className="hero-prefix">{t.heroPrefix}</span>
      <span className="hero-brand">MATCH FIT</span>
    </div>
  );
}

// ─── BurgerAd ─────────────────────────────────────────────────────────────────
function BurgerAd({ t }) {
  return (
    <div className="outer-ad">
      <div className="burger-logo">7th Street Burger</div>
      <div className="burger-stat">
        <div className="burger-stat-label">{t.burgerStat}</div>
        <div className="burger-stat-bar"><div className="burger-stat-fill" /></div>
      </div>
      <div className="burger-emoji">🍔</div>
      <div className="burger-char">👨‍🍳</div>
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

// ─── VertCol ──────────────────────────────────────────────────────────────────
function VertCol({ text }) {
  return (
    <div className="vert-col">
      <div className="vert-text">{text}</div>
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
                    <div key={item.id} className="archive-card">
                      <img
                        src={storageUrl(item.src)}
                        className="archive-thumb"
                        alt={item.title}
                        style={{ cursor: 'zoom-in' }}
                        onClick={() => setImageOpen({ src: storageUrl(item.src), title: item.title })}
                      />
                      <div className="archive-card-body">
                        <div className="archive-card-title">{item.title}</div>
                        {item.author && <div className="archive-card-author">{t.by}: {item.author}</div>}
                        <div className="archive-card-desc">{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {videos.length > 0 && (
                <div className="archive-grid">
                  {videos.map(item => (
                    <div key={item.id} className="archive-card" style={{flexDirection:'column',gap:4}}>
                      <div
                        className="video-thumb"
                        onClick={() => setVideoOpen({ src: storageUrl(item.src), title: item.title })}
                      >
                        <video
                          src={storageUrl(item.src)}
                          muted
                          preload="metadata"
                          style={{width:'100%',height:'100%',objectFit:'cover',display:'block',pointerEvents:'none'}}
                        />
                        <div className="video-play-btn">▶</div>
                      </div>
                      <div className="archive-card-body">
                        <div className="archive-card-title">{item.title}</div>
                        {item.author && <div className="archive-card-author">{t.by}: {item.author}</div>}
                        <div className="archive-card-desc">{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {docs.map(doc => {
                const isPdf = doc.directory?.toLowerCase().endsWith('.pdf');
                return (
                  <div key={doc.id} className="archive-doc">
                    <div className="archive-card-title">{doc.title}</div>
                    {doc.author && <div className="archive-card-author">{t.by}: {doc.author}</div>}
                    <div className="archive-card-desc">{doc.description}</div>
                    {doc.excerpt && <div className="archive-excerpt">"{doc.excerpt}"</div>}
                    {isPdf && (
                      <button className="view-pdf-btn" onClick={() => setPdfOpen({ src: storageUrl(doc.directory), title: doc.title })}>
                        📄 {t.viewPdf}
                      </button>
                    )}
                  </div>
                );
              })}

              {models.length > 0 && (
                <div className="archive-glb-grid">
                  {models.map(item => (
                    <div key={item.id} className="archive-glb-card">
                      <GlbViewer src={item.src} title={item.title} />
                      <div className="archive-card-body">
                        <div className="archive-card-title">{item.title}</div>
                        {item.author && <div className="archive-card-author">{t.by}: {item.author}</div>}
                        <div className="archive-card-desc">{item.description}</div>
                      </div>
                    </div>
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
        <span className="popup-chef-icon">👨‍🍳</span>
        <div>
          <div className="popup-brand">{t.popupBrand}</div>
          <div className="popup-sub">招牌粤菜 · 正宗出品</div>
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
export default function App() {
  const [lang, setLang]           = useState('zh');
  const [showPopup, setShowPopup] = useState(true);
  const [activeNav, setActiveNav] = useState(0);
  const t = T[lang];
  const toggleLang = () => setLang(l => (l === 'zh' ? 'en' : 'zh'));
  const isAbout = activeNav === t.navItems.length - 1;

  return (
    <div className="site">
      <LoginBar t={t} onToggleLang={toggleLang} />
      <SiteHeader t={t} />
      <SiteNav t={t} activeNav={activeNav} onNavClick={setActiveNav} />
      <HeroBanner t={t} />
      <div className="main-layout">
        <BurgerAd t={t} />
        <MemberCol title={t.femaleCol} profiles={FEMALE_PROFILES} lang={lang} />
        <VertCol text={t.vertLeft} />
        {isAbout ? <ArchiveContent t={t} /> : <StoriesContent t={t} />}
        <VertCol text={t.vertRight} />
        <MemberCol title={t.maleCol} profiles={MALE_PROFILES} lang={lang} />
        <BurgerAd t={t} />
      </div>
      {showPopup && <Popup t={t} onClose={() => setShowPopup(false)} />}
    </div>
  );
}
