import { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import {
  Compass, LogIn, User, Crown, Sun, Moon, Play,
  Plus, Check, X, Volume2, VolumeX, Maximize2, Sparkles, Film, Flame, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HeroBanner, HeroItem } from "@/components/hero-banner";
import { StoryBar } from "@/components/story-bar";
import { ContentRow, ContentItem } from "@/components/content-row";
import { FilterBar } from "@/components/filter-bar";
import { NotificationBell } from "@/components/notification-bell";
import { useTheme } from "@/components/theme-provider";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
];

async function fetchPublicCreators(params?: Record<string, string>) {
  const q = params ? "?" + new URLSearchParams(params).toString() : "";
  const r = await fetch(`${BASE}/api/public/creators${q}`);
  if (!r.ok) throw new Error("Failed");
  return r.json() as Promise<CreatorItem[]>;
}

async function fetchPublicContent(params?: Record<string, string>) {
  const q = params ? "?" + new URLSearchParams(params).toString() : "";
  const r = await fetch(`${BASE}/api/public/content${q}`);
  if (!r.ok) throw new Error("Failed");
  return r.json() as Promise<PostItem[]>;
}

async function fetchStories() {
  const r = await fetch(`${BASE}/api/stories`);
  if (!r.ok) throw new Error("Failed");
  return r.json();
}

interface CreatorItem {
  id: string;
  name: string;
  niche: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  subscriberCount: number;
  monthlyPrice: number;
  postCount: number;
  courseCount: number;
}

interface PostItem {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string | null;
  creatorNiche: string | null;
  title: string | null;
  body: string | null;
  mediaUrl: string | null;
  mediaType: string;
  isLocked: boolean;
}

