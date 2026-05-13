import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";

// Layered nature scene with parallax (scroll + mouse)
const AnimatedBackground = () => {
  const sunRef = useRef<HTMLDivElement>(null);
  const farRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const nearRef = useRef<HTMLDivElement>(null);
  const cloudsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mx = 0, my = 0, sy = 0;
    const apply = () => {
      if (sunRef.current) sunRef.current.style.transform = `translate(${mx * -8}px, ${sy * -0.05 + my * -6}px)`;
      if (cloudsRef.current) cloudsRef.current.style.transform = `translate(${mx * -14}px, ${sy * -0.08}px)`;
      if (farRef.current) farRef.current.style.transform = `translate(${mx * -10}px, ${sy * 0.1}px)`;
      if (midRef.current) midRef.current.style.transform = `translate(${mx * -20}px, ${sy * 0.18}px)`;
      if (nearRef.current) nearRef.current.style.transform = `translate(${mx * -32}px, ${sy * 0.28}px)`;
    };
    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      apply();
    };
    const onScroll = () => { sy = window.scrollY; apply(); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* SKY — sunrise gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fde8c4] via-[#f9c79e] to-[#a7d8f0] dark:from-[#1a1a3e] dark:via-[#2d1b4e] dark:to-[#0f1729]" />

      {/* SUN */}
      <div ref={sunRef} className="absolute top-[10%] right-[15%] will-change-transform">
        <div className="relative w-44 h-44">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-200 via-amber-300 to-orange-400 shadow-[0_0_140px_70px_rgba(251,191,36,0.55)] animate-pulse" />
          <div className="absolute inset-5 rounded-full bg-gradient-to-br from-yellow-100 to-amber-200 opacity-90" />
        </div>
      </div>

      {/* CLOUDS */}
      <div ref={cloudsRef} className="absolute inset-0 will-change-transform">
        {[
          { top: "8%",  left: "8%",  w: 220, op: 0.85, d: "0s",   dur: "55s" },
          { top: "14%", left: "55%", w: 180, op: 0.7,  d: "-20s", dur: "70s" },
          { top: "22%", left: "30%", w: 150, op: 0.6,  d: "-35s", dur: "60s" },
          { top: "5%",  left: "78%", w: 240, op: 0.8,  d: "-10s", dur: "80s" },
        ].map((c, i) => (
          <svg key={i} viewBox="0 0 200 60" className="absolute animate-cloud-drift"
               style={{ top: c.top, left: c.left, width: c.w, opacity: c.op, animationDelay: c.d, animationDuration: c.dur }}>
            <ellipse cx="50"  cy="40" rx="38" ry="18" fill="white" />
            <ellipse cx="90"  cy="32" rx="46" ry="22" fill="white" />
            <ellipse cx="135" cy="38" rx="38" ry="20" fill="white" />
            <ellipse cx="160" cy="44" rx="28" ry="14" fill="white" />
          </svg>
        ))}
      </div>

      {/* FAR mountains */}
      <div ref={farRef} className="absolute bottom-[34%] left-0 right-0 will-change-transform">
        <svg viewBox="0 0 1600 240" preserveAspectRatio="none" className="w-full h-56">
          <defs>
            <linearGradient id="farMt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9ca3c4" />
              <stop offset="100%" stopColor="#6b7da8" />
            </linearGradient>
          </defs>
          <path d="M0 240 L0 140 L120 80 L220 130 L340 60 L460 120 L600 50 L740 110 L880 70 L1020 130 L1160 80 L1300 140 L1440 90 L1600 130 L1600 240 Z" fill="url(#farMt)" opacity="0.75" />
          <path d="M340 60 L360 80 L320 80 Z M600 50 L622 70 L580 70 Z M880 70 L902 90 L860 90 Z M1440 90 L1460 108 L1420 108 Z" fill="white" opacity="0.85" />
        </svg>
      </div>

      {/* MID hills */}
      <div ref={midRef} className="absolute bottom-[22%] left-0 right-0 will-change-transform">
        <svg viewBox="0 0 1600 280" preserveAspectRatio="none" className="w-full h-64">
          <defs>
            <linearGradient id="midMt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5e7553" />
              <stop offset="100%" stopColor="#3d5439" />
            </linearGradient>
          </defs>
          <path d="M0 280 L0 180 L160 100 L320 170 L500 80 L680 160 L860 90 L1040 170 L1220 110 L1400 180 L1600 120 L1600 280 Z" fill="url(#midMt)" />
        </svg>
      </div>

      {/* NEAR forest hills + trees */}
      <div ref={nearRef} className="absolute bottom-[10%] left-0 right-0 will-change-transform">
        <svg viewBox="0 0 1600 260" preserveAspectRatio="none" className="w-full h-60">
          <defs>
            <linearGradient id="nearHill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4d7c4f" />
              <stop offset="100%" stopColor="#2d5a32" />
            </linearGradient>
          </defs>
          <path d="M0 260 L0 160 Q120 90 260 140 Q420 200 580 130 Q740 80 900 150 Q1060 210 1240 140 Q1400 90 1600 150 L1600 260 Z" fill="url(#nearHill)" />
          {[[80,150],[150,165],[240,150],[380,175],[520,155],[690,165],[860,158],[1010,175],[1180,155],[1340,168],[1490,160]].map(([cx,cy], i) => (
            <g key={i} transform={`translate(${cx} ${cy})`}>
              <rect x="-3" y="0" width="6" height="14" fill="#5a3a22" />
              <path d="M0 -28 L-14 6 L14 6 Z" fill="#2d5f3a" />
              <path d="M0 -18 L-10 4 L10 4 Z" fill="#3a7048" />
            </g>
          ))}
        </svg>
      </div>

      {/* meadow ground */}
      <div className="absolute bottom-0 left-0 right-0 h-[10%] bg-gradient-to-b from-[#3d6b3a] to-[#1e3d22]" />
    </div>
  );
};

