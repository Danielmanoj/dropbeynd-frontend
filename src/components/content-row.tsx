import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { ContentCard, ContentCardProps } from "./content-card";
import { Skeleton } from "@/components/ui/skeleton";

export interface ContentItem {
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
}

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  badge?: string;
  isTop10Row?: boolean;
  aspect?: "16/9" | "2/3";
  isLoading?: boolean;
  onPlay?: (item: any) => void;
}

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  Hot:     { background: "rgba(239,68,68,0.2)",    color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" },
  Free:    { background: "rgba(16,185,129,0.2)",   color: "#34d399", border: "1px solid rgba(16,185,129,0.4)" },
  New:     { background: "rgba(59,130,246,0.2)",   color: "#60a5fa", border: "1px solid rgba(59,130,246,0.4)" },
  Top10:   { background: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.3)" },
  Premium: { background: "rgba(255,255,255,0.1)",  color: "#e4e4e7", border: "1px solid rgba(255,255,255,0.2)" },
};

export function ContentRow({
  title,
  items,
  badge,
  isTop10Row,
  aspect = "16/9",
  isLoading,
  onPlay,
}: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [hovered, setHovered] = useState(false);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? el.clientWidth * 0.75 : -el.clientWidth * 0.75, behavior: "smooth" });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  if (!isLoading && items.length === 0) return null;

  const badgeStyle = badge ? (BADGE_STYLES[badge] ?? BADGE_STYLES.Premium) : undefined;
  const isPortrait = aspect === "2/3";
  const skeletonWidth = isPortrait ? "w-40 sm:w-44 md:w-48" : "w-60 sm:w-68 md:w-76";

  return (
    <section
      className="relative mb-6 md:mb-10 group/row"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Row Header */}
      <div className="flex items-center justify-between mb-1 px-6 md:px-14">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-extrabold text-lg sm:text-xl md:text-2xl tracking-tight drop-shadow-sm flex items-center gap-2">
            {title}
          </h2>
          {badge && badgeStyle && (
            <span
              className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm"
              style={badgeStyle}
            >
              {badge}
            </span>
          )}
        </div>

        {!isLoading && items.length > 0 && (
          <span className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold tracking-wide transition-colors cursor-pointer hidden sm:block">
            Explore All ({items.length})
          </span>
        )}
      </div>

      <div className="relative">
        {/* Left Arrow */}
        <div
          className={`absolute left-0 top-0 bottom-0 z-30 w-16 md:w-20 flex items-center justify-start pl-2 md:pl-4 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent ${
            canScrollLeft && hovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            className="pointer-events-auto flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full text-white bg-black/80 border border-white/20 backdrop-blur-md shadow-2xl transition-all duration-200 hover:scale-115 hover:bg-black active:scale-95 cursor-pointer"
            onClick={() => scroll("left")}
            title="Scroll left"
          >
            <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Horizontal Carousel Shelf */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto overflow-y-visible px-6 md:px-14 scrollbar-none scroll-smooth py-3"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 ${skeletonWidth}`}
                  style={{ scrollSnapAlign: "start" }}
                >
                  <Skeleton
                    className={`w-full rounded-xl animate-pulse bg-zinc-900 border border-zinc-800 ${
                      isPortrait ? "aspect-[2/3]" : "aspect-[16/9]"
                    }`}
                  />
                  <Skeleton className="h-4 w-32 mt-3 rounded bg-zinc-900" />
                  <Skeleton className="h-3 w-20 mt-1.5 rounded bg-zinc-900/60" />
                </div>
              ))
            : items.map((item, idx) => (
                <div key={item.id} style={{ scrollSnapAlign: "start" }}>
                  <ContentCard
                    {...item}
                    rank={isTop10Row ? idx + 1 : item.rank}
                    isTop10={isTop10Row ? true : item.isTop10}
                    aspect={aspect}
                    onPlay={onPlay}
                  />
                </div>
              ))}

          {/* End spacing buffer */}
          {!isLoading && items.length > 0 && (
            <div className="flex-shrink-0 w-6 md:w-12" aria-hidden="true" />
          )}
        </div>

        {/* Right Arrow */}
        <div
          className={`absolute right-0 top-0 bottom-0 z-30 w-16 md:w-20 flex items-center justify-end pr-2 md:pr-4 transition-opacity duration-300 pointer-events-none bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent ${
            canScrollRight && hovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            className="pointer-events-auto flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full text-white bg-black/80 border border-white/20 backdrop-blur-md shadow-2xl transition-all duration-200 hover:scale-115 hover:bg-black active:scale-95 cursor-pointer"
            onClick={() => scroll("right")}
            title="Scroll right"
          >
            <ChevronRight className="h-6 w-6 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </section>
  );
}

