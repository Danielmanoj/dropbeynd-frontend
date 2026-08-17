import { useState, useEffect } from "react";
import { Heart, MessageCircle, DollarSign, Flag, Send, ChevronDown, ChevronUp, Bookmark, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface Comment {
  id: string;
  userName: string;
  userAvatarUrl: string | null;
  body: string;
  replies: Comment[];
  createdAt: string;
}

interface PostInteractionsProps {
  postId: string;
  creatorId: string;
  initialLikeCount?: number;
  isBookmarked?: boolean;
  isLocked?: boolean;
  canAccess?: boolean;
  onBookmarkChange?: (saved: boolean) => void;
}

const TIP_AMOUNTS = [1, 3, 5, 10, 25];

export function PostInteractions({
  postId,
  creatorId,
  initialLikeCount = 0,
  isBookmarked = false,
  isLocked = false,
  canAccess = true,
  onBookmarkChange,
}: PostInteractionsProps) {
  const { isSignedIn } = useAuth();
  const { toast } = useToast();

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tipAmount, setTipAmount] = useState(5);
  const [tipMessage, setTipMessage] = useState("");
  const [tipping, setTipping] = useState(false);
  const [tipSent, setTipSent] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/content/${postId}/like-status`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setLiked(d.liked); setLikeCount(d.likeCount); } })
      .catch(() => {});
  }, [postId]);

  async function toggleLike() {
    if (!isSignedIn) {
      toast({ title: "Sign in required", description: "Sign in to like posts.", variant: "destructive" });
      return;
    }
    if (isLocked && !canAccess) {
      toast({
        title: "Locked content",
        description: "Subscribe to unlock and view this post before liking.",
        variant: "destructive",
      });
      return;
    }
    const method = liked ? "DELETE" : "POST";
    const r = await fetch(`${BASE}/api/content/${postId}/like`, { method, credentials: "include" });
    if (r.ok) {
      const data = await r.json();
      setLiked(data.liked);
      setLikeCount(data.likeCount);
      toast({ title: data.liked ? "Post liked!" : "Like removed" });
    } else {
      const err = await r.json().catch(() => ({}));
      toast({ title: "Could not like", description: err.error ?? "Could not update like.", variant: "destructive" });
    }
  }

  async function toggleBookmark() {
    if (!isSignedIn) {
      toast({ title: "Sign in required", description: "Sign in to save posts.", variant: "destructive" });
      return;
    }
    const newState = !bookmarked;
    const r = await fetch(`${BASE}/api/content/posts/${postId}/bookmark`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarked: newState }),
    });
    if (r.ok) {
      setBookmarked(newState);
      onBookmarkChange?.(newState);
      toast({ title: newState ? "Post saved!" : "Removed from saved" });
    } else {
      toast({ title: "Error", description: "Could not update save.", variant: "destructive" });
    }
  }

  function sharePost() {
    const url = `${window.location.origin}${BASE}/creators/${creatorId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied!", description: "Creator page link copied to clipboard." });
    }).catch(() => {
      toast({ title: "Share", description: url });
    });
  }

  async function loadComments() {
    const r = await fetch(`${BASE}/api/content/${postId}/comments`);
    if (r.ok) setComments(await r.json());
  }

  async function toggleComments() {
    if (!showComments && comments.length === 0) await loadComments();
    setShowComments(!showComments);
  }

  async function submitComment() {
    if (!commentText.trim() || !isSignedIn) return;
    setSubmittingComment(true);
    const r = await fetch(`${BASE}/api/content/${postId}/comments`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentText }),
    });
    if (r.ok) {
      const c = await r.json();
      setComments(prev => [c, ...prev]);
      setCommentText("");
      toast({ title: "Comment posted!" });
    } else {
      toast({ title: "Error", description: "Could not post comment.", variant: "destructive" });
    }
    setSubmittingComment(false);
  }

  async function sendTip() {
    if (!isSignedIn || tipping) return;
    setTipping(true);
    const r = await fetch(`${BASE}/api/tips`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId, amount: tipAmount, message: tipMessage }),
    });
    if (r.ok) {
      setTipSent(true);
      toast({ title: `$${tipAmount} tip sent!`, description: "Thank you for supporting this creator." });
      setTimeout(() => { setShowTip(false); setTipSent(false); setTipMessage(""); }, 2000);
    } else {
      toast({ title: "Error", description: "Could not send tip.", variant: "destructive" });
    }
    setTipping(false);
  }

  async function sendReport() {
    if (!isSignedIn) return;
    await fetch(`${BASE}/api/reports`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId: postId, contentType: "post", reason: reportReason }),
    });
    setReportSent(true);
    toast({ title: "Report submitted", description: "We'll review this content." });
    setTimeout(() => { setShowReport(false); setReportSent(false); }, 2000);
  }

  return (
    <div className="border-t border-border pt-3 space-y-3">
      {/* ── Action row ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Like */}
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            liked
              ? "bg-rose-500/20 text-rose-500 border border-rose-500/40"
              : "bg-muted text-muted-foreground border border-border hover:bg-accent hover:text-rose-500"
          }`}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-rose-500" : ""}`} />
          <span className="tabular-nums">{likeCount > 0 ? likeCount : "Like"}</span>
        </button>

        {/* Comment */}
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-accent hover:text-blue-500 transition-all"
        >
          <MessageCircle className="h-4 w-4" />
          {showComments ? "Hide" : "Comment"}
          {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {/* Save */}
        {isSignedIn && (
          <button
            onClick={toggleBookmark}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              bookmarked
                ? "bg-violet-500/20 text-violet-500 border border-violet-500/40"
                : "bg-muted text-muted-foreground border border-border hover:bg-accent hover:text-violet-500"
            }`}
          >
            <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-violet-500" : ""}`} />
            {bookmarked ? "Saved" : "Save"}
          </button>
        )}

        {/* Share */}
        <button
          onClick={sharePost}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-accent hover:text-emerald-500 transition-all"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>

        {/* Tip */}
        {isSignedIn && (
          <button
            onClick={() => setShowTip(!showTip)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-accent hover:text-yellow-500 transition-all"
          >
            <DollarSign className="h-4 w-4" />
            Tip
          </button>
        )}

        {/* Report */}
        {isSignedIn && (
          <button
            onClick={() => setShowReport(!showReport)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-accent hover:text-orange-500 transition-all ml-auto"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Sign-in prompt */}
        {!isSignedIn && (
          <Link href="/sign-in" className="text-violet-500 hover:text-violet-400 text-xs underline underline-offset-2 ml-1">
            Sign in to interact
          </Link>
        )}
      </div>

      {/* ── Tip panel ── */}
      {showTip && (
        <div className="bg-muted/60 border border-border rounded-xl p-4 space-y-3">
          {tipSent ? (
            <p className="text-yellow-500 text-center font-semibold">🎉 Tip sent! Thank you!</p>
          ) : (
            <>
              <p className="text-foreground text-sm font-semibold">Send a tip to this creator</p>
              <div className="flex gap-2 flex-wrap">
                {TIP_AMOUNTS.map(a => (
                  <button key={a} onClick={() => setTipAmount(a)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                      tipAmount === a
                        ? "bg-yellow-500 text-zinc-900 border-yellow-400"
                        : "bg-background text-foreground border-border hover:border-yellow-500 hover:text-yellow-500"
                    }`}
                  >
                    ${a}
                  </button>
                ))}
              </div>
              <input value={tipMessage} onChange={e => setTipMessage(e.target.value)}
                placeholder="Add a message (optional)"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-yellow-500"
              />
              <Button size="sm" onClick={sendTip} disabled={tipping}
                className="bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-bold">
                {tipping ? "Sending..." : `Send $${tipAmount} tip 💰`}
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Report panel ── */}
      {showReport && (
        <div className="bg-muted/60 border border-border rounded-xl p-4 space-y-3">
          {reportSent ? (
            <p className="text-orange-500 text-sm font-semibold">✓ Report submitted. We'll review this content.</p>
          ) : (
            <>
              <p className="text-foreground text-sm font-semibold">Report this content</p>
              <select value={reportReason} onChange={e => setReportReason(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-orange-500">
                <option value="spam">Spam</option>
                <option value="abuse">Abuse / Harassment</option>
                <option value="misinformation">Misinformation</option>
                <option value="nudity">Nudity / Adult content</option>
                <option value="copyright">Copyright violation</option>
                <option value="other">Other</option>
              </select>
              <Button size="sm" onClick={sendReport} className="bg-orange-600 hover:bg-orange-500 text-white">
                Submit Report
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Comments ── */}
      {showComments && (
        <div className="space-y-3">
          {isSignedIn && (
            <div className="flex gap-2">
              <Textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                className="resize-none min-h-[56px] text-sm"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              />
              <Button size="sm" onClick={submitComment}
                disabled={submittingComment || !commentText.trim()}
                className="bg-violet-600 hover:bg-violet-500 self-end shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-2">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {c.userName[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 bg-muted/60 rounded-xl px-3 py-2">
                    <p className="text-foreground text-xs font-semibold mb-0.5">{c.userName}</p>
                    <p className="text-foreground/80 text-sm leading-snug">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