type Section = {
  title: string;
  description: string;
  link: string;
  gradient: string; // tailwind gradient classes
  ring: string; // ring color tint
  art: "mosque" | "globe" | "diamond" | "compass" | "wallet";
};

const sections: Section[] = [
  {
    title: "سند قبض - بنك الرياض",
    description: "سندات قبض إلى بنك الرياض مع قيد تلقائي",
    link: "/accounting/bank-collection-receipt?bank=riyadh",
    gradient: "from-sky-500 via-blue-600 to-indigo-700",
    ring: "ring-sky-300/40",
    art: "globe",
  },
  {
    title: "سند قبض - بنك الراجحي",
    description: "سندات قبض إلى بنك الراجحي مع قيد تلقائي",
    link: "/accounting/bank-collection-receipt?bank=rajhi",
    gradient: "from-emerald-500 via-green-600 to-teal-700",
    ring: "ring-emerald-300/40",
    art: "mosque",
  },
  {
    title: "سند صرف - بنك الرياض",
    description: "سندات الصرف من بنك الرياض مع قيد تلقائي",
    link: "/accounting/bank-payment-voucher?bank=riyadh",
    gradient: "from-blue-600 via-indigo-700 to-slate-900",
    ring: "ring-blue-300/40",
    art: "compass",
  },
  {
    title: "سند صرف - بنك الراجحي",
    description: "سندات الصرف من بنك الراجحي مع قيد تلقائي",
    link: "/accounting/bank-payment-voucher?bank=rajhi",
    gradient: "from-teal-600 via-emerald-700 to-green-900",
    ring: "ring-emerald-300/40",
    art: "diamond",
  },
  {
    title: "مصروفات العهد",
    description: "تسجيل وإدارة مصروفات المندوبين",
    link: "/custody/expenses",
    gradient: "from-rose-500 via-red-600 to-orange-600",
    ring: "ring-rose-300/40",
    art: "wallet",
  },
];

