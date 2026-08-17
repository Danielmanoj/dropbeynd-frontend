import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

const LANGUAGES = ["All", "English", "Spanish", "French", "German", "Hindi", "Portuguese", "Japanese"];

interface FilterBarProps {
  onCategoryChange?: (cat: string | null) => void;
  onSearchChange?: (q: string) => void;
  onAccessChange?: (access: "all" | "free" | "premium") => void;
  onLanguageChange?: (lang: string | null) => void;
}

export function FilterBar({ onCategoryChange, onSearchChange, onAccessChange, onLanguageChange }: FilterBarProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeAccess, setActiveAccess] = useState<"all" | "free" | "premium">("all");
  const [activeLanguage, setActiveLanguage] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const handleCategory = (cat: string) => {
    setActiveCategory(cat);
    onCategoryChange?.(cat === "All" ? null : cat);
  };

  const handleSearch = (q: string) => {
    setSearch(q);
    onSearchChange?.(q);
  };

  const handleAccess = (a: "all" | "free" | "premium") => {
    setActiveAccess(a);
    onAccessChange?.(a);
  };

  const handleLanguage = (lang: string) => {
    setActiveLanguage(lang);
    onLanguageChange?.(lang === "All" ? null : lang);
  };

  return (
    <div className="px-4 md:px-8 space-y-3">
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search creators..."
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="text-muted-foreground hover:text-foreground gap-2 border-border bg-transparent"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {(activeAccess !== "all" || activeLanguage !== "All") && (
            <span className="h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>

        <div className="flex gap-1">
          {(["all", "free", "premium"] as const).map((a) => (
            <Button
              key={a}
              size="sm"
              variant="ghost"
              onClick={() => handleAccess(a)}
              className={`text-xs transition-all font-semibold ${
                activeAccess === a
                  ? "bg-silver-gradient text-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategory(cat)}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all border ${
              activeCategory === cat
                ? "bg-silver-gradient text-black font-semibold border-transparent"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="rounded-xl p-4 space-y-3 bg-card/60 border border-border backdrop-blur-sm">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Language</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguage(lang)}
                  className={`text-xs px-3 py-1 rounded-full transition-all border ${
                    activeLanguage === lang
                      ? "bg-silver-gradient text-black font-semibold border-transparent"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
