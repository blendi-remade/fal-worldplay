"use client";

import { useRef, useEffect, useCallback } from "react";
import { useAppState } from "@/lib/hooks";
import { useHistory } from "@/lib/history";
import type { GenerationSettings, WorldResponse, CharacterResult } from "@/lib/types";
import LandingHero from "@/components/LandingHero";
import GeneratingView from "@/components/GeneratingView";
import PreviewPanel from "@/components/PreviewPanel";
import PlacementView from "@/components/PlacementView";
import GameplayView from "@/components/GameplayView";

export default function Home() {
  const {
    state,
    generateWorld,
    generateCharacter,
    enterWorld,
    exitWorld,
    goToPreview,
    updateState,
  } = useAppState();

  const history = useHistory();

  const worldImageRef = useRef<string | null>(null);
  const charImageRef = useRef<string | null>(null);
  const worldFromHistoryRef = useRef(false);
  const charFromHistoryRef = useRef(false);

  useEffect(() => {
    if (state.worldData && !worldFromHistoryRef.current) {
      history.saveWorld(state.worldPrompt, state.worldData);
    }
  }, [state.worldData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.characterData && !charFromHistoryRef.current) {
      history.saveCharacter(state.characterPrompt, state.characterData);
    }
  }, [state.characterData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = (
    worldPrompt: string,
    characterPrompt: string,
    mediaAssetId?: string,
    settings?: GenerationSettings,
    characterImageUrl?: string,
    worldImagePreview?: string,
    charImagePreview?: string,
    historyWorld?: WorldResponse | null,
    historyCharacter?: CharacterResult | null
  ) => {
    worldImageRef.current = worldImagePreview || null;
    charImageRef.current = charImagePreview || null;
    worldFromHistoryRef.current = !!historyWorld;
    charFromHistoryRef.current = !!historyCharacter;

    const bothFromHistory = historyWorld && historyCharacter;

    if (historyWorld) {
      updateState({
        phase: bothFromHistory ? "preview" : "generating",
        worldPrompt,
        worldData: historyWorld,
        worldGenerating: false,
        settings: settings ?? state.settings,
      });
    } else {
      generateWorld(worldPrompt, undefined, mediaAssetId, settings);
    }

    if (historyCharacter) {
      updateState({
        characterPrompt,
        characterData: historyCharacter,
        characterGenerating: false,
      });
    } else {
      generateCharacter(characterPrompt, settings, characterImageUrl);
    }
  };

  // "Enter World" now goes to placement if we have a character, otherwise straight to playing (free cam)
  const handleEnterWorld = useCallback(() => {
    if (state.characterData) {
      updateState({ phase: "placing" });
    } else {
      enterWorld();
    }
  }, [state.characterData, updateState, enterWorld]);

  const handlePlacementStart = useCallback((spawnPos: [number, number, number], charScale: number) => {
    updateState({
      phase: "playing",
      spawnPosition: spawnPos,
      characterScale: charScale,
    });
  }, [updateState]);

  if (state.phase === "playing") {
    return <GameplayView state={state} onExit={exitWorld} />;
  }

  if (state.phase === "placing") {
    return (
      <PlacementView
        state={state}
        onStart={handlePlacementStart}
        onBack={goToPreview}
      />
    );
  }

  if (state.phase === "preview") {
    return <PreviewPanel state={state} onEnterWorld={handleEnterWorld} />;
  }

  if (state.phase === "generating") {
    return (
      <GeneratingView
        state={state}
        onPreview={goToPreview}
        worldImagePreview={worldImageRef.current}
        charImagePreview={charImageRef.current}
      />
    );
  }

  return (
    <LandingHero
      onGenerate={handleGenerate}
      worldHistory={history.worlds}
      characterHistory={history.characters}
    />
  );
}
