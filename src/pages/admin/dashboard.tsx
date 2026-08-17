import { useState, useEffect, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  LayoutDashboard, Users, FileText, ShieldCheck, AlertTriangle,
  TicketCheck, LogOut, RefreshCw, Ban, UserX, Eye,
  TrendingUp, ChevronRight, Play, DollarSign, Activity,
  BadgeCheck, ScanLine, BarChart3, UserCog, Bell, Search,
  CheckCircle2, XCircle, Trash2, Shield, Crown, ImageIcon,
  VideoIcon, MessageSquare, Clock, Zap, ArrowUpRight,
  ArrowDownRight, Circle, AlertCircle, ShieldAlert, Bot,
} from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

async function authFetch(url: string, opts?: RequestInit) {
  const token = await (window as any).Clerk?.session?.getToken();
  return fetch(url, {
    ...opts,
    headers: {
      ...(opts?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

type Section =
  | "overview"
  | "users"
  | "content"
  | "moderation"
  | "verifications"
  | "flagged"
  | "tickets";

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmState {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
}

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-[#111] border border-white/10 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            {state.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">{state.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} className="bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { state.onConfirm(); onClose(); }}
            className={state.variant === "warning" ? "bg-amber-600 hover:bg-amber-700 text-white border-0" : "bg-red-600 hover:bg-red-700 text-white border-0"}
          >
            {state.confirmLabel ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    open: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    review: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    flagged: "text-red-400 bg-red-500/10 border-red-500/20",
    removed: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
    rejected: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
    resolved: "text-zinc-400 bg-zinc-500/10 border-zinc-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${map[status] ?? "text-zinc-400 bg-zinc-500/10 border-zinc-700"}`}>
      {status}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title, value, sub, icon, trend, trendUp,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-4 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/[0.07] text-zinc-400">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trendUp ? "text-emerald-400" : "text-red-400"}`}>
            {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-white tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-sm font-medium text-zinc-400 mt-0.5">{title}</p>
        {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Media Thumb ──────────────────────────────────────────────────────────────

function MediaThumb({ mediaUrl, mediaType }: { mediaUrl?: string | null; mediaType?: string | null }) {
  if (!mediaUrl || mediaType === "none") {
    return (
      <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/[0.07] flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4 text-zinc-600" />
      </div>
    );
  }
  if (mediaType === "video") {
    return (
      <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-white/[0.07] flex items-center justify-center shrink-0 relative overflow-hidden">
        <Play className="h-4 w-4 text-zinc-400" />
      </div>
    );
  }
  return (
    <img src={mediaUrl} alt="" loading="lazy"
      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/[0.07]"
      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

// ─── Overview Section ─────────────────────────────────────────────────────────

function OverviewSection({ stats, pendingVerif, openTickets, moderationPending }: any) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Platform Overview</h2>
        <p className="text-zinc-500 text-sm mt-1">Real-time metrics and platform health</p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          sub="Registered accounts"
          icon={<Users className="h-4 w-4" />}
          trend="+12%"
          trendUp
        />
        <StatCard
          title="Active Creators"
          value={stats?.totalCreators ?? 0}
          sub="Publishing content"
          icon={<Crown className="h-4 w-4" />}
          trend="+8%"
          trendUp
        />
        <StatCard
          title="Active Subscriptions"
          value={stats?.activeSubscriptions ?? 0}
          sub={`of ${stats?.totalSubscriptions ?? 0} total`}
          icon={<Zap className="h-4 w-4" />}
          trend="+5%"
          trendUp
        />
        <StatCard
          title="Platform Revenue"
          value={`$${((stats?.platformCommission ?? 0)).toFixed(0)}`}
          sub="Commission earned"
          icon={<DollarSign className="h-4 w-4" />}
          trend="+18%"
          trendUp
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${((stats?.totalRevenue ?? 0)).toFixed(0)}`}
          sub="Gross platform volume"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="New Signups"
          value={stats?.recentSignups ?? 0}
          sub="Last 30 days"
          icon={<Activity className="h-4 w-4" />}
          trend="+3%"
          trendUp
        />
        <StatCard
          title="Suspended Users"
          value={stats?.suspendedUsers ?? 0}
          sub="Currently restricted"
          icon={<Ban className="h-4 w-4" />}
        />
        <StatCard
          title="Flagged Content"
          value={stats?.flaggedPosts ?? 0}
          sub="Awaiting review"
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={stats?.flaggedPosts > 0 ? `${stats.flaggedPosts} pending` : undefined}
          trendUp={false}
        />
      </div>

      {/* Action items */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">Action Required</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: "Pending Verifications", count: pendingVerif, icon: <BadgeCheck className="h-4 w-4" />, color: "blue", section: "verifications" },
            { label: "Open Support Tickets", count: openTickets, icon: <TicketCheck className="h-4 w-4" />, color: "amber", section: "tickets" },
            { label: "Moderation Queue", count: moderationPending, icon: <ScanLine className="h-4 w-4" />, color: "violet", section: "moderation" },
          ].map(item => (
            <div key={item.label} className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/[0.07] text-zinc-300 shrink-0">{item.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-xl">{item.count}</p>
                <p className="text-zinc-500 text-xs">{item.label}</p>
              </div>
              {item.count > 0 && (
                <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Users Section ────────────────────────────────────────────────────────────

function UsersSection({ users, onRefresh, loading }: { users: any[]; onRefresh: () => void; loading: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmState | null>(null);
  const [addAdminEmail, setAddAdminEmail] = useState("");
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);

  async function handleAddAdminByEmail() {
    if (!addAdminEmail.includes("@")) { toast({ title: "Valid email required", variant: "destructive" }); return; }
    setAddAdminLoading(true);
    try {
      const r = await authFetch(`${BASE}/api/admin/add-admin-by-email`, {
        method: "POST", body: JSON.stringify({ email: addAdminEmail }),
      });
      const d = await r.json();
      if (!r.ok) { toast({ title: d.error ?? "Error", variant: "destructive" }); return; }
      if (d.exists === false) {
        toast({ title: "Saved", description: "User will be promoted on first sign-in." });
      } else {
        toast({ title: `${d.email} is now an admin` });
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      }
      setAddAdminEmail(""); setShowAddAdmin(false);
    } finally { setAddAdminLoading(false); }
  }

  function promoteToAdmin(u: any) {
    setPendingConfirm({
      title: "Grant Admin Access",
      description: `Give "${u.name ?? u.email}" full admin authority over the platform? This cannot be easily undone.`,
      confirmLabel: "Grant Access",
      variant: "warning",
      onConfirm: async () => {
        await authFetch(`${BASE}/api/admin/users/${u.id}/promote`, { method: "PATCH" });
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        toast({ title: `${u.name ?? u.email} is now an admin` });
      },
    });
  }

  function toggleSuspend(u: any) {
    const action = u.isSuspended ? "Restore" : "Suspend";
    setPendingConfirm({
      title: `${action} Account`,
      description: `${u.isSuspended ? "Restore access for" : "Suspend"} "${u.name ?? u.email}"?`,
      confirmLabel: action,
      variant: u.isSuspended ? "warning" : "danger",
      onConfirm: async () => {
        await authFetch(`${BASE}/api/admin/users/${u.id}/suspend`, {
          method: "PATCH", body: JSON.stringify({ suspended: !u.isSuspended }),
        });
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        toast({ title: u.isSuspended ? "Account restored" : "Account suspended" });
      },
    });
  }

  function deleteUser(u: any) {
    setPendingConfirm({
      title: "Permanently Delete Account",
      description: `Delete "${u.name ?? u.email}" and all their data? This is irreversible.`,
      confirmLabel: "Delete Forever",
      onConfirm: async () => {
        await authFetch(`${BASE}/api/admin/users/${u.id}`, { method: "DELETE" });
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        toast({ title: "Account deleted", variant: "destructive" });
      },
    });
  }

  const filtered = users.filter(u => {
    const matchRole = filter === "all" || (filter === "suspended" ? u.isSuspended : u.role === filter);
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const filterBtns = [
    { key: "all", label: "All" },
    { key: "user", label: "Fans" },
    { key: "creator", label: "Creators" },
    { key: "suspended", label: "Suspended" },
  ];

  return (
    <div className="space-y-6">
      {pendingConfirm && <ConfirmDialog state={pendingConfirm} onClose={() => setPendingConfirm(null)} />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">User Management</h2>
          <p className="text-zinc-500 text-sm mt-1">{filtered.length} of {users.length} accounts shown</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAddAdmin(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${showAddAdmin ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/[0.07] text-zinc-400 hover:text-white hover:bg-white/10"}`}
          >
            <UserCog className="h-3.5 w-3.5" /> Add Admin
          </button>
          <button onClick={onRefresh} className="p-2 rounded-xl bg-white/5 border border-white/[0.07] text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showAddAdmin && (
        <div className="bg-violet-950/20 border border-violet-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-violet-400" />
            <p className="text-white text-sm font-bold">Grant Admin Access</p>
          </div>
          <p className="text-zinc-500 text-xs mb-4">Registered users are promoted immediately. Unregistered emails are promoted on first sign-in.</p>
          <div className="flex gap-2">
            <input
              value={addAdminEmail} onChange={e => setAddAdminEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddAdminByEmail()}
              placeholder="email@example.com" type="email"
              className="flex-1 bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
            />
            <button onClick={handleAddAdminByEmail} disabled={addAdminLoading}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 whitespace-nowrap">
              {addAdminLoading ? "Saving..." : "Promote to Admin"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full bg-[#111] border border-white/[0.07] text-white placeholder-zinc-600 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-white/20"
          />
        </div>
        <div className="flex gap-1.5 bg-[#111] border border-white/[0.07] rounded-xl p-1">
          {filterBtns.map(b => (
            <button key={b.key} onClick={() => setFilter(b.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === b.key ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-200"}`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          <p className="text-zinc-600 text-sm mt-3">Loading users…</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-zinc-600 font-semibold px-5 py-3.5 text-xs uppercase tracking-wider">Account</th>
                <th className="text-left text-zinc-600 font-semibold px-5 py-3.5 text-xs uppercase tracking-wider">Role</th>
                <th className="text-left text-zinc-600 font-semibold px-5 py-3.5 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left text-zinc-600 font-semibold px-5 py-3.5 text-xs uppercase tracking-wider hidden lg:table-cell">Joined</th>
                <th className="text-right text-zinc-600 font-semibold px-5 py-3.5 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(u => (
                <tr key={u.id} className={`hover:bg-white/[0.02] transition-colors group ${u.isSuspended ? "opacity-50" : ""}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={u.avatarUrl} />
                        <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-bold">{u.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate max-w-[160px]">{u.name ?? "—"}</p>
                        <p className="text-zinc-600 text-xs truncate max-w-[200px]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${u.role === "admin" ? "bg-violet-500/15 text-violet-300 border border-violet-500/20" : u.role === "creator" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-white/5 text-zinc-400 border border-white/[0.07]"}`}>
                      {u.role === "admin" && <Shield className="h-3 w-3" />}
                      {u.role === "creator" && <Crown className="h-3 w-3" />}
                      <span className="capitalize">{u.role}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${u.isSuspended ? "bg-red-400" : "bg-emerald-400"}`} />
                      <span className={`text-xs font-medium ${u.isSuspended ? "text-red-400" : "text-emerald-400"}`}>
                        {u.isSuspended ? "Suspended" : "Active"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-zinc-600 text-xs hidden lg:table-cell">
                    {format(new Date(u.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {u.role !== "admin" && (
                        <button onClick={() => promoteToAdmin(u)}
                          className="px-2.5 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 rounded-lg text-xs font-semibold transition-all"
                          title="Promote to admin">
                          <Shield className="h-3 w-3" />
                        </button>
                      )}
                      <button onClick={() => toggleSuspend(u)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${u.isSuspended ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" : "bg-white/5 border-white/[0.07] text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20"}`}>
                        <Ban className="h-3 w-3" />
                      </button>
                      <button onClick={() => deleteUser(u)}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-red-500/15 border border-white/[0.07] hover:border-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg text-xs font-semibold transition-all">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-16 text-center text-zinc-600 text-sm">No users match your filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Content Section ──────────────────────────────────────────────────────────

function ContentSection({ posts, onRefresh, loading }: { posts: any[]; onRefresh: () => void; loading: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmState | null>(null);

  const filtered = posts.filter(p => filter === "all" || p.moderationStatus === filter);

  async function moderate(postId: string, action: "approve" | "flag" | "remove") {
    await authFetch(`${BASE}/api/admin/content/${postId}/moderate`, {
      method: "POST", body: JSON.stringify({ action }),
    });
    queryClient.invalidateQueries({ queryKey: ["admin-content"] });
    toast({ title: action === "approve" ? "Post approved" : action === "flag" ? "Post flagged" : "Post removed" });
  }

  function deletePost(postId: string) {
    setPendingConfirm({
      title: "Delete Post",
      description: "Permanently delete this post? This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await authFetch(`${BASE}/api/admin/content/${postId}`, { method: "DELETE" });
        queryClient.invalidateQueries({ queryKey: ["admin-content"] });
        toast({ title: "Post deleted", variant: "destructive" });
      },
    });
  }

  const filterBtns = ["all", "active", "pending", "flagged", "removed"];

  return (
    <div className="space-y-6">
      {pendingConfirm && <ConfirmDialog state={pendingConfirm} onClose={() => setPendingConfirm(null)} />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Content Library</h2>
          <p className="text-zinc-500 text-sm mt-1">{filtered.length} of {posts.length} posts</p>
        </div>
        <button onClick={onRefresh} className="p-2 rounded-xl bg-white/5 border border-white/[0.07] text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-1.5 bg-[#111] border border-white/[0.07] rounded-xl p-1 w-fit">
        {filterBtns.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-200"}`}>
            {f}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="py-20 text-center"><div className="inline-block w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-zinc-600 font-semibold px-5 py-3.5 text-xs uppercase tracking-wider">Content</th>
                <th className="text-left text-zinc-600 font-semibold px-5 py-3.5 text-xs uppercase tracking-wider hidden md:table-cell">Creator</th>
                <th className="text-left text-zinc-600 font-semibold px-5 py-3.5 text-xs uppercase tracking-wider">Status</th>
                <th className="text-right text-zinc-600 font-semibold px-5 py-3.5 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <MediaThumb mediaUrl={p.mediaUrl} mediaType={p.mediaType} />
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate max-w-[200px]">{p.title || "Untitled"}</p>
                        <p className="text-zinc-600 text-xs mt-0.5 truncate max-w-[200px]">{p.body?.slice(0, 60) ?? ""}</p>
                        {p.isLocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 mt-1">
                            <Zap className="h-2.5 w-2.5" /> Premium
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={p.creatorAvatarUrl} />
                        <AvatarFallback className="bg-zinc-800 text-zinc-300 text-[9px]">{p.creatorName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-zinc-400 text-xs">{p.creatorName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={p.moderationStatus} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.moderationStatus !== "active" && (
                        <button onClick={() => moderate(p.id, "approve")} title="Approve"
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition-all">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {p.moderationStatus === "active" && (
                        <button onClick={() => moderate(p.id, "flag")} title="Flag"
                          className="p-1.5 bg-white/5 hover:bg-amber-500/10 border border-white/[0.07] hover:border-amber-500/20 text-zinc-500 hover:text-amber-400 rounded-lg transition-all">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => deletePost(p.id)} title="Delete"
                        className="p-1.5 bg-white/5 hover:bg-red-500/15 border border-white/[0.07] hover:border-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-16 text-center text-zinc-600 text-sm">No content matches this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Moderation Section ───────────────────────────────────────────────────────

function ModerationSection({ queue, onRefresh, loading }: { queue: any[]; onRefresh: () => void; loading: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  async function moderate(postId: string, action: "approve" | "flag" | "remove") {
    await authFetch(`${BASE}/api/admin/content/${postId}/moderate`, {
      method: "POST", body: JSON.stringify({ action }),
    });
    queryClient.invalidateQueries({ queryKey: ["admin-content"] });
    queryClient.invalidateQueries({ queryKey: ["admin-moderation-queue"] });
    toast({ title: action === "approve" ? "Approved" : action === "flag" ? "Flagged" : "Removed" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Moderation Queue</h2>
          <p className="text-zinc-500 text-sm mt-1">{queue.length} items awaiting review</p>
        </div>
        <button onClick={onRefresh} className="p-2 rounded-xl bg-white/5 border border-white/[0.07] text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {loading ? (
        <div className="py-20 text-center"><div className="inline-block w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" /></div>
      ) : queue.length === 0 ? (
        <div className="py-20 text-center bg-[#111] border border-white/[0.07] rounded-2xl">
          <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mx-auto mb-3" />
          <p className="text-zinc-400 font-semibold">Queue is clear</p>
          <p className="text-zinc-600 text-sm mt-1">All content has been reviewed</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map((p: any) => (
            <div key={p.id} className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 flex items-start gap-4 hover:border-white/[0.12] transition-colors">
              <MediaThumb mediaUrl={p.mediaUrl} mediaType={p.mediaType} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusBadge status={p.moderationStatus} />
                  <span className="text-zinc-600 text-xs">{p.creatorName}</span>
                  {p.moderationScore && (
                    <span className="text-xs text-zinc-600">Score: {p.moderationScore}</span>
                  )}
                </div>
                <p className="text-white text-sm font-semibold truncate">{p.title || "Untitled"}</p>
                <p className="text-zinc-600 text-xs mt-0.5 line-clamp-2">{p.body}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => moderate(p.id, "approve")}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold transition-all">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </button>
                <button onClick={() => moderate(p.id, "remove")}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold transition-all">
                  <XCircle className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Verifications Section ────────────────────────────────────────────────────

function VerificationsSection({ verifications, onRefresh, loading }: { verifications: any[]; onRefresh: () => void; loading: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  async function handle(id: string, action: "approve" | "reject" | "revoke") {
    await authFetch(`${BASE}/api/verifications/admin/${id}`, {
      method: "PATCH", body: JSON.stringify({ action }),
    });
    queryClient.invalidateQueries({ queryKey: ["admin-verifications"] });
    const messages: Record<string, string> = {
      approve: "Badge approved — valid for 1 month ✓",
      reject: "Verification rejected",
      revoke: "Verified badge revoked",
    };
    toast({ title: messages[action] });
  }

  const pending = verifications.filter(v => v.status === "pending");
  const reviewed = verifications.filter(v => v.status !== "pending");

  function badgeExpiry(v: any) {
    if (v.status !== "approved" || !v.expiresAt) return null;
    const exp = new Date(v.expiresAt);
    const isExpired = exp <= new Date();
    return { exp, isExpired };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Verification Requests</h2>
          <p className="text-zinc-500 text-sm mt-1">{pending.length} pending · {reviewed.length} reviewed</p>
        </div>
        <button onClick={onRefresh} className="p-2 rounded-xl bg-white/5 border border-white/[0.07] text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {loading ? (
        <div className="py-20 text-center"><div className="inline-block w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" /></div>
      ) : verifications.length === 0 ? (
        <div className="py-20 text-center bg-[#111] border border-white/[0.07] rounded-2xl">
          <BadgeCheck className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No verification requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              Pending Review
            </p>
          )}
          {[...pending, ...reviewed].map((v: any) => {
            const expiry = badgeExpiry(v);
            return (
              <div key={v.id} className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-4 hover:border-white/[0.12] transition-colors">
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarImage src={v.creatorAvatarUrl} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-300 font-bold">{v.creatorName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-bold text-sm">{v.creatorName}</p>
                    <StatusBadge status={v.status} />
                    {expiry?.isExpired && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                        Expired
                      </span>
                    )}
                    {v.creatorNiche && <span className="text-zinc-600 text-xs">{v.creatorNiche}</span>}
                  </div>
                  <p className="text-zinc-600 text-xs mt-0.5">
                    Requested {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                  </p>
                  {expiry && !expiry.isExpired && (
                    <p className="text-zinc-500 text-xs mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Badge expires {format(expiry.exp, "MMM d, yyyy")}
                    </p>
                  )}
                  {expiry?.isExpired && (
                    <p className="text-zinc-600 text-xs mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expired {formatDistanceToNow(expiry.exp, { addSuffix: true })}
                    </p>
                  )}
                  {v.status === "revoked" && v.reviewedAt && (
                    <p className="text-red-500/60 text-xs mt-0.5">
                      Revoked {formatDistanceToNow(new Date(v.reviewedAt), { addSuffix: true })}
                    </p>
                  )}
                  {v.adminNote && <p className="text-zinc-500 text-xs mt-1 italic">Note: {v.adminNote}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {v.status === "pending" && (
                    <>
                      <button onClick={() => handle(v.id, "approve")}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold transition-all">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button onClick={() => handle(v.id, "reject")}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold transition-all">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {v.status === "approved" && (
                    <button onClick={() => handle(v.id, "revoke")}
                      className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 rounded-xl text-xs font-semibold transition-all">
                      <ShieldAlert className="h-3.5 w-3.5" /> Revoke Badge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Flagged Section ──────────────────────────────────────────────────────────

function FlaggedSection({ posts, onRefresh, loading }: { posts: any[]; onRefresh: () => void; loading: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  async function moderate(postId: string, action: "approve" | "remove") {
    await authFetch(`${BASE}/api/admin/content/${postId}/moderate`, {
      method: "POST", body: JSON.stringify({ action }),
    });
    queryClient.invalidateQueries({ queryKey: ["admin-content"] });
    toast({ title: action === "approve" ? "Content restored" : "Content removed" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Flagged Reports</h2>
          <p className="text-zinc-500 text-sm mt-1">{posts.length} flagged posts need review</p>
        </div>
        <button onClick={onRefresh} className="p-2 rounded-xl bg-white/5 border border-white/[0.07] text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {loading ? (
        <div className="py-20 text-center"><div className="inline-block w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" /></div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center bg-[#111] border border-white/[0.07] rounded-2xl">
          <CheckCircle2 className="h-12 w-12 text-emerald-500/40 mx-auto mb-3" />
          <p className="text-zinc-400 font-semibold">No flagged content</p>
          <p className="text-zinc-600 text-sm mt-1">All clear — nothing needs attention</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((p: any) => (
            <div key={p.id} className="bg-[#111] border border-red-500/10 rounded-2xl p-4 flex items-start gap-4">
              <MediaThumb mediaUrl={p.mediaUrl} mediaType={p.mediaType} />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{p.title || "Untitled"}</p>
                <p className="text-zinc-500 text-xs mt-0.5 truncate">by {p.creatorName}</p>
                <p className="text-zinc-700 text-xs mt-1 line-clamp-2">{p.body}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => moderate(p.id, "approve")}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-emerald-500/10 border border-white/[0.07] hover:border-emerald-500/20 text-zinc-400 hover:text-emerald-400 rounded-xl text-xs font-semibold transition-all">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Restore
                </button>
                <button onClick={() => moderate(p.id, "remove")}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold transition-all">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tickets Section ──────────────────────────────────────────────────────────

function TicketItem({ ticket, onRefresh }: { ticket: any; onRefresh: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");

  async function sendReply() {
    if (!reply.trim()) return;
    await authFetch(`${BASE}/api/tickets/${ticket.id}/reply`, {
      method: "PATCH", body: JSON.stringify({ reply }),
    });
    setOpen(false); onRefresh();
    toast({ title: "Reply sent & ticket resolved" });
  }

  const categoryColor: Record<string, string> = {
    billing: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    technical: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    content: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    account: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    other: "text-zinc-400 bg-zinc-500/10 border-zinc-700",
  };

  return (
    <div className={`bg-[#111] border rounded-2xl overflow-hidden transition-colors ${open ? "border-white/15" : "border-white/[0.07]"}`}>
      <div className="flex items-start justify-between gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex gap-1.5 pt-0.5 shrink-0">
            <StatusBadge status={ticket.status} />
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${categoryColor[ticket.category] ?? categoryColor.other}`}>
              {ticket.category}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{ticket.subject}</p>
            <p className="text-zinc-600 text-xs mt-0.5 truncate">{ticket.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-zinc-700 text-xs hidden sm:block">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
          <ChevronRight className={`h-4 w-4 text-zinc-700 transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </div>
      {open && (
        <div className="border-t border-white/[0.06] p-4 space-y-4 bg-white/[0.01]">
          <p className="text-zinc-300 text-sm leading-relaxed">{ticket.message}</p>
          {ticket.reply && (
            <div className="bg-emerald-950/30 border border-emerald-900/30 rounded-xl p-3">
              <p className="text-xs text-emerald-500 font-semibold mb-1">Admin Reply</p>
              <p className="text-zinc-300 text-sm">{ticket.reply}</p>
            </div>
          )}
          {ticket.status !== "resolved" && (
            <div className="space-y-2">
              <textarea value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Type your reply…"
                className="w-full bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 resize-none"
                rows={3}
              />
              <button onClick={sendReply} disabled={!reply.trim()}
                className="px-5 py-2 bg-white text-black rounded-xl text-sm font-bold transition-all hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed">
                Send Reply & Resolve
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TicketsSection({ tickets, onRefresh, loading }: { tickets: any[]; onRefresh: () => void; loading: boolean }) {
  const open = tickets.filter(t => t.status === "open");
  const rest = tickets.filter(t => t.status !== "open");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Support Tickets</h2>
          <p className="text-zinc-500 text-sm mt-1">{open.length} open · {rest.length} resolved</p>
        </div>
        <button onClick={onRefresh} className="p-2 rounded-xl bg-white/5 border border-white/[0.07] text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {loading ? (
        <div className="py-20 text-center"><div className="inline-block w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" /></div>
      ) : tickets.length === 0 ? (
        <div className="py-20 text-center bg-[#111] border border-white/[0.07] rounded-2xl">
          <TicketCheck className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No support tickets yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {open.length > 0 && (
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" /> Open
            </p>
          )}
          {open.map(t => <TicketItem key={t.id} ticket={t} onRefresh={onRefresh} />)}
          {rest.length > 0 && (
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mt-6 mb-3">Resolved</p>
          )}
          {rest.map(t => <TicketItem key={t.id} ticket={t} onRefresh={onRefresh} />)}
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [section, setSection] = useState<Section>("overview");
  const { user: clerkUser } = useUser();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const now = new Date();

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => authFetch(`${BASE}/api/admin/stats`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => authFetch(`${BASE}/api/admin/users`).then(r => r.json()),
  });

  const { data: allContent = [], isLoading: contentLoading, refetch: refetchContent } = useQuery({
    queryKey: ["admin-content"],
    queryFn: () => authFetch(`${BASE}/api/admin/content`).then(r => r.json()),
  });

  const flaggedContent = (allContent as any[]).filter((p: any) => p.moderationStatus === "flagged");

  const { data: moderationQueue = [], isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ["admin-moderation-queue"],
    queryFn: () => authFetch(`${BASE}/api/moderation/queue`).then(r => r.ok ? r.json() : []),
    refetchInterval: 15000,
  });

  const { data: verifications = [], isLoading: verifLoading, refetch: refetchVerif } = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: () => authFetch(`${BASE}/api/verifications/admin/all`).then(r => r.json()),
  });

  const { data: tickets = [], isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: () => authFetch(`${BASE}/api/tickets/admin/all`).then(r => r.json()),
  });

  const pendingVerif = (verifications as any[]).filter((v: any) => v.status === "pending").length;
  const openTickets = (tickets as any[]).filter((t: any) => t.status === "open").length;
  const queuePending = (moderationQueue as any[]).length;
  const totalBadges = pendingVerif + openTickets + queuePending + flaggedContent.length;

  function signOut() {
    (window as any).Clerk?.signOut(() => setLocation("/sign-in"));
  }

  const navItems: { key: Section; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "overview",      label: "Overview",         icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "users",         label: "Users",            icon: <Users className="h-4 w-4" /> },
    { key: "content",       label: "Content",          icon: <FileText className="h-4 w-4" /> },
    { key: "moderation",    label: "Mod Queue",        icon: <ScanLine className="h-4 w-4" />, badge: queuePending || undefined },
    { key: "verifications", label: "Verifications",    icon: <BadgeCheck className="h-4 w-4" />, badge: pendingVerif || undefined },
    { key: "flagged",       label: "Flagged",          icon: <AlertTriangle className="h-4 w-4" />, badge: flaggedContent.length || undefined },
    { key: "tickets",       label: "Tickets",          icon: <TicketCheck className="h-4 w-4" />, badge: openTickets || undefined },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 flex flex-col bg-[#0d0d0d] border-r border-white/[0.06]">
        {/* Logo area */}
        <div className="px-4 pt-5 pb-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0">
              <Shield className="h-3.5 w-3.5 text-black" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-tight tracking-tight">CreatorHub</p>
              <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest">Admin Console</p>
            </div>
          </div>
          {totalBadges > 0 && (
            <div className="mt-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/15">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-amber-400 text-[11px] font-semibold">{totalBadges} actions pending</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                section === item.key
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2.5">
                {item.icon}
                {item.label}
              </span>
              {item.badge != null && item.badge > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${section === item.key ? "bg-black text-white" : "bg-amber-500/20 text-amber-400"}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Admin identity */}
        <div className="px-3 pb-4 pt-2 border-t border-white/[0.05] space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={clerkUser?.imageUrl} />
              <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">{clerkUser?.firstName?.[0] ?? "A"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-bold truncate">{clerkUser?.fullName ?? "Admin"}</p>
              <p className="text-zinc-600 text-[10px]">Super Admin</p>
            </div>
          </div>
          <button
            onClick={() => setLocation("/admin/ai-agent")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 text-xs font-bold transition-all"
          >
            <Bot className="h-3.5 w-3.5" /> AI Engineering Agent
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-600 hover:text-zinc-300 hover:bg-white/5 text-xs font-medium transition-all"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-white/[0.05] bg-[#0d0d0d]">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-400 text-sm font-medium capitalize">{section}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-600 text-xs">{format(now, "EEEE, MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { refetchStats(); refetchUsers(); refetchContent(); refetchVerif(); refetchTickets(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/[0.07] text-zinc-500 hover:text-zinc-200 text-xs font-medium transition-all hover:bg-white/10"
            >
              <RefreshCw className="h-3 w-3" /> Refresh All
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {section === "overview" && (
              <OverviewSection stats={stats} pendingVerif={pendingVerif} openTickets={openTickets} moderationPending={queuePending} />
            )}
            {section === "users" && (
              <UsersSection users={users as any[]} onRefresh={refetchUsers} loading={usersLoading} />
            )}
            {section === "content" && (
              <ContentSection posts={allContent as any[]} onRefresh={refetchContent} loading={contentLoading} />
            )}
            {section === "moderation" && (
              <ModerationSection queue={moderationQueue as any[]} onRefresh={refetchQueue} loading={queueLoading} />
            )}
            {section === "verifications" && (
              <VerificationsSection verifications={verifications as any[]} onRefresh={refetchVerif} loading={verifLoading} />
            )}
            {section === "flagged" && (
              <FlaggedSection posts={flaggedContent} onRefresh={refetchContent} loading={contentLoading} />
            )}
            {section === "tickets" && (
              <TicketsSection tickets={tickets as any[]} onRefresh={refetchTickets} loading={ticketsLoading} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
