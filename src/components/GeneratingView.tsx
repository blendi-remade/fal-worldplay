"use client";

import type { GenerationState } from "@/lib/types";
import { FalSpinner, FalLogo } from "./FalLogo";

interface Props {
  state: GenerationState;
  onPreview: () => void;
  worldImagePreview?: string | null;
  charImagePreview?: string | null;
}

function StatusIcon({ done, error }: { done: boolean; error: string | null }) {
  if (error) return <span style={{ color: "var(--fal-red)" }}><FalLogo size={20} /></span>;
  if (done) return <span style={{ color: "var(--success)" }}><FalLogo size={20} /></span>;
  return <FalSpinner size={20} />;
}

export default function GeneratingView({ state, onPreview, worldImagePreview, charImagePreview }: Props) {
  const worldDone = !!state.worldData;
  const charDone = !!state.characterData;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-md w-full">
        <h2 className="text-xl font-semibold mb-1 text-center" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Creating Your Experience
        </h2>
        <p className="text-sm mb-8 text-center" style={{ color: "var(--text-tertiary)" }}>
          This takes a few minutes.
        </p>

        <div className="space-y-4">
          {/* World row */}
          <div className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 10 }}>
            <div className="flex items-center gap-3 mb-3">
              <StatusIcon done={worldDone} error={state.worldError} />
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>World Generation</span>
              {worldDone && <span className="text-xs ml-auto" style={{ color: "var(--success)" }}>Ready</span>}
            </div>

            {state.worldError ? (
              <div className="text-xs p-2.5" style={{ background: "rgba(236,6,72,0.08)", border: "1px solid rgba(236,6,72,0.3)", borderRadius: 6, color: "var(--fal-red)" }}>
                {state.worldError}
              </div>
            ) : worldDone ? (
              state.worldData?.assets?.thumbnail_url && (
                <img src={state.worldData.assets.thumbnail_url} alt="World" className="w-full max-h-32 object-contain" style={{ borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-tertiary)" }} />
              )
            ) : (
              <div className="flex items-start gap-3">
                {worldImagePreview && (
                  <img src={worldImagePreview} alt="World input" className="h-16 max-w-24 object-contain shrink-0" style={{ borderRadius: 4, border: "1px solid var(--border-color)", background: "var(--bg-tertiary)" }} />
                )}
                {state.worldPrompt && (
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                    &ldquo;{state.worldPrompt.slice(0, 120)}{state.worldPrompt.length > 120 ? "..." : ""}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Character row */}
          <div className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 10 }}>
            <div className="flex items-center gap-3 mb-3">
              <StatusIcon done={charDone} error={state.characterError} />
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Character & Rigging</span>
              {charDone && <span className="text-xs ml-auto" style={{ color: "var(--success)" }}>Ready</span>}
            </div>

            {state.characterError ? (
              <div className="text-xs p-2.5" style={{ background: "rgba(236,6,72,0.08)", border: "1px solid rgba(236,6,72,0.3)", borderRadius: 6, color: "var(--fal-red)" }}>
                {state.characterError}
              </div>
            ) : charDone ? (
              state.characterData?.thumbnail?.url && (
                <img src={state.characterData.thumbnail.url} alt="Character" className="w-full max-h-32 object-contain" style={{ borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-tertiary)" }} />
              )
            ) : (
              <div className="flex items-start gap-3">
                {charImagePreview && (
                  <img src={charImagePreview} alt="Character input" className="h-16 max-w-24 object-contain shrink-0" style={{ borderRadius: 4, border: "1px solid var(--border-color)", background: "var(--bg-tertiary)" }} />
                )}
                {state.characterPrompt && state.characterPrompt !== "(from image)" && (
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                    &ldquo;{state.characterPrompt.slice(0, 120)}{state.characterPrompt.length > 120 ? "..." : ""}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {worldDone && (
          <button
            onClick={onPreview}
            className="w-full mt-6 py-2.5 text-sm font-medium transition-all duration-150 animate-fade-in"
            style={{ background: "var(--fal-cyan)", color: "white", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--fal-blue-light)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--fal-cyan)"}
          >
            {charDone ? "Preview Your World" : "Explore World (character still generating...)"}
          </button>
        )}
      </div>
    </div>
  );
}
