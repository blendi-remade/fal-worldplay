"use client";

import { useState, useRef } from "react";
import type { GenerationSettings, WorldResponse, CharacterResult } from "@/lib/types";
import type { WorldHistoryEntry, CharacterHistoryEntry } from "@/lib/history";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { FalLogo } from "./FalLogo";
import HistoryDropdown from "./HistoryDropdown";

interface Props {
  onGenerate: (
    worldPrompt: string,
    characterPrompt: string,
    worldImageAssetId?: string,
    settings?: GenerationSettings,
    characterImageUrl?: string,
    worldImagePreview?: string,
    charImagePreview?: string,
    historyWorld?: WorldResponse | null,
    historyCharacter?: CharacterResult | null
  ) => void;
  worldHistory: WorldHistoryEntry[];
  characterHistory: CharacterHistoryEntry[];
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function LandingHero({ onGenerate, worldHistory, characterHistory }: Props) {
  const [worldPrompt, setWorldPrompt] = useState("");
  const [characterPrompt, setCharacterPrompt] = useState("");
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);
  const [worldImagePreview, setWorldImagePreview] = useState<string | null>(null);
  const [worldUploading, setWorldUploading] = useState(false);
  const [worldUploadError, setWorldUploadError] = useState<string | null>(null);
  const worldFileRef = useRef<HTMLInputElement>(null);
  const [charImageDataUri, setCharImageDataUri] = useState<string | null>(null);
  const [charImagePreview, setCharImagePreview] = useState<string | null>(null);
  const charFileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GenerationSettings>({ ...DEFAULT_SETTINGS });

  // History selections
  const [selectedWorld, setSelectedWorld] = useState<WorldHistoryEntry | null>(null);
  const [selectedChar, setSelectedChar] = useState<CharacterHistoryEntry | null>(null);

