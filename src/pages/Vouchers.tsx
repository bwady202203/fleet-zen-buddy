import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

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
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                إدارة السندات
              </h1>
              <p className="text-muted-foreground mt-1">سندات الصرف البنكية ومصروفات العهد</p>
            </div>
            <Link to="/">
              <Button variant="outline">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {sections.map((s) => {
            const Art = ArtMap[s.art];
            return (
              <Link key={s.title} to={s.link} className="group">
                <Card className="relative overflow-hidden h-full border-2 hover:border-primary/40 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5">
                  <CardContent className="p-6">
                    {/* Artistic icon tile */}
                    <div
                      className={`relative mb-5 h-32 w-32 rounded-3xl bg-gradient-to-br ${s.gradient} text-white shadow-xl ring-4 ${s.ring} flex items-center justify-center overflow-hidden group-hover:scale-105 group-hover:rotate-[-3deg] transition-transform duration-500`}
                    >
                      {/* decorative blobs */}
                      <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/15 blur-xl" />
                      <div className="absolute -bottom-8 -right-4 w-24 h-24 rounded-full bg-black/20 blur-2xl" />
                      <div className="relative w-20 h-20 drop-shadow-lg">
                        <Art />
                      </div>
                      {/* shine sweep */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
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
    </div>
  );
};

export default Vouchers;
