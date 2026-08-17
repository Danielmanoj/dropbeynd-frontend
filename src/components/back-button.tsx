import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  label?: string;
  className?: string;
}

export function BackButton({ label = "Back", className = "" }: BackButtonProps) {
  return (
    <button
      onClick={() => window.history.back()}
      className={`fixed top-5 left-5 z-50 inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl
        bg-background/70 hover:bg-accent/90 border border-border hover:border-primary/20
        text-muted-foreground hover:text-foreground text-sm font-medium
        backdrop-blur-xl shadow-xl shadow-black/40
        transition-all duration-200 active:scale-95
        ${className}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
