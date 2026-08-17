import { useState } from "react";
import { LifeBuoy, CheckCircle2, Clock, MessageSquare, AlertCircle } from "lucide-react";
import { useAuth } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const CATEGORIES = ["billing", "technical", "content", "account", "other"] as const;

export default function Support() {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", category: "other" as typeof CATEGORIES[number] });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast({ title: "Missing fields", description: "Please fill in both subject and message.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const resp = await fetch(`${BASE}/api/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!resp.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      toast({ title: "Error", description: "Could not submit ticket. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Ticket Submitted!</h2>
        <p className="text-muted-foreground max-w-sm mb-6">Our team will review your request and respond as soon as possible. You'll be notified via email.</p>
        <button onClick={() => setSubmitted(false)} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-sm font-semibold transition-colors">
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <LifeBuoy className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
            <p className="text-muted-foreground text-sm">Submit a request and our team will get back to you.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Clock className="h-4 w-4" />, label: "Response Time", value: "< 24 hours" },
          { icon: <MessageSquare className="h-4 w-4" />, label: "Support Channel", value: "Email & Ticket" },
          { icon: <AlertCircle className="h-4 w-4" />, label: "Priority Support", value: "Creators & Pro" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-muted/50 border border-border p-4 text-center">
            <div className="flex justify-center text-violet-500 mb-1.5">{item.icon}</div>
            <div className="text-foreground text-sm font-semibold">{item.value}</div>
            <div className="text-muted-foreground text-xs mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl bg-card border border-border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: cat }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border capitalize transition-all ${
                  form.category === cat
                    ? "bg-violet-600 border-violet-500 text-white"
                    : "bg-background border-border text-muted-foreground hover:border-violet-500/50 hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">Subject</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="Brief description of your issue"
            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/60 text-sm transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">Message</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Describe your issue in detail..."
            rows={5}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/60 text-sm transition-colors resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {loading ? "Submitting..." : "Submit Support Ticket"}
        </button>
      </form>
    </div>
  );
}
