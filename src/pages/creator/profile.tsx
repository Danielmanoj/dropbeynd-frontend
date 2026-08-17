import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { format } from "date-fns";
import {
  User, Edit3, Save, X, Plus, ExternalLink, Image as ImageIcon,
  FileText, Play, Lock, Eye, EyeOff, Zap, AlertCircle,
  CheckCircle, Clock, Flag, Trash2, BookOpen, BadgeCheck,
  ShieldCheck, ShieldAlert, ShieldX, Pencil, Camera, UploadCloud,
} from "lucide-react";
import { useAuth } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropzoneUploader } from "@/components/upload/dropzone-uploader";
import { useDeletePost, useUpdatePost } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface CreatorProfile {
  id: string;
  userId: string;
  name: string;
  bio: string | null;
  niche: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  monthlyPrice: number;
  subscriberCount: number;
  postCount: number;
  courseCount: number;
  isVerified?: boolean;
}

interface OwnPost {
  id: string;
  creatorId: string;
  title: string | null;
  body: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  mediaType: string | null;
  isLocked: boolean;
  moderationStatus: string;
  moderationScore: number | null;
  createdAt: string;
}

interface EditingPost {
  id: string;
  title: string;
  body: string;
  isLocked: boolean;
}

function ModerationBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-700/40">
          <CheckCircle className="h-2.5 w-2.5" /> Active
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-700/40">
          <Clock className="h-2.5 w-2.5" /> Pending Review
        </span>
      );
    case "review":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950/50 text-blue-400 border border-blue-700/40">
          <Eye className="h-2.5 w-2.5" /> Under Review
        </span>
      );
    case "flagged":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-950/50 text-orange-400 border border-orange-700/40">
          <Flag className="h-2.5 w-2.5" /> Flagged
        </span>
      );
    case "removed":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-950/50 text-red-400 border border-red-700/40">
          <Trash2 className="h-2.5 w-2.5" /> Removed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
          {status}
        </span>
      );
  }
}

const NICHES = [
  "Fitness & Health", "Technology & Coding", "Finance & Investing",
  "Education", "Art & Design", "Music", "Cooking & Food",
  "Travel", "Gaming", "Business & Marketing", "Writing",
  "Yoga & Wellness", "Photography",
];

