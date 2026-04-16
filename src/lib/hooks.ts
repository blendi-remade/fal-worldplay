"use client";

import { useState, useCallback, useRef } from "react";
import type {
  GenerationState,
  GenerationSettings,
  WorldOperation,
  CharacterResult,
  WorldResponse,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";

const POLL_INTERVAL = 5000;

const initialState: GenerationState = {
  phase: "landing",
  settings: { ...DEFAULT_SETTINGS },
  worldPrompt: "",
  worldOperationId: null,
  worldData: null,
  worldGenerating: false,
  worldError: null,
  characterPrompt: "",
  characterRequestId: null,
  characterData: null,
  characterGenerating: false,
  characterError: null,
  spawnPosition: null,
  characterScale: 0.05,
};

export function useAppState() {
  const [state, setState] = useState<GenerationState>(initialState);
  const worldPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const charPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateState = useCallback(
    (updates: Partial<GenerationState>) =>
      setState((prev) => ({ ...prev, ...updates })),
    []
  );

  // ---------- World generation ----------
  const generateWorld = useCallback(
    async (prompt: string, imageUrl?: string, mediaAssetId?: string, settings?: GenerationSettings) => {
      updateState({
        phase: "generating",
        worldGenerating: true,
        worldError: null,
        worldPrompt: prompt,
        ...(settings ? { settings } : {}),
      });

      const model = settings?.worldModel ?? DEFAULT_SETTINGS.worldModel;

      try {
        const res = await fetch("/api/generate-world", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, imageUrl, mediaAssetId, model }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data: WorldOperation = await res.json();

        updateState({ worldOperationId: data.operation_id });

        // Start polling
        if (worldPollRef.current) clearInterval(worldPollRef.current);
        worldPollRef.current = setInterval(async () => {
          try {
            const statusRes = await fetch(
              `/api/world-status?operationId=${data.operation_id}`
            );
            const statusData: WorldOperation = await statusRes.json();

            if (statusData.done && statusData.response) {
              if (worldPollRef.current) clearInterval(worldPollRef.current);
              updateState({
                worldData: statusData.response,
                worldGenerating: false,
              });
            }
          } catch {
            // Keep polling on transient errors
          }
        }, POLL_INTERVAL);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "World generation failed";
        updateState({ worldGenerating: false, worldError: message });
      }
    },
    [updateState]
  );

  // ---------- Character generation ----------
  const generateCharacter = useCallback(
    async (prompt: string, settings?: GenerationSettings, imageUrl?: string) => {
      updateState({
        characterGenerating: true,
        characterError: null,
        characterPrompt: prompt || "(from image)",
      });

      const polycount = settings?.charPolycount ?? DEFAULT_SETTINGS.charPolycount;

      try {
        const res = await fetch("/api/generate-character", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt || undefined, imageUrl, polycount, tPose: settings?.charTPose ?? false }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { request_id, endpoint } = await res.json();

        updateState({ characterRequestId: request_id });

        // Start polling (pass endpoint so status route knows which to query)
        if (charPollRef.current) clearInterval(charPollRef.current);
        charPollRef.current = setInterval(async () => {
          try {
            const statusRes = await fetch(
              `/api/character-status?requestId=${request_id}&endpoint=${encodeURIComponent(endpoint)}`
            );
            const statusData = await statusRes.json();

            if (statusData.status === "COMPLETED") {
              if (charPollRef.current) clearInterval(charPollRef.current);
              updateState({
                characterData: statusData.result as CharacterResult,
                characterGenerating: false,
              });
            }
          } catch {
            // Keep polling on transient errors
          }
        }, POLL_INTERVAL);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Character generation failed";
        updateState({ characterGenerating: false, characterError: message });
      }
    },
    [updateState]
  );

  const setWorldData = useCallback(
    (data: WorldResponse) => updateState({ worldData: data, worldGenerating: false }),
    [updateState]
  );

  const setCharacterData = useCallback(
    (data: CharacterResult) =>
      updateState({ characterData: data, characterGenerating: false }),
    [updateState]
  );

  const enterWorld = useCallback(
    () => updateState({ phase: "playing" }),
    [updateState]
  );

  const exitWorld = useCallback(
    () => updateState({ phase: "preview" }),
    [updateState]
  );

  const goToPreview = useCallback(
    () => updateState({ phase: "preview" }),
    [updateState]
  );

  return {
    state,
    generateWorld,
    generateCharacter,
    setWorldData,
    setCharacterData,
    enterWorld,
    exitWorld,
    goToPreview,
    updateState,
  };
}
