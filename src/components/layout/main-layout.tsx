import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import {
  LayoutDashboard,
  Compass,
  Home as HomeIcon,
  CreditCard,
  Settings,
  Shield,
  Menu,
  LogOut,
  Receipt,
  MessageSquare,
  LifeBuoy,
  UserCircle,
  Sun,
  Moon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetMe } from "@/lib/api-client";
import { useTheme } from "@/components/theme-provider";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  requiresRole?: "user" | "creator" | "admin";
  badge?: number;
}

const navItems: NavItem[] = [
  { title: "Feed", href: "/feed", icon: <HomeIcon className="h-5 w-5" /> },
  { title: "Browse", href: "/browse", icon: <Compass className="h-5 w-5" /> },
  { title: "Subscriptions", href: "/subscriptions", icon: <CreditCard className="h-5 w-5" /> },
  { title: "Inbox", href: "/inbox", icon: <MessageSquare className="h-5 w-5" /> },
  { title: "Dashboard", href: "/creator/dashboard", icon: <LayoutDashboard className="h-5 w-5" />, requiresRole: "creator" },
  { title: "My Profile", href: "/creator/profile", icon: <UserCircle className="h-5 w-5" />, requiresRole: "creator" },
  { title: "Payments", href: "/payments", icon: <Receipt className="h-5 w-5" /> },
  { title: "Support", href: "/support", icon: <LifeBuoy className="h-5 w-5" /> },
  { title: "Admin", href: "/admin", icon: <Shield className="h-5 w-5" />, requiresRole: "admin" },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { data: user } = useGetMe({ query: { enabled: !!clerkUser } as any });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiresRole) return true;
    if (!user) return false;
    if (item.requiresRole === "creator" && (user.role === "creator" || user.role === "admin")) return true;
    if (item.requiresRole === "admin" && user.role === "admin") return true;
    return false;
  });

  const SidebarContent = () => {
    const { theme, setTheme } = useTheme();
    return (
      <div className="flex h-full flex-col border-r bg-sidebar border-sidebar-border">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl cursor-pointer">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl text-black bg-silver-gradient shadow-silver-glow"
            >
              <Compass className="h-4 w-4" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">DropBeynd</span>
          </Link>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-0.5">
            {filteredNavItems.map((item) => {
              const isActive = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-accent border-accent-border text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className={cn(isActive ? "text-primary" : "text-muted-foreground")}>{item.icon}</span>
                  {item.title}
                  {item.badge && item.badge > 0 ? (
                    <span
                      className="ml-auto text-[10px] rounded-full px-1.5 py-0.5 font-bold bg-silver-gradient text-black"
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Theme Toggle & User section */}
        <div className="border-t p-4 space-y-3 border-sidebar-border">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Appearance</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>

          {clerkUser ? (
            <>
              <div className="flex items-center gap-3 px-1">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage src={user?.avatarUrl || clerkUser?.imageUrl} alt={user?.name || "User"} />
                  <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                  <span className="truncate text-sm font-semibold text-foreground">{user?.name || clerkUser?.fullName || "Loading..."}</span>
                  <span className="truncate text-xs text-muted-foreground">{user?.role ?? "member"}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                  <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-muted-foreground hover:text-foreground text-xs font-medium transition-all bg-accent/50 border border-border hover:bg-accent">
                    <Settings className="h-3.5 w-3.5" /> Settings
                  </button>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-destructive hover:text-destructive/80 text-xs font-medium transition-all bg-destructive/10 border border-destructive/20"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs px-1">Sign in to access your account</p>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
                  <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-foreground hover:bg-accent text-xs font-semibold transition-all bg-accent/50 border border-border">
                    Sign In
                  </button>
                </Link>
                <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)}>
                  <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-black text-xs font-semibold transition-all hover:opacity-90 bg-silver-gradient">
                    Get Started
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 md:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:hidden bg-background border-border"
        >
          <Link href="/" className="flex items-center gap-2 font-bold text-lg cursor-pointer">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-black bg-silver-gradient"
            >
              <Compass className="h-4 w-4" />
            </div>
            <span className="text-foreground">DropBeynd</span>
          </Link>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r border-border bg-background">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto h-full max-w-6xl p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
