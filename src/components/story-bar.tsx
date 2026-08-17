import { Link } from "wouter";
import { Plus } from "lucide-react";
import { useAuth } from "@clerk/react";

interface StoryGroup {
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string | null;
  stories: Array<{ id: string; mediaUrl: string }>;
}

interface StoryBarProps {
  storyGroups?: StoryGroup[];
  creators?: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
  }>;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function AvatarCircle({ name, url, size = "md" }: { name: string; url: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-14 w-14" : "h-16 w-16";
  if (url) {
    return <img src={url} alt={name} className={`${dim} rounded-full object-cover`} />;
  }
  const colors = ["bg-violet-600", "bg-blue-600", "bg-emerald-600", "bg-orange-600", "bg-pink-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`${dim} rounded-full ${color} flex items-center justify-center text-white font-bold text-sm`}>
      {getInitials(name)}
    </div>
  );
}

export function StoryBar({ storyGroups = [], creators = [] }: StoryBarProps) {
  const { isSignedIn } = useAuth();

  const displayItems = storyGroups.length > 0
    ? storyGroups
    : creators.slice(0, 12).map(c => ({
        creatorId: c.id,
        creatorName: c.name,
        creatorAvatarUrl: c.avatarUrl,
        stories: [],
      }));

  if (displayItems.length === 0) return null;

  return (
    <div className="px-4 md:px-8">
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {isSignedIn && (
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted hover:bg-accent transition-colors cursor-pointer">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground text-center w-16 truncate">Add story</span>
          </div>
        )}

        {displayItems.map((group) => (
          <Link key={group.creatorId} href={`/creators/${group.creatorId}`}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
              <div className="p-0.5 rounded-full bg-silver-gradient group-hover:opacity-90 transition-all shadow-silver-glow">
                <div className="p-0.5 rounded-full bg-background">
                  <AvatarCircle name={group.creatorName} url={group.creatorAvatarUrl} />
                </div>
              </div>
              <span className="text-xs text-muted-foreground text-center w-16 truncate group-hover:text-foreground transition-colors">
                {group.creatorName.split(" ")[0]}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
