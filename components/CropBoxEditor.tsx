"use client";

import { useEffect, useRef, useState } from "react";

export type CropRect = { x: number; y: number; width: number; height: number };

const HANDLES = ["nw", "ne", "se", "sw"] as const;
type Handle = (typeof HANDLES)[number];

/**
 * A crop tool where the image is fixed in place and the user drags/resizes a
 * rectangular selection box over it — the opposite of react-easy-crop's
 * "image pans under a fixed window" behavior.
 */
export default function CropBoxEditor({
  imageSrc,
  aspect,
  onCropChange,
}: {
  imageSrc: string;
  /** Fixed aspect ratio (width/height), or null for a freely resizable box. */
  aspect: number | null;
  /** Called with the crop rectangle in the image's natural pixel space. */
  onCropChange: (rect: CropRect) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [box, setBox] = useState<CropRect | null>(null);
  const dragState = useRef<{ mode: "move" | Handle; startX: number; startY: number; startBox: CropRect } | null>(null);

  const initBox = (width: number, height: number) => {
    let boxW = width * 0.8;
    let boxH = aspect ? boxW / aspect : height * 0.8;
    if (boxH > height * 0.9) {
      boxH = height * 0.9;
      boxW = aspect ? boxH * aspect : boxW;
    }
    setBox({ x: (width - boxW) / 2, y: (height - boxH) / 2, width: boxW, height: boxH });
  };

  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    const rect = img.getBoundingClientRect();
    setDisplaySize({ width: rect.width, height: rect.height });
    initBox(rect.width, rect.height);
  };

  // Re-fit the box whenever the aspect ratio changes (e.g. user picks "Square").
  useEffect(() => {
    if (displaySize.width && displaySize.height) initBox(displaySize.width, displaySize.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect]);

  useEffect(() => {
    if (!box || !naturalSize.width || !displaySize.width) return;
    const scaleX = naturalSize.width / displaySize.width;
    const scaleY = naturalSize.height / displaySize.height;
    onCropChange({
      x: box.x * scaleX,
      y: box.y * scaleY,
      width: box.width * scaleX,
      height: box.height * scaleY,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);

  const clampBox = (b: CropRect): CropRect => {
    let { x, y, width, height } = b;
    width = Math.min(width, displaySize.width);
    height = Math.min(height, displaySize.height);
    x = Math.max(0, Math.min(x, displaySize.width - width));
    y = Math.max(0, Math.min(y, displaySize.height - height));
    return { x, y, width, height };
  };

  const startDrag = (mode: "move" | Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!box) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { mode, startX: e.clientX, startY: e.clientY, startBox: box };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragState.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const { startBox } = drag;

    if (drag.mode === "move") {
      setBox(clampBox({ ...startBox, x: startBox.x + dx, y: startBox.y + dy }));
      return;
    }

    let { x, y, width, height } = startBox;
    const minSize = 40;

    if (drag.mode === "nw") { x += dx; y += dy; width -= dx; height -= dy; }
    if (drag.mode === "ne") { y += dy; width += dx; height -= dy; }
    if (drag.mode === "se") { width += dx; height += dy; }
    if (drag.mode === "sw") { x += dx; width -= dx; height += dy; }

    if (aspect) {
      // Keep the aspect ratio locked, driven by the width delta.
      height = width / aspect;
      if (drag.mode === "nw" || drag.mode === "sw") y = startBox.y + startBox.height - height;
    }

    if (width < minSize || height < minSize) return;
    if (x < 0 || y < 0 || x + width > displaySize.width || y + height > displaySize.height) return;

    setBox({ x, y, width, height });
  };

  const endDrag = () => { dragState.current = null; };

  return (
    <div
      ref={containerRef}
      className="relative select-none touch-none bg-black rounded-xl overflow-hidden"
      style={{ height: 360 }}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
    >
      <img
        ref={imgRef}
        src={imageSrc}
        alt="To crop"
        className="w-full h-full object-contain pointer-events-none"
        onLoad={handleImageLoad}
        draggable={false}
      />

      {box && (
        <>
          {/* Dim everything outside the box using four bands (more reliable
              across browsers than a clip-path polygon). */}
          <div className="absolute bg-black/50 pointer-events-none" style={{ left: 0, top: 0, right: 0, height: box.y }} />
          <div className="absolute bg-black/50 pointer-events-none" style={{ left: 0, top: box.y + box.height, right: 0, bottom: 0 }} />
          <div className="absolute bg-black/50 pointer-events-none" style={{ left: 0, top: box.y, width: box.x, height: box.height }} />
          <div className="absolute bg-black/50 pointer-events-none" style={{ left: box.x + box.width, top: box.y, right: 0, height: box.height }} />

          <div
            className="absolute border-2 border-white cursor-move"
            style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
            onPointerDown={startDrag("move")}
          >
            {/* Rule-of-thirds grid, moves and resizes with the box */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/30" />
              ))}
            </div>

            {HANDLES.map((h) => (
              <div
                key={h}
                onPointerDown={startDrag(h)}
                className="absolute w-5 h-5 bg-accent border-2 border-white rounded-full"
                style={{
                  left: h.includes("w") ? -10 : undefined,
                  right: h.includes("e") ? -10 : undefined,
                  top: h.includes("n") ? -10 : undefined,
                  bottom: h.includes("s") ? -10 : undefined,
                  cursor: h === "nw" || h === "se" ? "nwse-resize" : "nesw-resize",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
