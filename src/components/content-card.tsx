import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Lock, Play, Plus, Check, ThumbsUp, ChevronDown, Sparkles, Volume2, VolumeX, BookOpen, Users, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ContentCardProps {
  id: string;
  type: "creator" | "post" | "course";
  title: string;
  subtitle?: string | null;
  thumbnailUrl?: string | null;
  avatarUrl?: string | null;
  videoUrl?: string | null;
  isLocked?: boolean;
  niche?: string | null;
  price?: number;
  subscriberCount?: number;
  rank?: number;
  isTop10?: boolean;
  matchScore?: number;
  duration?: string;
  rating?: string;
  aspect?: "16/9" | "2/3";
  href: string;
  onPlay?: (item: any) => void;
}

const NICHE_GRADIENTS: Record<string, string> = {
  "Fitness":     "from-orange-600 via-rose-700 to-zinc-900",
  "Technology":  "from-blue-600 via-indigo-700 to-zinc-900",
  "Finance":     "from-emerald-600 via-teal-700 to-zinc-900",
  "Education":   "from-zinc-600 via-slate-700 to-zinc-900",
  "Art":         "from-pink-600 via-purple-700 to-zinc-900",
  "Music":       "from-indigo-600 via-violet-700 to-zinc-900",
  "Cooking":     "from-amber-600 via-orange-700 to-zinc-900",
  "Travel":      "from-sky-600 via-blue-700 to-zinc-900",
  "Gaming":      "from-green-600 via-emerald-700 to-zinc-900",
  "Business":    "from-slate-600 via-zinc-700 to-zinc-900",
  "Action":      "from-red-600 via-rose-800 to-zinc-950",
  "default":     "from-zinc-700 via-zinc-800 to-zinc-950",
};

function getGradient(niche?: string | null) {
  if (!niche) return NICHE_GRADIENTS.default;
  const key = Object.keys(NICHE_GRADIENTS).find(k => niche.toLowerCase().includes(k.toLowerCase()));
  return key ? NICHE_GRADIENTS[key] : NICHE_GRADIENTS.default;
}