// SVG art pieces — drawn with currentColor / white opacities to match gradient backgrounds
const ArtMosque = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
    <defs>
      <radialGradient id="mskSky" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="60" cy="60" r="58" fill="url(#mskSky)" />
    {/* crescent + star */}
    <path d="M30 28a10 10 0 1 0 10 12 8 8 0 1 1-10-12z" fill="#fff" opacity="0.9" />
    <path d="M44 24l1.4 3 3.2.3-2.4 2.1.7 3.1L44 30.9l-2.9 1.6.7-3.1L39.4 27.3l3.2-.3z" fill="#fff" />
    {/* main dome */}
    <path d="M40 78c0-15 9-26 20-26s20 11 20 26v4H40z" fill="#fff" opacity="0.95" />
    <path d="M60 46v-8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <circle cx="60" cy="36" r="2.2" fill="#fff" />
    {/* minarets */}
    <rect x="22" y="58" width="6" height="34" rx="1.5" fill="#fff" opacity="0.95" />
    <path d="M25 58c0-4 0-7 0-9 2 2 2 5 2 9z" fill="#fff" />
    <circle cx="25" cy="54" r="2.2" fill="#fff" />
    <rect x="92" y="58" width="6" height="34" rx="1.5" fill="#fff" opacity="0.95" />
    <path d="M95 58c0-4 0-7 0-9 2 2 2 5 2 9z" fill="#fff" />
    <circle cx="95" cy="54" r="2.2" fill="#fff" />
    {/* arches base */}
    <path d="M40 82h40v10H40z" fill="#fff" opacity="0.5" />
    <path d="M48 92v-4a4 4 0 1 1 8 0v4M64 92v-4a4 4 0 1 1 8 0v4" stroke="#fff" strokeWidth="1.6" fill="none" />
  </svg>
);

const ArtGlobe = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
    <defs>
      <radialGradient id="glbShade" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="60" cy="60" r="44" fill="#fff" opacity="0.95" />
    <circle cx="60" cy="60" r="44" fill="url(#glbShade)" />
    {/* meridians */}
    <ellipse cx="60" cy="60" rx="44" ry="18" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" />
    <ellipse cx="60" cy="60" rx="18" ry="44" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" />
    <ellipse cx="60" cy="60" rx="34" ry="44" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2" />
    <line x1="16" y1="60" x2="104" y2="60" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.4" />
    {/* continents abstract */}
    <path d="M44 44c6-2 14 2 16 8s-4 10-10 8-10-12-6-16zM72 70c4-1 12 4 10 10s-12 6-14 0 0-9 4-10z" fill="currentColor" fillOpacity="0.55" />
    <path d="M38 70c3 0 6 4 4 7s-8 1-7-3 1-4 3-4z" fill="currentColor" fillOpacity="0.45" />
  </svg>
);

const ArtCompass = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
    <circle cx="60" cy="60" r="46" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
    <circle cx="60" cy="60" r="36" fill="#fff" opacity="0.95" />
    {/* needle */}
    <path d="M60 30 L66 60 L60 90 L54 60 Z" fill="currentColor" fillOpacity="0.85" />
    <path d="M60 30 L66 60 L54 60 Z" fill="#0f172a" fillOpacity="0.55" />
    {/* center */}
    <circle cx="60" cy="60" r="4" fill="#0f172a" />
    {/* tick marks */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <line
        key={a}
        x1="60"
        y1="18"
        x2="60"
        y2="24"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        transform={`rotate(${a} 60 60)`}
      />
    ))}
    <text x="60" y="22" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="700">N</text>
  </svg>
);

