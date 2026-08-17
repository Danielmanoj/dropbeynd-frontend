import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import {
  Lock, Play, Pause, Volume2, VolumeX, Maximize2,
  Image as ImageIcon, Compass, MoreHorizontal, Verified,
  Eye, TrendingUp, Sparkles, Search, X
} from "lucide-react";
import { useGetFeed, getGetFeedQueryKey, useBookmarkPost } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PostInteractions } from "@/components/post-interactions";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
      <div className="p-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-muted shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-36 bg-muted rounded-full" />
          <div className="h-2.5 w-24 bg-muted rounded-full" />
        </div>
        <div className="h-7 w-7 rounded-full bg-muted" />
      </div>
      <div className="h-72 w-full bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-2/3 bg-muted rounded-full" />
        <div className="h-3 w-full bg-muted rounded-full" />
        <div className="h-3 w-4/5 bg-muted rounded-full" />
        <div className="h-3 w-3/5 bg-muted rounded-full" />
      </div>
    </div>
  );
}

// ─── Video Player ──────────────────────────────────────────────────────────────

function VideoPlayer({ src, poster, isLocked }: { src: string; poster?: string; isLocked?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hovered, setHovered] = useState(false);
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

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  }, []);

  // Intercept native media error at capture phase so Vite's error overlay never sees it
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handler = (e: Event) => { e.stopImmediatePropagation(); setErrored(true); };
    v.addEventListener("error", handler, true);
    return () => v.removeEventListener("error", handler, true);
  }, []);

  if (errored) {
    return (
      <div className="relative bg-muted/30 flex items-center justify-center" style={{ aspectRatio: "16/9" }}>
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-full bg-muted border border-border flex items-center justify-center mx-auto">
            <Play className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-xs">Video unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative bg-black overflow-hidden cursor-pointer group"
      style={{ aspectRatio: "16/9" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
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

      {/* Loading placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-border border-t-primary animate-spin" />
        </div>
      )}

      {/* AI Generated badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm border border-primary/30">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-primary-foreground text-[10px] font-bold uppercase tracking-wider">AI Video</span>
      </div>

      {/* Controls overlay */}
      <div className={`absolute inset-0 flex flex-col justify-between p-3 transition-opacity duration-200 ${hovered || !playing ? "opacity-100" : "opacity-0"}`}>
        {/* Top row - mute */}
        <div className="flex justify-end">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Center play button */}
        <div className="flex-1 flex items-center justify-center">
          <div className={`p-4 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 transition-all duration-200 ${playing ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}>
            <Play className="h-8 w-8 text-white fill-white" />
          </div>
        </div>

        {/* Bottom progress */}
        <div
          className="h-1 bg-white/20 rounded-full cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Hashtag extractor ─────────────────────────────────────────────────────────

function extractHashtags(text: string): { clean: string; tags: string[] } {
  const tags: string[] = [];
  const clean = text.replace(/#(\w+)/g, (_, tag) => {
    tags.push(tag);
    return "";
  }).trim();
  return { clean, tags };
}

function getPostTags(niche: string | null): string[] {
  if (!niche) return [];
  const tagMap: Record<string, string[]> = {
    "Fitness":     ["fitness", "workout", "health"],
    "Technology":  ["tech", "coding", "dev"],
    "Finance":     ["finance", "investing", "money"],
    "Cooking":     ["foodie", "recipes", "chef"],
    "Yoga":        ["yoga", "mindfulness", "wellness"],
    "Art":         ["art", "creative", "design"],
    "Music":       ["music", "production", "beats"],
    "Travel":      ["travel", "adventure", "explore"],
    "Gaming":      ["gaming", "esports", "gamers"],
    "Business":    ["startup", "marketing", "growth"],
    "Photography": ["photography", "photo", "visual"],
    "Writing":     ["writing", "storytelling", "author"],
    "Education":   ["education", "learning", "study"],
    "Language":    ["language", "polyglot", "fluency"],
  };
  const key = Object.keys(tagMap).find(k => niche.includes(k));
  return key ? tagMap[key] : ["creator", "content"];
}

// ─── Post Card ─────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: any;
  isBookmarked: boolean;
  onBookmarkChange: (saved: boolean) => void;
}

function PostCard({ post, isBookmarked, onBookmarkChange }: PostCardProps) {
  const isLocked = post.isLocked;
  const canAccess = !isLocked || !!post.body || !!post.mediaUrl;
  const hasVideo = post.mediaType === "video" && post.mediaUrl;
  const hasImage = post.mediaType === "image" && post.mediaUrl;
  const hasMedia = hasVideo || hasImage || (post.mediaType && post.mediaType !== "none");
  const thumb = (post as any).thumbnailUrl as string | null | undefined;
  const niche = (post as any).creatorNiche as string | null | undefined;
  const tags = getPostTags(niche ?? null);
  const viewCount = post.viewsCount != null ? Number(post.viewsCount).toLocaleString() : "0";
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const priceDisplay = post.creatorMonthlyPrice != null
    ? Number(post.creatorMonthlyPrice).toFixed(2).replace(/\.00$/, "")
    : "9.99";

  useEffect(() => {
    fetch(`${BASE}/api/content/posts/${post.id}/view`, { method: "POST", credentials: "include" }).catch(() => {});
  }, [post.id]);

  return (
    <article className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/50 transition-all duration-200 hover:shadow-md">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <Link href={`/creators/${post.creatorId}`}>
            <div className="relative">
              <div className="p-0.5 rounded-full bg-silver-gradient shadow-silver-glow">
                <Avatar className="h-10 w-10 cursor-pointer border-2 border-background">
                  <AvatarImage src={post.creatorAvatarUrl || undefined} alt={post.creatorName} />
                  <AvatarFallback className="bg-muted text-muted-foreground font-bold text-sm">
                    {post.creatorName ? post.creatorName[0].toUpperCase() : "C"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background" />
            </div>
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <Link href={`/creators/${post.creatorId}`}
                className="font-bold text-sm text-foreground hover:text-primary transition-colors">
                {post.creatorName}
              </Link>
              <Verified className="h-3.5 w-3.5 text-primary fill-primary" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-muted-foreground text-xs">{timeAgo}</span>
              {niche && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-muted-foreground text-xs">{niche.split("&")[0].trim()}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLocked && !canAccess && (
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] gap-1 px-1.5 py-0.5">
              <Lock className="h-2.5 w-2.5" /> Premium
            </Badge>
          )}
          <button className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Title ── */}
      {post.title && (
        <div className="px-4 pb-2">
          <h3 className="font-bold text-base text-foreground leading-snug">{post.title}</h3>
        </div>
      )}

      {/* ── Body ── */}
      {post.body && (
        <div className="px-4 pb-3">
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap line-clamp-3">{post.body}</p>
        </div>
      )}
      {isLocked && !canAccess && !post.body && (
        <div className="px-4 pb-3">
          <p className="text-muted-foreground/60 text-sm italic">🔒 Premium content — subscribe to read</p>
        </div>
      )}

      {/* ── Tags ── */}
      {tags.length > 0 && (
        <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
          {tags.map(t => (
            <span key={t} className="text-primary text-xs font-medium hover:underline cursor-pointer">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* ── Media ── */}
      {hasMedia && (
        <div className="relative overflow-hidden border-t border-b border-border">
          {isLocked && !canAccess ? (
            /* Locked premium preview */
            <div className="relative" style={{ aspectRatio: "16/9" }}>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: thumb
                    ? `url(${thumb})`
                    : `linear-gradient(135deg, #c0c0c0, #a0a0a0)`,
                  filter: "blur(20px) brightness(0.5)",
                  transform: "scale(1.08)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="p-4 rounded-2xl bg-card/80 border border-border backdrop-blur-sm">
                  {post.mediaType === "video"
                    ? <Play className="h-10 w-10 text-muted-foreground fill-muted-foreground" />
                    : <ImageIcon className="h-10 w-10 text-muted-foreground" />}
                </div>
                <div className="text-center space-y-1">
                  <p className="text-foreground font-bold">
                    {post.mediaType === "video" ? "Premium Video" : "Premium Image"}
                  </p>
                  <p className="text-muted-foreground text-sm">Subscribe to unlock exclusive content</p>
                </div>
                <Link href={`/creators/${post.creatorId}`}>
                  <Button size="sm"
                    className="bg-primary hover:opacity-90 text-primary-foreground font-bold rounded-full px-6 gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Unlock for ${priceDisplay}/mo
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {hasVideo && (
                <VideoPlayer
                  src={post.mediaUrl!}
                  poster={thumb ?? undefined}
                  isLocked={isLocked}
                />
              )}
              {hasImage && !hasVideo && (
                <div className="relative">
                  <img
                    src={post.mediaUrl!}
                    alt={post.title ?? "Post image"}
                    className="w-full max-h-[520px] object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── View count row ── */}
      <div className="px-4 pt-2 flex items-center gap-3">
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <Eye className="h-3 w-3" />
          <span>{viewCount} views</span>
        </div>
        {post.mediaType === "video" && (
          <div className="flex items-center gap-1 text-primary/60 text-xs font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>Trending</span>
          </div>
        )}
      </div>

      {/* ── Interactions ── */}
      <div className="px-4 pb-4">
        <PostInteractions
          postId={post.id}
          creatorId={post.creatorId}
          isBookmarked={isBookmarked}
          isLocked={isLocked}
          canAccess={canAccess}
          onBookmarkChange={onBookmarkChange}
        />
      </div>
    </article>
  );
}

// ─── Main Feed Page ────────────────────────────────────────────────────────────

export default function Feed() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: posts, isLoading } = useGetFeed();
  const bookmarkPost = useBookmarkPost();

  const [bookmarkStates, setBookmarkStates] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  function handleBookmarkChange(postId: string, saved: boolean) {
    setBookmarkStates(s => ({ ...s, [postId]: saved }));
    queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
  }

  const filteredPosts = (posts ?? []).filter((post: any) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      post.title?.toLowerCase().includes(q) ||
      post.body?.toLowerCase().includes(q) ||
      post.creatorName?.toLowerCase().includes(q)
    );
  });

  const searchBar = (
    <div className="relative mb-5">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search posts, creators..."
        className="w-full bg-card border border-border rounded-full pl-10 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
      />
      {search && (
        <button
          onClick={() => setSearch("")}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-5 py-6 px-4 bg-background">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-32 bg-muted rounded-full animate-pulse" />
        </div>
        {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 space-y-5 px-4 bg-background">
        <div className="h-20 w-20 rounded-full bg-muted border border-border flex items-center justify-center mx-auto">
          <Compass className="h-9 w-9 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Your feed is empty</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">Subscribe to creators to see their latest posts, videos, and exclusive content here.</p>
        </div>
        <Link href="/browse">
          <Button className="bg-primary hover:opacity-90 text-primary-foreground rounded-full px-8 font-bold gap-2 mt-2">
            <Compass className="h-4 w-4" /> Browse Creators
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-16 py-4 px-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Feed</h1>
        <span className="text-muted-foreground text-sm">{filteredPosts.length} posts</span>
      </div>

      {searchBar}

      {filteredPosts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Search className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">No posts match "{search}"</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredPosts.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              isBookmarked={bookmarkStates[post.id] ?? post.isBookmarked ?? false}
              onBookmarkChange={(saved) => handleBookmarkChange(post.id, saved)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
