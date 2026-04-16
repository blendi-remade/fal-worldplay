// World Labs types
export interface WorldAssets {
  caption?: string;
  thumbnail_url?: string;
  splats?: {
    spz_urls?: {
      "100k"?: string;
      "500k"?: string;
      full_res?: string;
    };
  };
  mesh?: {
    collider_mesh_url?: string;
  };
  imagery?: {
    pano_url?: string;
  };
}

export interface WorldResponse {
  id: string;
  display_name: string;
  assets: WorldAssets;
  world_marble_url: string;
}

export interface WorldOperation {
  operation_id: string;
  done: boolean;
  response?: WorldResponse;
}

// Meshy/fal types
export interface MeshyFile {
  url: string;
  content_type: string;
  file_name: string;
  file_size: number;
}

export interface CharacterResult {
  model_glb: MeshyFile;
  thumbnail: MeshyFile;
  rigged_character_glb?: MeshyFile;
  rigged_character_fbx?: MeshyFile;
  animation_glb?: MeshyFile;
  animation_fbx?: MeshyFile;
  basic_animations?: {
    walking_glb: MeshyFile;
    running_glb: MeshyFile;
    walking_fbx: MeshyFile;
    running_fbx: MeshyFile;
    walking_armature_glb: MeshyFile;
    running_armature_glb: MeshyFile;
  };
  seed: number;
  prompt: string;
}

// Settings
export interface GenerationSettings {
  worldModel: "marble-1.1" | "marble-1.1-plus";
  splatQuality: "500k" | "full_res";
  charPolycount: number;
  charTPose: boolean;
  pixelRatio: number;
}

export const DEFAULT_SETTINGS: GenerationSettings = {
  worldModel: "marble-1.1-plus",
  splatQuality: "500k",
  charPolycount: 30000,
  charTPose: false,
  pixelRatio: 1,
};

// App state
export type AppPhase = "landing" | "generating" | "preview" | "placing" | "playing";

export interface GenerationState {
  phase: AppPhase;
  settings: GenerationSettings;
  // World
  worldPrompt: string;
  worldOperationId: string | null;
  worldData: WorldResponse | null;
  worldGenerating: boolean;
  worldError: string | null;
  // Character
  characterPrompt: string;
  characterRequestId: string | null;
  characterData: CharacterResult | null;
  characterGenerating: boolean;
  characterError: string | null;
  // Placement
  spawnPosition: [number, number, number] | null;
  characterScale: number;
}