const ArtDiamond = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
    <defs>
      <linearGradient id="dmShine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0.55" />
      </linearGradient>
    </defs>
    <path d="M30 48 L60 24 L90 48 L60 100 Z" fill="url(#dmShine)" />
    <path d="M30 48 H90 L60 100 Z" fill="#000" fillOpacity="0.12" />
    <path d="M30 48 L48 48 L60 24 M90 48 L72 48 L60 24 M48 48 L60 100 L72 48 M48 48 L72 48"
      stroke="#0f172a" strokeOpacity="0.35" strokeWidth="1.2" fill="none" />
    {/* sparkle */}
    <path d="M28 28 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z" fill="#fff" opacity="0.9" />
    <path d="M96 72 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" fill="#fff" opacity="0.8" />
  </svg>
);

const ArtWallet = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
    <rect x="18" y="34" width="84" height="56" rx="10" fill="#fff" opacity="0.95" />
    <path d="M18 50 H102 V62 H82 a8 8 0 1 0 0 0 H18 z" fill="currentColor" fillOpacity="0.3" />
    <rect x="74" y="56" width="22" height="14" rx="4" fill="currentColor" fillOpacity="0.85" />
    <circle cx="84" cy="63" r="2.4" fill="#fff" />
    {/* coin stack */}
    <ellipse cx="40" cy="40" rx="14" ry="5" fill="#fff" />
    <ellipse cx="40" cy="40" rx="14" ry="5" fill="currentColor" fillOpacity="0.4" />
    <path d="M26 40v6c0 2.8 6.3 5 14 5s14-2.2 14-5v-6" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.4" fill="none" />
  </svg>
);

const ArtMap = {
  mosque: ArtMosque,
  globe: ArtGlobe,
  compass: ArtCompass,
  diamond: ArtDiamond,
  wallet: ArtWallet,
};

