"use client";

import type { GenerationState } from "@/lib/types";
import { FalSpinner } from "./FalLogo";
import WorldViewer from "./WorldViewer";
import CharacterViewer from "./CharacterViewer";

interface Props {
  state: GenerationState;
  onEnterWorld: () => void;
}

export default function PreviewPanel({ state, onEnterWorld }: Props) {
  const spzUrls = state.worldData?.assets?.splats?.spz_urls;
  const splatUrl =
    state.settings.splatQuality === "full_res"
      ? (spzUrls?.full_res ?? spzUrls?.["500k"])
      : (spzUrls?.["500k"] ?? spzUrls?.full_res);

  const colliderMeshUrl = state.worldData?.assets?.mesh?.collider_mesh_url;

  const characterGlb =
    state.characterData?.rigged_character_glb?.url ??
    state.characterData?.model_glb?.url;

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-2.5" style={{ borderBottom: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Preview</h2>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Scroll to zoom inside the world. Drag to orbit. Enter world for third-person gameplay.</p>
        </div>
        <button
          onClick={onEnterWorld}
          className="px-5 py-2 text-sm font-medium transition-all duration-150"
          style={{ background: "var(--fal-cyan)", color: "white", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--fal-blue-light)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--fal-cyan)"}
        >
          {characterGlb ? "Enter World" : "Explore World"}
        </button>
      </div>

      {/* Split panels */}
      <div className="flex-1 flex">
        {/* World panel */}
        <div className="flex-1 relative" style={{ borderRight: "1px solid var(--border-color)" }}>
          <div className="absolute top-3 left-3 z-10 px-2.5 py-1" style={{ background: "rgba(10,10,11,0.7)", borderRadius: 6, border: "1px solid var(--border-color)" }}>
            <span className="text-xs font-medium" style={{ color: "var(--fal-purple-light)" }}>World</span>
          </div>
          {splatUrl ? (
            <WorldViewer splatUrl={splatUrl} colliderMeshUrl={colliderMeshUrl} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No splat data available</p>
            </div>
          )}
        </div>

        {/* Character panel */}
        <div className="flex-1 relative">
          <div className="absolute top-3 left-3 z-10 px-2.5 py-1" style={{ background: "rgba(10,10,11,0.7)", borderRadius: 6, border: "1px solid var(--border-color)" }}>
            <span className="text-xs font-medium" style={{ color: "var(--fal-cyan)" }}>Character</span>
          </div>
          {characterGlb ? (
            <CharacterViewer glbUrl={characterGlb} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              {state.characterGenerating ? (
                <>
                  <FalSpinner size={40} />
                  <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>Generating character...</span>
                </>
              ) : state.characterError ? (
                <p className="text-sm px-4" style={{ color: "var(--fal-red)" }}>{state.characterError}</p>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No character data</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
