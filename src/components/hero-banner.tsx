import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Play, Plus, Volume2, VolumeX, ChevronRight, ChevronLeft, Info, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@clerk/react";

const SAMPLE_TRAILERS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
];

const FALLBACK_POSTERS = [
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80",
];

export interface HeroItem {
  id: string;
  name: string;
  niche: string | null;
  bio: string | null;
  coverUrl: string | null;
  avatarUrl: string | null;
  videoUrl?: string | null;
  subscriberCount?: number;
  monthlyPrice?: number;
  tags?: string[];
  year?: string;
  rating?: string;
  duration?: string;
  languages?: string;
}

interface HeroBannerProps {
  creators?: HeroItem[];
  isLoading?: boolean;
  onPlayTrailer?: (item: HeroItem) => void;
}

export function HeroBanner({ creators = [], isLoading, onPlayTrailer }: HeroBannerProps) {
  const { isSignedIn } = useAuth();
  const [current, setCurrent] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbScrollRef = useRef<HTMLDivElement>(null);

  // Normalize items
  const items: HeroItem[] = creators.length > 0
    ? creators.slice(0, 6).map((c, i) => ({
        ...c,
        videoUrl: c.videoUrl || SAMPLE_TRAILERS[i % SAMPLE_TRAILERS.length],
        coverUrl: c.coverUrl || FALLBACK_POSTERS[i % FALLBACK_POSTERS.length],
        year: c.year || (2024 + (i % 3)).toString(),
        rating: c.rating || "U/A 16+",
        duration: c.duration || (i % 2 === 0 ? "1h 44m" : "2h 10m"),
        languages: c.languages || "4 Languages",
        tags: c.tags || (c.niche ? [c.niche.split("&")[0].trim(), "Exclusive", "4K Ultra HD", "Original"] : ["Action", "Thriller", "4K HDR", "Original"]),
      }))
    : [];

  const item = items[current] || {
    id: "featured-1",
    name: "THE ROUNDUP : NO WAY OUT",
    niche: "Action & Thriller",
    bio: "Elite creators and cinematic visionaries join forces to investigate an underground operation, sparking a high-stakes clash across borders and boundaries.",
    coverUrl: FALLBACK_POSTERS[0],
    videoUrl: SAMPLE_TRAILERS[0],
    year: "2025",
    rating: "U/A 16+",
    duration: "1h 44m",
    languages: "4 Languages",
    tags: ["Action", "Crime", "Thriller", "Gritty", "4K HDR"],
    monthlyPrice: 9.99,
  };

  const goTo = useCallback((idx: number) => {
    setCurrent(idx);
    setIsVideoLoaded(false);
    setIsWatchlisted(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const next = useCallback(() => {
    if (items.length <= 1) return;
    goTo((current + 1) % items.length);
  }, [current, items.length, goTo]);

  const prev = useCallback(() => {
    if (items.length <= 1) return;
    goTo((current - 1 + items.length) % items.length);
  }, [current, items.length, goTo]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    }
  }, [current, isMuted]);

  if (isLoading) {
    return (
      <div className="relative w-full h-[85vh] min-h-[580px] bg-zinc-950 flex items-end pb-24 px-6 md:px-14 overflow-hidden animate-pulse">
        <div className="space-y-4 max-w-xl">
          <div className="h-6 w-32 bg-zinc-800 rounded-md" />
          <div className="h-14 w-80 bg-zinc-800 rounded-xl" />
          <div className="h-4 w-60 bg-zinc-800 rounded" />
          <div className="h-16 w-full max-w-lg bg-zinc-800 rounded-lg" />
          <div className="flex gap-4 pt-2">
            <div className="h-12 w-36 bg-zinc-800 rounded-xl" />
            <div className="h-12 w-12 bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="relative w-full h-[88vh] min-h-[620px] max-h-[920px] overflow-hidden bg-black select-none">
      {/* ── Background Video / Image Player ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        {item.videoUrl ? (
          <video
            ref={videoRef}
            src={item.videoUrl}
            poster={item.coverUrl || undefined}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            preload="auto"
            onLoadedData={() => setIsVideoLoaded(true)}
            className="w-full h-full object-cover object-center scale-[1.03] transition-opacity duration-1000"
            style={{ opacity: isVideoLoaded ? 1 : 0.85 }}
          />
        ) : (
          <img
            src={item.coverUrl || FALLBACK_POSTERS[0]}
            alt={item.name}
            className="w-full h-full object-cover object-center scale-[1.02]"
          />
        )}

        {/* Cinematic Vignette & Edge Masks */}
        {/* Left deep shadow for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-black/20" />
        {/* Top shadow for floating navbar contrast */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />
        {/* Bottom smooth fade into the content shelves */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
        {/* Subtle cinematic grain */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />
      </div>

      {/* ── Main Foreground Content Overlay ── */}
      <div className="relative z-10 w-full h-full flex flex-col justify-end pb-16 md:pb-24 px-6 md:px-14 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end w-full">
          
          {/* Left Column: Title, Metadata, Synopsis, and CTA */}
          <div className="lg:col-span-8 space-y-4 max-w-2xl">
            {/* Title / Logo */}
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] font-sans">
                {item.name}
              </h1>
              <p className="text-cyan-400 font-bold text-xs sm:text-sm tracking-wide drop-shadow">
                Newly Added
              </p>
            </div>

            {/* Metadata Badges Row */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-semibold text-zinc-300">
              <span className="text-white font-bold">{item.year}</span>
              <span className="text-zinc-500">•</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/80 text-[11px] text-zinc-200">
                {item.rating}
              </span>
              <span className="text-zinc-500">•</span>
              <span>{item.duration}</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-300">{item.languages}</span>
            </div>

            {/* Synopsis / Bio */}
            {item.bio && (
              <p className="text-zinc-300 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-3 md:line-clamp-4 max-w-xl drop-shadow-md">
                {item.bio}
              </p>
            )}

            {/* Tags / Genres */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-400 pt-0.5">
                {item.tags.map((t, idx) => (
                  <span key={t} className="flex items-center gap-2">
                    <span className="text-zinc-200 font-semibold">{t}</span>
                    {idx < item.tags!.length - 1 && <span className="text-zinc-600">|</span>}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons Row (Matching screenshot Watch Now button + Plus) */}
            <div className="flex items-center gap-3.5 pt-2">
              <Button
                size="lg"
                onClick={() => onPlayTrailer ? onPlayTrailer(item) : null}
                className="h-12 px-7 rounded-xl font-extrabold text-sm sm:text-base text-white shadow-xl gap-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
                style={{
                  boxShadow: "0 8px 30px rgba(99, 102, 241, 0.4)",
                }}
              >
                <Play className="h-5 w-5 fill-white" />
                Watch Now
              </Button>

              <button
                onClick={() => setIsWatchlisted(!isWatchlisted)}
                className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all duration-200 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 ${
                  isWatchlisted
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                }`}
                title={isWatchlisted ? "Added to Watchlist" : "Add to Watchlist"}
              >
                {isWatchlisted ? <Check className="h-5 w-5 stroke-[2.5]" /> : <Plus className="h-5 w-5 stroke-[2.5]" />}
              </button>

              <Link href={`/creators/${item.id}`}>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-5 rounded-xl font-bold text-xs sm:text-sm bg-black/40 hover:bg-black/60 border-white/20 text-zinc-200 hover:text-white backdrop-blur-md transition-all gap-2 cursor-pointer"
                >
                  <Info className="h-4 w-4" />
                  Details
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Audio Toggle & Mini Thumbnail Switcher Carousel */}
          <div className="lg:col-span-4 flex flex-col items-end gap-5 justify-end">
            {/* Mute / Unmute Button (matching the right-side audio toggle in screenshot) */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMute}
                className="h-10 w-10 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 shadow-lg cursor-pointer"
                title={isMuted ? "Unmute sound" : "Mute sound"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            {/* Mini Carousel Thumbnails Row (as shown on bottom right of screenshot) */}
            {items.length > 1 && (
              <div className="relative flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-lg shadow-2xl max-w-full overflow-hidden">
                <div
                  ref={thumbScrollRef}
                  className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 px-0.5"
                >
                  {items.map((it, idx) => {
                    const isActive = idx === current;
                    return (
                      <button
                        key={it.id}
                        onClick={() => goTo(idx)}
                        className={`relative flex-shrink-0 w-16 sm:w-20 md:w-24 aspect-[16/9] rounded-lg overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                          isActive
                            ? "border-cyan-400 scale-105 shadow-[0_0_15px_rgba(34,211,238,0.5)] opacity-100 ring-2 ring-cyan-400/50"
                            : "border-transparent opacity-60 hover:opacity-100 hover:scale-100"
                        }`}
                      >
                        <img
                          src={it.coverUrl || FALLBACK_POSTERS[idx % FALLBACK_POSTERS.length]}
                          alt={it.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <span className="absolute bottom-0.5 left-1 right-1 text-[8px] font-bold text-white truncate text-left">
                          {it.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right chevron button */}
                <button
                  onClick={next}
                  className="flex-shrink-0 h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Next featured title"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

