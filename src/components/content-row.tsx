import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ContentCard } from "./content-card";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentItem {
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

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  badge?: string;
  isLoading?: boolean;
}

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  Hot:     { background: "rgba(239,68,68,0.15)",   color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" },
  Free:    { background: "rgba(16,185,129,0.15)",  color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" },
  New:     { background: "rgba(59,130,246,0.15)",  color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" },
  Premium: { background: "rgba(192,192,192,0.12)", color: "#c0c0c0", border: "1px solid rgba(192,192,192,0.25)" },
};

export function ContentRow({ title, items, badge, isLoading }: ContentRowProps) {
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

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Row header */}
      <div className="flex items-center gap-3 mb-3 px-4 md:px-8">
        <h2 className="text-foreground font-bold text-lg md:text-xl tracking-tight">{title}</h2>
        {badge && badgeStyle && (
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={badgeStyle}
          >
            {badge}
          </span>
        )}
        {!isLoading && items.length > 0 && (
          <span className="text-muted-foreground text-xs ml-auto mr-2 hidden md:block">
            {items.length} items
          </span>
        )}
      </div>

      <div className="relative">
        {/* Left gradient + arrow */}
        <div
          className={`absolute left-0 top-0 bottom-4 z-10 w-20 flex items-center justify-start pl-2 transition-all duration-300 pointer-events-none bg-gradient-to-r from-background to-transparent ${canScrollLeft && hovered ? "opacity-100" : "opacity-0"}`}
        >
          <button
            className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full text-foreground bg-card/90 border border-primary/25 backdrop-blur-sm shadow-silver-glow transition-all duration-200 hover:scale-110 active:scale-95"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto pb-4 px-4 md:px-8"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-44 md:w-52" style={{ scrollSnapAlign: "start" }}>
                  <Skeleton className="aspect-[2/3] w-full rounded-xl animate-pulse bg-muted" />
                  <Skeleton className="h-3 w-20 mt-2 rounded bg-muted" />
                </div>
              ))
            : items.map(item => (
                <div key={item.id} style={{ scrollSnapAlign: "start" }}>
                  <ContentCard {...item} />
                </div>
              ))
          }
          {/* Partial ghost card at end — visual scroll cue */}
          {!isLoading && items.length > 0 && (
            <div className="flex-shrink-0 w-8 md:w-12" aria-hidden="true" />
          )}
        </div>

        {/* Right gradient + arrow */}
        <div
          className={`absolute right-0 top-0 bottom-4 z-10 w-20 flex items-center justify-end pr-2 transition-all duration-300 pointer-events-none bg-gradient-to-l from-background to-transparent ${canScrollRight && hovered ? "opacity-100" : "opacity-0"}`}
        >
          <button
            className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full text-foreground bg-card/90 border border-primary/25 backdrop-blur-sm shadow-silver-glow transition-all duration-200 hover:scale-110 active:scale-95"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
