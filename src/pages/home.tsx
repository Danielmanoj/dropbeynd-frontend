import { useState, useCallback } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Compass, LogIn, User, Crown, Sun, Moon, Search, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HeroBanner } from "@/components/hero-banner";
import { ContentRow } from "@/components/content-row";
import { NotificationBell } from "@/components/notification-bell";
import { useTheme } from "@/components/theme-provider";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const CATEGORIES = [
  "All",
  "Fitness & Health",
  "Technology & Coding",
  "Finance & Investing",
  "Education & Tutoring",
  "Art & Illustration",
  "Music & Audio",
  "Cooking & Food",
  "Travel & Lifestyle",
  "Gaming",
  "Business",
  "Personal Development",
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

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [accessFilter, setAccessFilter] = useState<"all" | "free" | "premium">("all");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

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

  const safeArray = <T,>(val: any): T[] => (Array.isArray(val) ? val : []);

  const filterCreators = useCallback((list: any) => {
    let r = safeArray<CreatorItem>(list);
    if (searchQuery) r = r.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (categoryFilter && categoryFilter !== "All") r = r.filter(c => c.niche?.includes(categoryFilter));
    return r;
  }, [searchQuery, categoryFilter]);

  const filterContent = useCallback((list: any) => {
    let r = safeArray<PostItem>(list);
    if (searchQuery) r = r.filter(p => (p.title ?? p.creatorName ?? "").toLowerCase().includes(searchQuery.toLowerCase()));
    if (categoryFilter && categoryFilter !== "All") r = r.filter(p => p.creatorNiche?.includes(categoryFilter));
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

  const toCreatorItems = (list: CreatorItem[]) =>
    list.map(c => ({
      id: c.id,
      type: "creator" as const,
      title: c.name,
      subtitle: c.niche,
      avatarUrl: c.avatarUrl,
      thumbnailUrl: c.coverUrl,
      niche: c.niche,
      price: c.monthlyPrice,
      subscriberCount: c.subscriberCount,
      href: `/creators/${c.id}`,
    }));

  const toPostItems = (list: PostItem[]) =>
    list.map(p => ({
      id: p.id,
      type: "post" as const,
      title: p.title ?? p.creatorName,
      subtitle: p.creatorName,
      thumbnailUrl: p.mediaUrl,
      avatarUrl: p.creatorAvatarUrl,
      isLocked: p.isLocked,
      niche: p.creatorNiche,
      href: `/creators/${p.creatorId}`,
    }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── iPhone Liquid Glass Floating Navbar ── */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-4xl">
        <div
          className="flex items-center justify-between px-5 md:px-7 py-2.5 rounded-full border border-white/25 dark:border-white/15 bg-background/60 dark:bg-black/45 backdrop-blur-2xl backdrop-saturate-200 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5),inset_0_1px_2px_0_rgba(255,255,255,0.4)] transition-all duration-300"
        >
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2.5 font-extrabold text-base md:text-lg text-foreground cursor-pointer group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg text-black bg-silver-gradient shadow-silver-glow group-hover:scale-105 transition-transform">
                <Compass className="h-4 w-4" />
              </div>
              <span className="tracking-tight font-bold text-foreground">DropBeynd</span>
            </div>
          </Link>

          {/* Clean Nav Links: Home, Search, Feed */}
          <nav className="flex items-center gap-5 md:gap-7 text-sm font-medium">
            <Link href="/" className="text-foreground font-semibold hover:text-primary transition-colors">
              Home
            </Link>
            <Link href="/browse" className="text-muted-foreground hover:text-foreground transition-colors">
              Search
            </Link>
            <Link href="/feed" className="text-muted-foreground hover:text-foreground transition-colors">
              Feed
            </Link>
          </nav>

          {/* Right Controls / Clean Liquid CTA */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>

            {isSignedIn ? (
              <>
                <NotificationBell />
                <Link href="/settings">
                  <Button
                    size="sm"
                    className="font-semibold gap-1.5 rounded-full px-4 h-8 text-xs text-black bg-silver-gradient shadow-sm hover:opacity-90 transition-opacity"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Profile</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground gap-1.5 h-8 text-xs rounded-full">
                    <LogIn className="h-3.5 w-3.5" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button
                    size="sm"
                    className="font-semibold rounded-full px-4 h-8 text-xs text-black bg-silver-gradient shadow-sm hover:opacity-90 transition-opacity"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Viewport-Anchored Hero Visual Layer ── */}
      <div className="relative w-full z-0 overflow-hidden">
        <HeroBanner creators={allCreators} isLoading={creatorsLoading} />
      </div>

      {/* ── Continuous Rising Content Surface ── */}
      <div className="relative z-10 -mt-10 md:-mt-18 bg-background rounded-t-[28px] md:rounded-t-[36px] border-t border-border/40 shadow-[0_-25px_50px_rgba(0,0,0,0.6)] space-y-7 pt-6 pb-12">
        {/* Category Pills Strip */}
        <div className="px-4 md:px-8 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              className={`flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all border ${
                (categoryFilter === cat || (!categoryFilter && cat === "All"))
                  ? "bg-silver-gradient text-black font-bold border-transparent shadow-sm"
                  : "bg-card/70 text-muted-foreground border-border/60 hover:text-foreground hover:bg-card"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>


        {!isSignedIn && (
          <div
            className="mx-4 md:mx-8 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-accent/30 border border-border backdrop-blur-md"
          >
            <div>
              <p className="text-foreground font-semibold">Unlock the full experience</p>
              <p className="text-muted-foreground text-sm">Sign in to subscribe, save content, and get personalized recommendations.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link href="/sign-in">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-foreground hover:bg-accent border-border"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button
                  size="sm"
                  className="font-semibold text-black bg-silver-gradient"
                >
                  Join Free
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Top Creators Section ── */}
        {(creatorsLoading || topCreators.length > 0) && (
          <div className="px-4 md:px-8">
            <div className="flex items-center gap-3 mb-5">
              <Crown className="h-5 w-5 text-yellow-500" />
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">Top Creators</h2>
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-bold">#1 Ranked</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
              {creatorsLoading
                ? [1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex-none w-44 snap-start rounded-2xl p-4 space-y-3 animate-pulse bg-card border border-border">
                      <div className="h-14 w-14 rounded-full mx-auto bg-muted" />
                      <div className="h-3 rounded w-24 mx-auto bg-muted" />
                      <div className="h-2.5 rounded w-16 mx-auto bg-muted" />
                    </div>
                  ))
                : topCreators.map((creator, idx) => {
                    const ringGradient = idx === 0
                      ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                      : idx === 1
                      ? "linear-gradient(135deg, #e5e5e5, #a0a0a0)"
                      : idx === 2
                      ? "linear-gradient(135deg, #d97706, #b45309)"
                      : "linear-gradient(135deg, #909090, #606060)";
                    const badgeBg = idx === 0 ? "#fbbf24" : idx === 1 ? "#d4d4d4" : idx === 2 ? "#b45309" : "#707070";
                    const badgeColor = idx <= 2 ? "#000" : "#fff";
                    return (
                      <Link key={creator.id} href={`/creators/${creator.id}`}>
                        <div
                          className="flex-none w-44 snap-start cursor-pointer group rounded-2xl p-4 flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-0.5 bg-card border border-border hover:border-primary/50 hover:shadow-silver-glow"
                        >
                          <div className="relative mb-3">
                            <div className="p-0.5 rounded-full" style={{ background: ringGradient }}>
                              <Avatar className="h-14 w-14 rounded-full border-2 border-background">
                                <AvatarImage src={creator.avatarUrl || undefined} alt={creator.name} className="rounded-full" />
                                <AvatarFallback className="font-bold text-lg rounded-full bg-muted text-muted-foreground">
                                  {creator.name[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <span
                              className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs font-extrabold border-2 border-background"
                              style={{ background: badgeBg, color: badgeColor }}
                            >
                              {idx + 1}
                            </span>
                          </div>

                          <p className="text-foreground font-bold text-sm truncate w-full">{creator.name}</p>
                          {creator.niche && <p className="text-muted-foreground text-xs truncate w-full mt-0.5">{creator.niche}</p>}

                          <div className="mt-2 flex items-center gap-1 text-muted-foreground text-xs">
                            <span className="font-semibold text-foreground">{creator.subscriberCount.toLocaleString()}</span>
                            <span>subs</span>
                          </div>

                          <div className="mt-3 w-full">
                            <span
                              className="block text-xs font-bold rounded-lg py-1.5 transition-all text-muted-foreground bg-muted border border-border hover:bg-accent"
                            >
                              ${creator.monthlyPrice}/mo
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
              }
            </div>
          </div>
        )}

        <ContentRow
          title="Trending Creators"
          badge="Hot"
          items={toCreatorItems(trending)}
          isLoading={creatorsLoading}
        />

        <ContentRow
          title="Free Content"
          badge="Free"
          items={toPostItems(filteredFree)}
          isLoading={freeLoading}
        />

        <ContentRow
          title="Popular This Week"
          items={toCreatorItems(filtered.slice(0, 15))}
          isLoading={creatorsLoading}
        />

        <ContentRow
          title="Premium Content"
          badge="Premium"
          items={toPostItems(filteredPremium)}
          isLoading={premiumLoading}
        />

        <ContentRow
          title="New Creators"
          badge="New"
          items={toCreatorItems(filteredNew.slice(0, 15))}
          isLoading={newLoading}
        />

        {!isSignedIn && (
          <div className="mx-4 md:mx-8 py-16 text-center">
            <h2 className="text-3xl font-extrabold text-foreground mb-3">Ready to dive in?</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Create your free account to subscribe to creators, comment, and unlock premium content.</p>
            <Link href="/sign-up">
              <Button
                size="lg"
                className="font-bold px-8 rounded-full text-black bg-silver-gradient shadow-silver-glow"
              >
                Start for Free
              </Button>
            </Link>
          </div>
        )}
      </div>

      <footer className="border-t py-8 text-center text-sm border-border text-muted-foreground">
        <p>© {new Date().getFullYear()} DropBeynd. All rights reserved.</p>
      </footer>
    </div>
  );
}
