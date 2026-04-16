"use client";

import { useState, useEffect, useCallback } from "react";
import type { WorldResponse, CharacterResult } from "./types";

const WORLD_HISTORY_KEY = "worldplay_worlds";
const CHAR_HISTORY_KEY = "worldplay_characters";
const MAX_HISTORY = 10;

export interface WorldHistoryEntry {
  id: string;
  prompt: string;
  thumbnail?: string;
  data: WorldResponse;
  createdAt: number;
}

export interface CharacterHistoryEntry {
  id: string;
  prompt: string;
  thumbnail?: string;
  data: CharacterResult;
  createdAt: number;
}

function loadFromStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Storage full — silently fail
  }
}

export function useHistory() {
  const [worlds, setWorlds] = useState<WorldHistoryEntry[]>([]);
  const [characters, setCharacters] = useState<CharacterHistoryEntry[]>([]);

  // Load on mount
  useEffect(() => {
    setWorlds(loadFromStorage<WorldHistoryEntry>(WORLD_HISTORY_KEY));
    setCharacters(loadFromStorage<CharacterHistoryEntry>(CHAR_HISTORY_KEY));
  }, []);

  const saveWorld = useCallback((prompt: string, data: WorldResponse) => {
    // Always read fresh from localStorage to avoid stale state
    const existing = loadFromStorage<WorldHistoryEntry>(WORLD_HISTORY_KEY);
    const entry: WorldHistoryEntry = {
      id: data.id,
      prompt: prompt || data.display_name || "World",
      thumbnail: data.assets?.thumbnail_url,
      data,
      createdAt: Date.now(),
    };
    const filtered = existing.filter((w) => w.id !== entry.id);
    const next = [entry, ...filtered].slice(0, MAX_HISTORY);
    saveToStorage(WORLD_HISTORY_KEY, next);
    setWorlds(next);
  }, []);

  const saveCharacter = useCallback((prompt: string, data: CharacterResult) => {
    const existing = loadFromStorage<CharacterHistoryEntry>(CHAR_HISTORY_KEY);
    const entry: CharacterHistoryEntry = {
      id: `${data.seed}-${Date.now()}`,
      prompt: prompt || "Character",
      thumbnail: data.thumbnail?.url,
      data,
      createdAt: Date.now(),
    };
    const next = [entry, ...existing].slice(0, MAX_HISTORY);
    saveToStorage(CHAR_HISTORY_KEY, next);
    setCharacters(next);
  }, []);

  return { worlds, characters, saveWorld, saveCharacter };
}
