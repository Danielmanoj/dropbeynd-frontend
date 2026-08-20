import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Lock, Play, BookOpen, Users } from "lucide-react";

interface ContentCardProps {
  id: string;
  type: "creator" | "post" | "course";
  title: string;
  subtitle?: string | null;
  thumbnailUrl?: string | null;
  avatarUrl?: string | null;
  isLocked?: boolean;
  niche?: string | null;
  price?: number;
  subscriberCount?: number;
  href: string;
}

const NICHE_GRADIENTS: Record<string, string> = {
  "Fitness":     "from-orange-500 via-red-600 to-rose-800",
  "Technology":  "from-blue-500 via-cyan-600 to-indigo-800",
  "Finance":     "from-emerald-500 via-teal-600 to-green-800",
  "Education":   "from-zinc-500 via-zinc-600 to-zinc-800",
  "Art":         "from-pink-500 via-fuchsia-600 to-rose-800",
  "Music":       "from-indigo-500 via-blue-600 to-slate-800",
  "Cooking":     "from-amber-500 via-orange-600 to-yellow-800",
  "Travel":      "from-sky-500 via-blue-600 to-cyan-800",
  "Gaming":      "from-green-500 via-emerald-600 to-teal-800",
  "Business":    "from-slate-500 via-zinc-600 to-gray-800",
  "Personal":    "from-stone-500 via-zinc-600 to-neutral-800",
  "Photography": "from-stone-500 via-zinc-600 to-neutral-800",
  "Writing":     "from-rose-500 via-pink-600 to-fuchsia-800",
  "Language":    "from-teal-500 via-cyan-600 to-sky-800",
  "Yoga":        "from-lime-500 via-green-600 to-emerald-800",
  default:       "from-zinc-600 via-zinc-700 to-zinc-900",
};

function getGradient(niche?: string | null) {
  if (!niche) return NICHE_GRADIENTS.default;
  const key = Object.keys(NICHE_GRADIENTS).find(k => niche.includes(k));
  return key ? NICHE_GRADIENTS[key] : NICHE_GRADIENTS.default;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export function ContentCard({
  id, type, title, subtitle, thumbnailUrl, avatarUrl,
  isLocked, niche, price, subscriberCount, href,
}: ContentCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(thumbnailUrl || avatarUrl || null);
  const [hasError, setHasError] = useState(false);
  const gradient = getGradient(niche);

  // Sync if props change
  useEffect(() => {
    setImgSrc(thumbnailUrl || avatarUrl || null);
    setHasError(false);
  }, [thumbnailUrl, avatarUrl]);

  const handleImageError = () => {
    // If thumbnailUrl failed, try falling back to creator avatarUrl
    if (imgSrc === thumbnailUrl && avatarUrl && avatarUrl !== thumbnailUrl) {
      setImgSrc(avatarUrl);
    } else {
      // Both failed or no secondary URL available
      setHasError(true);
      setImgSrc(null);
    }
  };

  return (
    <Link href={href}>
      <div
        className="relative flex-shrink-0 w-44 md:w-52 cursor-pointer group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Soft silver glow on hover */}
        <div
          className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(192,192,192,0.2) 0%, transparent 70%)" }}
        />

        <div
          className={`relative overflow-hidden rounded-xl transition-all duration-300 border ${hovered ? "border-primary/25 shadow-silver-glow-lg" : "border-border"}`}
          style={{
            transform: hovered ? "scale(1.04)" : "scale(1)",
            zIndex: hovered ? 10 : undefined,
          }}
        >
          <div className="aspect-[2/3] w-full relative">
            {imgSrc && !hasError ? (
              <img
                src={imgSrc}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={handleImageError}
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <span className="text-white text-3xl font-extrabold opacity-50 select-none">
                  {getInitials(title)}
                </span>
              </div>
            )}

            {/* Dark gradient overlay */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent transition-opacity duration-300"
              style={{ opacity: hovered ? 1 : 0.7 }}
            />

            {/* PRO badge */}
            {isLocked && (
              <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md px-1.5 py-0.5" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(234,179,8,0.35)" }}>
                <Lock className="h-2.5 w-2.5 text-yellow-400" />
                <span className="text-yellow-400 text-[9px] font-bold tracking-wider">PRO</span>
              </div>
            )}

            {/* Course badge — silver */}
            {type === "course" && (
              <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md px-1.5 py-0.5" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(192,192,192,0.2)" }}>
                <BookOpen className="h-2.5 w-2.5 text-zinc-300" />
                <span className="text-zinc-300 text-[9px] font-bold tracking-wider">COURSE</span>
              </div>
            )}

            {/* Card info */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white font-semibold text-sm leading-snug line-clamp-2 drop-shadow-lg">
                {title}
              </p>
              {subtitle && (
                <p className="text-zinc-300 text-xs mt-0.5 line-clamp-1">{subtitle}</p>
              )}
              <div className="flex items-center justify-between mt-1.5">
                {price !== undefined && (
                  <span className="text-xs font-bold" style={{ color: "#c0c0c0" }}>${price}/mo</span>
                )}
                {subscriberCount !== undefined && subscriberCount > 0 && (
                  <span className="text-zinc-500 text-[10px] flex items-center gap-0.5">
                    <Users className="h-2.5 w-2.5" />
                    {subscriberCount >= 1000 ? `${(subscriberCount / 1000).toFixed(1)}k` : subscriberCount}
                  </span>
                )}
              </div>
            </div>

            {/* Play button */}
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
              style={{ opacity: hovered ? 1 : 0 }}
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-2xl" style={{ background: "rgba(192,192,192,0.9)", backdropFilter: "blur(4px)", boxShadow: "0 0 20px rgba(192,192,192,0.4)" }}>
                <Play className="h-5 w-5 ml-0.5" style={{ color: "#000", fill: "#000" }} />
              </div>
            </div>
          </div>
        </div>

        {niche && (
          <p className="mt-1.5 text-[11px] text-muted-foreground truncate px-0.5 group-hover:text-foreground transition-colors">
            {niche}
          </p>
        )}
      </div>
    </Link>
  );
}
