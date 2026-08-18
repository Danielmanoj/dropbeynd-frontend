import { useState, useEffect, useRef, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Bot, Play, Shield, Zap, Database, Palette, BarChart3,
  RefreshCw, Trash2, ChevronRight, AlertTriangle, CheckCircle2,
  XCircle, Info, Clock, Activity, Terminal, Cpu, Lock,
  ArrowLeft, Circle, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanType = "system" | "security" | "performance" | "database" | "ui_ux";
type ScanStatus = "running" | "completed" | "failed";
type Severity = "critical" | "high" | "medium" | "low" | "info";

interface Scan {
  id: string;
  type: ScanType;
  status: ScanStatus;
  summary: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface AgentLog {
  id: string;
  level: string;
  message: string;
  createdAt: string;
}

interface AgentReport {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  category: string;
  suggestedFix: string | null;
  createdAt: string;
}

interface ScanDetail extends Scan {
  logs: AgentLog[];
  reports: AgentReport[];
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<Severity, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  critical: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25" },
  high:     { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25" },
  medium:   { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
  low:      { icon: <Info className="h-3.5 w-3.5" />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25" },
  info:     { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-700" },
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.icon}
      {severity}
    </span>
  );
}

function LogLine({ log }: { log: AgentLog }) {
  const colorMap: Record<string, string> = {
    error: "text-red-400",
    warning: "text-amber-400",
    success: "text-emerald-400",
    info: "text-zinc-400",
  };
  const prefixMap: Record<string, string> = {
    error: "ERR",
    warning: "WRN",
    success: "OK ",
    info: "INF",
  };
  const color = colorMap[log.level] ?? "text-zinc-500";
  const prefix = prefixMap[log.level] ?? "LOG";
  const time = format(new Date(log.createdAt), "HH:mm:ss.SSS");

  return (
    <div className="flex items-start gap-2 py-0.5 font-mono text-xs leading-relaxed group">
      <span className="text-zinc-700 shrink-0 select-none">{time}</span>
      <span className={`shrink-0 font-bold ${color}`}>[{prefix}]</span>
      <span className={color}>{log.message}</span>
    </div>
  );
}

// ─── Scan type config ─────────────────────────────────────────────────────────

const SCAN_TYPES: { type: ScanType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  {
    type: "system",
    label: "Full System Scan",
    desc: "API health, DB stats, env config, AI analysis",
    icon: <Cpu className="h-5 w-5" />,
    color: "from-violet-600 to-purple-700",
  },
  {
    type: "security",
    label: "Security Audit",
    desc: "Auth keys, payment config, access control",
    icon: <Shield className="h-5 w-5" />,
    color: "from-red-600 to-rose-700",
  },
  {
    type: "performance",
    label: "Performance Audit",
    desc: "DB query times, table sizes, bottlenecks",
    icon: <Zap className="h-5 w-5" />,
    color: "from-amber-600 to-orange-700",
  },
  {
    type: "database",
    label: "Database Scan",
    desc: "Orphaned records, integrity checks, indexes",
    icon: <Database className="h-5 w-5" />,
    color: "from-blue-600 to-cyan-700",
  },
  {
    type: "ui_ux",
    label: "UI/UX Audit",
    desc: "Feature gaps, engagement, monetization ideas",
    icon: <Palette className="h-5 w-5" />,
    color: "from-emerald-600 to-teal-700",
  },
];

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({ report }: { report: AgentReport }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[report.severity] ?? SEVERITY_CONFIG.info;

  return (
    <div className={`rounded-xl border ${cfg.border} bg-black/40 overflow-hidden`}>
      <button
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className={`mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white text-sm font-semibold">{report.title}</p>
            <SeverityBadge severity={report.severity} />
            <span className="text-zinc-700 text-[11px] font-mono capitalize">{report.category}</span>
          </div>
          <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{report.description}</p>
        </div>
        <ChevronRight className={`h-4 w-4 text-zinc-700 mt-0.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-white/[0.05] px-4 pb-4 pt-3 space-y-3">
          <p className="text-zinc-300 text-sm leading-relaxed">{report.description}</p>
          {report.suggestedFix && (
            <div className="bg-emerald-950/30 border border-emerald-900/30 rounded-xl p-3">
              <p className="text-emerald-400 text-xs font-bold mb-1 uppercase tracking-widest">Suggested Fix</p>
              <p className="text-zinc-300 text-sm leading-relaxed">{report.suggestedFix}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Active scan terminal ─────────────────────────────────────────────────────

function ScanTerminal({ scanId, onComplete }: { scanId: string; onComplete: (scan: ScanDetail) => void }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<ScanDetail | null>(null);
  const seenLogIds = useRef(new Set<string>());

  const poll = useCallback(async () => {
    try {
      const r = await authFetch(`${BASE}/api/ai-agent/scans/${scanId}`);
      if (!r.ok) return;
      const d: ScanDetail = await r.json();
      setDetail(d);
      if (d.status !== "running") {
        onComplete(d);
      }
    } catch { /* ignore */ }
  }, [scanId, onComplete]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [detail?.logs]);

  const isRunning = !detail || detail.status === "running";

  return (
    <div className="flex flex-col h-full">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/80 border-b border-white/[0.06] shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-zinc-500 text-xs font-mono flex-1 text-center">
          agent@dropbeynd ~ scan/{detail?.type ?? "…"}
        </span>
        {isRunning && (
          <div className="flex items-center gap-1.5 text-amber-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-[11px] font-mono">RUNNING</span>
          </div>
        )}
        {detail?.status === "completed" && (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span className="text-[11px] font-mono">COMPLETE</span>
          </div>
        )}
        {detail?.status === "failed" && (
          <div className="flex items-center gap-1.5 text-red-400">
            <XCircle className="h-3 w-3" />
            <span className="text-[11px] font-mono">FAILED</span>
          </div>
        )}
      </div>

      {/* Log stream */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 bg-black/60 font-mono text-xs space-y-0"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="text-emerald-500 mb-2">$ agent scan --type={detail?.type ?? "…"} --ai-analysis=true</div>
        {(detail?.logs ?? []).map(log => <LogLine key={log.id} log={log} />)}
        {isRunning && (
          <div className="flex items-center gap-2 mt-1 text-zinc-600">
            <span className="animate-pulse">▊</span>
          </div>
        )}
      </div>

      {/* Reports */}
      {!isRunning && detail && detail.reports.length > 0 && (
        <div className="border-t border-white/[0.06] p-4 max-h-80 overflow-y-auto space-y-2">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">
            {detail.reports.length} Finding{detail.reports.length !== 1 ? "s" : ""}
          </p>
          {detail.reports
            .sort((a, b) => {
              const order: Severity[] = ["critical", "high", "medium", "low", "info"];
              return order.indexOf(a.severity) - order.indexOf(b.severity);
            })
            .map(r => <ReportCard key={r.id} report={r} />)}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIAgentPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [scans, setScans] = useState<Scan[]>([]);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [selectedScan, setSelectedScan] = useState<ScanDetail | null>(null);
  const [view, setView] = useState<"home" | "terminal" | "history" | "detail">("home");
  const [loadingScans, setLoadingScans] = useState(true);
  const [runningType, setRunningType] = useState<ScanType | null>(null);

  const loadScans = useCallback(async () => {
    try {
      const r = await authFetch(`${BASE}/api/ai-agent/scans`);
      if (r.ok) setScans(await r.json());
    } finally {
      setLoadingScans(false);
    }
  }, []);

  useEffect(() => { loadScans(); }, [loadScans]);

  async function startScan(type: ScanType) {
    setRunningType(type);
    try {
      const r = await authFetch(`${BASE}/api/ai-agent/scan`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      if (!r.ok) {
        toast({ title: "Failed to start scan", variant: "destructive" });
        setRunningType(null);
        return;
      }
      const { scanId } = await r.json();
      setActiveScanId(scanId);
      setView("terminal");
    } catch {
      toast({ title: "Error starting scan", variant: "destructive" });
      setRunningType(null);
    }
  }

  function handleScanComplete(scan: ScanDetail) {
    setRunningType(null);
    loadScans();
    if (scan.status === "failed") {
      toast({
        title: "Scan failed",
        description: scan.summary ?? "An error occurred during scan execution",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Scan complete",
        description: scan.summary ?? `${scan.reports?.length ?? 0} findings generated`,
      });
    }
  }

  async function clearAllScans() {
    if (!confirm("Are you sure you want to clear all scan history?")) return;
    try {
      await authFetch(`${BASE}/api/ai-agent/scans`, { method: "DELETE" });
      loadScans();
      setSelectedScan(null);
      toast({ title: "Scan history cleared", description: "All past scans have been deleted." });
    } catch {
      toast({ title: "Failed to clear scans", variant: "destructive" });
    }
  }

  async function openScan(scan: Scan) {
    const r = await authFetch(`${BASE}/api/ai-agent/scans/${scan.id}`);
    if (r.ok) {
      setSelectedScan(await r.json());
      setView("detail");
    }
  }

  async function deleteScan(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await authFetch(`${BASE}/api/ai-agent/scans/${id}`, { method: "DELETE" });
    loadScans();
    if (selectedScan?.id === id) { setSelectedScan(null); setView("history"); }
    toast({ title: "Scan deleted" });
  }

  const scanTypeConfig = (type: ScanType) => SCAN_TYPES.find(s => s.type === type)!;

  const statusIndicator = (status: ScanStatus) => ({
    running: <span className="flex items-center gap-1 text-amber-400 text-xs font-mono"><Loader2 className="h-3 w-3 animate-spin" />Running</span>,
    completed: <span className="flex items-center gap-1 text-emerald-400 text-xs font-mono"><CheckCircle2 className="h-3 w-3" />Done</span>,
    failed: <span className="flex items-center gap-1 text-red-400 text-xs font-mono"><XCircle className="h-3 w-3" />Failed</span>,
  }[status]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#080808] px-6 py-4 flex items-center gap-4 shrink-0">
        <button
          onClick={() => view !== "home" ? setView("home") : setLocation("/admin")}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.07] text-zinc-500 hover:text-white transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-tight">AI Engineering Agent</p>
            <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Platform Intelligence System</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-[11px] font-mono">ONLINE</span>
        </div>
        <button
          onClick={() => setView("history")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${view === "history" ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-white/[0.07] text-zinc-500 hover:text-white"}`}
        >
          <Clock className="h-3.5 w-3.5" />
          History ({scans.length})
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* HOME — scan launcher */}
        {view === "home" && (
          <div className="flex-1 overflow-y-auto p-6 lg:p-10">
            <div className="max-w-4xl mx-auto space-y-10">
              {/* Hero */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-bold uppercase tracking-widest mb-4">
                  <Activity className="h-3 w-3" />
                  Autonomous Analysis Engine
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                  Platform AI Agent
                </h1>
                <p className="text-zinc-500 text-sm max-w-xl">
                  Run intelligent scans powered by GPT-5. Automatically detects bugs, security issues, performance bottlenecks, and suggests improvements.
                </p>
              </div>

              {/* Scan buttons */}
              <div>
                <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-widest mb-4">Select Scan Type</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SCAN_TYPES.map(scan => (
                    <button
                      key={scan.type}
                      onClick={() => startScan(scan.type)}
                      disabled={!!runningType}
                      className="group relative flex flex-col gap-3 p-5 rounded-2xl border border-white/[0.07] bg-[#0d0d0d] hover:border-white/20 hover:bg-[#111] transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${scan.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${scan.color} flex items-center justify-center shrink-0`}>
                        {runningType === scan.type ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : scan.icon}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{scan.label}</p>
                        <p className="text-zinc-600 text-xs mt-0.5 leading-relaxed">{scan.desc}</p>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-700 group-hover:text-zinc-400 transition-colors text-xs mt-auto">
                        <Play className="h-3 w-3" />
                        <span>Run scan</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent scans */}
              {scans.length > 0 && (
                <div>
                  <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-widest mb-4">Recent Scans</p>
                  <div className="space-y-2">
                    {scans.slice(0, 5).map(scan => {
                      const cfg = scanTypeConfig(scan.type);
                      return (
                        <div
                          key={scan.id}
                          onClick={() => openScan(scan)}
                          className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-[#0d0d0d] hover:bg-[#111] hover:border-white/10 cursor-pointer transition-all group"
                        >
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.color} flex items-center justify-center shrink-0`}>
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold">{cfg.label}</p>
                            {scan.summary && <p className="text-zinc-600 text-xs truncate mt-0.5">{scan.summary}</p>}
                          </div>
                          {statusIndicator(scan.status)}
                          <span className="text-zinc-700 text-xs hidden sm:block">
                            {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
                          </span>
                          <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TERMINAL — active scan */}
        {view === "terminal" && activeScanId && (
          <div className="flex-1 overflow-hidden flex flex-col bg-black/80">
            <ScanTerminal
              scanId={activeScanId}
              onComplete={scan => {
                handleScanComplete(scan);
                setSelectedScan(scan);
              }}
            />
            {selectedScan && selectedScan.status !== "running" && (
              <div className="p-4 border-t border-white/[0.06] flex gap-3 bg-[#0d0d0d] shrink-0">
                <button
                  onClick={() => { setView("detail"); }}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-sm font-bold hover:bg-zinc-200 transition-colors"
                >
                  <BarChart3 className="h-3.5 w-3.5" /> View Full Report
                </button>
                <button
                  onClick={() => setView("home")}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-zinc-300 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors"
                >
                  ← Back
                </button>
              </div>
            )}
          </div>
        )}

        {/* HISTORY — scan list */}
        {view === "history" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Scan History</h2>
                  <p className="text-zinc-600 text-sm mt-0.5">{scans.length} scans recorded</p>
                </div>
                <div className="flex items-center gap-2">
                  {scans.length > 0 && (
                    <button
                      onClick={clearAllScans}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-xs font-semibold transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear History
                    </button>
                  )}
                  <button onClick={loadScans} className="p-2 rounded-xl bg-white/5 border border-white/[0.07] text-zinc-500 hover:text-white transition-all" title="Refresh">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {loadingScans ? (
                <div className="py-20 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-700 mx-auto" />
                </div>
              ) : scans.length === 0 ? (
                <div className="py-20 text-center border border-white/[0.06] rounded-2xl">
                  <Terminal className="h-12 w-12 text-zinc-800 mx-auto mb-3" />
                  <p className="text-zinc-500">No scans yet — run your first scan</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scans.map(scan => {
                    const cfg = scanTypeConfig(scan.type);
                    return (
                      <div
                        key={scan.id}
                        onClick={() => openScan(scan)}
                        className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-[#0d0d0d] hover:bg-[#111] hover:border-white/10 cursor-pointer transition-all group"
                      >
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shrink-0`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-bold">{cfg.label}</p>
                          {scan.summary && <p className="text-zinc-600 text-xs truncate mt-0.5">{scan.summary}</p>}
                          <p className="text-zinc-700 text-[11px] mt-0.5 font-mono">
                            {format(new Date(scan.createdAt), "MMM d, yyyy · HH:mm")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusIndicator(scan.status)}
                          <button
                            onClick={e => deleteScan(scan.id, e)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 border border-white/[0.07] hover:border-red-500/20 text-zinc-600 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DETAIL — scan results */}
        {view === "detail" && selectedScan && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Scan header */}
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${scanTypeConfig(selectedScan.type).color} flex items-center justify-center shrink-0`}>
                  {scanTypeConfig(selectedScan.type).icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-black text-white tracking-tight">{scanTypeConfig(selectedScan.type).label}</h2>
                  <p className="text-zinc-500 text-sm mt-0.5">{selectedScan.summary}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {statusIndicator(selectedScan.status)}
                    <span className="text-zinc-700 text-xs font-mono">
                      {format(new Date(selectedScan.createdAt), "MMM d, yyyy · HH:mm:ss")}
                    </span>
                    {selectedScan.completedAt && (
                      <span className="text-zinc-700 text-xs font-mono">
                        Duration: {Math.round((new Date(selectedScan.completedAt).getTime() - new Date(selectedScan.createdAt).getTime()) / 1000)}s
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Severity summary */}
              {selectedScan.reports.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {(["critical", "high", "medium", "low", "info"] as Severity[]).map(sev => {
                    const count = selectedScan.reports.filter(r => r.severity === sev).length;
                    const cfg = SEVERITY_CONFIG[sev];
                    return (
                      <div key={sev} className={`p-3 rounded-xl border ${cfg.border} ${cfg.bg} text-center`}>
                        <p className={`text-lg font-black ${cfg.color}`}>{count}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${cfg.color}`}>{sev}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reports */}
              {selectedScan.reports.length > 0 && (
                <div>
                  <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-widest mb-3">Findings</p>
                  <div className="space-y-2">
                    {selectedScan.reports
                      .sort((a, b) => {
                        const order: Severity[] = ["critical", "high", "medium", "low", "info"];
                        return order.indexOf(a.severity) - order.indexOf(b.severity);
                      })
                      .map(r => <ReportCard key={r.id} report={r} />)}
                  </div>
                </div>
              )}

              {/* Logs */}
              <div>
                <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-widest mb-3">Scan Logs</p>
                <div className="bg-black/60 rounded-xl border border-white/[0.06] p-4 space-y-0 max-h-80 overflow-y-auto">
                  <div className="text-emerald-500 font-mono text-xs mb-2">$ agent scan --type={selectedScan.type}</div>
                  {selectedScan.logs.map(log => <LogLine key={log.id} log={log} />)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
