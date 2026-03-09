"use client";

import { createElement, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import archiveData from "@/data/archive-assets.json";

type SectionId = (typeof archiveData.tabs)[number]["id"];
type ActiveTab = "all" | SectionId;
type ImageAsset = (typeof archiveData.imageAssets)[number];
type ModelAsset = (typeof archiveData.modelAssets)[number];
type FullscreenAsset =
  | { kind: "image"; item: ImageAsset }
  | { kind: "model"; item: ModelAsset }
  | null;
type AdUnit = {
  id: string;
  title: string;
  subline: string;
  cta: string;
  badge: string;
  gifUrl: string;
  palette: string;
};

const AD_GIFS = [
  "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif",
  "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif",
  "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
];

const AD_TITLES = [
  "速配通道 3分钟建档",
  "高净值优选专区",
  "同城真人认证库",
  "父母省心相亲包",
  "黄金周末专场",
  "一键匹配提高效率",
];

const AD_SUBLINES = [
  "今日已新增 2,381 位候选档案",
  "跳过无效社交，直连目标对象",
  "资料透明：年龄/学历/收入可筛选",
  "热门城市同步开放预约入口",
  "限时赠送 7 天高优先曝光",
  "高频更新，实时排行滚动中",
];

const AD_CTAS = ["立即进入", "点击抢位", "马上匹配", "限时查看", "进入专题", "快速申请"];
const AD_BADGES = ["广告", "特惠", "HOT", "推荐", "限时", "置顶"];
const AD_PALETTES = [
  "from-[#fff4bd] via-[#ffe28e] to-[#ffbf72]",
  "from-[#d8ecff] via-[#b9d9ff] to-[#98c4ff]",
  "from-[#ffe0de] via-[#ffc3bd] to-[#ffad84]",
  "from-[#e6ffd9] via-[#d4f7bc] to-[#c3eca4]",
];
const SHOW_FAKE_ADS = false;

function normalizeAssetPath(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) {
    return path;
  }

  const withoutPublic = path.startsWith("public/") ? path.slice("public".length) : path;
  return withoutPublic.startsWith("/") ? withoutPublic : `/${withoutPublic}`;
}

function seededValue(seed: string, step: number, mod: number): number {
  let hash = 7 + step * 13;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  return hash % mod;
}

