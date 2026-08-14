"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Check, X } from "lucide-react";
import { warpToRectangle, type Pt } from "@/lib/perspective";

const CORNER_LABELS = ["top-left", "top-right", "bottom-right", "bottom-left"];

export default function PerspectiveEditor({
  imageSrc,
  onApply,
  onSkip,
}: {
  imageSrc: string;
  /** Called with a new data URL once the user applies the straighten. */
  onApply: (correctedDataUrl: string) => void;
  /** Called when the user wants to keep the image as-is. */
  onSkip: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  // Corners in *displayed* pixel space, clockwise from top-left.
  const [corners, setCorners] = useState<[Pt, Pt, Pt, Pt] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetCorners = (width: number, height: number) => {
    const inset = 0; // start as the full image, like Google Photos does
    setCorners([
      { x: inset, y: inset },
      { x: width - inset, y: inset },
      { x: width - inset, y: height - inset },
      { x: inset, y: height - inset },
    ]);
  };

  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    const rect = img.getBoundingClientRect();
    setDisplaySize({ width: rect.width, height: rect.height });
    resetCorners(rect.width, rect.height);
  };

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragIndex === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, displaySize.width);
    const y = clamp(e.clientY - rect.top, 0, displaySize.height);
    setCorners((prev) => {
      if (!prev) return prev;
      const next = [...prev] as [Pt, Pt, Pt, Pt];
      next[dragIndex] = { x, y };
      return next;
    });
  };

  const startDrag = (index: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragIndex(index);
  };

  const handleApply = async () => {
    if (!corners || !imgRef.current) return;
    setIsProcessing(true);
    try {
      const scaleX = naturalSize.width / displaySize.width;
      const scaleY = naturalSize.height / displaySize.height;
      const naturalCorners = corners.map((c) => ({ x: c.x * scaleX, y: c.y * scaleY })) as [Pt, Pt, Pt, Pt];

      // Output size: the average width/height implied by the quad, so
      // proportions roughly match what the user marked out.
      const width = (dist(naturalCorners[0], naturalCorners[1]) + dist(naturalCorners[3], naturalCorners[2])) / 2;
      const height = (dist(naturalCorners[0], naturalCorners[3]) + dist(naturalCorners[1], naturalCorners[2])) / 2;
      const outWidth = Math.max(1, Math.round(width));
      const outHeight = Math.max(1, Math.round(height));

      const canvas = warpToRectangle(imgRef.current, naturalCorners, outWidth, outHeight);
      onApply(canvas.toDataURL("image/png"));
    } finally {
      setIsProcessing(false);
    }
  };

  const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

  const polygonPoints = corners?.map((c) => `${c.x},${c.y}`).join(" ") ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-dim">
          Drag the corners to straighten the image, or skip to crop as-is.
        </p>
        {corners && (
          <button
            onClick={() => resetCorners(displaySize.width, displaySize.height)}
            className="flex items-center gap-1 text-xs text-text-dim hover:text-text"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative select-none touch-none bg-black rounded-xl overflow-hidden"
        style={{ height: 360 }}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragIndex(null)}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="To straighten"
          className="w-full h-full object-contain"
          onLoad={handleImageLoad}
          draggable={false}
        />

        {corners && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: "normal" }}>
            <polygon points={polygonPoints} fill="rgba(0,255,136,0.15)" stroke="#00FF88" strokeWidth={2} />
          </svg>
        )}

        {corners?.map((c, i) => (
          <div
            key={i}
            onPointerDown={startDrag(i)}
            role="slider"
            aria-label={`Adjust ${CORNER_LABELS[i]} corner`}
            className="absolute w-6 h-6 rounded-full bg-accent border-2 border-white shadow-lg cursor-grab active:cursor-grabbing"
            style={{ left: c.x - 12, top: c.y - 12, touchAction: "none" }}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onSkip} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface text-text-dim text-sm font-medium hover:text-text transition-colors">
          <X className="w-4 h-4" /> Skip
        </button>
        <button
          onClick={handleApply}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent text-background text-sm font-medium hover:bg-accent-dim transition-colors disabled:opacity-50"
        >
          <Check className="w-4 h-4" /> {isProcessing ? "Straightening..." : "Apply & Continue"}
        </button>
      </div>
    </div>
  );
}
