import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Type, Lock, Image as ImageIcon, Film, FileText, Camera } from "lucide-react";
import { useCreatePost } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { DropzoneUploader } from "@/components/upload/dropzone-uploader";

const formSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(10, { message: "Content must be at least 10 characters long" }),
  mediaType: z.enum(["none", "image", "video"]),
  mediaUrl: z.string().optional().or(z.literal("")),
  isLocked: z.boolean().default(true),
});

type MediaType = "none" | "image" | "video";

const MEDIA_OPTIONS: { value: MediaType; label: string; icon: React.ElementType; hint: string }[] = [
  { value: "none", label: "Text only", icon: Type, hint: "" },
  { value: "image", label: "Image", icon: ImageIcon, hint: "JPG, PNG, WebP · max 50 MB" },
  { value: "video", label: "Video", icon: Film, hint: "MP4, MOV · max 50 MB" },
];

export default function CreatePost() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createPost = useCreatePost();

  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string>("");
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", body: "", mediaType: "none", mediaUrl: "", isLocked: true },
  });

  const mediaType = form.watch("mediaType");

  function onSubmit(values: z.infer<typeof formSchema>) {
    const finalMediaUrl = uploadedMediaUrl || values.mediaUrl;
    createPost.mutate(
      {
        data: {
          title: values.title || undefined,
          body: values.body,
          mediaType: values.mediaType === "none" ? undefined : values.mediaType as "image" | "video",
          mediaUrl: values.mediaType === "none" ? undefined : (finalMediaUrl || undefined),
          thumbnailUrl: uploadedThumbnailUrl || undefined,
          isLocked: values.isLocked,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          toast({ title: "Post published!" });
          setLocation("/creator/dashboard");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to publish post.", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create New Post</h1>
        <p className="text-muted-foreground mt-1 text-sm">Publish content for your subscribers or public audience.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          {/* Premium toggle */}
          <Card className="bg-card border-border rounded-2xl">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-violet-500" /> Premium Content
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">Only paying subscribers can view this post</p>
              </div>
              <FormField
                control={form.control}
                name="isLocked"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-violet-600" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Title */}
          <Card className="bg-card border-border rounded-2xl">
            <CardContent className="p-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter a catchy title…"
                        className="text-lg py-5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Body */}
          <Card className="bg-card border-border rounded-2xl">
            <CardContent className="p-5">
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What do you want to share with your audience?"
                        className="min-h-[180px] resize-y text-base p-4"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Media */}
          <Card className="bg-card border-border rounded-2xl">
            <CardContent className="p-5 space-y-5">
              <div>
                <p className="text-foreground/80 font-medium text-sm mb-3">Attach Media</p>
                <div className="flex gap-3 flex-wrap">
                  {MEDIA_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        form.setValue("mediaType", opt.value);
                        setUploadedMediaUrl("");
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                        ${mediaType === opt.value
                          ? "border-violet-500 bg-violet-500/15 text-violet-600 dark:text-violet-300"
                          : "border-border bg-muted text-muted-foreground hover:border-border/70 hover:text-foreground"
                        }`}
                    >
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {mediaType === "image" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <DropzoneUploader
                    uploadType="post"
                    label="Upload Image"
                    hint="JPG, PNG, WebP · max 50MB · drag & drop or browse"
                    persistKey="post-image"
                    onUploadComplete={(url) => setUploadedMediaUrl(url)}
                    onClear={() => setUploadedMediaUrl("")}
                  />
                  {!uploadedMediaUrl && (
                    <div className="mt-3">
                      <p className="text-muted-foreground text-xs mb-1.5">Or paste a direct URL</p>
                      <FormField
                        control={form.control}
                        name="mediaUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="https://example.com/image.jpg" className="text-sm" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}

              {mediaType === "video" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <DropzoneUploader
                    uploadType="post"
                    label="Upload Video"
                    hint="MP4, MOV · max 50MB · drag & drop or browse"
                    persistKey="post-video"
                    onUploadComplete={(url, _file, thumbnailDataUrl) => {
                      setUploadedMediaUrl(url);
                      if (thumbnailDataUrl && !uploadedThumbnailUrl) setUploadedThumbnailUrl(thumbnailDataUrl);
                    }}
                    onClear={() => setUploadedMediaUrl("")}
                  />
                  {!uploadedMediaUrl && (
                    <div className="mt-3">
                      <p className="text-muted-foreground text-xs mb-1.5">Or paste a direct URL</p>
                      <FormField
                        control={form.control}
                        name="mediaUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="https://example.com/video.mp4" className="text-sm" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}

              {mediaType === "none" && (
                <div className="flex items-center gap-3 py-6 text-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                  <FileText className="h-5 w-5" />
                  Text-only post — no media attachment
                </div>
              )}
            </CardContent>
          </Card>

          {/* Thumbnail */}
          <Card className="bg-card border-border rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-violet-500" />
                <p className="text-foreground/80 font-medium text-sm">Post Thumbnail</p>
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </div>
              <p className="text-muted-foreground text-xs -mt-1">
                {mediaType === "video"
                  ? "Auto-extracted from your video, or upload a custom thumbnail below."
                  : "Add a thumbnail image that appears as a card preview for this post."}
              </p>

              {uploadedThumbnailUrl && uploadedThumbnailUrl.startsWith("data:") && (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 mb-1">
                  <img src={uploadedThumbnailUrl} alt="Auto thumbnail" className="h-10 w-16 object-cover rounded-lg" />
                  <div>
                    <p className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">Auto-extracted from video</p>
                    <button
                      type="button"
                      onClick={() => setUploadedThumbnailUrl("")}
                      className="text-muted-foreground hover:text-foreground text-xs underline"
                    >
                      Replace with custom
                    </button>
                  </div>
                </div>
              )}

              {(!uploadedThumbnailUrl || !uploadedThumbnailUrl.startsWith("data:")) && (
                <DropzoneUploader
                  uploadType="post"
                  accept="image"
                  label=""
                  hint="JPG, PNG, WebP · max 50MB · drag & drop or browse"
                  persistKey="post-thumbnail"
                  defaultPreview={uploadedThumbnailUrl && !uploadedThumbnailUrl.startsWith("data:") ? uploadedThumbnailUrl : undefined}
                  onUploadComplete={(url) => setUploadedThumbnailUrl(url)}
                  onClear={() => setUploadedThumbnailUrl("")}
                />
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setLocation("/creator/dashboard")}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={createPost.isPending}
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl px-8 gap-2"
            >
              {createPost.isPending ? "Publishing…" : "Publish Post"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
