import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  FileText, Lock, Play, Pause, Volume2, VolumeX, BookOpen, ShieldCheck,
  Bell, BellOff, Zap, Crown, Sparkles,
} from "lucide-react";
import {
  useGetCreator,
  useGetCreatorPosts,
  useGetCreatorCourses,
  useGetSubscriptionStatus,
  useGetMe,
} from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@clerk/react";
import { PostInteractions } from "@/components/post-interactions";
import { BackButton } from "@/components/back-button";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-background/60 border border-border/60 backdrop-blur-sm min-w-[80px]">
      <span className="text-foreground font-bold text-xl leading-none">{value}</span>
      <span className="text-muted-foreground text-xs mt-1">{label}</span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  creatorId,
  onFollow,
  following,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  creatorId: string;
  onFollow: () => void;
  following: boolean;
}) {
  const { isSignedIn } = useAuth();
  return (
    <div className="flex flex-col items-center py-16 text-center bg-card/60 border border-border rounded-2xl">
      <div className="text-5xl mb-4">🚀</div>
      <h3 className="text-foreground font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">{desc}</p>
      <div className="flex gap-3">
        {isSignedIn ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onFollow}
            className={`rounded-xl gap-2 ${following
              ? "border-violet-500/50 text-violet-600 dark:text-violet-400 bg-violet-500/10"
              : "border-border text-muted-foreground hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400"
            }`}
          >
            {following ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {following ? "Following" : "Follow for updates"}
          </Button>
        ) : (
          <Link href="/sign-up">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 rounded-xl gap-2">
              <Bell className="h-4 w-4" /> Sign up for updates
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function ProfileVideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handler = (e: Event) => { e.stopImmediatePropagation(); setErrored(true); };
    v.addEventListener("error", handler, true);
    return () => v.removeEventListener("error", handler, true);
  }, []);

  if (errored) {
    return (
      <div className="relative bg-muted flex items-center justify-center" style={{ aspectRatio: "16/9" }}>
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-full bg-card border border-border flex items-center justify-center mx-auto">
            <Play className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-xs">Video unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative bg-black cursor-pointer group"
      style={{ aspectRatio: "16/9" }}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedData={() => setLoaded(true)}
        onEnded={() => setPlaying(false)}
        onError={(e) => { e.stopPropagation(); setErrored(true); }}
        className="w-full h-full object-cover"
        style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.3s" }}
      />
      {!loaded && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}
      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/70 border border-violet-500/30">
        <Sparkles className="h-2.5 w-2.5 text-violet-400" />
        <span className="text-violet-300 text-[10px] font-bold uppercase tracking-wider">Video</span>
      </div>
      <div className={`absolute inset-0 flex flex-col justify-between p-3 transition-opacity duration-200 ${playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
        <div className="flex justify-end">
          <button onClick={toggleMute}
            className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
            {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {!playing && (
            <div className="p-3.5 rounded-full bg-black/50 border border-white/20">
              <Play className="h-7 w-7 text-white fill-white" />
            </div>
          )}
        </div>
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${progress}%`, transition: "width 0.1s linear" }} />
        </div>
      </div>
    </div>
  );
}

