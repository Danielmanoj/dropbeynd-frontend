import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Play, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/react";

/* Dark, editorial gradients — no purple */
const GRADIENTS = [
  "from-zinc-900/95 via-zinc-800/60",
  "from-neutral-900/95 via-stone-800/60",
  "from-black/95 via-zinc-900/60",
];

interface HeroBannerProps {
  creators?: Array<{
    id: string;
    name: string;
    niche: string | null;
    bio: string | null;
    coverUrl: string | null;
    avatarUrl: string | null;
    subscriberCount: number;
    monthlyPrice: number;
  }>;
  isLoading?: boolean;
}

export function HeroBanner({ creators = [], isLoading }: HeroBannerProps) {
  const { isSignedIn } = useAuth();
  const items = creators && creators.length > 0 ? creators.slice(0, 5) : [];
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((idx: number) => {
    if (items.length <= 1) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 300);
  }, [items.length]);

  const next = useCallback(() => {
    if (items.length <= 1) return;
    goTo((current + 1) % items.length);
  }, [current, items.length, goTo]);

  const prev = useCallback(() => {
    if (items.length <= 1) return;
    goTo((current - 1 + items.length) % items.length);
  }, [current, items.length, goTo]);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(next, 6000);
    return () => clearInterval(interval);
  }, [next, items.length]);

  // Smooth scroll-driven parallax and fading
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let ticking = false;

    const updateScrollTransforms = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const height = containerRef.current?.offsetHeight || 500;
      // Normalized progress 0 to 1 over the hero height
      const progress = Math.min(1, Math.max(0, scrollY / height));

      if (bgRef.current) {
        const translateY = progress * -16; // recedes upward smoothly
        const scale = 1 + progress * 0.035; // extremely subtle zoom
        const opacity = 1 - progress * 0.55; // gentle fade
        bgRef.current.style.transform = `translate3d(0, ${translateY}%, 0) scale(${scale})`;
        bgRef.current.style.opacity = `${opacity}`;
      }

      if (contentRef.current) {
        const translateY = progress * -70; // foreground moves upward
        const opacity = Math.max(0, 1 - progress * 1.5); // fades gracefully
        contentRef.current.style.transform = `translate3d(0, ${translateY}px, 0)`;
        contentRef.current.style.opacity = `${opacity}`;
      }

      if (controlsRef.current) {
        const opacity = Math.max(0, 1 - progress * 2);
        controlsRef.current.style.opacity = `${opacity}`;
      }

      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollTransforms);
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateScrollTransforms();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden flex items-center bg-zinc-950">
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="relative z-10 px-8 md:px-16 max-w-2xl space-y-4 animate-pulse">
          <div className="h-6 w-28 rounded-full bg-zinc-800" />
          <div className="h-12 md:h-16 w-4/5 rounded-2xl bg-zinc-800" />
          <div className="h-4 w-full max-w-md rounded bg-zinc-800/80" />
          <div className="h-4 w-2/3 max-w-sm rounded bg-zinc-800/60" />
          <div className="flex gap-3 pt-3">
            <div className="h-11 w-36 rounded-lg bg-zinc-800" />
            <div className="h-11 w-44 rounded-lg bg-zinc-800/60" />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="relative w-full h-[60vh] min-h-[460px] overflow-hidden flex items-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="relative z-10 px-8 md:px-16 max-w-3xl">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-3 px-3 py-1 rounded-full text-zinc-300 bg-white/10 border border-white/20">
            Welcome to DropBeynd
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight drop-shadow-lg">
            Discover & Connect with Elite Creators
          </h1>
          <p className="text-zinc-300 text-sm md:text-base mb-8 max-w-xl leading-relaxed">
            Exclusive posts, live premium video, comprehensive masterclasses, and direct community subscriptions.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link href="/browse">
              <Button size="lg" className="font-bold text-black bg-silver-gradient hover:opacity-90 rounded-xl px-8 shadow-lg">
                Explore Creators
              </Button>
            </Link>
            {!isSignedIn && (
              <Link href="/sign-up">
                <Button size="lg" variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800 rounded-xl px-6">
                  Join as Creator
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const item = items[current];
  const gradient = GRADIENTS[current % GRADIENTS.length];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[70vh] min-h-[500px] overflow-hidden select-none"
      style={{ background: "#0a0a0a" }}
    >
      {/* ── Parallax Background Layer ── */}
      <div
        ref={bgRef}
        className="absolute inset-0 w-full h-full will-change-transform pointer-events-none"
      >
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.4) saturate(0.6)" }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} to-black`} />
        )}
      </div>

      {/* Vignette overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/50 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />

      {/* Subtle silver noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      {/* ── Foreground Hero Content ── */}
      <div
        ref={contentRef}
        className={`absolute inset-0 flex items-center will-change-transform transition-opacity duration-300 ${
          animating ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="px-8 md:px-16 max-w-2xl">
          {item.niche && (
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest mb-3 px-3 py-1 rounded-full"
              style={{
                color: "#c0c0c0",
                background: "rgba(192,192,192,0.12)",
                border: "1px solid rgba(192,192,192,0.2)",
              }}
            >
              {item.niche}
            </span>
          )}
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight drop-shadow-lg">
            {item.name}
          </h1>
          {item.bio && (
            <p className="text-zinc-300 text-base md:text-lg mb-8 max-w-lg leading-relaxed line-clamp-3">
              {item.bio}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href={`/creators/${item.id}`}>
              <Button
                size="lg"
                className="font-bold rounded-lg px-6 gap-2 shadow-xl text-black"
                style={{
                  background:
                    "linear-gradient(135deg, #e5e5e5 0%, #c0c0c0 50%, #a0a0a0 100%)",
                  boxShadow: "0 4px 24px rgba(192,192,192,0.25)",
                }}
              >
                <Play className="h-5 w-5 fill-black" />
                Explore Free
              </Button>
            </Link>
            {isSignedIn ? (
              <Link href={`/creators/${item.id}`}>
                <Button
                  size="lg"
                  variant="outline"
                  className="font-semibold rounded-lg px-6 gap-2 backdrop-blur-sm"
                  style={{ borderColor: "rgba(192,192,192,0.3)", color: "#e5e5e5" }}
                >
                  <Plus className="h-5 w-5" />
                  Subscribe · ${item.monthlyPrice}/mo
                </Button>
              </Link>
            ) : (
              <Link href="/sign-up">
                <Button
                  size="lg"
                  variant="outline"
                  className="font-semibold rounded-lg px-6 gap-2 backdrop-blur-sm"
                  style={{ borderColor: "rgba(192,192,192,0.3)", color: "#e5e5e5" }}
                >
                  Join Free
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Interactive Controls (Nav arrows & indicators) ── */}
      <div ref={controlsRef} className="will-change-opacity">
        {/* Nav arrows */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 cursor-pointer"
          style={{
            background: "rgba(0,0,0,0.6)",
            border: "1px solid rgba(192,192,192,0.2)",
            backdropFilter: "blur(8px)",
          }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 cursor-pointer"
          style={{
            background: "rgba(0,0,0,0.6)",
            border: "1px solid rgba(192,192,192,0.2)",
            backdropFilter: "blur(8px)",
          }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Slide indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="h-1 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                width: i === current ? "24px" : "6px",
                background: i === current ? "#c0c0c0" : "rgba(192,192,192,0.3)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

