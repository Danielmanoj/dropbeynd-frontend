import { useState } from "react";
import { Link } from "wouter";
import { Search, Star, Users, Lock, Compass, BadgeCheck } from "lucide-react";
import { useListCreators } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/back-button";

const NICHES = ["All", "Fitness", "Technology & Coding", "Finance", "Cooking", "Yoga & Wellness", "Art & Design", "Music", "Travel", "Gaming", "Business", "Writing", "Photography"];

function CreatorCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border animate-pulse">
      <div className="h-36 bg-muted" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted -mt-8 ring-2 ring-card" />
          <div className="space-y-1 flex-1">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        </div>
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-3/4 bg-muted rounded" />
        <div className="flex justify-between mt-2">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-8 w-24 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  );
}

function CreatorCard({ creator }: { creator: any }) {
  const price = parseFloat(creator.monthlyPrice ?? "0");
  const initials = creator.name?.slice(0, 2).toUpperCase() ?? "??";
  const coverUrl = creator.coverUrl;
  const avatarUrl = creator.avatarUrl;

  return (
    <Link href={`/creators/${creator.id}`}>
      <div className="group relative rounded-2xl overflow-hidden border border-border bg-card backdrop-blur-sm cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:border-primary/60 hover:shadow-silver-glow">
        <div className="relative h-36 overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={creator.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {creator.isVerified && (
            <div className="absolute top-2 right-2 bg-primary/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 text-primary-foreground text-[10px] font-semibold border border-primary-foreground/20">
              <BadgeCheck className="h-3 w-3" /> Verified
            </div>
          )}
        </div>

        <div className="p-4 pt-0">
          {/* Avatar overlapping the cover */}
          <div className="relative -mt-7 mb-2 flex items-end justify-between">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={creator.name}
                  className="h-14 w-14 rounded-full ring-[3px] ring-card object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-full ring-[3px] ring-card bg-silver-gradient flex items-center justify-center text-black text-sm font-bold">
                  {initials}
                </div>
              )}
            </div>
          </div>
          {/* Name row — fully in the card body, below the avatar */}
          <div className="mb-2 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-foreground font-bold text-sm truncate leading-tight">{creator.name}</h3>
              {creator.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
            </div>
            <p className="text-primary text-xs truncate">{creator.niche ?? "Creator"}</p>
          </div>

          <p className="text-muted-foreground text-xs line-clamp-2 mb-3 leading-relaxed min-h-[2rem]">
            {creator.bio ?? "Premium content creator."}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {(creator.subscriberCount ?? 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {creator.postCount ?? 0} posts
              </span>
            </div>
            <div className="shrink-0">
              {price === 0 ? (
                <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full px-3 py-1 font-medium">Free</span>
              ) : (
                <span className="text-xs bg-accent text-accent-foreground border border-border rounded-full px-3 py-1 font-medium">
                  ${price.toFixed(2)}/mo
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-card/95 backdrop-blur-sm border-t border-border p-4 flex gap-2">
          <div className="flex-1 text-center py-2 bg-primary hover:opacity-90 text-primary-foreground text-xs font-semibold rounded-xl transition-colors">
            View Profile
          </div>
          <div className="flex-1 text-center py-2 bg-accent hover:bg-accent/70 text-accent-foreground text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1">
            {price === 0 ? "" : <Lock className="h-3 w-3" />}
            {price === 0 ? "Follow Free" : "Subscribe"}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Browse() {
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("All");

  const { data, isLoading } = useListCreators(
    { search: search || undefined, niche: niche === "All" ? undefined : niche }
  );

  const creators = data?.creators ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <div className="relative overflow-hidden py-16 px-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/40 via-background to-background pointer-events-none" />
        {/* Back button — top-left, above all layers */}
        <div className="absolute top-4 left-4 z-20">
          <BackButton />
        </div>
        <div className="relative max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-accent border border-border rounded-full px-4 py-1.5 text-accent-foreground text-xs font-medium mb-2">
            <Compass className="h-3.5 w-3.5" />
            Discover Creators
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
            Find Your Next Favorite Creator
          </h1>
          <p className="text-muted-foreground text-lg">Explore premium content from top creators across every niche.</p>

          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search creators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-card border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all text-sm"
            />
          </div>
        </div>
      </div>

      <div className="px-6 max-w-7xl mx-auto">
        <div className="flex gap-2 flex-wrap mb-8">
          {NICHES.map((n) => (
            <button
              key={n}
              onClick={() => setNiche(n)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                niche === n
                  ? "bg-primary border-primary text-primary-foreground shadow-silver-glow"
                  : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">
            {isLoading ? "Loading..." : `${creators.length} creator${creators.length !== 1 ? "s" : ""} found`}
          </h2>
          <span className="text-muted-foreground text-xs">{niche !== "All" ? niche : "All niches"}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <CreatorCardSkeleton key={i} />)
            : creators.map((c: any) => <CreatorCard key={c.id} creator={c} />)
          }
        </div>

        {!isLoading && creators.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <div className="text-5xl">🔍</div>
            <h3 className="text-xl font-bold text-foreground">No creators found</h3>
            <p className="text-muted-foreground">Try a different search term or niche filter.</p>
            <button onClick={() => { setSearch(""); setNiche("All"); }} className="mt-2 px-6 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-full text-sm font-semibold transition-colors">
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
