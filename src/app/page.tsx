"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Play, ArrowRight, Camera, Film, Sparkles, Check, Instagram, Youtube, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ------------------------------------------------------------------
// Smart <video/> with multiple sources (iOS friendly, autoplay/inline)
// ------------------------------------------------------------------

type VideoSmartProps = {
  className?: string;
  srcMp41080: string;
  srcMp4720: string;
  srcHevc1080?: string; // optional (HEVC)
  srcWebm?: string;     // optional (WebM)
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  /** На мобилках сначала грузить 720p */
  mobilePrefer720?: boolean;
  /** Ограничить автоплей на мобилках/медленной сети */
  limitAutoplayOnMobile?: boolean;
  /** Если постер не задан – сгенерировать из первого кадра */
  autoPoster?: boolean;
  /** Ручной постер (если вдруг нужен) */
  poster?: string;
  /** На какой секунде брать кадр для постера */
  posterTime?: number;
};

function VideoSmart({
  className,
  srcMp41080,
  srcMp4720,
  srcHevc1080,
  srcWebm,
  autoPlay = true,
  loop = true,
  muted = true,
  mobilePrefer720 = true,
  limitAutoplayOnMobile = true,
  autoPoster = false,
  poster,
  posterTime = 0.2,
}: VideoSmartProps) {
  const ref = useRef<HTMLVideoElement | null>(null);
const [shouldAutoplay, setShouldAutoplay] = useState<boolean>(autoPlay);
const [preloadMode, setPreloadMode] = useState<"none" | "metadata">("none");
const [posterUrl, setPosterUrl] = useState<string | undefined>(poster);

  // Решаем, как вести себя на мобилке/медленной сети
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onIntersect: IntersectionObserverCallback = (entries) => {
      for (const ent of entries) {
        if (ent.isIntersecting) {
          el.preload = preloadMode;
          if (shouldAutoplay && el.paused) {
            el.play().catch(() => {});
          }
        } else {
          if (!el.paused) el.pause();
        }
      }
    };

    if (typeof window !== "undefined" && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(onIntersect, { rootMargin: "200px" });
      io.observe(el);
      return () => io.disconnect();
    }
    // Fallback: просто попытаться проиграть
    try { if (shouldAutoplay) ref.current?.play().catch(() => {}); } catch {}
    return () => void 0;
  }, [shouldAutoplay, preloadMode]);

  // Автогенерация постера из первого кадра (без отдельного файла)
  useEffect(() => {
    if (!autoPoster || poster || posterUrl) return;
    const target = ref.current;
    if (!target) return;

    // Выбираем лёгкий источник для скриншота
    const src = mobilePrefer720 ? srcMp4720 : (srcHevc1080 || srcMp41080);
    if (!src) return;

    let canceled = false;
    const tempVideo = document.createElement("video");
    tempVideo.crossOrigin = "anonymous"; // тот же origin – ок; на CDN может потребоваться CORS
    tempVideo.preload = "auto";
    tempVideo.src = src;
    tempVideo.muted = true;
    tempVideo.playsInline = true;

    const toPoster = async () => {
      try {
        // Ждём метаданные → выставим время → ждём seeked
        await new Promise<void>((res) => {
          if (tempVideo.readyState >= 1) return res();
          tempVideo.addEventListener("loadedmetadata", () => res(), { once: true });
        });
        tempVideo.currentTime = Math.max(0.001, posterTime);
        await new Promise<void>((res) => tempVideo.addEventListener("seeked", () => res(), { once: true }));

        const w = tempVideo.videoWidth || 1280;
        const h = tempVideo.videoHeight || 720;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(tempVideo, 0, 0, w, h);
        let data = "";
        try {
          data = canvas.toDataURL("image/webp", 0.82);
        } catch {
          data = canvas.toDataURL("image/png");
        }
        if (!canceled && data) {
          setPosterUrl(data);
          // Мгновенно применим постер к реальному видео
          if (ref.current) {
            (ref.current as HTMLVideoElement).poster = data;
          }
        }
      } catch {}
    };

    toPoster();
    return () => { canceled = true; tempVideo.src = ""; };
  }, [autoPoster, poster, posterUrl, posterTime, mobilePrefer720, srcMp4720, srcHevc1080, srcMp41080]);

  return (
    <video
      ref={ref}
      className={className}
      playsInline
      muted={muted}
      loop={loop}
      autoPlay={shouldAutoplay}
      preload={preloadMode}
      disablePictureInPicture
      poster={posterUrl}
      controls={false}
    >
      {/* Сначала более лёгкий источник для мобилок */}
      {mobilePrefer720 && <source media="(max-width: 768px)" src={srcMp4720} type="video/mp4" />}
      {/* HEVC для iOS/современных устройств (1080p) */}
      {srcHevc1080 ? <source media="(min-width: 769px)" src={srcHevc1080} type="video/mp4; codecs=hev1" /> : null}
      {/* Fallback 1080p H.264 */}
      <source media="(min-width: 769px)" src={srcMp41080} type="video/mp4" />
      {/* WebM как дополнительный вариант */}
      {srcWebm ? <source media="(min-width: 769px)" src={srcWebm} type="video/webm" /> : null}
      Ваш браузер не поддерживает воспроизведение видео.
    </video>
  );
}