export default function CreatorProfilePage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const verSession = params.get("ver_session");

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<OwnPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile edit state
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editNiche, setEditNiche] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");

  // Post edit state
  const [editingPost, setEditingPost] = useState<EditingPost | null>(null);
  const [savingPost, setSavingPost] = useState(false);
  const updatePost = useUpdatePost();

  // Verification state
  const [verStatus, setVerStatus] = useState<string | null>(null);
  const [verLoading, setVerLoading] = useState(false);

  async function authFetch(url: string, opts?: RequestInit) {
    const token = await getToken();
    return fetch(url, {
      ...opts,
      credentials: "include",
      headers: {
        ...(opts?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  useEffect(() => {
    authFetch(`${BASE}/api/creators/me`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCreator(d); })
      .catch(() => {})
      .finally(() => setLoading(false));

    authFetch(`${BASE}/api/creators/me/posts`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setPosts(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setPostsLoading(false));

    authFetch(`${BASE}/api/verifications/my-status`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setVerStatus(d.status); })
      .catch(() => {});
  }, []);

  // Handle Stripe verification redirect
  useEffect(() => {
    if (!verSession) return;
    (async () => {
      setVerLoading(true);
      try {
        const r = await authFetch(`${BASE}/api/verifications/verify-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: verSession }),
        });
        if (r.ok) {
          setVerStatus("pending");
          toast({ title: "Payment received!", description: "Your verification request has been submitted. We'll review it shortly." });
        } else {
          const e = await r.json().catch(() => ({}));
          if (e.error?.includes("already pending") || e.error?.includes("Already verified")) {
            toast({ description: "Your verification request is already on file." });
          } else {
            toast({ title: "Could not confirm payment", description: e.error ?? "Please contact support.", variant: "destructive" });
          }
        }
      } catch {
        toast({ title: "Network error", description: "Could not confirm verification payment.", variant: "destructive" });
      } finally {
        setVerLoading(false);
        // Clean the URL
        window.history.replaceState({}, "", `${BASE}/creator/profile`);
      }
    })();
  }, [verSession]);

  function startEdit() {
    if (!creator) return;
    setEditName(creator.name);
    setEditBio(creator.bio ?? "");
    setEditNiche(creator.niche ?? "");
    setEditPrice(String(creator.monthlyPrice));
    setEditCoverUrl(creator.coverUrl ?? "");
    setEditAvatarUrl(creator.avatarUrl ?? "");
    setEditing(true);
  }

  async function handleQuickAvatarUpload(url: string) {
    if (!creator) return;
    setCreator(prev => prev ? { ...prev, avatarUrl: url } : null);
    setEditAvatarUrl(url);
    try {
      const r = await authFetch(`${BASE}/api/creators/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: creator.name,
          avatarUrl: url,
        }),
      });
      if (r.ok) {
        const updated = await r.json();
        setCreator(updated);
        queryClient.invalidateQueries();
        toast({ title: "Profile picture updated!", description: "Your new avatar is live across CreatorHub." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update avatar.", variant: "destructive" });
    }
  }

  async function handleQuickCoverUpload(url: string) {
    if (!creator) return;
    setCreator(prev => prev ? { ...prev, coverUrl: url } : null);
    setEditCoverUrl(url);
    try {
      const r = await authFetch(`${BASE}/api/creators/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: creator.name,
          coverUrl: url,
        }),
      });
      if (r.ok) {
        const updated = await r.json();
        setCreator(updated);
        queryClient.invalidateQueries();
        toast({ title: "Banner image updated!", description: "Your new cover banner is live." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update banner.", variant: "destructive" });
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const parsedPrice = parseFloat(editPrice);
      const r = await authFetch(`${BASE}/api/creators/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          bio: editBio,
          niche: editNiche,
          monthlyPrice: !isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 9.99,
          coverUrl: editCoverUrl || null,
          avatarUrl: editAvatarUrl || null,
        }),
      });
      if (r.ok) {
        const updated = await r.json();
        setCreator(updated);
        setEditing(false);
        queryClient.invalidateQueries();
        toast({ title: "Profile updated!", description: "Your creator profile has been saved." });
      } else {
        const e = await r.json().catch(() => ({}));
        toast({ title: "Error", description: e.error ?? "Failed to save.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function openEditPost(post: OwnPost) {
    setEditingPost({ id: post.id, title: post.title ?? "", body: post.body ?? "", isLocked: post.isLocked });
  }

  async function saveEditedPost() {
    if (!editingPost) return;
    setSavingPost(true);
    updatePost.mutate(
      { postId: editingPost.id, data: { title: editingPost.title, body: editingPost.body, isLocked: editingPost.isLocked } },
      {
        onSuccess: (updated) => {
          setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, title: updated.title ?? null, body: updated.body ?? null, isLocked: updated.isLocked } : p));
          setEditingPost(null);
          toast({ title: "Post updated!" });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update post.", variant: "destructive" });
        },
        onSettled: () => setSavingPost(false),
      }
    );
  }

  function handlePostDeleted(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id));
    toast({ title: "Post deleted." });
  }

  async function requestVerification() {
    setVerLoading(true);
    try {
      const r = await authFetch(`${BASE}/api/verifications/checkout`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) {
        if (data.error?.includes("pending")) {
          setVerStatus("pending");
          toast({ description: "Your verification request is already pending review." });
        } else {
          toast({ title: "Error", description: data.error ?? "Failed to start verification.", variant: "destructive" });
        }
        return;
      }
      if (data.submitted) {
        // Dev mode — auto submitted
        setVerStatus("pending");
        toast({ title: "Verification request submitted!", description: "We'll review your profile shortly." });
      } else if (data.url) {
        // Stripe redirect
        window.location.href = data.url;
      }
    } catch {
      toast({ title: "Network error", description: "Could not start verification.", variant: "destructive" });
    } finally {
      setVerLoading(false);
    }
  }

  const activeCount = posts.filter(p => p.moderationStatus === "active").length;
  const pendingCount = posts.filter(p => p.moderationStatus === "pending" || p.moderationStatus === "review").length;
  const flaggedCount = posts.filter(p => p.moderationStatus === "flagged" || p.moderationStatus === "removed").length;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-zinc-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">No creator profile found</h2>
        <p className="text-muted-foreground mb-6">You don't have a creator profile yet. Set one up to start publishing.</p>
        <Link href="/role-selection">
          <Button className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Create Creator Profile
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage how you appear to subscribers and followers.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/creators/${creator.id}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
              <ExternalLink className="h-3.5 w-3.5" /> Public View
            </Button>
          </Link>
          <Link href="/creator/posts/new">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl overflow-hidden border border-border bg-card">
        {/* Cover */}
        <div className="relative h-36 md:h-52 group">
          {editing && editCoverUrl ? (
            <img src={editCoverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : creator.coverUrl ? (
            <img src={creator.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900 via-violet-800 to-zinc-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-black/20 to-transparent" />
          
          {!editing && (
            <div className="absolute top-3 right-3 opacity-90 hover:opacity-100 transition-opacity">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur border border-white/20 shadow-lg">
                <Camera className="h-3.5 w-3.5" />
                Change Banner
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    toast({ title: "Uploading banner..." });
                    const res = await fetch(`${BASE}/api/storage/cloudinary/sign`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ uploadType: "cover", contentType: f.type, size: f.size }),
                    });
                    if (!res.ok) {
                      toast({ title: "Upload failed", description: "Could not prepare upload.", variant: "destructive" });
                      return;
                    }
                    const sig = await res.json();
                    const fd = new FormData();
                    fd.append("file", f);
                    fd.append("api_key", sig.apiKey);
                    fd.append("timestamp", String(sig.timestamp));
                    fd.append("signature", sig.signature);
                    fd.append("folder", sig.folder);
                    const upRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`, {
                      method: "POST",
                      body: fd,
                    });
                    if (upRes.ok) {
                      const data = await upRes.json();
                      await handleQuickCoverUpload(data.secure_url);
                    } else {
                      toast({ title: "Upload failed", variant: "destructive" });
                    }
                  }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Avatar + info row */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end -mt-12 relative z-10">
            <div className="relative group p-1 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 w-fit shadow-2xl">
              <Avatar className="h-24 w-24 border-4 border-background rounded-full">
                <AvatarImage
                  src={(editing ? editAvatarUrl : creator.avatarUrl) || undefined}
                  alt={creator.name}
                />
                <AvatarFallback className="bg-violet-600 text-white text-3xl font-extrabold rounded-full">
                  {creator.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              {!editing && (
                <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
                  <Camera className="h-6 w-6 drop-shadow" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      toast({ title: "Uploading avatar..." });
                      const res = await fetch(`${BASE}/api/storage/cloudinary/sign`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ uploadType: "profile", contentType: f.type, size: f.size }),
                      });
                      if (!res.ok) {
                        toast({ title: "Upload failed", description: "Could not prepare upload.", variant: "destructive" });
                        return;
                      }
                      const sig = await res.json();
                      const fd = new FormData();
                      fd.append("file", f);
                      fd.append("api_key", sig.apiKey);
                      fd.append("timestamp", String(sig.timestamp));
                      fd.append("signature", sig.signature);
                      fd.append("folder", sig.folder);
                      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`, {
                        method: "POST",
                        body: fd,
                      });
                      if (upRes.ok) {
                        const data = await upRes.json();
                        await handleQuickAvatarUpload(data.secure_url);
                      } else {
                        toast({ title: "Upload failed", variant: "destructive" });
                      }
                    }}
                  />
                </label>
              )}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{creator.name}</h2>
                {creator.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
                {creator.niche && (
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/40 text-xs">
                    {creator.niche}
                  </Badge>
                )}
              </div>
              {creator.bio && (
                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{creator.bio}</p>
              )}
            </div>
            {!editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={startEdit}
                className="rounded-xl gap-1.5 self-start sm:self-auto hover:border-violet-500"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit Profile
              </Button>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-3 mt-5">
            {[
              { label: "Subscribers", value: creator.subscriberCount.toLocaleString() },
              { label: "Posts", value: creator.postCount.toLocaleString() },
              { label: "Courses", value: creator.courseCount.toLocaleString() },
              { label: "Monthly Price", value: `$${creator.monthlyPrice}/mo` },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col items-center px-4 py-2 rounded-xl bg-muted/60 border border-border/50 min-w-[80px]">
                <span className="text-foreground font-bold text-lg leading-none">{stat.value}</span>
                <span className="text-muted-foreground text-xs mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="border-t border-border px-6 py-6 space-y-5 bg-background/30">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-violet-400" /> Edit Profile
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">Display Name</label>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className=""
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">Monthly Price ($)</label>
                <Input
                  type="number"
                  min="0.99"
                  step="0.01"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className=""
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">Niche / Category</label>
              <div className="flex flex-wrap gap-2">
                {NICHES.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEditNiche(editNiche === n ? "" : n)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      editNiche === n
                        ? "bg-violet-600 border-violet-500 text-white"
                        : "bg-muted border-border text-muted-foreground hover:border-violet-500 hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">Bio</label>
              <Textarea
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                rows={3}
                placeholder="Tell your audience about yourself…"
                className="resize-none"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">Profile Picture</label>
                <DropzoneUploader
                  uploadType="profile"
                  accept="image"
                  circular={false}
                  label=""
                  hint="JPG, PNG, WebP · max 2MB"
                  persistKey="creator-avatar"
                  defaultPreview={editAvatarUrl || undefined}
                  onUploadComplete={url => {
                    setEditAvatarUrl(url);
                    toast({ title: "Avatar uploaded!", description: "Click Save Changes below to save to your profile." });
                  }}
                />
                <Input
                  value={editAvatarUrl}
                  onChange={e => setEditAvatarUrl(e.target.value)}
                  placeholder="Or paste image URL"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">Cover Image</label>
                <DropzoneUploader
                  uploadType="cover"
                  accept="image"
                  circular={false}
                  label=""
                  hint="JPG, PNG, WebP · max 5MB — banner image"
                  persistKey="creator-cover"
                  defaultPreview={editCoverUrl || undefined}
                  onUploadComplete={url => {
                    setEditCoverUrl(url);
                    toast({ title: "Cover banner uploaded!", description: "Click Save Changes below to save to your profile." });
                  }}
                />
                <Input
                  value={editCoverUrl}
                  onChange={e => setEditCoverUrl(e.target.value)}
                  placeholder="Or paste cover URL"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={saveProfile}
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditing(false)}
                className="rounded-xl gap-2"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Verification Badge Section ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0 mt-0.5">
              <BadgeCheck className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
                Verified Creator Badge
              </h3>
              {creator.isVerified ? (
                <p className="text-muted-foreground text-sm mt-0.5">Your account is verified. The blue checkmark appears on your profile and posts.</p>
              ) : verStatus === "pending" ? (
                <p className="text-muted-foreground text-sm mt-0.5">Your verification request is under review. We'll notify you once it's approved.</p>
              ) : verStatus === "rejected" ? (
                <p className="text-muted-foreground text-sm mt-0.5">Your last request was not approved. You can submit a new request.</p>
              ) : (
                <p className="text-muted-foreground text-sm mt-0.5">
                  Get a verified badge to build trust with your audience.{" "}
                  <span className="text-foreground font-medium">$5/month</span>
                  {" "}— cancel anytime.
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {creator.isVerified ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30">
                <ShieldCheck className="h-4 w-4" /> Verified
              </span>
            ) : verStatus === "pending" ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Clock className="h-4 w-4" /> Under Review
              </span>
            ) : verStatus === "rejected" ? (
              <Button
                onClick={requestVerification}
                disabled={verLoading}
                size="sm"
                className="bg-muted hover:bg-muted/80 text-foreground rounded-xl gap-1.5"
              >
                <ShieldAlert className="h-4 w-4" />
                {verLoading ? "Processing…" : "Re-apply — $5/mo"}
              </Button>
            ) : (
              <Button
                onClick={requestVerification}
                disabled={verLoading}
                size="sm"
                className="gap-1.5 rounded-xl font-semibold text-black"
                style={{ background: "linear-gradient(135deg, #60a5fa, #3b82f6)" }}
              >
                <Zap className="h-4 w-4" />
                {verLoading ? "Processing…" : "Get Verified — $5"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Post Dialog ───────────────────────────────────────────────── */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-foreground font-semibold text-lg flex items-center gap-2">
                <Pencil className="h-4 w-4 text-violet-400" /> Edit Post
              </h2>
              <button
                onClick={() => setEditingPost(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-sm font-medium">Title <span className="text-muted-foreground/60">(optional)</span></label>
                <Input
                  value={editingPost.title}
                  onChange={e => setEditingPost(p => p ? { ...p, title: e.target.value } : p)}
                  placeholder="Enter a title…"
                  className=""
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-sm font-medium">Content</label>
                <Textarea
                  value={editingPost.body}
                  onChange={e => setEditingPost(p => p ? { ...p, body: e.target.value } : p)}
                  placeholder="Write your post content…"
                  rows={6}
                  className="resize-none"
                />
              </div>
              <div className="flex items-center justify-between bg-muted/60 rounded-xl px-4 py-3 border border-border/50">
                <div>
                  <p className="text-foreground text-sm font-medium">Premium / Locked</p>
                  <p className="text-muted-foreground text-xs">Only paying subscribers can view this</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPost(p => p ? { ...p, isLocked: !p.isLocked } : p)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editingPost.isLocked ? "bg-violet-600" : "bg-zinc-600"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editingPost.isLocked ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <Button
                variant="outline"
                onClick={() => setEditingPost(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={saveEditedPost}
                disabled={savingPost}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl gap-2"
              >
                <Save className="h-4 w-4" />
                {savingPost ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Posts section ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Your Posts</h2>
            <p className="text-muted-foreground text-sm mt-0.5">{posts.length} total · {activeCount} live · {pendingCount} in review{flaggedCount > 0 ? ` · ${flaggedCount} flagged` : ""}</p>
          </div>
          <Link href="/creator/posts/new">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Post
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="bg-muted border border-border h-10 rounded-xl p-1 mb-5 w-auto inline-flex gap-0.5">
            <TabsTrigger value="all" className="rounded-lg text-xs data-[state=active]:bg-violet-600 data-[state=active]:text-white text-muted-foreground px-4">
              All ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg text-xs data-[state=active]:bg-violet-600 data-[state=active]:text-white text-muted-foreground px-4">
              Live ({activeCount})
            </TabsTrigger>
            {pendingCount > 0 && (
              <TabsTrigger value="pending" className="rounded-lg text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white text-muted-foreground px-4">
                Review ({pendingCount})
              </TabsTrigger>
            )}
            {flaggedCount > 0 && (
              <TabsTrigger value="flagged" className="rounded-lg text-xs data-[state=active]:bg-red-700 data-[state=active]:text-white text-muted-foreground px-4">
                Flagged ({flaggedCount})
              </TabsTrigger>
            )}
          </TabsList>

          {(["all", "active", "pending", "flagged"] as const).map(tab => {
            const filtered = tab === "all" ? posts
              : tab === "active" ? posts.filter(p => p.moderationStatus === "active")
              : tab === "pending" ? posts.filter(p => p.moderationStatus === "pending" || p.moderationStatus === "review")
              : posts.filter(p => p.moderationStatus === "flagged" || p.moderationStatus === "removed");

            return (
              <TabsContent key={tab} value={tab} className="space-y-3 mt-0">
                {postsLoading ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 bg-muted/20 border border-border rounded-2xl">
                    <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      {tab === "all" ? "You haven't published any posts yet." : `No ${tab} posts.`}
                    </p>
                    {tab === "all" && (
                      <Link href="/creator/posts/new">
                        <Button size="sm" className="mt-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> Create Your First Post
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  filtered.map(post => (
                    <PostRow
                      key={post.id}
                      post={post}
                      creatorId={creator.id}
                      onEdit={openEditPost}
                      onDeleted={handlePostDeleted}
                    />
                  ))
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}

// ─── PostRow ──────────────────────────────────────────────────────────────────

function PostRow({
  post,
  creatorId,
  onEdit,
  onDeleted,
}: {
  post: OwnPost;
  creatorId: string;
  onEdit: (post: OwnPost) => void;
  onDeleted: (id: string) => void;
}) {
  const { toast } = useToast();
  const deletePost = useDeletePost();
  const thumb = post.thumbnailUrl ?? post.mediaUrl;
  const mediaIcon =
    post.mediaType === "video" ? <Play className="h-3.5 w-3.5" /> :
    post.mediaType === "image" ? <ImageIcon className="h-3.5 w-3.5" /> :
    post.mediaType === "pdf" ? <FileText className="h-3.5 w-3.5" /> : null;

  function handleDelete() {
    deletePost.mutate(
      { postId: post.id },
      {
        onSuccess: () => onDeleted(post.id),
        onError: () => toast({ title: "Error", description: "Failed to delete post.", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="flex gap-4 p-4 rounded-xl bg-card border border-border hover:border-border/70 transition-colors group">
      {/* Thumbnail */}
      <div className="shrink-0 h-16 w-16 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
            {mediaIcon ?? <FileText className="h-5 w-5" />}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-semibold truncate leading-tight">
              {post.title ?? "Untitled Post"}
            </p>
            {post.body && (
              <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1 leading-snug">{post.body}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <ModerationBadge status={post.moderationStatus} />
              {post.isLocked ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-700/40">
                  <Lock className="h-2.5 w-2.5" /> Premium
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  <Eye className="h-2.5 w-2.5" /> Free
                </span>
              )}
              {mediaIcon && (
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                  {mediaIcon} {post.mediaType}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            <p className="text-muted-foreground text-[11px]">{format(new Date(post.createdAt), "MMM d, yyyy")}</p>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link href={`/creators/${creatorId}`}>
                <button className="text-[11px] text-violet-500 hover:text-violet-400 transition-colors px-1">
                  View →
                </button>
              </Link>
              <button
                onClick={() => onEdit(post)}
                className="p-1 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-border/70 transition-all"
                title="Edit post"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="p-1 rounded-lg bg-muted border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/40 transition-all"
                    title="Delete post"
                    disabled={deletePost.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove "<strong>{post.title ?? "Untitled Post"}</strong>" and cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-700 hover:bg-red-600 text-white rounded-xl"
                    >
                      Delete Post
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
