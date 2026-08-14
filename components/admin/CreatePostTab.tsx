"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase";
import {
  Upload, ImageIcon, Palette, Type, X, Pencil, RotateCcw, Crop, Move, Check,
} from "lucide-react";
import { cn, sanitizeInput } from "@/lib/utils";
import { getFontClassName, FONT_OPTIONS } from "@/lib/fonts";
import toast from "react-hot-toast";
import CropBoxEditor, { type CropRect } from "@/components/CropBoxEditor";

// Code-split so react-easy-crop's replacement UI and the 20 self-hosted
// Google Fonts (via lib/fonts) only load when this tab is actually opened,
// instead of on every admin page visit.
const PerspectiveEditor = dynamic(() => import("@/components/PerspectiveEditor"), { ssr: false });

const GOOGLE_FONTS = FONT_OPTIONS;

const PRESET_COLORS = [
  "#E0E0E0", "#FFFFFF", "#000000", "#FF6B6B", "#4ECDC4", "#45B7D1",
  "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#F8C471", "#82E0AA", "#F1948A",
  "#1A1A1A", "#2D3436", "#636E72", "#B2BEC3", "#DFE6E9",
  "#FF7675", "#74B9FF", "#A29BFE", "#FD79A8", "#FDCB6E",
  "#6C5CE7", "#00B894", "#E17055", "#D63031", "#0984E3",
  "#E84393", "#00CEC9", "#F39C12", "#8E44AD", "#2ECC71",
  "#C0392B", "#27AE60", "#2980B9", "#D35400",
  "#7F8C8D", "#2C3E50", "#16A085", "#E74C3C", "#9B59B6",
  "#34495E", "#1ABC9C", "#F1C40F", "#E67E22", "#95A5A6"
];

const PRESET_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)",
  "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)"
];

