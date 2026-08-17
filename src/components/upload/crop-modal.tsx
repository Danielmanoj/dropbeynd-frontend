import { useCallback, useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CropModalProps {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

const VIEWPORT = 272;

export function CropModal({ imageSrc, onConfirm, onCancel }: CropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [imageSrc]);

  const constrainPan = useCallback((nx: number, ny: number, z: number, nat: { w: number; h: number }) => {
    const minDim = Math.min(nat.w, nat.h);
    const base = VIEWPORT / minDim;
    const dw = nat.w * base * z;
    const dh = nat.h * base * z;
    const maxX = Math.max(0, (dw - VIEWPORT) / 2);
    const maxY = Math.max(0, (dh - VIEWPORT) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, nx)),
      y: Math.max(-maxY, Math.min(maxY, ny)),
    };
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragStart.current || !imgRef.current) return;
    const img = imgRef.current;
    const nat = { w: img.naturalWidth, h: img.naturalHeight };
    const nx = dragStart.current.px + (e.clientX - dragStart.current.mx);
    const ny = dragStart.current.py + (e.clientY - dragStart.current.my);
    setPan(constrainPan(nx, ny, zoom, nat));
  }
  function onMouseUp() { dragStart.current = null; }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    dragStart.current = { mx: t.clientX, my: t.clientY, px: pan.x, py: pan.y };
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragStart.current || !imgRef.current) return;
    const t = e.touches[0];
    const img = imgRef.current;
    const nat = { w: img.naturalWidth, h: img.naturalHeight };
    const nx = dragStart.current.px + (t.clientX - dragStart.current.mx);
    const ny = dragStart.current.py + (t.clientY - dragStart.current.my);
    setPan(constrainPan(nx, ny, zoom, nat));
  }
  function onTouchEnd() { dragStart.current = null; }

  function handleZoom(delta: number) {
    if (!imgRef.current) return;
    const newZoom = Math.max(1, Math.min(4, zoom + delta));
    const img = imgRef.current;
    const nat = { w: img.naturalWidth, h: img.naturalHeight };
    const clamped = constrainPan(pan.x, pan.y, newZoom, nat);
    setZoom(newZoom);
    setPan(clamped);
  }

  async function handleConfirm() {
    if (!imgRef.current) return;
    setConfirming(true);
    const img = imgRef.current;
    const nat = { w: img.naturalWidth, h: img.naturalHeight };
    const minDim = Math.min(nat.w, nat.h);
    const base = VIEWPORT / minDim;
    const dw = nat.w * base * zoom;
    const dh = nat.h * base * zoom;
    const cx = VIEWPORT / 2 + pan.x;
    const cy = VIEWPORT / 2 + pan.y;
    const srcX = (cx - dw / 2) / dw * nat.w * -1;
    const srcY = (cy - dh / 2) / dh * nat.h * -1;

    const canvas = document.createElement("canvas");
    canvas.width = VIEWPORT;
    canvas.height = VIEWPORT;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(VIEWPORT / 2, VIEWPORT / 2, VIEWPORT / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, srcX, srcY, dw, dh);

    canvas.toBlob(blob => {
      if (blob) onConfirm(blob);
      setConfirming(false);
    }, "image/png");
  }

  let imgStyle: React.CSSProperties = {};
  if (loaded && imgRef.current) {
    const img = imgRef.current;
    const nat = { w: img.naturalWidth, h: img.naturalHeight };
    const minDim = Math.min(nat.w, nat.h);
    const base = VIEWPORT / minDim;
    const dw = nat.w * base * zoom;
    const dh = nat.h * base * zoom;
    imgStyle = {
      width: dw,
      height: dh,
      transform: `translate(${pan.x}px, ${pan.y}px)`,
      cursor: dragStart.current ? "grabbing" : "grab",
      userSelect: "none",
      transition: dragStart.current ? "none" : "transform 0.08s ease",
    };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">

        <div className="flex items-center justify-between">
          <h2 className="text-foreground font-bold text-lg">Crop Profile Photo</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Circular viewport */}
        <div className="flex justify-center">
          <div
            className="relative bg-muted overflow-hidden flex items-center justify-center select-none"
            style={{ width: VIEWPORT, height: VIEWPORT, borderRadius: "50%", cursor: "grab" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop"
              draggable={false}
              onLoad={() => setLoaded(true)}
              style={loaded ? imgStyle : { width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Ring overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-full ring-4 ring-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-3 px-1">
          <button onClick={() => handleZoom(-0.25)} disabled={zoom <= 1}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40">
            <ZoomOut className="h-4 w-4" />
          </button>
          <input
            type="range" min={100} max={400} step={5}
            value={Math.round(zoom * 100)}
            onChange={e => {
              const z = Number(e.target.value) / 100;
              if (!imgRef.current) return;
              const img = imgRef.current;
              const clamped = constrainPan(pan.x, pan.y, z, { w: img.naturalWidth, h: img.naturalHeight });
              setZoom(z);
              setPan(clamped);
            }}
            className="flex-1 accent-primary cursor-pointer h-1.5 rounded-full"
          />
          <button onClick={() => handleZoom(0.25)} disabled={zoom >= 4}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40">
            <ZoomIn className="h-4 w-4" />
          </button>
          <span className="text-muted-foreground text-xs w-10 text-right">{Math.round(zoom * 100)}%</span>
        </div>

        <p className="text-muted-foreground text-xs text-center">Drag to reposition · Scroll to zoom</p>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 border-border text-foreground hover:bg-accent rounded-xl" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={confirming || !loaded} onClick={handleConfirm}
            className="flex-1 bg-primary hover:opacity-90 text-primary-foreground font-bold rounded-xl gap-2">
            <Check className="h-4 w-4" />
            {confirming ? "Processing…" : "Use This Photo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
