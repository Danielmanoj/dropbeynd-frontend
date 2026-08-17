import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import {
  UploadCloud, X, RefreshCw, CheckCircle2, AlertCircle,
  Film, ImageIcon, Loader2, Clock, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CropModal } from "./crop-modal";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadAccept = "image" | "image+video" | "video+pdf+doc";
export type UploadType = "profile" | "cover" | "post" | "course";
export type UploadStatus = "idle" | "uploading" | "done" | "error" | "cancelled";

const ACCEPT_MAP: Record<UploadAccept, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp"],
  "image+video": ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"],
  "video+pdf+doc": [
    "video/mp4", "video/quicktime",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

const SIZE_LIMITS_MB: Record<UploadType, number> = {
  profile: 2,
  cover: 5,
  post: 50,
  course: 100,
};

const ACCEPT_FOR_TYPE: Record<UploadType, UploadAccept> = {
  profile: "image",
  cover: "image",
  post: "image+video",
  course: "video+pdf+doc",
};

const ENDPOINT_FOR_TYPE: Record<UploadType, string> = {
  profile: "/api/storage/uploads/profile",
  cover: "/api/storage/uploads/cover",
  post: "/api/storage/uploads/post",
  course: "/api/storage/uploads/course",
};

// ─── localStorage persistence ─────────────────────────────────────────────────

const LS_PREFIX = "creatorhub_uploader";

interface PersistedState {
  fileName: string;
  fileSize: number;
  status: UploadStatus;
  progress: number;
  uploadType: UploadType;
  savedAt: number;
}

function loadPersisted(key: string): PersistedState | null {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}_${key}`);
    if (!raw) return null;
    const data: PersistedState = JSON.parse(raw);
    const ageMs = Date.now() - data.savedAt;
    if (ageMs > 24 * 60 * 60 * 1000) { clearPersisted(key); return null; }
    return data;
  } catch { return null; }
}

function savePersisted(key: string, data: Partial<PersistedState>): void {
  try {
    const existing = loadPersisted(key);
    localStorage.setItem(`${LS_PREFIX}_${key}`, JSON.stringify({ ...existing, ...data, savedAt: Date.now() }));
  } catch {}
}

function clearPersisted(key: string): void {
  try { localStorage.removeItem(`${LS_PREFIX}_${key}`); } catch {}
}

// ─── Video thumbnail extraction ───────────────────────────────────────────────

function extractVideoThumbnail(videoFile: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;
    video.muted = true;
    video.preload = "metadata";
    video.crossOrigin = "anonymous";
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    video.onloadedmetadata = () => { video.currentTime = Math.min(1, video.duration * 0.1); };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = Math.min(video.videoWidth, 960);
        const h = Math.round(video.videoHeight * (w / video.videoWidth));
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { cleanup(); resolve(null); return; }
        ctx.drawImage(video, 0, 0, w, h);
        cleanup();
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch { cleanup(); resolve(null); }
    };
    video.onerror = () => { cleanup(); resolve(null); };
    setTimeout(() => { cleanup(); resolve(null); }, 8000);
  });
}

// ─── Presigned URL request (legacy object-storage path) ──────────────────────

async function requestPresignedUrl(
  file: File,
  uploadType: UploadType,
  getToken: () => Promise<string | null>,
): Promise<{ uploadURL: string; objectPath: string; remainingToday?: number } | null | "limit_exceeded"> {
  const endpoint = `${BASE}${ENDPOINT_FOR_TYPE[uploadType]}`;
  const token = await getToken();
  const res = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (res.status === 429) return "limit_exceeded";
  if (!res.ok) return null;
  return res.json();
}

// ─── Cloudinary signature request ─────────────────────────────────────────────

interface CloudinarySignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  resourceType: "image" | "video" | "raw";
  remainingToday?: number;
}

let cloudinaryConfiguredCache: boolean | null = null;

async function isCloudinaryAvailable(): Promise<boolean> {
  if (cloudinaryConfiguredCache !== null) return cloudinaryConfiguredCache;
  try {
    const res = await fetch(`${BASE}/api/storage/cloudinary/status`);
    const data = await res.json();
    cloudinaryConfiguredCache = !!data.configured;
  } catch {
    cloudinaryConfiguredCache = false;
  }
  return cloudinaryConfiguredCache;
}

async function requestCloudinarySignature(
  file: File,
  uploadType: UploadType,
  getToken: () => Promise<string | null>,
): Promise<CloudinarySignature | null | "limit_exceeded"> {
  const token = await getToken();
  const res = await fetch(`${BASE}/api/storage/cloudinary/sign`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ uploadType, contentType: file.type, size: file.size }),
  });
  if (res.status === 429) return "limit_exceeded";
  if (!res.ok) return null;
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface DropzoneUploaderProps {
  uploadType?: UploadType;
  accept?: UploadAccept;
  circular?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  persistKey?: string;
  onUploadComplete: (url: string, file: File, thumbnailDataUrl?: string) => void;
  onUploadStart?: () => void;
  onClear?: () => void;
  defaultPreview?: string;
}

export function DropzoneUploader({
  uploadType = "post",
  accept,
  circular = false,
  label,
  hint,
  className = "",
  persistKey,
  onUploadComplete,
  onUploadStart,
  onClear,
  defaultPreview,
}: DropzoneUploaderProps) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const resolvedAccept = accept ?? ACCEPT_FOR_TYPE[uploadType];
  const maxMB = SIZE_LIMITS_MB[uploadType];

  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultPreview ?? null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [interrupted, setInterrupted] = useState<PersistedState | null>(null);

  useEffect(() => {
    if (!persistKey) return;
    const saved = loadPersisted(persistKey);
    if (saved && saved.status === "uploading") {
      setInterrupted(saved);
    } else if (saved && saved.status === "done") {
      clearPersisted(persistKey);
    }
  }, [persistKey]);

  useEffect(() => {
    if (!persistKey || !file) return;
    savePersisted(persistKey, { fileName: file.name, fileSize: file.size, status, progress, uploadType });
    if (status === "done" || status === "cancelled" || status === "error") {
      setTimeout(() => clearPersisted(persistKey!), 5000);
    }
  }, [status, progress, file, persistKey, uploadType]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl !== defaultPreview) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, defaultPreview]);

  function validate(f: File): string | null {
    if (!ACCEPT_MAP[resolvedAccept].includes(f.type)) {
      const ext = ACCEPT_MAP[resolvedAccept].map(t => t.split("/")[1]).join(", ");
      return `Invalid file type. Allowed: ${ext}`;
    }
    if (f.size > maxMB * 1024 * 1024) return `File too large. Max ${maxMB}MB for ${uploadType} uploads.`;
    return null;
  }

  async function handleFile(f: File) {
    const err = validate(f);
    if (err) { toast({ title: "Invalid file", description: err, variant: "destructive" }); return; }
    if (previewUrl && previewUrl !== defaultPreview) URL.revokeObjectURL(previewUrl);
    setInterrupted(null);

    const isVideo = f.type.startsWith("video/");
    const isDoc = f.type === "application/pdf" ||
      f.type === "application/msword" ||
      f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const local = URL.createObjectURL(f);

    if (circular && f.type.startsWith("image/")) {
      setCropSrc(local);
      return;
    }

    setFile(f);
    setProgress(0);
    setThumbnailUrl(null);

    if (isVideo) {
      setPreviewUrl(null);
      const thumb = await extractVideoThumbnail(f);
      setPreviewUrl(local);
      setThumbnailUrl(thumb);
    } else if (isDoc) {
      setPreviewUrl(null); // show doc icon instead
    } else {
      setPreviewUrl(local);
    }

    // Auto-start upload immediately so user doesn't have to click a secondary button
    startUpload(f);
  }

  function onCropConfirm(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    const cropped = new File([blob], (file?.name ?? "avatar.png").replace(/\.[^.]+$/, ".png"), { type: "image/png" });
    const local = URL.createObjectURL(cropped);
    if (previewUrl && previewUrl !== defaultPreview) URL.revokeObjectURL(previewUrl);
    setFile(cropped);
    setPreviewUrl(local);
    setProgress(0);

    // Auto-start upload of cropped avatar immediately
    startUpload(cropped);
  }

  function onCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const startUpload = useCallback(async (fileOverride?: File) => {
    const f = fileOverride ?? file;
    if (!f) return;

    setStatus("uploading");
    setProgress(0);
    onUploadStart?.();

    const useCloudinary = await isCloudinaryAvailable();

    if (useCloudinary) {
      const sig = await requestCloudinarySignature(f, uploadType, getToken);

      if (sig === "limit_exceeded") {
        setStatus("error");
        toast({
          title: "Upload limit reached",
          description: "You've reached your 20 uploads/day limit. Try again tomorrow.",
          variant: "destructive",
        });
        return;
      }
      if (!sig) {
        setStatus("error");
        toast({ title: "Upload failed", description: "Could not get upload signature. Make sure you are signed in and try again.", variant: "destructive" });
        return;
      }

      const formData = new FormData();
      formData.append("file", f);
      formData.append("api_key", sig.apiKey);
      formData.append("timestamp", String(sig.timestamp));
      formData.append("signature", sig.signature);
      formData.append("folder", sig.folder);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const body = JSON.parse(xhr.responseText);
            setProgress(100);
            setStatus("done");
            onUploadComplete(body.secure_url, f, thumbnailUrl ?? undefined);
            if (sig.remainingToday !== undefined && sig.remainingToday <= 3) {
              toast({
                title: "Upload successful",
                description: `${sig.remainingToday} upload${sig.remainingToday === 1 ? "" : "s"} remaining today.`,
              });
            }
          } catch {
            setStatus("error");
            toast({ title: "Upload failed", description: "Unexpected response from storage provider.", variant: "destructive" });
          }
        } else {
          setStatus("error");
          toast({ title: "Upload failed", description: `Storage provider error (${xhr.status}). Try again.`, variant: "destructive" });
        }
        xhrRef.current = null;
      };

      xhr.onerror = () => {
        setStatus("error");
        toast({ title: "Upload failed", description: "Network error. Check connection and retry.", variant: "destructive" });
        xhrRef.current = null;
      };

      xhr.onabort = () => {
        setStatus("cancelled");
        setProgress(0);
        xhrRef.current = null;
      };

      xhr.send(formData);
      return;
    }

    // ── Legacy object-storage path (used only if Cloudinary isn't configured) ──
    const meta = await requestPresignedUrl(f, uploadType, getToken);

    if (meta === "limit_exceeded") {
      setStatus("error");
      toast({
        title: "Upload limit reached",
        description: "You've reached your 20 uploads/day limit. Try again tomorrow.",
        variant: "destructive",
      });
      return;
    }

    if (!meta) {
      setStatus("error");
      toast({ title: "Upload failed", description: "Could not get upload URL. Make sure you are signed in and try again.", variant: "destructive" });
      return;
    }

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("PUT", meta.uploadURL);
    xhr.setRequestHeader("Content-Type", f.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        setStatus("done");
        const url = `${BASE}/api/storage${meta.objectPath}`;
        onUploadComplete(url, f, thumbnailUrl ?? undefined);
        if (meta.remainingToday !== undefined && meta.remainingToday <= 3) {
          toast({
            title: "Upload successful",
            description: `${meta.remainingToday} upload${meta.remainingToday === 1 ? "" : "s"} remaining today.`,
          });
        }
      } else {
        setStatus("error");
        toast({ title: "Upload failed", description: `Server error (${xhr.status}). Try again.`, variant: "destructive" });
      }
      xhrRef.current = null;
    };

    xhr.onerror = () => {
      setStatus("error");
      toast({ title: "Upload failed", description: "Network error. Check connection and retry.", variant: "destructive" });
      xhrRef.current = null;
    };

    xhr.onabort = () => {
      setStatus("cancelled");
      setProgress(0);
      xhrRef.current = null;
    };

    xhr.send(f);
  }, [file, uploadType, onUploadComplete, onUploadStart, thumbnailUrl, toast, getToken]);

  function cancelUpload() { xhrRef.current?.abort(); }

  function clearFile() {
    xhrRef.current?.abort();
    if (previewUrl && previewUrl !== defaultPreview) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(defaultPreview ?? null);
    setThumbnailUrl(null);
    setStatus("idle");
    setProgress(0);
    setInterrupted(null);
    if (persistKey) clearPersisted(persistKey);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClear?.();
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const isVideo = file?.type.startsWith("video/") ?? false;
  const isDoc = file ? (
    file.type === "application/pdf" ||
    file.type === "application/msword" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) : false;
  const showPreview = !!previewUrl;
  const uploading = status === "uploading";
  const displayPreview = isVideo && thumbnailUrl ? thumbnailUrl : previewUrl;

  const acceptAttr = ACCEPT_MAP[resolvedAccept].join(",");

  return (
    <>
      {cropSrc && <CropModal imageSrc={cropSrc} onConfirm={onCropConfirm} onCancel={onCropCancel} />}

      <div className={`w-full ${className}`}>
        {label && <p className="text-foreground font-medium text-sm mb-2">{label}</p>}

        {/* ── Interrupted upload notice ── */}
        {interrupted && !file && (
          <div className="mb-3 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-amber-700 dark:text-amber-300 text-sm font-medium truncate">{interrupted.fileName}</p>
              <p className="text-amber-600 dark:text-amber-500 text-xs">Upload was interrupted. Re-select the file to try again.</p>
            </div>
            <button onClick={() => { setInterrupted(null); if (persistKey) clearPersisted(persistKey); }}
              className="text-amber-600 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-300 transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Dropzone area ── */}
        <div
          className={`relative overflow-hidden transition-all duration-200 border-2 border-dashed
            ${circular ? "rounded-full aspect-square" : "rounded-2xl min-h-[140px]"}
            ${dragging
              ? "border-primary bg-primary/10 shadow-silver-glow"
              : (showPreview || (file && isDoc))
                ? "border-border bg-transparent"
                : "border-border bg-muted/60 hover:border-primary/60 hover:bg-muted/90 cursor-pointer"
            }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={(!showPreview && !isDoc) ? () => fileInputRef.current?.click() : undefined}
        >
          {/* ── Doc file state ── */}
          {isDoc && !showPreview ? (
            <div className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{file?.name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{((file?.size ?? 0) / (1024 * 1024)).toFixed(2)} MB</p>
                {uploading && (
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-silver-gradient rounded-full transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                {status === "done" && (
                  <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Uploaded successfully
                  </p>
                )}
              </div>
              {!uploading && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); clearFile(); }}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : !showPreview ? (
            /* ── Empty state ── */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              {dragging ? (
                <>
                  <div className="p-3 rounded-2xl bg-primary/20 border border-primary/40">
                    <UploadCloud className="h-7 w-7 text-primary animate-bounce" />
                  </div>
                  <p className="text-primary font-semibold text-sm">Drop to upload</p>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-muted border border-border">
                    <UploadCloud className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      Drag & drop or{" "}
                      <span className="text-primary underline underline-offset-2">browse</span>
                    </p>
                    {hint && <p className="text-muted-foreground text-xs mt-1">{hint}</p>}
                    {!hint && (
                      <p className="text-muted-foreground text-xs mt-1">
                        Max {maxMB}MB
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── Image/video preview ── */
            <div className="relative w-full h-full">
              <img
                src={displayPreview!}
                alt="Preview"
                className={`w-full object-cover ${circular ? "h-full" : "max-h-64"}`}
                style={uploading ? { filter: "blur(3px)", transform: "scale(1.04)", transition: "all 0.3s" } : {}}
              />
              {isVideo && !uploading && status !== "done" && (
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-background/90 border border-border backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs font-medium text-foreground">
                  <Film className="h-3.5 w-3.5 text-primary" /> Video
                  {thumbnailUrl && <span className="text-muted-foreground">· thumbnail extracted</span>}
                </div>
              )}
              {!uploading && file && (
                <div className="absolute top-3 left-3">
                  <span className="bg-background/80 backdrop-blur-sm border border-border rounded-lg px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
                    {isVideo ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-9 w-9 text-primary animate-spin" />
                  <p className="text-foreground font-bold text-2xl tabular-nums">{progress}%</p>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">Uploading</p>
                  <div className="absolute bottom-0 left-0 right-0 h-1.5">
                    <div
                      className="h-full bg-silver-gradient rounded-full transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
              {status === "done" && (
                <div className="absolute top-3 right-3 bg-emerald-500 rounded-full p-1 shadow-lg">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              )}
              {status === "error" && (
                <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="text-destructive text-sm font-semibold">Upload failed</p>
                  <p className="text-muted-foreground text-xs">Tap Retry below</p>
                </div>
              )}
              {status === "cancelled" && (
                <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center gap-2">
                  <X className="h-7 w-7 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm font-medium">Upload cancelled</p>
                </div>
              )}
              {!uploading && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); clearFile(); }}
                  className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm border border-border rounded-full p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Progress bar (non-circular, non-doc) ── */}
        {!circular && !isDoc && uploading && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Uploading {file?.name}…</span>
              <span className="tabular-nums font-mono">{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-silver-gradient rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {status === "done" && !isDoc && (
          <p className="mt-2 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Upload complete
          </p>
        )}

        {/* ── Action buttons ── */}
        <div className="mt-3 flex gap-2 flex-wrap">
          {status !== "uploading" && (
            <Button type="button" size="sm" variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-border text-foreground hover:bg-accent rounded-lg gap-1.5 text-xs">
              <UploadCloud className="h-3.5 w-3.5" />
              {(showPreview || isDoc) ? "Replace file" : "Choose file"}
            </Button>
          )}
          {file && (status === "idle" || status === "cancelled") && (
            <Button type="button" size="sm" onClick={() => startUpload()}
              className="bg-primary hover:opacity-90 text-primary-foreground rounded-lg gap-1.5 text-xs font-bold">
              <UploadCloud className="h-3.5 w-3.5" /> Upload
            </Button>
          )}
          {status === "uploading" && (
            <Button type="button" size="sm" variant="outline" onClick={cancelUpload}
              className="border-destructive/50 text-destructive hover:bg-destructive/10 rounded-lg gap-1.5 text-xs">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          )}
          {status === "error" && (
            <Button type="button" size="sm" onClick={() => startUpload()}
              className="bg-destructive hover:opacity-90 text-destructive-foreground rounded-lg gap-1.5 text-xs font-bold">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept={acceptAttr} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
    </>
  );
}
