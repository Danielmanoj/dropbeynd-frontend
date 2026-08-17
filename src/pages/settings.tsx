import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  User, Mail, Save, ShieldCheck, ShieldAlert, Bell,
  CheckCircle, Clock, AlertCircle, Heart, Bookmark,
  Lock, Play, Image as ImageIcon, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "wouter";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/back-button";
import { DropzoneUploader } from "@/components/upload/dropzone-uploader";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  avatarUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
});

function VerificationStatus({ status }: { status: string | null }) {
  if (status === "approved") return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
      <CheckCircle className="h-4 w-4" /> Verified Creator
    </div>
  );
  if (status === "pending") return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm font-medium">
      <Clock className="h-4 w-4" /> Verification Pending
    </div>
  );
  if (status === "rejected") return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium">
      <AlertCircle className="h-4 w-4" /> Verification Rejected — Reapply
    </div>
  );
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border text-muted-foreground text-sm font-medium">
      <ShieldAlert className="h-4 w-4" /> Not Verified
    </div>
  );
}

interface PostItem {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string | null;
  title: string | null;
  body: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  mediaType: string | null;
  isLocked: boolean;
  createdAt: string;
}

function MiniPostCard({ post }: { post: PostItem }) {
  const thumb = post.thumbnailUrl ?? post.mediaUrl;
  const mediaIcon = post.mediaType === "video" ? <Play className="h-3 w-3" /> :
    post.mediaType === "image" ? <ImageIcon className="h-3 w-3" /> :
    post.mediaType === "pdf" ? <FileText className="h-3 w-3" /> : null;

  return (
    <Link href={`/creators/${post.creatorId}`}>
      <div className="flex gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:border-border/70 hover:bg-muted transition-all cursor-pointer group">
        <div className="shrink-0 h-14 w-14 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center">
              {mediaIcon ?? <FileText className="h-5 w-5 text-white/50" />}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-foreground text-sm font-semibold truncate leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            {post.title ?? "Untitled Post"}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5 truncate">{post.creatorName}</p>
          {post.body && (
            <p className="text-muted-foreground/70 text-xs mt-0.5 line-clamp-1">{post.body}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          {post.isLocked && (
            <span className="flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 rounded-full px-2 py-0.5 font-medium">
              <Lock className="h-2.5 w-2.5" /> Premium
            </span>
          )}
          {mediaIcon && (
            <span className="flex items-center gap-1 text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">
              {mediaIcon}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function PostListSection({
  title, icon, endpoint, emptyMessage,
}: {
  title: string;
  icon: React.ReactNode;
  endpoint: string;
  emptyMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function toggle() {
    if (!open && !loaded) {
      setLoading(true);
      try {
        const r = await fetch(`${BASE}${endpoint}`, { credentials: "include" });
        if (r.ok) setPosts(await r.json());
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    }
    setOpen(v => !v);
  }

  return (
    <Card className="bg-card border-border rounded-2xl shadow-sm">
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={toggle}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground text-lg flex items-center gap-2">
            {icon} {title}
            {loaded && posts.length > 0 && (
              <span className="ml-1 text-xs bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-500/30 rounded-full px-2 py-0.5 font-normal">
                {posts.length}
              </span>
            )}
          </CardTitle>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        <CardDescription>
          {title === "Liked Posts" ? "All posts you've liked across the platform." : "All posts you've saved for later."}
        </CardDescription>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 pb-4 space-y-2">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/40 animate-pulse">
                <div className="h-14 w-14 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-2/3 bg-muted rounded" />
                  <div className="h-3 w-1/3 bg-muted rounded" />
                </div>
              </div>
            ))
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground text-sm italic py-4 text-center">{emptyMessage}</p>
          ) : (
            posts.map(p => <MiniPostCard key={p.id} post={p} />)
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();

  const [notifNewPost, setNotifNewPost] = useState(true);
  const [notifNewCourse, setNotifNewCourse] = useState(true);
  const [notifFollower, setNotifFollower] = useState(true);
  const [notifTip, setNotifTip] = useState(true);

  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [requestingVerification, setRequestingVerification] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", avatarUrl: "" },
  });

  useEffect(() => {
    if (user) {
      if (!form.getValues("name") && user.name) form.setValue("name", user.name);
      if (!form.getValues("avatarUrl") && user.avatarUrl) form.setValue("avatarUrl", user.avatarUrl);
      fetch(`${BASE}/api/verifications/my-status`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setVerificationStatus(d?.status ?? null))
        .catch(() => {});
    }
  }, [user]);

  const requestVerification = async () => {
    setRequestingVerification(true);
    try {
      const res = await fetch(`${BASE}/api/verifications/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Requesting creator verification." }),
      });
      if (res.ok) {
        setVerificationStatus("pending");
        toast({ title: "Verification requested", description: "Your request is under review." });
      } else {
        const e = await res.json().catch(() => ({}));
        toast({ title: "Error", description: e.error ?? "Could not submit request.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    } finally {
      setRequestingVerification(false);
    }
  };

  function invalidateUser() {
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    queryClient.invalidateQueries();
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateMe.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Settings saved", description: "Your profile has been updated." });
        invalidateUser();
      },
      onError: () => toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" }),
    });
  }

  function handleAvatarUploaded(url: string) {
    form.setValue("avatarUrl", url);
    updateMe.mutate({ data: { avatarUrl: url, name: form.getValues("name") || user?.name || "" } }, {
      onSuccess: () => {
        toast({ title: "Profile picture updated!", description: "Your avatar has been saved." });
        invalidateUser();
      },
      onError: () => toast({ title: "Error", description: "Failed to save avatar.", variant: "destructive" }),
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const currentAvatar = form.watch("avatarUrl") || user?.avatarUrl || undefined;

  return (
    <div className="max-w-2xl mx-auto pb-16 space-y-6">
      <div className="flex items-center gap-3 mb-2"><BackButton /></div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your profile, verification, and notification preferences.</p>
      </div>

      {/* ── Profile Form ── */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-card border-border rounded-2xl shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-violet-500" /> Profile Information
              </CardTitle>
              <CardDescription>This information is displayed publicly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-6 pb-6 border-b border-border">
                <div className="shrink-0">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarImage src={currentAvatar} />
                    <AvatarFallback className="text-2xl bg-violet-600/20 text-violet-600 dark:text-violet-300">
                      {form.watch("name")?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <h3 className="font-medium text-foreground text-sm">Profile Picture</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP · max 5MB · drag & drop or browse</p>
                  </div>
                  <DropzoneUploader
                    uploadType="profile"
                    circular={false}
                    label=""
                    hint="Drag an image here or click to browse · max 2MB"
                    className="max-w-xs"
                    persistKey="avatar"
                    defaultPreview={currentAvatar}
                    onUploadComplete={handleAvatarUploaded}
                  />
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Or paste an image URL</Label>
                    <FormField control={form.control} name="avatarUrl" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/avatar.jpg"
                            className="max-w-xs text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-sm flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email Address
                  </Label>
                  <Input value={user?.email || ""} disabled className="max-w-md" />
                  <p className="text-xs text-muted-foreground/70">Managed via your Clerk account.</p>
                </div>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input className="max-w-md" {...field} />
                    </FormControl>
                    <FormDescription>Your public display name on CreatorHub.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t border-border flex justify-end py-4 px-6 rounded-b-2xl">
              <Button type="submit" disabled={updateMe.isPending}
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-2 rounded-xl">
                <Save className="h-4 w-4" />
                {updateMe.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {/* ── Liked Posts ── */}
      <PostListSection
        title="Liked Posts"
        icon={<Heart className="h-5 w-5 text-rose-500" />}
        endpoint="/api/users/liked-posts"
        emptyMessage="You haven't liked any posts yet."
      />

      {/* ── Saved Posts ── */}
      <PostListSection
        title="Saved Posts"
        icon={<Bookmark className="h-5 w-5 text-violet-500" />}
        endpoint="/api/users/bookmarks"
        emptyMessage="You haven't saved any posts yet."
      />

      {/* ── Verification ── */}
      <Card className="bg-card border-border rounded-2xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-foreground text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-500" /> Creator Verification
          </CardTitle>
          <CardDescription>Get a verified badge to build trust with your audience.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <VerificationStatus status={verificationStatus} />
          <p className="text-muted-foreground text-sm">Verified creators get a badge on their profile, higher search visibility, and priority support.</p>
          {(verificationStatus === null || verificationStatus === "rejected") && (
            <Button onClick={requestVerification} disabled={requestingVerification} variant="outline"
              className="border-violet-500/50 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300 gap-2 rounded-xl">
              <ShieldCheck className="h-4 w-4" />
              {requestingVerification ? "Submitting…" : "Request Verification"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Notification Preferences ── */}
      <Card className="bg-card border-border rounded-2xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-foreground text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-violet-500" /> Notification Preferences
          </CardTitle>
          <CardDescription>Choose what activity you want to be notified about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {[
            { label: "New posts from creators you follow", value: notifNewPost, set: setNotifNewPost },
            { label: "New courses from creators you follow", value: notifNewCourse, set: setNotifNewCourse },
            { label: "New followers", value: notifFollower, set: setNotifFollower },
            { label: "Tips received", value: notifTip, set: setNotifTip },
          ].map(({ label, value, set }) => (
            <div key={label} className="flex items-center justify-between py-3 border-b border-border/60 last:border-0">
              <span className="text-foreground/80 text-sm">{label}</span>
              <Switch checked={value} onCheckedChange={set} className="data-[state=checked]:bg-violet-600" />
            </div>
          ))}
        </CardContent>
        <CardFooter className="bg-muted/30 border-t border-border flex justify-end py-4 px-6 rounded-b-2xl">
          <Button variant="outline" size="sm"
            onClick={() => toast({ title: "Preferences saved", description: "Notification settings updated." })}
            className="gap-2 rounded-xl">
            <Save className="h-3.5 w-3.5" /> Save Preferences
          </Button>
        </CardFooter>
      </Card>

      {/* ── Danger Zone ── */}
      <Card className="bg-card border-red-500/30 rounded-2xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-red-500 text-lg">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions that affect your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">To delete your account or transfer data, contact <span className="text-violet-600 dark:text-violet-400">support@creatorhub.com</span>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