function PremiumPostBlur({
  title,
  body,
  price,
  onSubscribe,
  isPending,
  isSignedIn,
}: {
  title?: string | null;
  body?: string | null;
  price: number;
  onSubscribe: () => void;
  isPending: boolean;
  isSignedIn: boolean;
}) {
  const preview = body?.slice(0, 180) ?? "Unlock this exclusive post and get access to all premium content from this creator.";
  return (
    <div className="relative overflow-hidden rounded-xl min-h-[200px] bg-card/60 border border-border">
      {body && (
        <div className="select-none pointer-events-none px-4 pt-4" aria-hidden="true">
          <p className="text-muted-foreground leading-relaxed text-sm blur-[6px] line-clamp-3">{preview}…</p>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/75 to-background/98 flex flex-col items-center justify-center gap-3 text-center px-6 py-8">
        <div className="p-3 rounded-2xl bg-violet-600/15 border border-violet-500/25 shadow-lg shadow-violet-900/20">
          <Lock className="h-7 w-7 text-violet-500" />
        </div>
        <div>
          <p className="text-foreground font-bold text-base mb-1">Premium Content</p>
          <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
            Subscribe to unlock this post and all exclusive content from this creator.
          </p>
        </div>
        {isSignedIn ? (
          <Button
            size="sm"
            onClick={onSubscribe}
            disabled={isPending}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl px-6 gap-1.5 shadow-lg shadow-violet-900/40 mt-1"
          >
            <Zap className="h-4 w-4" />
            {isPending ? "Processing…" : `Subscribe · $${price}/mo`}
          </Button>
        ) : (
          <Link href="/sign-in">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl px-6 mt-1">
              Sign In to Subscribe
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function CreatorProfile() {
  const params = useParams();
  const creatorId = params.creatorId as string;
  const { isSignedIn } = useAuth();

  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: creator, isLoading: creatorLoading } = useGetCreator(creatorId, {
    query: { enabled: !!creatorId } as any,
  });
  const { data: me } = useGetMe({ query: { enabled: !!isSignedIn } as any });
  const { data: posts, isLoading: postsLoading } = useGetCreatorPosts(creatorId, undefined, { query: { enabled: !!creatorId } as any });
  const { data: courses, isLoading: coursesLoading } = useGetCreatorCourses(creatorId, { query: { enabled: !!creatorId } as any });
  const { data: subStatus } = useGetSubscriptionStatus(creatorId, { query: { enabled: !!creatorId && isSignedIn === true } as any });
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("subscribed=1")) {
      queryClient.invalidateQueries({ queryKey: ["/api/creators", creatorId, "subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/creators", creatorId, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/creators", creatorId, "courses"] });
    }
  }, [creatorId, queryClient]);

  const isOwner = Boolean(isSignedIn && me && creator && (creator.userId === me.id || creator.id === (me as any).creatorId));
  const isSubscribed = isOwner || subStatus?.status === "active";

  useEffect(() => {
    if (!creator) return;
    fetch(`${BASE}/api/creators/${creatorId}/follow-status`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setFollowing(d.following); setFollowerCount(d.followerCount); }
      })
      .catch(() => {});
  }, [creator, creatorId]);

  const handleSubscribe = () => {
    if (!isSignedIn) {
      setLocation("/sign-in");
      return;
    }
    setLocation(`/payments?subscribe=${creatorId}`);
  };

  async function toggleFollow() {
    if (!isSignedIn) return;
    const method = following ? "DELETE" : "POST";
    const r = await fetch(`${BASE}/api/creators/${creatorId}/follow`, { method, credentials: "include" });
    if (r.ok) {
      const d = await r.json();
      setFollowing(d.following);
      setFollowerCount(prev => following ? prev - 1 : prev + 1);
    }
  }

  useEffect(() => {
    const el = profileRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [creator]);

  if (creatorLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-64 w-full rounded-none" />
        <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-10 space-y-6">
          <div className="flex gap-6">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="pt-16 space-y-3 flex-1">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Creator not found</p>
          <Link href="/browse"><Button className="mt-4">Browse Creators</Button></Link>
        </div>
      </div>
    );
  }

  const NICHE_GRADIENT: Record<string, string> = {
    "Fitness": "from-orange-600 to-red-700",
    "Technology": "from-blue-600 to-cyan-700",
    "Finance": "from-emerald-600 to-teal-700",
    "Education": "from-violet-600 to-purple-700",
    "Art": "from-pink-600 to-rose-700",
    "Music": "from-indigo-600 to-blue-700",
    "Cooking": "from-amber-600 to-orange-700",
    "Travel": "from-sky-600 to-blue-700",
    default: "from-violet-700 to-purple-900",
  };
  const gradientKey = Object.keys(NICHE_GRADIENT).find(k => creator.niche?.includes(k)) ?? "default";
  const coverGradient = NICHE_GRADIENT[gradientKey];

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ── Sticky mini-header ── */}
      <div className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${stickyVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}>
        <div className="bg-background/90 backdrop-blur-xl border-b border-border/80 shadow-lg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 border border-border shrink-0">
                <AvatarImage src={creator.avatarUrl || undefined} alt={creator.name} />
                <AvatarFallback className="text-sm bg-violet-600 text-white font-bold">
                  {creator.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground font-bold text-sm truncate">{creator.name}</span>
                  {creator.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-violet-500 shrink-0" />}
                </div>
                {creator.niche && <p className="text-muted-foreground text-xs truncate">{creator.niche}</p>}
              </div>
            </div>
            {isOwner ? (
              <Link href="/creator/profile">
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5 shrink-0">
                  Edit Profile
                </Button>
              </Link>
            ) : !isSubscribed ? (
              <Button
                size="sm"
                onClick={handleSubscribe}
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl shrink-0 gap-1.5 shadow-md shadow-violet-900/40"
              >
                <Zap className="h-3.5 w-3.5" />
                {isSignedIn ? `$${creator.monthlyPrice}/mo` : "Sign in"}
              </Button>
            ) : (
              <span className="text-emerald-500 text-xs font-semibold flex items-center gap-1">
                ✓ Subscribed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Back button */}
      <BackButton />

      {/* Cover Banner */}
      <div className="relative h-56 md:h-72 w-full overflow-hidden">
        {creator.coverUrl ? (
          <img src={creator.coverUrl} alt="Cover" className="w-full h-full object-cover" style={{ filter: "brightness(0.75)" }} />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${coverGradient}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      {/* Profile Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6" ref={profileRef}>
        <div className="relative -mt-20 flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="relative z-10">
            <div className="p-1 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 shadow-2xl">
              <Avatar className="h-32 w-32 md:h-36 md:w-36 border-4 border-background rounded-full">
                <AvatarImage src={creator.avatarUrl || undefined} alt={creator.name} className="rounded-full" />
                <AvatarFallback className="text-4xl bg-violet-600 text-white font-extrabold rounded-full">
                  {creator.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Info + Actions */}
          <div className="flex-1 pt-2 md:pt-10 flex flex-col md:flex-row justify-between gap-4 w-full">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">{creator.name}</h1>
                {creator.isVerified && <ShieldCheck className="h-5 w-5 text-violet-500" />}
                {creator.subscriberCount >= 1000 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-xs font-bold">
                    <Crown className="h-3 w-3" /> Top Creator
                  </span>
                )}
                {creator.niche && (
                  <Badge className="bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/40 text-xs">
                    {creator.niche}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <StatPill value={creator.subscriberCount?.toLocaleString() ?? 0} label="Subscribers" />
                <StatPill value={followerCount.toLocaleString()} label="Followers" />
                <StatPill value={creator.postCount ?? 0} label="Posts" />
                <StatPill value={creator.courseCount ?? 0} label="Courses" />
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
              {isOwner ? (
                <Link href="/creator/profile">
                  <Button size="lg" className="bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-900/40 rounded-xl px-6 gap-1.5">
                    Edit Profile
                  </Button>
                </Link>
              ) : !isSubscribed ? (
                <Button
                  size="lg"
                  onClick={handleSubscribe}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-900/40 rounded-xl px-6 gap-1.5"
                >
                  <Zap className="h-5 w-5" />
                  {isSignedIn ? `Subscribe · $${creator.monthlyPrice}/mo` : "Sign in to Subscribe"}
                </Button>
              ) : (
                <Button size="lg" className="bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 rounded-xl pointer-events-none">
                  ✓ Subscribed
                </Button>
              )}
              {isSignedIn && !isOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleFollow}
                  className={`rounded-xl border gap-1.5 ${following
                    ? "border-violet-500/50 text-violet-600 dark:text-violet-400 bg-violet-500/10"
                    : "border-border text-muted-foreground hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400"
                  }`}
                >
                  {following ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  {following ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {creator.bio && (
          <p className="mt-6 text-foreground/80 text-base leading-relaxed max-w-2xl border-l-2 border-violet-500/50 pl-4">
            {creator.bio}
          </p>
        )}

        {/* Tabs */}
        <Tabs defaultValue="posts" className="mt-10">
          <TabsList className="bg-card border border-border h-11 rounded-xl p-1 w-auto inline-flex gap-1">
            <TabsTrigger value="posts" className="rounded-lg text-sm data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-none text-muted-foreground gap-1.5">
              <FileText className="h-4 w-4" /> Posts {creator.postCount ? `(${creator.postCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="courses" className="rounded-lg text-sm data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-none text-muted-foreground gap-1.5">
              <BookOpen className="h-4 w-4" /> Courses {creator.courseCount ? `(${creator.courseCount})` : ""}
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-6 space-y-5">
            {postsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-52 w-full rounded-2xl" />)}
              </div>
            ) : !posts?.length ? (
              <EmptyState
                icon={FileText}
                title="This creator is just getting started 🚀"
                desc="No posts yet — but great things are coming. Follow to be the first to know when they publish."
                creatorId={creatorId}
                onFollow={toggleFollow}
                following={following}
              />
            ) : (
              posts.map(post => (
                <div
                  key={post.id}
                  className="group relative bg-card border border-border hover:border-border/70 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/40"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />

                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        {post.title && (
                          <h3 className="text-lg font-bold text-foreground leading-snug mb-1">{post.title}</h3>
                        )}
                        <p className="text-muted-foreground text-xs">{format(new Date(post.createdAt), "MMM d, yyyy")}</p>
                      </div>
                      {post.isLocked && (
                        <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 flex-shrink-0">
                          <Lock className="h-3 w-3" /> Premium
                        </span>
                      )}
                    </div>

                    {post.isLocked && !isSubscribed ? (
                      <PremiumPostBlur
                        title={post.title}
                        body={post.body}
                        price={creator.monthlyPrice}
                        onSubscribe={handleSubscribe}
                        isPending={checkout.isPending}
                        isSignedIn={!!isSignedIn}
                      />
                    ) : (
                      <>
                        {post.body && <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap mb-4">{post.body}</p>}
                        {post.mediaUrl && post.mediaType !== "none" && (
                          <div className="mt-3 rounded-xl overflow-hidden border border-border">
                            {post.mediaType === "image" && (
                              <img src={post.mediaUrl} alt="Post" className="w-full h-auto max-h-96 object-cover" loading="lazy" />
                            )}
                            {post.mediaType === "video" && (
                              <ProfileVideoPlayer src={post.mediaUrl} />
                            )}
                          </div>
                        )}
                        <div className="mt-4">
                          <PostInteractions postId={post.id} creatorId={creatorId} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="mt-6">
            {coursesLoading ? (
              <div className="grid md:grid-cols-2 gap-5">
                {[1, 2].map(i => <Skeleton key={i} className="h-80 rounded-2xl" />)}
              </div>
            ) : !courses?.length ? (
              <EmptyState
                icon={BookOpen}
                title="No courses yet — stay tuned! 🎓"
                desc="This creator is working on something great. Follow them to get notified when their first course drops."
                creatorId={creatorId}
                onFollow={toggleFollow}
                following={following}
              />
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {courses.map(course => (
                  <div
                    key={course.id}
                    className="group bg-card border border-border hover:border-border/70 rounded-2xl overflow-hidden flex flex-col transition-all hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/40"
                  >
                    <div className="relative h-44 overflow-hidden">
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${coverGradient} flex items-center justify-center`}>
                          <BookOpen className="h-12 w-12 text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {!isSubscribed && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/70 backdrop-blur text-xs font-bold px-2 py-1 rounded-lg border border-white/10 text-yellow-400">
                          <Lock className="h-3 w-3" /> Premium
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-foreground font-bold text-base line-clamp-2 mb-2">{course.title}</h3>
                      {course.description && (
                        <p className="text-muted-foreground text-sm line-clamp-2 flex-1">{course.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-4 text-muted-foreground text-sm">
                        <Play className="h-4 w-4" />
                        <span>{course.lessonCount ?? 0} Lessons</span>
                      </div>
                      <div className="mt-4">
                        {isSubscribed ? (
                          <Link href={`/courses/${course.id}`}>
                            <Button className="w-full bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold">
                              <Play className="h-4 w-4 mr-2" /> Start Course
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={handleSubscribe}
                            disabled={!isSignedIn}
                            className="w-full border-border text-muted-foreground hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 rounded-xl gap-2"
                          >
                            <Zap className="h-4 w-4" />
                            {isSignedIn ? "Subscribe to Unlock" : "Sign In to Subscribe"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Sticky Subscribe Bar (floating bottom) ── */}
      {!isSubscribed && stickyVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
          <div className="pointer-events-auto">
            <div className="bg-background/95 backdrop-blur-xl border-t border-border shadow-2xl">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-foreground font-bold text-sm truncate">{creator.name}</p>
                  <p className="text-muted-foreground text-xs">Unlock all premium content and courses</p>
                </div>
                <Button
                  size="lg"
                  onClick={handleSubscribe}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl gap-2 shadow-lg shadow-violet-900/50 shrink-0 px-6"
                >
                  <Zap className="h-5 w-5" />
                  {isSignedIn ? `Subscribe for $${creator.monthlyPrice}/mo` : "Sign in to Subscribe"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