// -----------------------------
// Data & simple dev-time checks
// -----------------------------

type NavLink = [string, string];
const NAV_LINKS: NavLink[] = [
  ["Услуги", "#services"],
  ["Прайс", "#pricing"],
  ["Работы", "#work"],
  ["Процесс", "#process"],
  ["FAQ", "#faq"],
  ["О нас", "#about"],
  ["Контакты", "#contact"],
];

// Показывать соцсети (Instagram/YouTube) в блоке контактов
const SHOW_SOCIALS = false;

// Full price groups (7 sections)

type PriceItem = { title: string; unit: string; price: string };
type PriceGroupT = { title: string; items: PriceItem[] };

const PRICE_GROUPS: PriceGroupT[] = [
  {
    title: "Рекламные ролики",
    items: [
      { title: "ТВ-реклама", unit: "под ключ", price: "от 200 000 ₽" },
      { title: "OLV / Digital Spot (15-30 сек.)", unit: "YouTube/CTV/соцсети", price: "65 000-130 000 ₽" },
      { title: "Performance-креативы", unit: "массовые видео для тестов/ротаций", price: "13 000-40 000 ₽" },
      { title: "Вертикальные форматы (Reels/Shorts/TikTok)", unit: "пакет", price: "10 000 ₽ / 5 шт." },
    ],
  },
  {
    title: "Бренд-видео",
    items: [
      { title: "Имиджевый ролик", unit: "под ключ", price: "100 000-250 000 ₽" },
      { title: "Корпоративное видео", unit: "под ключ", price: "50 000-120 000 ₽" },
      { title: "HR-видео", unit: "под ключ", price: "25 000-65 000 ₽" },
      { title: "Event-фильм", unit: "съёмка мероприятий", price: "35 000-100 000 ₽" },
    ],
  },
  {
    title: "CGI & Моушн",
    items: [
      { title: "3D-продуктовые рендеры", unit: "моделинг/свет/сцены", price: "25 000-85 000 ₽" },
      { title: "Explainer video / Motion design", unit: "анимационные объясняющие ролики", price: "17 000-50 000 ₽" },
      { title: "UI-анимации / App-видео", unit: "демонстрация интерфейсов", price: "10 000-35 000 ₽" },
      { title: "Full CGI-реклама", unit: "полностью 3D-проект", price: "от 130 000 ₽" },
    ],
  },
  {
    title: "Контент для соцсетей",
    items: [
      { title: "Вертикальные короткие видео (до 60 сек)", unit: "пакет", price: "10 000 ₽ / 5 шт." },
      { title: "UGC-постановка", unit: "реалистичный пользовательский контент", price: "20 000-80 000 ₽" },
      { title: "Клипы для брендов", unit: "креатив + монтаж", price: "13 000-40 000 ₽" },
      { title: "Пакет контента (5-10 видео)", unit: "под кампанию/месяц", price: "25 000-85 000 ₽" },
    ],
  },
  {
    title: "Видеокейсы",
    items: [
      { title: "Проектный видеокейс", unit: "история реализации", price: "25 000-65 000 ₽" },
      { title: "Digital / Performance кейс", unit: "метрики, графика, аналитика", price: "35 000-85 000 ₽" },
      { title: "Event / Activation кейс", unit: "репортаж + сторителлинг", price: "20 000-50 000 ₽" },
    ],
  },
  {
    title: "Под ключ",
    items: [
      { title: "Производство под ключ", unit: "креатив, сценарий, кастинг, съёмка, пост", price: "от 65 000 ₽" },
      { title: "Комплексная рекламная кампания", unit: "серия роликов, адаптации, права", price: "от 250 000 ₽" },
      { title: "Пакет услуг (ежемесячно)", unit: "поддержка 5-10 видео", price: "от 50 000 ₽/мес" },
    ],
  },
  {
    title: "Доп. опции",
    items: [
      { title: "Кастинг актёров / модели", unit: "доп. опция", price: "от 3 000 ₽" },
      { title: "Локации и продакшен-дизайн", unit: "доп. опция", price: "от 8 000 ₽" },
      { title: "Музыка / лицензии / права", unit: "доп. опция", price: "от 1 500 ₽" },
      { title: "Субтитры и адаптация", unit: "доп. опция", price: "от 800 ₽" },
      { title: "Англоязычная версия", unit: "+ к стоимости", price: "+15-25%" },
    ],
  },
];