function generateAds(seed: string, count: number): AdUnit[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${seed}-${index}`,
    title: AD_TITLES[seededValue(seed, index + 1, AD_TITLES.length)],
    subline: AD_SUBLINES[seededValue(seed, index + 3, AD_SUBLINES.length)],
    cta: AD_CTAS[seededValue(seed, index + 5, AD_CTAS.length)],
    badge: AD_BADGES[seededValue(seed, index + 7, AD_BADGES.length)],
    gifUrl: AD_GIFS[seededValue(seed, index + 11, AD_GIFS.length)],
    palette: AD_PALETTES[seededValue(seed, index + 17, AD_PALETTES.length)],
  }));
}

function AdCard({ ad, small = false }: { ad: AdUnit; small?: boolean }) {
  return (
    <article
      className={`ad-card dense-item relative overflow-hidden border-[#e3a75f] p-1.5 ${
        small ? "min-h-[96px]" : "min-h-[108px]"
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br opacity-75 ${ad.palette}`} />
      <div className="ad-scanlines absolute inset-0 opacity-35" />
      <div className="relative z-10 flex gap-2">
        <div
          className={`${small ? "h-14 w-[72px]" : "h-16 w-20"} shrink-0 border border-[#c77d35] bg-cover bg-center`}
          style={{ backgroundImage: `url(${ad.gifUrl})` }}
          aria-label={`${ad.title} gif banner`}
        />
        <div className="min-w-0 text-[10px] leading-[1.15] text-[#5f2400]">
          <p className="ad-blink inline-block rounded bg-[#b41400] px-1 py-0.5 text-[9px] font-bold text-white">
            {ad.badge}
          </p>
          <h4 className="mt-1 truncate text-[11px] font-bold">{ad.title}</h4>
          <p className="line-clamp-2">{ad.subline}</p>
          <p className="mt-1 inline-block rounded border border-[#9e3f00] bg-[#ffea9c] px-1 py-0.5 text-[10px] font-semibold text-[#8f2e00]">
            {ad.cta}
          </p>
        </div>
      </div>
    </article>
  );
}

function ImageCard({
  title,
  src,
  directory,
  description,
  author,
  onExpand,
}: {
  title: string;
  src: string;
  directory: string;
  description: string;
  author?: string;
  onExpand?: () => void;
}) {
  const normalizedSrc = normalizeAssetPath(src);

  return (
    <article className="dense-item flex min-h-[92px] gap-2 p-1.5">
      <button type="button" onClick={onExpand} className="group block h-20 w-24 shrink-0 cursor-zoom-in">
        <Image
          src={normalizedSrc}
          alt={title}
          width={160}
          height={120}
          unoptimized
          loading="lazy"
          className="h-20 w-24 border border-[#8a9fc7] object-cover"
        />
      </button>
      <div className="min-w-0 text-[11px] leading-[1.2] text-[#122b55]">
        <h4 className="truncate text-[11px] font-semibold text-[#ad1f00]">{title}</h4>
        {author ? <p className="truncate text-[10px] font-semibold text-[#17437f]">By {author}</p> : null}
        <p className="line-clamp-3">{description}</p>
        <p className="mt-1 text-[10px] font-semibold text-[#17437f]">Click image to fullscreen</p>
        <p className="mt-1 truncate font-mono text-[10px] text-[#48648f]">{directory}</p>
      </div>
    </article>
  );
}

function VideoCard({
  title,
  src,
  directory,
  description,
  author,
}: {
  title: string;
  src: string;
  directory: string;
  description: string;
  author?: string;
}) {
  return (
    <article className="dense-item flex min-h-[96px] gap-2 p-1.5">
      <video
        src={normalizeAssetPath(src)}
        controls
        preload="metadata"
        className="h-20 w-24 shrink-0 border border-[#8a9fc7] object-cover"
      />
      <div className="min-w-0 text-[11px] leading-[1.2] text-[#122b55]">
        <h4 className="truncate text-[11px] font-semibold text-[#ad1f00]">{title}</h4>
        {author ? <p className="truncate text-[10px] font-semibold text-[#17437f]">By {author}</p> : null}
        <p className="line-clamp-3">{description}</p>
        <p className="mt-1 truncate font-mono text-[10px] text-[#48648f]">{directory}</p>
      </div>
    </article>
  );
}

function ModelCard({
  title,
  src,
  poster,
  directory,
  description,
  author,
  onExpand,
}: {
  title: string;
  src: string;
  poster?: string;
  directory: string;
  description: string;
  author?: string;
  onExpand?: () => void;
}) {
  const normalizedSrc = normalizeAssetPath(src);
  const normalizedPoster = poster ? normalizeAssetPath(poster) : undefined;

  return (
    <article className="dense-item p-1.5">
      <div className="grid grid-cols-[1.05fr_1fr] gap-2">
        <button type="button" onClick={onExpand} className="group relative block h-28 w-full cursor-zoom-in">
          {createElement("model-viewer", {
            src: normalizedSrc,
            poster: normalizedPoster,
            loading: "lazy",
            "auto-rotate": true,
            "camera-controls": true,
            exposure: "1",
            "shadow-intensity": "1",
            className: "pointer-events-none h-28 w-full overflow-hidden border border-[#8a9fc7] bg-[#dbe8ff]",
          })}
          <span className="pointer-events-none absolute right-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
            Fullscreen
          </span>
        </button>
        <div className="min-w-0 text-[11px] leading-[1.2] text-[#122b55]">
          <h4 className="truncate text-[11px] font-semibold text-[#ad1f00]">{title}</h4>
          {author ? <p className="truncate text-[10px] font-semibold text-[#17437f]">By {author}</p> : null}
          <p className="line-clamp-4">{description}</p>
          <p className="mt-1 text-[10px] font-semibold text-[#17437f]">Click model to fullscreen</p>
          <p className="mt-1 truncate font-mono text-[10px] text-[#48648f]">{directory}</p>
        </div>
      </div>
    </article>
  );
}

function IframeCard({
  title,
  url,
  directory,
  description,
  author,
}: {
  title: string;
  url: string;
  directory: string;
  description: string;
  author?: string;
}) {
  return (
    <article className="dense-item p-1.5">
      <iframe
        src={url}
        loading="lazy"
        title={title}
        className="h-32 w-full border border-[#8a9fc7] bg-white"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        referrerPolicy="no-referrer"
      />
      <div className="mt-1.5 text-[11px] leading-[1.2] text-[#122b55]">
        <h4 className="truncate text-[11px] font-semibold text-[#ad1f00]">{title}</h4>
        {author ? <p className="truncate text-[10px] font-semibold text-[#17437f]">By {author}</p> : null}
        <p className="line-clamp-3">{description}</p>
        <p className="mt-1 truncate font-mono text-[10px] text-[#48648f]">{directory}</p>
      </div>
    </article>
  );
}

function DocumentCard({
  title,
  directory,
  description,
  excerpt,
  author,
}: {
  title: string;
  directory: string;
  description: string;
  excerpt: string;
  author?: string;
}) {
  return (
    <article className="dense-item min-h-[110px] p-1.5 text-[11px] leading-[1.2] text-[#122b55]">
      <h4 className="truncate text-[11px] font-semibold text-[#ad1f00]">{title}</h4>
      {author ? <p className="truncate text-[10px] font-semibold text-[#17437f]">By {author}</p> : null}
      <p className="mt-1 line-clamp-2">{description}</p>
      <p className="mt-1 rounded bg-[#fff4dc] px-1.5 py-1 text-[10px] leading-[1.25] text-[#22395f]">
        {excerpt}
      </p>
      <p className="mt-1.5 truncate font-mono text-[10px] text-[#48648f]">{directory}</p>
    </article>
  );
}

function SectionPanel({
  sectionId,
  onImageExpand,
  onModelExpand,
}: {
  sectionId: SectionId;
  onImageExpand: (item: ImageAsset) => void;
  onModelExpand: (item: ModelAsset) => void;
}) {
  const images = archiveData.imageAssets.filter((item) => item.sectionId === sectionId);
  const videos = archiveData.videoAssets.filter((item) => item.sectionId === sectionId);
  const models = archiveData.modelAssets.filter((item) => item.sectionId === sectionId);
  const iframes = archiveData.iframeAssets.filter((item) => item.sectionId === sectionId);
  const docs = archiveData.documents.filter((item) => item.sectionId === sectionId);
  const sectionAds = useMemo(
    () => (SHOW_FAKE_ADS ? generateAds(`section-${sectionId}`, 6) : []),
    [sectionId],
  );

  return (
    <div className="space-y-2">
      {images.length > 0 ? (
        <div>
          <h5 className="section-subtitle">IMAGE ASSET LEDGER ({images.length})</h5>
          <div className="compact-grid mt-1.5">
            {images.map((item) => (
              <ImageCard key={item.id} {...item} onExpand={() => onImageExpand(item)} />
            ))}
          </div>
        </div>
      ) : null}

      {videos.length > 0 ? (
        <div>
          <h5 className="section-subtitle">VIDEO CLIPS ({videos.length})</h5>
          <div className="compact-grid mt-1.5">
            {videos.map((item) => (
              <VideoCard key={item.id} {...item} />
            ))}
          </div>
        </div>
      ) : null}

      {models.length > 0 ? (
        <div>
          <h5 className="section-subtitle">3D FLOOR MODEL / GLB ({models.length})</h5>
          <div className="compact-grid mt-1.5">
            {models.map((item) => (
              <ModelCard key={item.id} {...item} onExpand={() => onModelExpand(item)} />
            ))}
          </div>
        </div>
      ) : null}

      {iframes.length > 0 ? (
        <div>
          <h5 className="section-subtitle">SUPPORT IFRAMES ({iframes.length})</h5>
          <div className="compact-grid mt-1.5">
            {iframes.map((item) => (
              <IframeCard key={item.id} {...item} />
            ))}
          </div>
        </div>
      ) : null}

      {docs.length > 0 ? (
        <div>
          <h5 className="section-subtitle">DOCUMENT FILES ({docs.length})</h5>
          <div className="compact-grid mt-1.5">
            {docs.map((item) => (
              <DocumentCard key={item.id} {...item} />
            ))}
          </div>
        </div>
      ) : null}

      {SHOW_FAKE_ADS ? (
        <div>
          <h5 className="section-subtitle">SPONSOR ADS / 推广位 ({sectionAds.length})</h5>
          <div className="compact-grid mt-1.5">
            {sectionAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [fullscreenAsset, setFullscreenAsset] = useState<FullscreenAsset>(null);
  const headerAds = useMemo(() => generateAds("header-ads", 6), []);
  const railLeftAds = useMemo(() => generateAds("rail-left", 5), []);
  const railRightAds = useMemo(() => generateAds("rail-right", 5), []);

  useEffect(() => {
    if (!fullscreenAsset) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreenAsset(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreenAsset]);

  const isAllView = activeTab === "all";

  const visibleTabs = useMemo(
    () =>
      activeTab === "all"
        ? archiveData.tabs
        : archiveData.tabs.filter((tab) => tab.id === activeTab),
    [activeTab],
  );

  return (
    <div className="min-h-screen px-2 py-2 sm:px-3 sm:py-3">
      <main className="mx-auto max-w-[1520px]">
        <header className="dense-panel sticky top-0 z-40 overflow-hidden">
          <div className="top-strip">
            <span>Autofiction Archive / 项目资料库</span>
            <span>Dense Mode Enabled</span>
            <span>Update JSON to edit all media + docs</span>
          </div>
          <div className="grid gap-2 border-b border-[#c9dbff] p-2 sm:grid-cols-[1.5fr_1fr]">
            <div>
              <h1 className="text-[20px] font-bold uppercase leading-[1] tracking-tight text-[#b01800]">
                {archiveData.project.title}
              </h1>
              <p className="mt-1 text-[12px] font-medium text-[#17437f]">{archiveData.project.subtitle}</p>
            </div>
            <p className="rounded border border-[#a6bfe8] bg-[#f9fcff] px-2 py-1 text-[11px] leading-[1.25] text-[#1b3762]">
              {archiveData.project.notice}
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-4 lg:grid-cols-7">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`folder-tab ${activeTab === "all" ? "folder-tab-active" : ""}`}
            >
              总览 All
            </button>
            {archiveData.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`folder-tab ${activeTab === tab.id ? "folder-tab-active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {SHOW_FAKE_ADS ? (
            <div className="grid grid-cols-2 gap-1 border-t border-[#d6e5ff] bg-[#fff3d2] p-1.5 md:grid-cols-3 lg:grid-cols-6">
              {headerAds.map((ad) => (
                <AdCard key={ad.id} ad={ad} small />
              ))}
            </div>
          ) : null}
        </header>

        <section
          className={
            isAllView
              ? "mt-2 columns-1 gap-2 sm:mt-3 md:columns-2 xl:columns-3"
              : "mt-2 flex justify-center sm:mt-3"
          }
        >
          {visibleTabs.map((tab) => (
            <article
              key={tab.id}
              className={
                isAllView
                  ? "dense-panel mb-2 inline-block w-full break-inside-avoid-column"
                  : "dense-panel w-full max-w-[920px]"
              }
            >
              <div className="border-b border-[#c9dbff] px-2 py-1.5">
                <h2 className="text-[12px] font-bold uppercase text-[#0f3b7b]">{tab.label}</h2>
                <p className="mt-0.5 text-[10px] leading-[1.2] text-[#385987]">{tab.description}</p>
              </div>
              <div className="p-2">
                <SectionPanel
                  sectionId={tab.id}
                  onImageExpand={(item) => setFullscreenAsset({ kind: "image", item })}
                  onModelExpand={(item) => setFullscreenAsset({ kind: "model", item })}
                />
              </div>
            </article>
          ))}
        </section>
      </main>

      {SHOW_FAKE_ADS ? (
        <aside className="pointer-events-none fixed left-1 top-20 z-30 hidden w-[150px] space-y-1.5 2xl:block">
          {railLeftAds.map((ad) => (
            <div key={ad.id} className="pointer-events-auto">
              <AdCard ad={ad} small />
            </div>
          ))}
        </aside>
      ) : null}
      {SHOW_FAKE_ADS ? (
        <aside className="pointer-events-none fixed right-1 top-20 z-30 hidden w-[150px] space-y-1.5 2xl:block">
          {railRightAds.map((ad) => (
            <div key={ad.id} className="pointer-events-auto">
              <AdCard ad={ad} small />
            </div>
          ))}
        </aside>
      ) : null}

      {fullscreenAsset ? (
        <div
          className="fixed inset-0 z-[120] bg-black/88 p-2 sm:p-5"
          onClick={() => setFullscreenAsset(null)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-[1700px] flex-col border border-[#6085bd] bg-[#0b1936]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2a4f85] bg-[#102446] px-3 py-2 text-[#d7e8ff]">
              <div className="min-w-0">
                <h3 className="truncate text-[13px] font-semibold">
                  {fullscreenAsset.kind === "image"
                    ? fullscreenAsset.item.title
                    : fullscreenAsset.item.title}
                </h3>
                <p className="truncate text-[11px] text-[#aac4eb]">
                  {fullscreenAsset.kind === "image"
                    ? fullscreenAsset.item.author || "Unknown author"
                    : fullscreenAsset.item.author || "Unknown author"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenAsset(null)}
                className="border border-[#6085bd] bg-[#1c3764] px-2 py-1 text-[11px] font-semibold text-[#f5f9ff] hover:bg-[#28487b]"
              >
                Close [Esc]
              </button>
            </div>

            <div className="flex-1 p-2 sm:p-4">
              {fullscreenAsset.kind === "image" ? (
                <div className="relative h-full w-full border border-[#4f73a8] bg-black">
                  <Image
                    src={normalizeAssetPath(fullscreenAsset.item.src)}
                    alt={fullscreenAsset.item.title}
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              ) : (
                createElement("model-viewer", {
                  src: normalizeAssetPath(fullscreenAsset.item.src),
                  poster: fullscreenAsset.item.poster
                    ? normalizeAssetPath(fullscreenAsset.item.poster)
                    : undefined,
                  loading: "eager",
                  "auto-rotate": true,
                  "camera-controls": true,
                  exposure: "1",
                  "shadow-intensity": "1",
                  className: "h-full w-full border border-[#4f73a8] bg-[#0a1327]",
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
