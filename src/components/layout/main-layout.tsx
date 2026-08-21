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
  LogIn,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  { title: "Feed", href: "/feed", icon: <HomeIcon className="h-5 w-5 shrink-0" /> },
  { title: "Browse", href: "/browse", icon: <Compass className="h-5 w-5 shrink-0" /> },
  { title: "Subscriptions", href: "/subscriptions", icon: <CreditCard className="h-5 w-5 shrink-0" /> },
  { title: "Inbox", href: "/inbox", icon: <MessageSquare className="h-5 w-5 shrink-0" /> },
  { title: "Dashboard", href: "/creator/dashboard", icon: <LayoutDashboard className="h-5 w-5 shrink-0" />, requiresRole: "creator" },
  { title: "My Profile", href: "/creator/profile", icon: <UserCircle className="h-5 w-5 shrink-0" />, requiresRole: "creator" },
  { title: "Payments", href: "/payments", icon: <Receipt className="h-5 w-5 shrink-0" /> },
  { title: "Support", href: "/support", icon: <LifeBuoy className="h-5 w-5 shrink-0" /> },
  { title: "Admin", href: "/admin", icon: <Shield className="h-5 w-5 shrink-0" />, requiresRole: "admin" },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { data: user } = useGetMe({ query: { enabled: !!clerkUser } as any });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiresRole) return true;
    if (!user) return false;
    if (item.requiresRole === "creator" && (user.role === "creator" || user.role === "admin")) return true;
    if (item.requiresRole === "admin" && user.role === "admin") return true;
    return false;
  });

  const SidebarBody = ({ isMobile = false }: { isMobile?: boolean }) => {
    const { theme, setTheme } = useTheme();
    return (
      <div className="flex h-full flex-col bg-sidebar select-none">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border/40 overflow-hidden px-4">
          <Link href="/" className="flex items-center gap-3.5 font-bold text-xl cursor-pointer w-full">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-black bg-silver-gradient shadow-silver-glow"
            >
              <Compass className="h-5 w-5" />
            </div>
            <div className={cn(
              "overflow-hidden transition-all duration-300",
              isMobile ? "block" : "hidden group-hover/sidebar:block"
            )}>
              <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent whitespace-nowrap font-extrabold tracking-tight">
                DropBeynd
              </span>
            </div>
          </Link>
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden scrollbar-hide px-3">
          <nav className="flex flex-col gap-1.5">
            {filteredNavItems.map((item) => {
              const isActive = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group/item relative flex items-center h-11 rounded-xl transition-all duration-200 px-2.5",
                    isActive
                      ? "bg-accent border border-accent-border/50 text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent"
                  )}
                  onClick={() => {
                    if (isMobile) setIsMobileMenuOpen(false);
                  }}
                  title={item.title}
                >
                  <div className={cn(
                    "flex h-6 w-6 items-center justify-center shrink-0 transition-colors",
                    isActive ? "text-primary font-bold" : "text-muted-foreground group-hover/item:text-foreground"
                  )}>
                    {item.icon}
                  </div>
                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ml-3.5",
                    isMobile ? "block" : "hidden group-hover/sidebar:block"
                  )}>
                    <span className="whitespace-nowrap text-sm font-medium">
                      {item.title}
                    </span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    isMobile ? (
                      <span className="ml-auto text-[10px] rounded-full px-1.5 py-0.5 font-bold bg-silver-gradient text-black">
                        {item.badge}
                      </span>
                    ) : (
                      <>
                        <span className="ml-auto text-[10px] rounded-full px-1.5 py-0.5 font-bold bg-silver-gradient text-black hidden group-hover/sidebar:inline-block">
                          {item.badge}
                        </span>
                        <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background group-hover/sidebar:hidden" />
                      </>
                    )
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Theme Toggle & User section */}
        <div className="border-t p-3 space-y-3 border-sidebar-border/40 overflow-hidden">
          {/* Appearance */}
          <div className="flex items-center justify-between px-1">
            <div className={cn(
              "overflow-hidden",
              isMobile ? "block" : "hidden group-hover/sidebar:block"
            )}>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                Appearance
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 mx-auto group-hover/sidebar:mx-0"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>

          {clerkUser ? (
            <>
              <div className="flex items-center gap-3 px-1">
                <Link href="/settings" className="shrink-0 cursor-pointer mx-auto group-hover/sidebar:mx-0">
                  <Avatar className="h-9 w-9 border border-border/80 shadow-sm hover:scale-105 transition-transform">
                    <AvatarImage src={user?.avatarUrl || clerkUser?.imageUrl} alt={user?.name || "User"} />
                    <AvatarFallback className="text-sm bg-muted text-muted-foreground font-bold">
                      {user?.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className={cn(
                  "flex flex-col overflow-hidden min-w-0 flex-1",
                  isMobile ? "flex" : "hidden group-hover/sidebar:flex"
                )}>
                  <span className="truncate text-sm font-semibold text-foreground">{user?.name || clerkUser?.fullName || "Loading..."}</span>
                  <span className="truncate text-xs text-muted-foreground">{user?.role ?? "member"}</span>
                </div>
              </div>

              <div className={cn(
                "grid grid-cols-2 gap-2 pt-1",
                isMobile ? "grid" : "hidden group-hover/sidebar:grid"
              )}>
                <Link href="/settings" onClick={() => { if (isMobile) setIsMobileMenuOpen(false); }}>
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
            <>
              <div className={cn(
                "space-y-2",
                isMobile ? "block" : "hidden group-hover/sidebar:block"
              )}>
                <p className="text-muted-foreground text-xs px-1 whitespace-nowrap">Sign in to access your account</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/sign-in" onClick={() => { if (isMobile) setIsMobileMenuOpen(false); }}>
                    <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-foreground hover:bg-accent text-xs font-semibold transition-all bg-accent/50 border border-border">
                      Sign In
                    </button>
                  </Link>
                  <Link href="/sign-up" onClick={() => { if (isMobile) setIsMobileMenuOpen(false); }}>
                    <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-black text-xs font-semibold transition-all hover:opacity-90 bg-silver-gradient">
                      Get Started
                    </button>
                  </Link>
                </div>
              </div>
              <div className={cn(
                "flex justify-center",
                isMobile ? "hidden" : "group-hover/sidebar:hidden"
              )}>
                <Link href="/sign-in">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground" title="Sign In">
                    <LogIn className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Navigation Rail & Expandable Side Nav */}
      <div className="hidden md:block w-[72px] shrink-0">
        <aside
          className="group/sidebar fixed top-0 left-0 h-screen z-50 border-r border-sidebar-border bg-sidebar/95 backdrop-blur-2xl transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] w-[72px] hover:w-64 hover:shadow-[20px_0_50px_rgba(0,0,0,0.85)]"
        >
          <SidebarBody isMobile={false} />
        </aside>
      </div>

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
            <SheetContent side="left" className="p-0 w-72 border-r border-border bg-sidebar">
              <SidebarBody isMobile={true} />
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

