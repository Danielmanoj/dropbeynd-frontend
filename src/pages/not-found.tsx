import { Link } from "wouter";
import { Home, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center text-center px-6 max-w-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl mb-6 bg-muted border border-border">
          <SearchX className="h-10 w-10 text-muted-foreground" />
        </div>

        <h1 className="text-6xl font-black text-foreground mb-3 tabular-nums" style={{ letterSpacing: "-2px" }}>404</h1>
        <h2 className="text-xl font-bold text-foreground mb-3">Page not found</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          The page you're looking for doesn't exist or may have been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link href="/" className="flex-1">
            <Button
              className="w-full font-semibold gap-2 bg-violet-600 hover:bg-violet-500 text-white"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </Link>
          <Link href="/browse" className="flex-1">
            <Button variant="outline" className="w-full">
              Browse Creators
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