export function ContentCard({
  id,
  type,
  title,
  subtitle,
  thumbnailUrl,
  avatarUrl,
  videoUrl,
  isLocked,
  niche,
  price,
  subscriberCount,
  rank,
  isTop10,
  matchScore = 98,
  duration = "1h 45m",
  rating = "U/A 16+",
  aspect = "16/9",
  href,
  onPlay,
}: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isAdded, setIsAdded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const gradient = getGradient(niche);
  const imageSrc = thumbnailUrl || avatarUrl;

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Delay video preview slightly for smooth scrolling performance
    if (videoUrl) {
      hoverTimeoutRef.current = setTimeout(() => {
        setVideoActive(true);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {});
        }
      }, 400);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setVideoActive(false);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdded(!isAdded);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    if (onPlay) {
      e.preventDefault();
      e.stopPropagation();
      onPlay({ id, title, subtitle, videoUrl, thumbnailUrl, niche });
    }
  };

  const isPortrait = aspect === "2/3";
  const widthClass = isPortrait ? "w-40 sm:w-44 md:w-48" : "w-60 sm:w-68 md:w-76";

  return (
    <div
      className={`relative flex-shrink-0 ${widthClass} py-4 select-none group transition-all duration-300`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ zIndex: isHovered ? 40 : 1 }}
    >
      <Link href={href}>
        <div
          className={`relative rounded-xl overflow-hidden bg-zinc-900 border transition-all duration-300 ease-out cursor-pointer ${
            isHovered
              ? "scale-[1.12] md:scale-[1.18] shadow-[0_16px_40px_rgba(0,0,0,0.85)] border-zinc-500/50 -translate-y-2 ring-1 ring-white/20"
              : "scale-100 shadow-md border-white/[0.08]"
          }`}
          style={{
            transformOrigin: "center bottom",
          }}
        >
          {/* ── Media Container ── */}
          <div
            className={`relative w-full overflow-hidden bg-zinc-950 ${
              isPortrait ? "aspect-[2/3]" : "aspect-[16/9]"
            }`}
          >
            {/* Background Image / Poster */}
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={title}
                loading="lazy"
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isHovered ? "scale-105" : "scale-100"
                }`}
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center p-4`}>
                <span className="text-white/80 font-black text-2xl tracking-wider uppercase text-center line-clamp-2">
                  {title}
                </span>
              </div>
            )}

            {/* Video Preview on Hover */}
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                muted={isMuted}
                loop
                playsInline
                preload="none"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  videoActive ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              />
            )}

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent opacity-80" />

            {/* TOP 10 Badge (Matching Screenshot top-right magenta pill) */}
            {(isTop10 || (rank && rank <= 10)) && (
              <div className="absolute top-2 right-2 flex items-center shadow-lg">
                <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 text-white font-black text-[10px] tracking-wider px-2 py-0.5 rounded-md shadow-md flex items-center gap-1 border border-white/20">
                  <span className="text-[9px] font-extrabold uppercase">TOP</span>
                  <span className="text-[11px] font-black">{rank || 10}</span>
                </div>
              </div>
            )}

            {/* PRO / Lock Badge */}
            {isLocked && !isTop10 && (
              <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md px-1.5 py-0.5 bg-black/70 backdrop-blur-md border border-amber-500/40">
                <Lock className="h-2.5 w-2.5 text-amber-400" />
                <span className="text-amber-400 text-[9px] font-bold tracking-wider">PRO</span>
              </div>
            )}

            {/* Mute toggle when video is active on hover */}
            {videoActive && (
              <button
                onClick={toggleMute}
                className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-md shadow-md transition-transform hover:scale-110"
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Base Card Title (visible when not hovered) */}
            <div
              className={`absolute bottom-2 left-2.5 right-2.5 transition-opacity duration-200 ${
                isHovered ? "opacity-0" : "opacity-100"
              }`}
            >
              <p className="text-white font-bold text-xs sm:text-sm leading-tight truncate drop-shadow-md">
                {title}
              </p>
              {niche && (
                <p className="text-zinc-400 text-[10px] truncate mt-0.5">
                  {niche}
                </p>
              )}
            </div>
          </div>

          {/* ── Expanding Info Deck (Pops up when hovered) ── */}
          <div
            className={`p-3 bg-zinc-950 space-y-2 transition-all duration-300 ${
              isHovered ? "block" : "hidden"
            }`}
          >
            {/* Quick Action Icons Row */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                {/* Play Button */}
                <button
                  onClick={handlePlayClick}
                  className="h-8 w-8 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-transform hover:scale-110 shadow-lg cursor-pointer"
                  title="Play"
                >
                  <Play className="h-4 w-4 fill-black ml-0.5" />
                </button>

                {/* Add to Watchlist */}
                <button
                  onClick={handleWatchlist}
                  className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all hover:scale-110 cursor-pointer ${
                    isAdded
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                      : "bg-zinc-800/80 hover:bg-zinc-700 border-zinc-600 text-white"
                  }`}
                  title={isAdded ? "Added to list" : "Add to list"}
                >
                  {isAdded ? <Check className="h-4 w-4 stroke-[2.5]" /> : <Plus className="h-4 w-4 stroke-[2.5]" />}
                </button>

                {/* Like */}
                <button
                  onClick={handleLike}
                  className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all hover:scale-110 cursor-pointer ${
                    isLiked
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-400"
                      : "bg-zinc-800/80 hover:bg-zinc-700 border-zinc-600 text-white"
                  }`}
                  title="Like"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Expand Details Trigger */}
              <button
                className="h-8 w-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 hover:text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                title="More details"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Title & Metadata */}
            <div>
              <p className="text-white font-black text-sm leading-snug line-clamp-1">
                {title}
              </p>
              {subtitle && (
                <p className="text-zinc-400 text-xs truncate mt-0.5">{subtitle}</p>
              )}
            </div>

            {/* Badges & Match */}
            <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-300 flex-wrap pt-0.5">
              <span className="text-emerald-400 font-bold">{matchScore}% Match</span>
              <span className="px-1 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300">
                {rating}
              </span>
              <span>{duration}</span>
              <span className="px-1 rounded bg-zinc-800/90 text-[10px] text-zinc-400 font-bold border border-zinc-700">
                HD
              </span>
            </div>

            {/* Genre & Pricing */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
              <span className="truncate max-w-[120px]">{niche || "Exclusive"}</span>
              {price !== undefined && (
                <span className="font-bold text-zinc-200">${price}/mo</span>
              )}
              {subscriberCount !== undefined && subscriberCount > 0 && (
                <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {subscriberCount >= 1000 ? `${(subscriberCount / 1000).toFixed(1)}k` : subscriberCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