export default function Home() {
  const { isSignedIn } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [accessFilter, setAccessFilter] = useState<"all" | "free" | "premium">("all");
  const [activeTheaterItem, setActiveTheaterItem] = useState<any | null>(null);

  // Dynamic scroll listener for transparent-to-frosted glass top navigation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: allCreators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ["public-creators"],
    queryFn: () => fetchPublicCreators({ limit: "30" }),
  });

  const { data: newCreators = [], isLoading: newLoading } = useQuery({
    queryKey: ["public-creators-new"],
    queryFn: () => fetchPublicCreators({ sort: "new", limit: "20" }),
  });

  const { data: freeContent = [], isLoading: freeLoading } = useQuery({
    queryKey: ["public-content-free"],
    queryFn: () => fetchPublicContent({ filter: "free", limit: "20" }),
  });

  const { data: premiumContent = [], isLoading: premiumLoading } = useQuery({
    queryKey: ["public-content-premium"],
    queryFn: () => fetchPublicContent({ filter: "premium", limit: "20" }),
  });

  const { data: storyGroups = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: fetchStories,
  });

  const safeArray = <T,>(val: any): T[] => (Array.isArray(val) ? val : []);

  const filterCreators = useCallback((list: any) => {
    let r = safeArray<CreatorItem>(list);
    if (searchQuery) r = r.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (categoryFilter) r = r.filter(c => c.niche?.includes(categoryFilter));
    return r;
  }, [searchQuery, categoryFilter]);

  const filterContent = useCallback((list: any) => {
    let r = safeArray<PostItem>(list);
    if (searchQuery) r = r.filter(p => (p.title ?? p.creatorName ?? "").toLowerCase().includes(searchQuery.toLowerCase()));
    if (categoryFilter) r = r.filter(p => p.creatorNiche?.includes(categoryFilter));
    return r;
  }, [searchQuery, categoryFilter]);

  const safeAllCreators = safeArray<CreatorItem>(allCreators);
  const trending = filterCreators(safeAllCreators).sort((a, b) => (b.subscriberCount || 0) - (a.subscriberCount || 0)).slice(0, 15);
  const filtered = filterCreators(safeAllCreators);
  const filteredFree = accessFilter !== "premium" ? filterContent(freeContent) : [];
  const filteredPremium = accessFilter !== "free" ? filterContent(premiumContent) : [];
  const filteredNew = filterCreators(newCreators);

  const topCreators = [...safeAllCreators]
    .sort((a, b) => (b.subscriberCount || 0) - (a.subscriberCount || 0))
    .slice(0, 10);

  const toCreatorItems = (list: CreatorItem[], aspect: "16/9" | "2/3" = "16/9"): ContentItem[] =>
    list.map((c, i) => ({
      id: c.id,
      type: "creator" as const,
      title: c.name,
      subtitle: c.niche,
      avatarUrl: c.avatarUrl,
      thumbnailUrl: c.coverUrl || c.avatarUrl,
      videoUrl: SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length],
      niche: c.niche,
      price: c.monthlyPrice,
      subscriberCount: c.subscriberCount,
      aspect,
      duration: "Series · 4K",
      rating: "U/A 16+",
      matchScore: 95 + (i % 5),
      href: `/creators/${c.id}`,
    }));

  const toPostItems = (list: PostItem[], aspect: "16/9" | "2/3" = "16/9"): ContentItem[] =>
    list.map((p, i) => ({
      id: p.id,
      type: "post" as const,
      title: p.title ?? p.creatorName,
      subtitle: p.creatorName,
      thumbnailUrl: p.mediaUrl || p.creatorAvatarUrl,
      avatarUrl: p.creatorAvatarUrl,
      videoUrl: p.mediaUrl && p.mediaUrl.endsWith(".mp4") ? p.mediaUrl : SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length],
      isLocked: p.isLocked,
      niche: p.creatorNiche,
      aspect,
      duration: "1h 44m",
      rating: "U/A 16+",
      matchScore: 97 + (i % 3),
      href: `/creators/${p.creatorId}`,
    }));

  const handlePlayTrailer = (item: any) => {
    setActiveTheaterItem({
      title: item.name || item.title || "DropBeynd Exclusive",
      subtitle: item.niche || item.subtitle || "Original Trailer",
      videoUrl: item.videoUrl || SAMPLE_VIDEOS[0],
      bio: item.bio || "Experience premium 4K Ultra HD streaming on DropBeynd with multi-channel audio.",
    });
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black">
      {/* ── Top Floating Glass OTT Navigation Header ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-14 py-4 transition-all duration-500 ${
          isScrolled
            ? "bg-black/90 backdrop-blur-xl border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-3.5"
            : "bg-gradient-to-b from-black/90 via-black/40 to-transparent border-b border-transparent"
        }`}
      >
        <div className="flex items-center gap-8">
          <Link href="/">
            <div className="flex items-center gap-2.5 font-black text-xl md:text-2xl text-white tracking-tighter cursor-pointer group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] group-hover:scale-105 transition-transform">
                <Film className="h-5 w-5" />
              </div>
              <span>
                DROP<span className="text-cyan-400">BEYND</span>
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-bold text-zinc-300">
            <Link href="/" className="text-white hover:text-cyan-400 transition-colors flex items-center gap-1.5">
              Home
            </Link>
            <Link href="/browse" className="hover:text-cyan-400 transition-colors">
              Movies & Series
            </Link>
            <Link href="/browse" className="hover:text-cyan-400 transition-colors">
              Creators
            </Link>
            {isSignedIn && (
              <Link href="/feed" className="hover:text-cyan-400 transition-colors">
                My Feed
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {isSignedIn ? (
            <>
              <NotificationBell />
              <Link href="/settings">
                <Button
                  size="sm"
                  className="font-bold gap-1.5 rounded-full px-4 text-black bg-white hover:bg-zinc-200 transition-all cursor-pointer shadow-lg"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Account</span>
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-in">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-300 hover:text-white hover:bg-white/10 font-bold cursor-pointer"
                >
                  <LogIn className="h-4 w-4 mr-1.5" />
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button
                  size="sm"
                  className="font-extrabold rounded-full px-5 text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-95 shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer"
                >
                  Join Free
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Cinematic Hero Banner with Video Trailer & Switcher ── */}
      <HeroBanner
        creators={allCreators as any}
        isLoading={creatorsLoading}
        onPlayTrailer={handlePlayTrailer}
      />

      {/* ── Seamless Layered OTT Content Shelves (Smooth Scroll Overlap) ── */}
      <div className="relative z-20 -mt-16 sm:-mt-24 md:-mt-32 space-y-6 pb-20 bg-gradient-to-b from-transparent via-zinc-950 to-black">
        {/* Story Bar */}
        <div className="pt-2">
          <StoryBar
            storyGroups={storyGroups}
            creators={allCreators.slice(0, 12)}
          />
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 md:px-14">
          <FilterBar
            onSearchChange={setSearchQuery}
            onCategoryChange={setCategoryFilter}
            onAccessChange={setAccessFilter}
          />
        </div>

        {/* ── ROW 1: TOP 10 on DropBeynd Today (Matching Reference Screenshot) ── */}
        <ContentRow
          title="Top 10 on DropBeynd Today"
          badge="Top10"
          isTop10Row={true}
          aspect="16/9"
          items={toCreatorItems(topCreators, "16/9")}
          isLoading={creatorsLoading}
          onPlay={handlePlayTrailer}
        />

        {/* ── ROW 2: Trending Blockbusters & Creator Exclusives ── */}
        <ContentRow
          title="Trending Blockbusters & Series"
          badge="Hot"
          aspect="16/9"
          items={toPostItems(filteredPremium, "16/9")}
          isLoading={premiumLoading}
          onPlay={handlePlayTrailer}
        />

        {/* ── ROW 3: Free Streamable Shows & Videos ── */}
        <ContentRow
          title="Watch Free on DropBeynd"
          badge="Free"
          aspect="16/9"
          items={toPostItems(filteredFree, "16/9")}
          isLoading={freeLoading}
          onPlay={handlePlayTrailer}
        />

        {/* ── ROW 4: Masterclasses & Video Courses (Portrait Aspect) ── */}
        <ContentRow
          title="Featured Masterclasses & Courses"
          badge="Premium"
          aspect="2/3"
          items={toCreatorItems(filtered.slice(0, 12), "2/3")}
          isLoading={creatorsLoading}
          onPlay={handlePlayTrailer}
        />

        {/* ── ROW 5: New Creators & Studios ── */}
        <ContentRow
          title="Newly Added Creators"
          badge="New"
          aspect="16/9"
          items={toCreatorItems(filteredNew.slice(0, 15), "16/9")}
          isLoading={newLoading}
          onPlay={handlePlayTrailer}
        />

        {/* CTA Banner for logged-out users */}
        {!isSignedIn && (
          <div className="mx-6 md:mx-14 my-12 p-8 rounded-3xl relative overflow-hidden bg-gradient-to-r from-blue-950/60 via-zinc-900 to-purple-950/60 border border-white/10 shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Sparkles className="h-5 w-5 text-cyan-400" />
                  <span className="text-cyan-400 font-extrabold text-xs tracking-wider uppercase">
                    Unlimited Streaming Access
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Ready to experience the next era of content?
                </h3>
                <p className="text-zinc-400 text-sm max-w-xl">
                  Subscribe to your favorite creators, stream unreleased 4K videos, interact with live masterclasses, and get 1-on-1 access.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <Link href="/sign-up">
                  <Button
                    size="lg"
                    className="h-12 px-8 rounded-full font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 hover:opacity-95 shadow-[0_0_25px_rgba(99,102,241,0.5)] cursor-pointer"
                  >
                    Start Watching Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Fullscreen Theater Video Modal ── */}
      {activeTheaterItem && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 md:p-10 animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl bg-zinc-950 rounded-2xl overflow-hidden border border-white/15 shadow-[0_0_60px_rgba(0,0,0,0.9)]">
            {/* Modal Close button */}
            <button
              onClick={() => setActiveTheaterItem(null)}
              className="absolute top-4 right-4 z-30 h-10 w-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/20 transition-all hover:scale-110 cursor-pointer shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Video Container */}
            <div className="relative aspect-[16/9] w-full bg-black">
              <video
                src={activeTheaterItem.videoUrl}
                autoPlay
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {/* Video Info Bottom Bar */}
            <div className="p-6 bg-zinc-950 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {activeTheaterItem.title}
                  </h3>
                  <p className="text-cyan-400 font-semibold text-xs sm:text-sm">
                    {activeTheaterItem.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300">
                    4K ULTRA HD
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300">
                    U/A 16+
                  </span>
                </div>
              </div>

              {activeTheaterItem.bio && (
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-3xl">
                  {activeTheaterItem.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-10 text-center text-xs text-zinc-500 bg-black">
        <p>© {new Date().getFullYear()} DropBeynd Platform. All streaming content & media rights reserved.</p>
      </footer>
    </div>
  );
}