  const handleWorldImage = async (file: File) => {
    setWorldUploadError(null);
    setSelectedWorld(null); // Deselect history if uploading fresh
    const preview = await fileToDataUri(file);
    setWorldImagePreview(preview);
    setWorldUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Upload failed"); }
      const data = await res.json();
      if (!data.media_asset_id) throw new Error("No media_asset_id in response");
      setMediaAssetId(data.media_asset_id);
    } catch (err: unknown) {
      setWorldUploadError(err instanceof Error ? err.message : "Upload failed");
      setWorldImagePreview(null);
      setMediaAssetId(null);
    } finally {
      setWorldUploading(false);
    }
  };

  const removeWorldImage = () => {
    setMediaAssetId(null); setWorldImagePreview(null); setWorldUploadError(null);
    if (worldFileRef.current) worldFileRef.current.value = "";
  };

  const handleCharImage = async (file: File) => {
    setSelectedChar(null);
    const dataUri = await fileToDataUri(file);
    setCharImagePreview(dataUri);
    setCharImageDataUri(dataUri);
  };

  const removeCharImage = () => {
    setCharImageDataUri(null); setCharImagePreview(null);
    if (charFileRef.current) charFileRef.current.value = "";
  };

  const canProceedStep1 = selectedWorld || worldPrompt.trim() || mediaAssetId;
  const canGenerate = selectedChar || charImageDataUri || characterPrompt.trim();

  const handleSubmit = () => {
    if (!canProceedStep1 || !canGenerate) return;
    onGenerate(
      selectedWorld?.prompt ?? worldPrompt.trim(),
      selectedChar?.prompt ?? characterPrompt.trim(),
      selectedWorld ? undefined : (mediaAssetId || undefined),
      settings,
      selectedChar ? undefined : (charImageDataUri || undefined),
      worldImagePreview || undefined,
      charImagePreview || undefined,
      selectedWorld?.data ?? null,
      selectedChar?.data ?? null
    );
  };

  // Shared styles
  const cardStyle = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "1.75rem" };
  const inputStyle = { background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "0.75rem 1rem", color: "var(--text-primary)", outline: "none", transition: "border-color 0.2s ease" };
  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLTextAreaElement>) => e.target.style.borderColor = "var(--fal-purple-light)",
    onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => e.target.style.borderColor = "var(--border-color)",
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center overflow-y-auto" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-xl w-full px-6 py-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <FalLogo size={40} />
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>WorldPlay</h1>
        </div>
        <p className="mb-10 text-sm" style={{ color: "var(--text-secondary)" }}>Generate a world. Create a character. Step inside.</p>

        {/* Step dots */}
        <div className="flex justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="w-2.5 h-2.5 rounded-full transition-all duration-200"
              style={{ background: step >= s ? "var(--fal-purple-light)" : "var(--bg-tertiary)", border: `1px solid ${step >= s ? "var(--fal-purple-light)" : "var(--border-color)"}` }} />
          ))}
        </div>

        {/* ===== STEP 1: World ===== */}
        {step === 1 && (
          <div className="animate-fade-in" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: "var(--fal-purple-deep)" }}>1</div>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Your world</h2>
            </div>

            {/* History */}
            {worldHistory.length > 0 && (
              <HistoryDropdown
                items={worldHistory}
                selected={selectedWorld}
                onSelect={(item) => setSelectedWorld(item as WorldHistoryEntry | null)}
              />
            )}

            {!selectedWorld && (
              <>
                <div className="mb-4">
                  <textarea
                    value={worldPrompt}
                    onChange={(e) => setWorldPrompt(e.target.value)}
                    placeholder="A mystical floating island with waterfalls, ancient ruins..."
                    rows={3}
                    className="w-full resize-none text-sm"
                    style={inputStyle}
                    {...focusHandlers}
                  />
                </div>

                <div className="mb-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleWorldImage(f); }}>
                  {worldImagePreview ? (
                    <div className="relative overflow-hidden" style={{ border: "1px solid var(--border-color)", borderRadius: 6 }}>
                      <img src={worldImagePreview} alt="World reference" className="w-full max-h-40 object-contain" style={{ background: "var(--bg-tertiary)" }} />
                      <button onClick={removeWorldImage} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-xs rounded" style={{ background: "rgba(0,0,0,0.7)", color: "var(--text-secondary)" }}>x</button>
                      <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
                        <p className="text-xs" style={{ color: worldUploading ? "var(--text-tertiary)" : mediaAssetId ? "var(--success)" : "var(--text-tertiary)" }}>
                          {worldUploading ? "Uploading..." : mediaAssetId ? "Reference image ready" : "Processing..."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => worldFileRef.current?.click()} className="w-full py-3 text-sm transition-all duration-150" style={{ background: "transparent", border: "1px dashed var(--border-color)", borderRadius: 6, color: "var(--text-tertiary)" }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border-color-hover)"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-color)"}
                    >+ Add a reference image (optional)</button>
                  )}
                  <input ref={worldFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleWorldImage(f); }} />
                </div>

                {worldUploadError && <div className="mb-4 text-xs p-3" style={{ background: "rgba(236,6,72,0.08)", border: "1px solid rgba(236,6,72,0.3)", borderRadius: 6, color: "var(--fal-red)" }}>{worldUploadError}</div>}
              </>
            )}

            {/* World settings */}
            <button onClick={() => setShowSettings(!showSettings)} className="text-xs mb-3 transition-colors duration-150" style={{ color: "var(--text-tertiary)", background: "none" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}
            >{showSettings ? "Hide" : "Show"} world settings</button>

            {showSettings && (
              <div className="mb-4 p-3 space-y-3 text-left animate-fade-in" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 6 }}>
                <div>
                  <label className="block mb-1 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>World model</label>
                  <select value={settings.worldModel} onChange={(e) => setSettings({ ...settings, worldModel: e.target.value as GenerationSettings["worldModel"] })} className="w-full text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "0.4rem 0.75rem", color: "var(--text-primary)" }}>
                    <option value="marble-1.1-plus">marble-1.1-plus (best quality)</option>
                    <option value="marble-1.1">marble-1.1 (faster)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Splat quality</label>
                  <select value={settings.splatQuality} onChange={(e) => setSettings({ ...settings, splatQuality: e.target.value as GenerationSettings["splatQuality"] })} className="w-full text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "0.4rem 0.75rem", color: "var(--text-primary)" }}>
                    <option value="500k">500k (better performance)</option>
                    <option value="full_res">Full resolution</option>
                  </select>
                </div>
              </div>
            )}

            <button onClick={() => setStep(2)} disabled={!canProceedStep1 || worldUploading} className="w-full py-2.5 text-sm font-medium transition-all duration-150"
              style={{ background: "var(--fal-purple-deep)", color: "white", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", opacity: (!canProceedStep1 || worldUploading) ? 0.5 : 1, cursor: (!canProceedStep1 || worldUploading) ? "not-allowed" : "pointer" }}
              onMouseEnter={(e) => { if (canProceedStep1 && !worldUploading) e.currentTarget.style.background = "var(--fal-purple-light)"; }}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--fal-purple-deep)"}
            >Next: Create Your Character</button>
          </div>
        )}

        {/* ===== STEP 2: Character ===== */}
        {step === 2 && (
          <div className="animate-fade-in" style={cardStyle}>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep(1)} className="text-xs transition-colors duration-150" style={{ color: "var(--text-tertiary)", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 6, padding: "0.3rem 0.6rem" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-color-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
              >Back</button>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: "var(--fal-purple-deep)" }}>2</div>
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Your character</h2>
              </div>
            </div>

            {/* History */}
            {characterHistory.length > 0 && (
              <HistoryDropdown
                items={characterHistory}
                selected={selectedChar}
                onSelect={(item) => setSelectedChar(item as CharacterHistoryEntry | null)}
              />
            )}

            {!selectedChar && (
              <>
                <div className="mb-4">
                  <textarea
                    value={characterPrompt}
                    onChange={(e) => setCharacterPrompt(e.target.value)}
                    placeholder="A battle-worn elven ranger with silver armor, glowing blue eyes..."
                    rows={3}
                    className="w-full resize-none text-sm"
                    style={inputStyle}
                    {...focusHandlers}
                  />
                </div>

                <div className="mb-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleCharImage(f); }}>
                  {charImagePreview ? (
                    <div className="relative overflow-hidden" style={{ border: "1px solid var(--border-color)", borderRadius: 6 }}>
                      <img src={charImagePreview} alt="Character reference" className="w-full max-h-44 object-contain" style={{ background: "var(--bg-tertiary)" }} />
                      <button onClick={removeCharImage} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-xs rounded" style={{ background: "rgba(0,0,0,0.7)", color: "var(--text-secondary)" }}>x</button>
                      <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
                        <p className="text-xs" style={{ color: "var(--success)" }}>Image ready, will use image-to-3D</p>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => charFileRef.current?.click()} className="w-full py-3 text-sm transition-all duration-150" style={{ background: "transparent", border: "1px dashed var(--border-color)", borderRadius: 6, color: "var(--text-tertiary)" }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border-color-hover)"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-color)"}
                    >+ Upload a character image (optional)</button>
                  )}
                  <input ref={charFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCharImage(f); }} />
                </div>
              </>
            )}

            {/* Character + render settings */}
            <button onClick={() => setShowSettings(!showSettings)} className="text-xs mb-3 transition-colors duration-150" style={{ color: "var(--text-tertiary)", background: "none" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}
            >{showSettings ? "Hide" : "Show"} character settings</button>

            {showSettings && (
              <div className="mb-4 p-3 space-y-3 text-left animate-fade-in" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 6 }}>
                <div>
                  <label className="block mb-1 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Polycount: {settings.charPolycount.toLocaleString()}</label>
                  <input type="range" min={5000} max={50000} step={5000} value={settings.charPolycount} onChange={(e) => setSettings({ ...settings, charPolycount: Number(e.target.value) })} className="w-full" style={{ accentColor: "var(--fal-purple-light)" }} />
                  <div className="flex justify-between text-[10px]" style={{ color: "var(--text-tertiary)" }}><span>5k</span><span>50k</span></div>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Render quality: {settings.pixelRatio}x</label>
                  <input type="range" min={0.5} max={2} step={0.25} value={settings.pixelRatio} onChange={(e) => setSettings({ ...settings, pixelRatio: Number(e.target.value) })} className="w-full" style={{ accentColor: "var(--fal-purple-light)" }} />
                  <div className="flex justify-between text-[10px]" style={{ color: "var(--text-tertiary)" }}><span>0.5x</span><span>2x</span></div>
                </div>
              </div>
            )}

            <button onClick={handleSubmit} disabled={!canGenerate} className="w-full py-2.5 text-sm font-medium transition-all duration-150"
              style={{ background: "var(--fal-cyan)", color: "white", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", opacity: !canGenerate ? 0.5 : 1, cursor: !canGenerate ? "not-allowed" : "pointer" }}
              onMouseEnter={(e) => { if (canGenerate) e.currentTarget.style.background = "var(--fal-blue-light)"; }}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--fal-cyan)"}
            >
              {selectedWorld && selectedChar ? "Go to Preview" : "Generate World & Character"}
            </button>
          </div>
        )}

        <p className="mt-8 text-xs" style={{ color: "var(--text-tertiary)" }}>Powered by World Labs + Meshy on fal.ai</p>
      </div>
    </div>
  );
}