const PRICE_ITEMS: (PriceItem & { group: string })[] = PRICE_GROUPS.flatMap((g) => g.items.map((it) => ({ ...it, group: g.title })));

// -----------------------------
// Lightweight validators (dev-only tests)
// -----------------------------

const validateNavLinks = (links: NavLink[]) =>
  Array.isArray(links) && links.every((l) => Array.isArray(l) && l.length === 2 && typeof l[0] === "string" && typeof l[1] === "string");

const validatePriceItems = (items: PriceItem[]) =>
  Array.isArray(items) && items.every((it) => it && typeof it.title === "string" && typeof it.unit === "string" && typeof it.price === "string");

const validatePriceGroups = (groups: PriceGroupT[]) =>
  Array.isArray(groups) &&
  groups.length === 7 &&
  groups.every((g) => g && typeof g.title === "string" && Array.isArray(g.items) && validatePriceItems(g.items));

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  console.assert(validateNavLinks(NAV_LINKS) === true, "[TEST] NAV_LINKS should be valid");
  console.assert(validateNavLinks(([ ["A", "#a"], ["B"] ] as unknown) as NavLink[]) === false, "[TEST] invalid tuple length should fail");
  console.assert(validateNavLinks(([ ["A", 123] ] as unknown) as NavLink[]) === false, "[TEST] non-string href should fail");

  console.assert(validatePriceItems(PRICE_ITEMS) === true, "[TEST] PRICE_ITEMS structure should be valid");
  console.assert(
    validatePriceItems(([{ title: "x", unit: (1 as unknown) as string, price: "y" }] as unknown) as PriceItem[]) === false,
    "[TEST] non-string unit should fail"
  );
  console.assert(
    validatePriceItems(([{ title: (1 as unknown) as string, unit: "u", price: "p" }] as unknown) as PriceItem[]) === false,
    "[TEST] non-string title should fail"
  );

  console.assert(validatePriceGroups(PRICE_GROUPS) === true, "[TEST] PRICE_GROUPS should contain 7 valid groups");
  console.assert(
    validatePriceGroups([{ title: "A", items: [{ title: "x", unit: "u", price: "p" }] }] as unknown as PriceGroupT[]) === false,
    "[TEST] PRICE_GROUPS wrong length should fail"
  );
  console.assert(PRICE_GROUPS.every((g) => g.items.length > 0), "[TEST] each price group should be non-empty");
}