const Vouchers = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen relative" dir="rtl">
      <AnimatedBackground />
      <header className="border-b border-white/20 bg-white/10 backdrop-blur-md text-slate-900 dark:text-slate-100 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-fuchsia-500 via-sky-500 to-emerald-500 bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_200%]">
                إدارة السندات
              </h1>
              <p className="text-muted-foreground mt-1">سندات الصرف البنكية ومصروفات العهد</p>
            </div>
              <Button variant="outline" size="icon" className="rounded-full border-primary/30 hover:bg-primary/10 hover:border-primary/60 transition-all" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {sections.map((s) => {
            const Art = ArtMap[s.art];
            return (
              <Link key={s.title} to={s.link} className="group">
                <Card className="relative overflow-visible h-full border-0 bg-transparent shadow-none hover:shadow-none transition-all duration-500 hover:-translate-y-2 group/card">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    {/* === Islamic Decorative Door === */}
                    <div
                      className="islamic-door relative mb-5 h-44 w-36 animate-float-soft drop-shadow-[0_25px_25px_rgba(0,0,0,0.45)]"
                      style={{ perspective: "900px" }}
                    >
                      {/* Outer arched frame */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-b ${s.gradient} shadow-2xl ring-4 ${s.ring}`}
                        style={{
                          clipPath:
                            "path('M18 170 L18 60 Q18 0 72 0 Q126 0 126 60 L126 170 Z')",
                        }}
                      />
                      {/* Decorative outer border line */}
                      <svg
                        viewBox="0 0 144 180"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      >
                        <path
                          d="M22 174 L22 62 Q22 6 72 6 Q122 6 122 62 L122 174"
                          fill="none"
                          stroke="rgba(255,255,255,0.55)"
                          strokeWidth="1.2"
                          strokeDasharray="2 3"
                        />
                        {/* keystone star */}
                        <g transform="translate(72 18)">
                          <path
                            d="M0 -7 L2 -2 L7 -2 L3 1 L4.5 6 L0 3 L-4.5 6 L-3 1 L-7 -2 L-2 -2 Z"
                            fill="#fff"
                            opacity="0.9"
                          />
                        </g>
                      </svg>

                      {/* Inner room — revealed when doors open */}
                      <div
                        className="absolute bg-gradient-to-b from-amber-50 via-yellow-100 to-amber-200 dark:from-amber-900 dark:via-amber-800 dark:to-amber-950 overflow-hidden flex items-center justify-center"
                        style={{
                          left: "22px",
                          right: "22px",
                          top: "6px",
                          bottom: "6px",
                          clipPath:
                            "path('M0 168 L0 56 Q0 0 50 0 Q100 0 100 56 L100 168 Z')",
                          boxShadow: "inset 0 0 30px rgba(0,0,0,0.4)",
                        }}
                      >
                        {/* warm glow */}
                        <div className="absolute inset-0 bg-radial-glow opacity-90" />
                        {/* the icon emblem inside */}
                        <div
                          className={`relative w-20 h-20 text-white drop-shadow-2xl bg-gradient-to-br ${s.gradient} rounded-full p-3 shadow-2xl ring-2 ring-white/60 transition-transform duration-700 group-hover:scale-110`}
                        >
                          <Art />
                        </div>
                      </div>

                      {/* === LEFT door leaf === */}
                      <div
                        className="door-leaf door-leaf-left absolute"
                        style={{
                          left: "18px",
                          top: "0",
                          width: "54px",
                          height: "170px",
                          transformOrigin: "left center",
                          transformStyle: "preserve-3d",
                        }}
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`}
                          style={{
                            clipPath:
                              "path('M0 170 L0 60 Q0 0 54 0 L54 170 Z')",
                            boxShadow: "inset -4px 0 8px rgba(0,0,0,0.35)",
                          }}
                        />
                        <svg
                          viewBox="0 0 54 170"
                          className="absolute inset-0 w-full h-full pointer-events-none"
                        >
                          {/* arabesque panel */}
                          <path
                            d="M8 162 L8 60 Q8 10 46 10 L46 162 Z"
                            fill="none"
                            stroke="rgba(255,255,255,0.7)"
                            strokeWidth="1.4"
                          />
                          {/* 8-point star pattern */}
                          {[40, 80, 120].map((cy) => (
                            <g key={cy} transform={`translate(28 ${cy})`}>
                              <path
                                d="M0 -10 L3 -3 L10 -3 L4 2 L7 9 L0 4 L-7 9 L-4 2 L-10 -3 L-3 -3 Z"
                                fill="rgba(255,255,255,0.55)"
                              />
                              <circle cx="0" cy="0" r="2" fill="rgba(255,255,255,0.9)" />
                            </g>
                          ))}
                          {/* door knob */}
                          <circle cx="6" cy="100" r="2.6" fill="#fde68a" stroke="#92400e" strokeWidth="0.6" />
                        </svg>
                      </div>

                      {/* === RIGHT door leaf === */}
                      <div
                        className="door-leaf door-leaf-right absolute"
                        style={{
                          left: "72px",
                          top: "0",
                          width: "54px",
                          height: "170px",
                          transformOrigin: "right center",
                          transformStyle: "preserve-3d",
                        }}
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-bl ${s.gradient}`}
                          style={{
                            clipPath:
                              "path('M54 170 L54 60 Q54 0 0 0 L0 170 Z')",
                            boxShadow: "inset 4px 0 8px rgba(0,0,0,0.35)",
                          }}
                        />
                        <svg
                          viewBox="0 0 54 170"
                          className="absolute inset-0 w-full h-full pointer-events-none"
                        >
                          <path
                            d="M46 162 L46 60 Q46 10 8 10 L8 162 Z"
                            fill="none"
                            stroke="rgba(255,255,255,0.7)"
                            strokeWidth="1.4"
                          />
                          {[40, 80, 120].map((cy) => (
                            <g key={cy} transform={`translate(26 ${cy})`}>
                              <path
                                d="M0 -10 L3 -3 L10 -3 L4 2 L7 9 L0 4 L-7 9 L-4 2 L-10 -3 L-3 -3 Z"
                                fill="rgba(255,255,255,0.55)"
                              />
                              <circle cx="0" cy="0" r="2" fill="rgba(255,255,255,0.9)" />
                            </g>
                          ))}
                          <circle cx="48" cy="100" r="2.6" fill="#fde68a" stroke="#92400e" strokeWidth="0.6" />
                        </svg>
                      </div>

                      {/* base step */}
                      <div className="absolute -bottom-1 left-2 right-2 h-2 rounded-b-md bg-gradient-to-b from-stone-400 to-stone-600 shadow-md" />
                    </div>

                    <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {s.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                  </CardContent>

                  {/* corner accent */}
                  <div className={`absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r ${s.gradient} opacity-80`} />
                </Card>
              </Link>
            );
          })}
        </div>
      </main>

      {/* === Animated Road & Car === */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-30 h-28 overflow-hidden" dir="ltr">
        {/* sky glow */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-900/60 via-slate-800/30 to-transparent" />

        {/* buildings silhouette */}
        <svg viewBox="0 0 1600 80" preserveAspectRatio="none" className="absolute bottom-12 left-0 w-full h-12 opacity-40">
          <path d="M0 80 L0 50 L60 50 L60 30 L120 30 L120 55 L180 55 L180 20 L240 20 L240 45 L320 45 L320 25 L380 25 L380 50 L460 50 L460 35 L540 35 L540 55 L620 55 L620 28 L700 28 L700 48 L780 48 L780 32 L860 32 L860 52 L940 52 L940 22 L1020 22 L1020 45 L1100 45 L1100 30 L1180 30 L1180 55 L1260 55 L1260 35 L1340 35 L1340 50 L1420 50 L1420 25 L1500 25 L1500 48 L1600 48 L1600 80 Z" fill="#1e293b" />
        </svg>

        {/* road */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-slate-700 to-slate-900 border-t-2 border-slate-600">
          {/* lane dashes */}
          <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 animate-road-dash"
               style={{
                 backgroundImage: "repeating-linear-gradient(to right, #fbbf24 0 30px, transparent 30px 60px)",
               }} />
        </div>

        {/* the car — mirrored for RTL, larger, improved sedan design */}
        <div className="absolute bottom-3 animate-car-drive-rtl">
          <svg viewBox="0 0 180 72" className="w-44 h-[4.5rem] drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]" style={{ direction: "ltr" }}>
            {/* shadow */}
            <ellipse cx="90" cy="66" rx="72" ry="3.5" fill="rgba(0,0,0,0.45)" />

            {/* bumper / underbody */}
            <rect x="12" y="58" width="156" height="6" rx="3" fill="#1e293b" />

            {/* main body */}
            <path d="M10 58 L14 42 Q16 34 24 32 L52 30 L64 18 Q68 12 78 10 L116 10 Q128 10 136 18 L156 30 L164 34 Q170 36 172 40 L176 56 Q178 60 174 62 L10 62 Z"
                  fill="url(#carBody2)" stroke="#0f172a" strokeWidth="1.2" />

            {/* hood highlight */}
            <path d="M24 34 L52 32 L58 28 L58 30 Z" fill="rgba(255,255,255,0.18)" />

            <defs>
              <linearGradient id="carBody2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="35%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
            </defs>

            {/* windshield */}
            <path d="M66 18 L78 12 Q84 10 90 10 L106 10 Q114 10 120 14 L130 26 L64 26 Z" fill="#e0f2fe" opacity="0.85" />
            <path d="M66 18 L78 12 Q84 10 90 10 L106 10 Q114 10 120 14 L130 26 L64 26 Z" fill="none" stroke="#1e3a8a" strokeWidth="1" />

            {/* rear window */}
            <path d="M24 32 L56 30 L60 26 L28 30 Z" fill="#bae6fd" opacity="0.75" />
            <path d="M24 32 L56 30 L60 26 L28 30 Z" fill="none" stroke="#1e3a8a" strokeWidth="0.8" />

            {/* side windows / door gap */}
            <path d="M64 26 L130 26 L132 42 L62 42 Z" fill="#bae6fd" opacity="0.65" />
            <line x1="98" y1="26" x2="96" y2="42" stroke="#1e3a8a" strokeWidth="1" />
            {/* door handle */}
            <rect x="104" y="38" width="10" height="2.5" rx="1" fill="#94a3b8" />

            {/* front headlight */}
            <path d="M166 38 Q172 40 174 44 L174 50 Q174 52 170 52 L162 50 Q160 48 160 44 Z" fill="#fef08a" />
            <ellipse cx="170" cy="44" rx="6" ry="10" fill="#fef08a" opacity="0.35" />
            <circle cx="172" cy="44" r="2" fill="#fff" opacity="0.9" />

            {/* taillight */}
            <path d="M10 38 Q6 40 6 46 L6 52 Q6 56 10 56 L14 54 Q16 52 16 46 Z" fill="#ef4444" />
            <ellipse cx="10" cy="46" rx="4" ry="10" fill="#ef4444" opacity="0.3" />

            {/* side mirror */}
            <rect x="60" y="28" width="8" height="5" rx="2" fill="#1e3a8a" />

            {/* grille front */}
            <path d="M174 52 L172 58 Q172 60 168 60" fill="none" stroke="#0f172a" strokeWidth="1.5" />

            {/* === front wheel (right side since flipped) === */}
            <g className="animate-wheel-spin" style={{ transformOrigin: "146px 58px" }}>
              <circle cx="146" cy="58" r="12" fill="#0f172a" />
              <circle cx="146" cy="58" r="7.5" fill="#334155" />
              <circle cx="146" cy="58" r="4" fill="#94a3b8" />
              {/* spokes */}
              <line x1="146" y1="46" x2="146" y2="70" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="134" y1="58" x2="158" y2="58" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="137.5" y1="49.5" x2="154.5" y2="66.5" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="154.5" y1="49.5" x2="137.5" y2="66.5" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
            </g>

            {/* === rear wheel === */}
            <g className="animate-wheel-spin" style={{ transformOrigin: "34px 58px" }}>
              <circle cx="34" cy="58" r="12" fill="#0f172a" />
              <circle cx="34" cy="58" r="7.5" fill="#334155" />
              <circle cx="34" cy="58" r="4" fill="#94a3b8" />
              <line x1="34" y1="46" x2="34" y2="70" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="22" y1="58" x2="46" y2="58" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="25.5" y1="49.5" x2="42.5" y2="66.5" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="42.5" y1="49.5" x2="25.5" y2="66.5" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        {/* dust clouds behind car */}
        <div className="absolute bottom-10 animate-car-drive-rtl opacity-50" style={{ animationDelay: "-0.15s" }}>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded-full bg-slate-400/50 blur-sm" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-400/40 blur-sm" />
            <div className="w-2 h-2 rounded-full bg-slate-400/30 blur-sm" />
          </div>
        </div>

        {/* === Bicycle === */}
        <div className="absolute bottom-2 animate-car-drive-rtl" style={{ animationDelay: "7.5s" }}>
          <svg viewBox="0 0 100 52" className="w-24 h-[3.25rem]" style={{ direction: "ltr" }}>
            <ellipse cx="16" cy="44" rx="12" ry="2" fill="rgba(0,0,0,0.3)" />
            <ellipse cx="76" cy="44" rx="12" ry="2" fill="rgba(0,0,0,0.3)" />
            {/* frame */}
            <path d="M76 44 L64 24 L56 44 L16 44 L26 22 L56 44" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="26" y1="22" x2="64" y2="24" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            {/* seat */}
            <path d="M22 22 L30 22 Q34 22 34 19" fill="none" stroke="#4b5563" strokeWidth="2.5" strokeLinecap="round" />
            {/* handlebars */}
            <path d="M64 24 L66 14 L72 14" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
            {/* wheels */}
            <g className="animate-wheel-spin" style={{ transformOrigin: "16px 44px" }}>
              <circle cx="16" cy="44" r="10" fill="none" stroke="#1f2937" strokeWidth="2" />
              <circle cx="16" cy="44" r="2" fill="#94a3b8" />
              <line x1="16" y1="34" x2="16" y2="54" stroke="#cbd5e1" strokeWidth="1.2" />
              <line x1="6" y1="44" x2="26" y2="44" stroke="#cbd5e1" strokeWidth="1.2" />
            </g>
            <g className="animate-wheel-spin" style={{ transformOrigin: "76px 44px" }}>
              <circle cx="76" cy="44" r="10" fill="none" stroke="#1f2937" strokeWidth="2" />
              <circle cx="76" cy="44" r="2" fill="#94a3b8" />
              <line x1="76" y1="34" x2="76" y2="54" stroke="#cbd5e1" strokeWidth="1.2" />
              <line x1="66" y1="44" x2="86" y2="44" stroke="#cbd5e1" strokeWidth="1.2" />
            </g>
          </svg>
        </div>

        {/* === Planes formation === */}
        {[/* delay, bottom, size-class, wingColor, tailColor, opacity */
          { delay: "7.2s",  bottom: "bottom-14", size: "w-28 h-[4.4rem]", body: "#f8fafc", wing: "#e2e8f0", opacity: "1" },
          { delay: "8.0s",  bottom: "bottom-20", size: "w-20 h-14",       body: "#f1f5f9", wing: "#cbd5e1", opacity: "0.85" },
          { delay: "5.5s",  bottom: "bottom-8",  size: "w-24 h-[3.8rem]", body: "#fff1f2", wing: "#fecdd3", opacity: "0.95" },
          { delay: "8.8s",  bottom: "bottom-24", size: "w-16 h-10",       body: "#f0f9ff", wing: "#bae6fd", opacity: "0.7" },
          { delay: "9.5s",  bottom: "bottom-4",  size: "w-32 h-20",       body: "#f8fafc", wing: "#e2e8f0", opacity: "0.9" },
        ].map((p, i) => (
          <div key={i} className={`absolute ${p.bottom} animate-plane-fly`} style={{ animationDelay: p.delay, opacity: p.opacity }}>
            <svg viewBox="0 0 90 44" className={p.size} style={{ direction: "ltr" }}>
              {/* fuselage */}
              <path d="M8 24 Q10 20 16 18 L56 14 Q64 14 72 18 L82 22 Q86 24 82 26 L72 28 Q64 30 56 30 L16 28 Q10 27 8 24 Z" fill={p.body} stroke="#334155" strokeWidth="1" />
              {/* cockpit window */}
              <path d="M54 16 L60 14 Q66 14 68 18 L56 18 Z" fill="#38bdf8" opacity="0.8" />
              {/* wings */}
              <path d="M46 28 L56 44 L62 44 L52 28 Z" fill={p.wing} stroke="#64748b" strokeWidth="0.8" />
              <path d="M44 16 L36 2 L42 2 L50 16 Z" fill={p.wing} stroke="#64748b" strokeWidth="0.8" />
              {/* tail */}
              <path d="M16 20 L8 10 L12 10 L18 19 Z" fill={p.wing} stroke="#64748b" strokeWidth="0.8" />
              {/* engine nacelle */}
              <rect x="52" y="26" width="16" height="5" rx="2" fill="#94a3b8" />
              {/* propeller blur */}
              <ellipse cx="82" cy="24" rx="3" ry="8" fill="#cbd5e1" opacity="0.5" />
              {/* trail cloud */}
              <circle cx="6" cy="24" r="2.5" fill="#94a3b8" opacity="0.4" />
              <circle cx="2" cy="26" r="1.5" fill="#94a3b8" opacity="0.3" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Vouchers;