export default function CreatePostTab() {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"text-only" | "image-above" | "image-below" | "image-background" | "whatsapp-status" | "image-only">("text-only");
  const [bgType, setBgType] = useState("solid");
  const [bgValue, setBgValue] = useState("#141414");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [textColor, setTextColor] = useState("#E0E0E0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image crop state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [showCropper, setShowCropper] = useState(false);
  const [editorStep, setEditorStep] = useState<"perspective" | "crop">("perspective");
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
        setEditorStep("perspective");
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Bakes a 90° rotation into the image itself (rather than rotating on top
  // of a fixed crop box), so the crop box's geometry never has to account
  // for rotation separately.
  const handleRotate90 = async () => {
    if (!imagePreview) return;
    const image = await createImage(imagePreview);
    const canvas = document.createElement("canvas");
    canvas.width = image.height;
    canvas.height = image.width;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    setImagePreview(canvas.toDataURL("image/png"));
    setCropRect(null); // let CropBoxEditor re-initialize for the new dimensions
  };

  const getCroppedImage = async (): Promise<Blob | null> => {
    if (!imagePreview || !cropRect) return null;

    const image = await createImage(imagePreview);
    const canvas = document.createElement("canvas");
    canvas.width = cropRect.width;
    canvas.height = cropRect.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      image,
      cropRect.x, cropRect.y, cropRect.width, cropRect.height,
      0, 0, cropRect.width, cropRect.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(null); return; }
        resolve(blob);
      }, "image/jpeg", 0.9);
    });
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener("load", () => resolve(img));
      img.addEventListener("error", (err) => reject(err));
      img.src = url;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (postType !== "image-only" && !content.trim()) { 
      toast.error("Enter content"); 
      return; 
    }

    const needsImage = postType !== "text-only";
    if (needsImage && !imageFile) {
      toast.error("Please select an image file");
      return;
    }

    let finalBgValue = bgValue;
    let imageUrl = "";
    let finalBgType = bgType;

    // Upload cropped image if needed
    if (needsImage && imageFile && imagePreview) {
      setIsSubmitting(true);
      try {
        const croppedBlob = await getCroppedImage();
        if (!croppedBlob) throw new Error("Failed to crop image");

        const supabase = createClient();
        const imagePath = `post-images/${Date.now()}_cropped.jpg`;
        const { error: uploadErr } = await supabase.storage.from("images").upload(imagePath, croppedBlob, {
          contentType: "image/jpeg",
        });
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from("images").getPublicUrl(imagePath);
        imageUrl = publicUrl;
        if (postType === "image-background") {
          finalBgValue = publicUrl;
          finalBgType = "image";
        }
      } catch (error: any) {
        toast.error(error.message || "Image upload failed");
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("posts").insert({
        content: sanitizeInput(content) || " ",
        bg_type: finalBgType,
        bg_value: finalBgValue,
        font_family: fontFamily,
        text_color: textColor,
        image_url: imageUrl,
        image_position: postType === "image-above" ? "above" : postType === "image-below" ? "below" : postType === "whatsapp-status" ? "fullscreen" : postType === "image-only" ? "only" : "",
        image_fit: "cover",
        image_pos_x: 50,
        image_pos_y: 50,
        likes: 0,
        shares: 0,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Post created!");
      setContent(""); setBgValue("#141414"); setBgType("solid"); setImageFile(null); setImagePreview(""); setShowCropper(false); setPostType("text-only");
      setCropRect(null); setEditorStep("perspective");
    } catch (error: any) { toast.error(error.message || "Failed"); }
    finally { setIsSubmitting(false); }
  };

  const getPreview = () => {
    switch (postType) {
      case "text-only":
        return (
          <div className="w-full min-h-[280px] flex items-center justify-center p-8 rounded-xl" style={{ backgroundColor: bgValue }}>
            <p className={`text-center break-words w-full font-medium ${getFontClassName(fontFamily)}`} style={{
              color: textColor,
              fontSize: "clamp(0.875rem, 2.5vw, 1.25rem)", lineHeight: 1.5,
            }}>{content || "Your text here..."}</p>
          </div>
        );
      case "image-above":
        return (
          <div className="w-full rounded-xl overflow-hidden bg-card border border-border">
            {imagePreview && !showCropper && (
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" style={{ objectPosition: "center" }} />
            )}
            <div className="p-6" style={{ backgroundColor: bgValue }}>
              <p className={`text-center break-words font-medium ${getFontClassName(fontFamily)}`} style={{
                color: textColor,
                fontSize: "clamp(1.1rem, 3vw, 1.8rem)", lineHeight: 1.5,
              }}>{content || "Your text here..."}</p>
            </div>
          </div>
        );
      case "image-below":
        return (
          <div className="w-full rounded-xl overflow-hidden bg-card border border-border">
            <div className="p-6" style={{ backgroundColor: bgValue }}>
              <p className={`text-center break-words font-medium ${getFontClassName(fontFamily)}`} style={{
                color: textColor,
                fontSize: "clamp(1.1rem, 3vw, 1.8rem)", lineHeight: 1.5,
              }}>{content || "Your text here..."}</p>
            </div>
            {imagePreview && !showCropper && (
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
            )}
          </div>
        );
      case "image-background":
        return (
          <div className="w-full min-h-[280px] flex items-center justify-center p-8 rounded-xl relative overflow-hidden">
            {imagePreview && !showCropper && (
              <img src={imagePreview} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/40" />
            <p className={`relative text-center break-words w-full font-medium ${getFontClassName(fontFamily)}`} style={{
              color: textColor,
              fontSize: "clamp(1rem, 3vw, 1.5rem)", lineHeight: 1.5,
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
            }}>{content || "Your text here..."}</p>
          </div>
        );
      case "whatsapp-status":
        return (
          <div className="w-full min-h-[400px] flex flex-col items-center justify-center rounded-xl relative overflow-hidden">
            {imagePreview && !showCropper && (
              <img src={imagePreview} alt="Status" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/30" />
            {content?.trim() && content !== " " && (
              <div className="relative z-10 px-6 py-4 bg-black/50 rounded-xl backdrop-blur-sm">
                <p className={`text-center break-words font-medium ${getFontClassName(fontFamily)}`} style={{
                  color: textColor,
                  fontSize: "clamp(0.875rem, 2.5vw, 1.25rem)", lineHeight: 1.5,
                }}>{content}</p>
              </div>
            )}
          </div>
        );
      case "image-only":
        return (
          <div className="w-full rounded-xl overflow-hidden bg-card border border-border">
            {imagePreview && !showCropper ? (
              <img src={imagePreview} alt="Post" className="w-full h-auto max-h-[500px] object-contain" />
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-surface">
                <ImageIcon className="w-12 h-12 text-text-dim" />
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 bg-card border-b border-border/50 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-muted">Live Preview</span>
        </div>
        {getPreview()}
      </div>

      {/* Image Cropper Modal */}
      {showCropper && imagePreview && editorStep === "perspective" && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="text-sm font-medium text-text flex items-center gap-2">
                <Move className="w-4 h-4 text-accent" /> Straighten
              </h3>
              <button onClick={() => setShowCropper(false)} className="p-1.5 rounded-lg hover:bg-surface text-text-dim">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <PerspectiveEditor
                imageSrc={imagePreview}
                onApply={(correctedDataUrl) => {
                  setImagePreview(correctedDataUrl);
                  setEditorStep("crop");
                }}
                onSkip={() => setEditorStep("crop")}
              />
            </div>
          </div>
        </div>
      )}

      {showCropper && imagePreview && editorStep === "crop" && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="text-sm font-medium text-text flex items-center gap-2">
                <Crop className="w-4 h-4 text-accent" /> Crop & Position Image
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditorStep("perspective")}
                  className="px-2 py-1 rounded-lg hover:bg-surface text-text-dim text-xs"
                >
                  Back to straighten
                </button>
                <button onClick={() => setShowCropper(false)} className="p-1.5 rounded-lg hover:bg-surface text-text-dim">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 pb-0">
              <p className="text-xs text-text-dim mb-2">Drag the box to move it, drag a corner to resize.</p>
            </div>
            <div className="px-4">
              <CropBoxEditor
                key={imagePreview}
                imageSrc={imagePreview}
                aspect={aspect}
                onCropChange={setCropRect}
              />
            </div>

            <div className="p-4 space-y-4">
              {/* Rotate: bakes a 90° rotation into the image itself, then the
                  box above operates on the already-rotated result. */}
              <div className="flex justify-center">
                <button
                  onClick={handleRotate90}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface text-text-dim hover:text-text text-xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Rotate 90°
                </button>
              </div>

              {/* Aspect Ratio */}
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-xs text-text-dim">Aspect:</span>
                {[
                  { label: "16:9", value: 16/9 },
                  { label: "4:3", value: 4/3 },
                  { label: "1:1", value: 1 },
                  { label: "9:16", value: 9/16 },
                  { label: "Free", value: null },
                ].map((ratio) => (
                  <button
                    key={ratio.label}
                    onClick={() => setAspect(ratio.value)}
                    className={cn("px-2 py-1 rounded text-xs transition-colors",
                      aspect === ratio.value ? "bg-accent text-background" : "bg-surface text-text-dim hover:text-text")}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowCropper(false)}
                className="btn-primary w-full"
              >
                <Check className="w-4 h-4 inline mr-2" /> Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {postType !== "image-only" && (
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Content</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} maxLength={500}
              className="input-field resize-none" placeholder="Write your post..." />
            <p className="text-xs text-text-dim mt-1">{content.length}/500</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1.5">Post Style</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: "text-only", label: "Text Only", desc: "Just text with background" },
              { id: "image-above", label: "Image Top", desc: "Like X/Twitter" },
              { id: "image-below", label: "Image Bottom", desc: "Text first, image below" },
              { id: "image-background", label: "Background Image", desc: "Text over full image" },
              { id: "whatsapp-status", label: "Status Style", desc: "Like WhatsApp status" },
              { id: "image-only", label: "Image Only", desc: "Just the image" },
            ].map((type) => (
              <button key={type.id} type="button" onClick={() => setPostType(type.id as any)}
                className={cn("p-3 rounded-xl border text-left transition-all",
                  postType === type.id ? "border-accent bg-accent/10" : "border-border hover:border-accent/30")}>
                <p className="text-sm font-medium text-text">{type.label}</p>
                <p className="text-[10px] text-text-dim mt-0.5">{type.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {postType !== "text-only" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Upload Image</label>
              <input type="file" accept="image/*" onChange={handleFileChange}
                className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-accent/10 file:text-accent file:text-sm hover:file:bg-accent/20" />
            </div>

            {imagePreview && !showCropper && (
              <div className="p-3 rounded-xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Crop className="w-4 h-4 text-accent" />
                  <span className="text-sm text-text-muted">Image ready</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCropper(true)}
                  className="text-sm text-accent hover:text-accent-dim transition-colors flex items-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit crop/position
                </button>
              </div>
            )}
          </div>
        )}

        {postType === "text-only" && (
          <>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Background Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button key={color} type="button" onClick={() => setBgValue(color)}
                    className={cn("w-8 h-8 rounded-lg border-2 transition-all", bgValue === color ? "border-accent scale-110" : "border-transparent hover:scale-105")}
                    style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5 flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> Font</label>
                <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="input-field">
                  {GOOGLE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Text Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.slice(0, 12).map((color) => (
                    <button key={color} type="button" onClick={() => setTextColor(color)}
                      className={cn("w-6 h-6 rounded-full border-2 transition-all", textColor === color ? "border-accent scale-125" : "border-white/10 hover:scale-110")}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? "Creating..." : "Create Post"}
        </button>
      </form>
    </div>
  );
}