// -----------------------------
// Animations & helpers
// -----------------------------

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const float: Variants = {
  animate: { y: [0, -6, 0], transition: { duration: 4, repeat: Infinity, ease: [0.45, 0, 0.55, 1] } },
};

// Soft cursor glow
const CursorGlow: React.FC = () => {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -200, y: -200 });
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
      setEnabled(!!fine);
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [enabled]);
  if (!enabled) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-0 h-48 w-48 rounded-full"
      style={{
        translateX: pos.x - 96,
        translateY: pos.y - 96,
        background: "radial-gradient(closest-side, rgba(99,102,241,0.24), rgba(236,72,153,0.18), transparent 70%)",
        filter: "blur(28px)",
      }}
      transition={{ type: "spring", stiffness: 140, damping: 18, mass: 0.2 }}
    />
  );
};

// FAQ item component

type FAQItemProps = { q: string; a: string };
const FAQItem: React.FC<FAQItemProps> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-base font-medium text-white">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-white/60">▼</motion.span>
      </button>
      <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} className="overflow-hidden px-5 pb-4 text-white/70">
        {a}
      </motion.div>
    </motion.div>
  );
};

// Price group accordion

type PriceGroupProps = { title: string; items: PriceItem[]; defaultOpen?: boolean };
const PriceGroup: React.FC<PriceGroupProps> = ({ title, items, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-4">
        <span className="text-base font-semibold text-white">{title}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-white/60">▼</motion.span>
      </button>
      <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} className="overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-white/10">
          <div className="hidden md:grid grid-cols-[minmax(220px,1.2fr)_minmax(200px,1fr)_minmax(140px,0.6fr)] bg-white/5 text-white/60 text-xs uppercase tracking-wide">
            <div className="px-4 py-3">Услуга</div>
            <div className="px-4 py-3">Описание</div>
            <div className="px-4 py-3 text-right">Цена</div>
          </div>
          {items.map((p) => (
            <div key={p.title} className="grid grid-cols-1 md:grid-cols-[minmax(220px,1.2fr)_minmax(200px,1fr)_minmax(140px,0.6fr)] bg-white/5">
              <div className="px-4 py-4 text-base font-medium text-white">{p.title}</div>
              <div className="px-4 py-4 text-white/70">{p.unit}</div>
              <div className="px-4 py-4 md:text-right text-white font-semibold">{p.price}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// Works (video cases)

type WorkItem = {
  title: string;
  href: string;
  srcMp41080: string;
  srcMp4720: string;
  srcHevc1080?: string;
  srcWebm?: string;
};

const WORKS: WorkItem[] = [
  {
    title: "Корпоративное видео — Aurora",
    href: "#",
    srcHevc1080: "/work/aurora/1080p-h265.mp4",
    srcMp41080: "/work/aurora/1080p.mp4",
    srcMp4720: "/work/aurora/720p.mp4",
    srcWebm: "/work/aurora/1080p.webm",
  },
  {
    title: "Товарная реклама — Nova",
    href: "#",
    srcHevc1080: "/work/nova/1080p-h265.mp4",
    srcMp41080: "/work/nova/1080p.mp4",
    srcMp4720: "/work/nova/720p.mp4",
    srcWebm: "/work/nova/1080p.webm",
  },
  {
    title: "Рендер товаров — Pulse",
    href: "#",
    srcHevc1080: "/work/pulse/1080p-h265.mp4",
    srcMp41080: "/work/pulse/1080p.mp4",
    srcMp4720: "/work/pulse/720p.mp4",
    srcWebm: "/work/pulse/1080p.webm",
  },
];

// -----------------------------
// ErrorBoundary (used around the whole page)
// -----------------------------

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; msg?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: unknown) {
    return { hasError: true, msg: (err as Error)?.message };
  }
  componentDidCatch(err: unknown) { if (typeof window !== 'undefined') console.error(err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
          <div className="max-w-lg text-center">
            <h1 className="text-2xl font-semibold">Упс, что-то пошло не так</h1>
            <p className="mt-2 text-white/70">Страница не загрузилась из‑за ошибки в интерфейсе. Мы уже записали её в консоль.</p>
            {this.state.msg && <p className="mt-2 text-xs text-white/50">{this.state.msg}</p>}
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

// -----------------------------
// Page
// -----------------------------

export default function HighLevelVideoLanding() {
  // Brief form state & send-to-email
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<null | "ok" | "fail">(null);
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSent(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("send failed");
      setSent("ok");
      setForm({ name: "", company: "", email: "", phone: "", message: "" });
    } catch (err) {
      console.error(err);
      setSent("fail");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white selection:bg-white/80 selection:text-black overflow-x-hidden scroll-smooth">
        {/* Background */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_-10%,rgba(120,119,198,0.35),rgba(255,255,255,0)_70%),radial-gradient(50%_50%_at_110%_10%,rgba(56,189,248,0.25),rgba(255,255,255,0)_70%),radial-gradient(50%_50%_at_-10%_90%,rgba(244,63,94,0.25),rgba(255,255,255,0)_70%)]" />
          {/* шумовую подложку убрали, чтобы избежать проблем парсера в некоторых сборках */}
        </div>
        <CursorGlow />

        {/* Nav */}
        <nav className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-black/40">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <a href="#top" className="flex items-center gap-2">
              <img src="/logo.png" alt="High Level Video" className="h-7 w-auto" />
              <span className="text-white font-semibold tracking-tight">High Level Video</span>
            </a>
            <div className="hidden items-center gap-8 md:flex">
              {NAV_LINKS.map(([label, href]) => (
                <a key={href} href={href} className="text-sm text-white/80 transition hover:text-white">
                  {label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button asChild className="rounded-2xl bg-white text-black hover:bg-white/90">
                <a href="#brief">Заполнить бриф</a>
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header id="top" className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
            <motion.div variants={container} initial="hidden" animate="show" className="order-2 md:order-1">
              <motion.h1 variants={item} className="text-4xl font-semibold leading-tight md:text-6xl">
                Видео-продакшен <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-300">полного цикла</span>
              </motion.h1>
              <motion.p variants={item} className="mt-5 max-w-[52ch] text-white/70 md:text-lg">
                Создаём высокоуровневый контент: рекламные ролики, бренд-видео, имиджевые и продуктовые фильмы, видеокейсы и контент для соцсетей.
              </motion.p>
              <motion.div variants={item} className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild className="rounded-2xl bg-white text-black hover:bg-white/90">
                  <a href="#work"><Play className="mr-2 h-4 w-4" /> Смотреть</a>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10">
                  <a href="#contact">Обсудить проект <ArrowRight className="ml-2 h-4 w-4" /></a>
                </Button>
              </motion.div>
              <motion.div variants={item} className="mt-8 flex flex-wrap gap-6 text-sm text-white/60">
                {["Стратегия", "Продакшен", "Съёмка", "Постпродакшн", "3D/CGI", "Моушн-дизайн"].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <Check className="h-4 w-4" /> {t}
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Visual */}
            <motion.div className="order-1 md:order-2" variants={float} animate="animate">
              <Card className="overflow-hidden rounded-3xl border-white/10 bg-white/5">
                <CardContent className="p-0">
                  <div className="relative aspect-video w-full">
                    <VideoSmart
                      className="h-full w-full object-cover"
                      srcHevc1080="/reel-1080p-h265.mp4"
                      srcMp41080="/reel-1080p.mp4"
                      srcMp4720="/reel-720p.mp4"
                      srcWebm="/reel.webm"
                      mobilePrefer720
                      limitAutoplayOnMobile={false}
                      autoPoster
                      posterTime={0.3}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-3">
                      <div className="rounded-full bg-white/90 p-2 text-black"><Play className="h-4 w-4" /></div>
                      <span className="text-sm text-white/80">Шоурил High Level Video</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </header>

        {/* Logos */}
        <section className="border-y border-white/10 bg-white/5 py-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-10 px-4 opacity-80">
            {["Smart Group", "Istanbul City", "EugAuto", "ФПК Правда", "Жарка", "ГК Родина"].map((brand) => (
              <div key={brand} className="text-sm uppercase tracking-widest text-white/60">{brand}</div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section id="services" className="mx-auto max-w-7xl px-4 py-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={container}>
            <motion.h2 variants={item} className="text-white text-3xl font-semibold md:text-4xl">Услуги</motion.h2>
            <motion.p variants={item} className="mt-3 max-w-[60ch] text-white/70">От идеи до релиза: берём на себя весь цикл — ресёрч, креатив, препродакшн, производство и пост.</motion.p>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                { icon: <Camera className="h-5 w-5" />, title: "Рекламные ролики", text: "ТВ/OLV кампании, перформанс-креативы, вертикальные форматы." },
                { icon: <Film className="h-5 w-5" />, title: "Бренд-видео", text: "Имиджевые, корпоративные, HR и event-фильмы." },
                { icon: <Sparkles className="h-5 w-5" />, title: "CGI & Моушн", text: "3D, продуктовые рендеры, объясняющие и UI-анимации." },
                { icon: <Play className="h-5 w-5" />, title: "Контент для соцсетей", text: "Вертикальные короткие форматы, клипы, UGC-постановка." },
                { icon: <ArrowRight className="h-5 w-5" />, title: "Видеокейсы", text: "Истории проектов с метриками, инсайтами и результатами." },
                { icon: <Check className="h-5 w-5" />, title: "Под ключ", text: "Креатив, продакшен, кастинг, локации, лицензии, права." },
              ].map((s) => (
                <Card key={s.title} className="group border-white/10 bg-white/5 hover:bg-white/10 transform-gpu transition duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-white/80">{s.icon}<span className="text-sm uppercase tracking-wide">{s.title}</span></div>
                        <p className="mt-3 text-sm text-white/60">{s.text}</p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-7xl px-4 py-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={container}>
            <motion.h2 variants={item} className="text-white text-3xl font-semibold md:text-4xl">Прайс-лист</motion.h2>
            <motion.p variants={item} className="mt-3 max-w-[60ch] text-white/70">Базовые ориентиры по стоимости. Точная смета формируется после брифа.</motion.p>
            <div className="mt-10 space-y-4">
              {PRICE_GROUPS.map((g, i) => (
                <PriceGroup key={g.title} title={`${i + 1 < 10 ? "0" : ""}${i + 1}. ${g.title}`} items={g.items} defaultOpen={i === 0} />
              ))}
            </div>
            <div className="mt-4 text-sm text-white/60">Цены ориентировочные; точная смета формируется по брифу.</div>
          </motion.div>
        </section>

        {/* Work */}
        <section id="work" className="mx-auto max-w-7xl px-4 py-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={container}>
            <motion.h2 variants={item} className="text-white text-3xl font-semibold md:text-4xl">Работы</motion.h2>
            <motion.p variants={item} className="mt-3 max-w-[60ch] text-white/70">Подборка последних проектов. Замените ссылки на свои.</motion.p>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {WORKS.map((w) => (
                <a key={w.title} href={w.href} className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-white transform-gpu transition duration-300 hover:-translate-y-1">
                  <VideoSmart
                    className="aspect-video w-full object-cover transition duration-500 group-hover:scale-105"
                    srcHevc1080={w.srcHevc1080}
                    srcMp41080={w.srcMp41080}
                    srcMp4720={w.srcMp4720}
                    srcWebm={w.srcWebm}
                    mobilePrefer720
                    limitAutoplayOnMobile // кейсы не автоплеим на слабых сетях/мобилках
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm uppercase tracking-wide text-white/80">Кейс</div>
                        <div className="text-lg font-medium text-white">{w.title}</div>
                      </div>
                      <ArrowRight className="h-5 w-5 opacity-60 transition group-hover:translate-x-1 group-hover:opacity-100" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Process */}
        <section id="process" className="mx-auto max-w-7xl px-4 py-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={container}>
            <motion.h2 variants={item} className="text-white text-3xl font-semibold md:text-4xl">Процесс</motion.h2>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-4">
              {[
                { step: "01", title: "Бриф", text: "Цели, задачи, аудитория, KPI." },
                { step: "02", title: "Креатив", text: "Идеи, референсы, скрипт, раскадровка." },
                { step: "03", title: "Продакшен", text: "Съёмка, свет, звук, продюсирование." },
                { step: "04", title: "Пост", text: "Монтаж, цвет, звук, графика, сдача." },
              ].map((p) => (
                <Card key={p.step} className="border-white/10 bg-white/5 transform-gpu transition duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="text-sm text-white/50">{p.step}</div>
                    <div className="mt-1 text-lg font-medium text-white">{p.title}</div>
                    <p className="mt-2 text-sm text-white/60">{p.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </section>

        {/* About */}
        <section id="about" className="mx-auto max-w-7xl px-4 py-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={container}>
            <motion.h2 variants={item} className="text-white text-3xl font-semibold md:text-4xl">О нас</motion.h2>
            <div className="mt-8 grid grid-cols-1 items-center gap-10 md:grid-cols-3">
              <div className="md:col-span-2">
                <p className="text-white/70 md:text-lg">High Level Video — команда продюсеров, режиссёров и креативных специалистов, которая создаёт видео, решающее бизнес‑задачи и не только. Мы за скорость, качество и кристальную коммуникацию.</p>
                <div className="mt-6 grid grid-cols-2 gap-4 md:max-w-lg">
                  {[ ["50+", "реализованных проектов"], ["12", "постоянных специалистов"], ["24/7", "сопровождение запусков"], ["A+", "оценка клиентов"] ].map(([n, l]) => (
                    <Card key={l} className="border-white/10 bg-white/5 transform-gpu transition duration-300 hover:-translate-y-1">
                      <CardContent className="p-4">
                        <div className="text-2xl font-semibold text-white">{n}</div>
                        <div className="text-sm text-white/60">{l}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div>
                <Card className="overflow-hidden border-white/10 bg-white/5">
                  <CardContent className="p-0">
                    <picture>
                      {/* PNG первым — чтобы точно подхватился, даже если WEBP отсутствует */}
                      <source srcSet="/about/poster.png" type="image/png" />
                      <source srcSet="/about/poster.webp" type="image/webp" />
                      <img src="/about/poster.png" alt="High Level Video — команда" className="h-full w-full object-cover" />
                    </picture>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-7xl px-4 py-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={container}>
            <motion.h2 variants={item} className="text-white text-3xl font-semibold md:text-4xl">FAQ</motion.h2>
            <motion.p variants={item} className="mt-3 max-w-[60ch] text-white/70">Частые вопросы и короткие ответы. Если не нашли нужное — напишите нам, ответим в течение дня.</motion.p>
            <div className="mt-8 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/5">
              {[
                { q: "Сроки производства?", a: "От 5-7 дней для рилс/шортс до 2-4 недель для корпоративных роликов. Точный тайминг зависит от кастинга, локаций и графики." },
                { q: "Сколько правок включено?", a: "Стандартно: 2 круга правок на монтаж и 1 круг на графику. Можно расширить по брифу." },
                { q: "Вы отдаёте исходники?", a: "По умолчанию — финальные материалы. Исходники можем выгрузить по запросу, это отдельная опция." },
                { q: "Какой порядок оплаты?", a: "Обычно 50% предоплата, 50% — по сдаче. Для постоянных клиентов возможны иные условия." },
                { q: "Поможете с идеей и сценарием?", a: "Да. Креатив и сценарий можем сделать под задачу и целевую аудиторию, предложим референсы." },
                { q: "Работаете удалённо/в регионах?", a: "Да, снимаем в Москве и по миру. Организация экспедиции и локальных команд — наша зона ответственности." },
              ].map((it) => (
                <FAQItem key={it.q} q={it.q} a={it.a} />
              ))}
            </div>
          </motion.div>
        </section>

        {/* CTA / Brief */}
        <section id="brief" className="mx-auto max-w-7xl px-4 pb-10 pt-20">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 border-white/10 bg-gradient-to-br from-white/10 to-white/5">
              <CardContent className="p-8">
                <div className="text-sm uppercase tracking-wide text-white/70">Начнём</div>
                <h3 className="mt-2 text-2xl font-semibold text-white">Заполните короткий бриф — вернёмся с предложением в течение суток</h3>
                <form onSubmit={onSubmit} noValidate className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input name="name" required value={form.name} onChange={onChange} className="rounded-xl border border-white/15 bg-black/40 p-3 outline-none text-white caret-white placeholder:text-white/60 focus:ring-2 focus:ring-white/20" placeholder="Имя" />
                  <input name="company" value={form.company} onChange={onChange} className="rounded-xl border border-white/15 bg-black/40 p-3 outline-none text-white caret-white placeholder:text-white/60 focus:ring-2 focus:ring-white/20" placeholder="Компания" />
                  <input name="email" inputMode="email" value={form.email} onChange={onChange} className="rounded-xl border border-white/15 bg-black/40 p-3 outline-none text-white caret-white placeholder:text-white/60 focus:ring-2 focus:ring-white/20" placeholder="Email" />
                  <input name="phone" inputMode="tel" required value={form.phone} onChange={onChange} className="rounded-xl border border-white/15 bg-black/40 p-3 outline-none text-white caret-white placeholder:text-white/60 focus:ring-2 focus:ring-white/20" placeholder="Телефон" />
                  <textarea name="message" value={form.message} onChange={onChange} className="md:col-span-2 h-28 rounded-xl border border-white/15 bg-black/40 p-3 outline-none text-white caret-white placeholder:text-white/60 focus:ring-2 focus:ring-white/20" placeholder="Коротко о задаче" />
                  <Button type="submit" disabled={submitting} className="md:col-span-2 rounded-2xl bg-white text-black hover:bg-white/90">{submitting ? "Отправка..." : "Отправить"}</Button>
                  {sent === "ok" && <div className="md:col-span-2 text-sm text-emerald-400">Отправлено! Мы свяжемся с вами в течение суток.</div>}
                  {sent === "fail" && <div className="md:col-span-2 text-sm text-red-400">Не удалось отправить. Попробуйте ещё раз или напишите на cormarketinq@yandex.ru</div>}
                </form>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5 transform-gpu transition duration-300 hover:-translate-y-1">
              <CardContent className="p-8">
                <div className="text-sm uppercase tracking-wide text-white/70">Контакты</div>
                <div className="mt-4 space-y-3 text-white/80">
                  <a href="mailto:cormarketinq@yandex.ru" className="flex items-center gap-2 text-white hover:text-white"><Mail className="h-4 w-4" /> cormarketinq@yandex.ru</a>
                  <a href="tel:+79267943537" className="flex items-center gap-2 text-white hover:text-white"><Phone className="h-4 w-4" /> +7 926 794-35-37</a>
                  {SHOW_SOCIALS && (
                    <>
                      <a href="#" className="flex items-center gap-2 text-white hover:text-white"><Instagram className="h-4 w-4" /> Instagram</a>
                      <a href="#" className="flex items-center gap-2 text-white hover:text-white"><Youtube className="h-4 w-4" /> YouTube</a>
                    </>
                  )}
                </div>
                <div className="mt-6 text-sm text-white/60">Москва · Работаем по миру</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer id="contact" className="border-t border-white/10 py-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
            <div className="text-white/60">© {new Date().getFullYear()} High Level Video</div>
            <div className="flex items-center gap-6 text-white/60">
              <a href="#brief" className="hover:text-white">Бриф</a>
              <a href="#services" className="hover:text-white">Услуги</a>
              <a href="#work" className="hover:text-white">Работы</a>
              <a href="#about" className="hover:text-white">О нас</a>
            </div>
            <div className="text-xs text-white/50">Не является публичной офертой</div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
