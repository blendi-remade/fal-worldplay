"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import type { GenerationState } from "@/lib/types";

interface Props {
  state: GenerationState;
  onStart: (spawnPos: [number, number, number], charScale: number) => void;
  onBack: () => void;
}

export default function PlacementView({ state, onStart, onBack }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.05);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [posZ, setPosZ] = useState(0);
  const [worldBounds, setWorldBounds] = useState({ min: -1, max: 1 });

  const charModelRef = useRef<THREE.Object3D | null>(null);
  const rawCharHeightRef = useRef(1);

  const handleStart = useCallback(() => {
    onStart([posX, posY, posZ], scale);
  }, [posX, posY, posZ, scale, onStart]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.001, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: state.settings.pixelRatio >= 1 });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(state.settings.pixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sun.position.set(10, 20, 10);
    scene.add(sun);

    // SparkJS + splat
    const spark = new SparkRenderer({ renderer });
    scene.add(spark);
    const worldRoot = new THREE.Group();
    worldRoot.scale.set(1, -1, 1);
    scene.add(worldRoot);

    const spzUrls = state.worldData?.assets?.splats?.spz_urls;
    const splatUrl = state.settings.splatQuality === "full_res"
      ? (spzUrls?.full_res ?? spzUrls?.["500k"])
      : (spzUrls?.["500k"] ?? spzUrls?.full_res);
    if (splatUrl) worldRoot.add(new SplatMesh({ url: splatUrl }));

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0;

    const gltfLoader = new GLTFLoader();

    // Load collider to get world bounds
    const colliderMeshUrl = state.worldData?.assets?.mesh?.collider_mesh_url;
    if (colliderMeshUrl) {
      gltfLoader.load(colliderMeshUrl, (gltf) => {
        if (destroyed) return;
        const collider = gltf.scene;
        collider.scale.set(1, -1, 1);
        collider.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(collider);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Set slider ranges based on world bounds
        setWorldBounds({ min: -maxDim, max: maxDim });

        // Initialize position to world center
        setPosX(center.x);
        setPosY(center.y);
        setPosZ(center.z);

        // Camera
        camera.position.copy(center);
        camera.position.z += maxDim * 0.3;
        controls.target.copy(center);
        controls.maxDistance = maxDim * 2;
      });
    }

    // Load character (visible immediately)
    const charUrl = state.characterData?.rigged_character_glb?.url ?? state.characterData?.model_glb?.url;
    let mixer: THREE.AnimationMixer | null = null;
    const clock = new THREE.Clock();

    if (charUrl) {
      gltfLoader.load(charUrl, (gltf) => {
        if (destroyed) return;
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        rawCharHeightRef.current = box.getSize(new THREE.Vector3()).y || 1;
        scene.add(model);
        charModelRef.current = model;

        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(gltf.animations[0]).play();
        }
      });
    }

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      mixer?.update(clock.getDelta());
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      destroyed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [state.worldData, state.characterData, state.settings]);

  // Update character position + scale reactively
  useEffect(() => {
    const model = charModelRef.current;
    if (!model) return;

    const scaleFactor = scale / rawCharHeightRef.current;
    model.scale.setScalar(scaleFactor);

    model.position.set(posX, 0, posZ);
    const box = new THREE.Box3().setFromObject(model);
    model.position.y = posY - box.min.y;
  }, [scale, posX, posY, posZ]);

  const sliderStep = (worldBounds.max - worldBounds.min) / 1000;

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="w-full h-full" />

      {/* Top hint */}
      <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none">
        <div className="pointer-events-auto inline-block px-3 py-1.5" style={{ background: "rgba(10,10,11,0.7)", border: "1px solid var(--border-color)", borderRadius: 6 }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Drag to orbit, scroll to zoom. Use sliders to position and size your character.
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 10 }}>

          {/* Position sliders */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>X</label>
              <input type="range" min={worldBounds.min} max={worldBounds.max} step={sliderStep} value={posX}
                onChange={(e) => setPosX(Number(e.target.value))} className="w-full" style={{ accentColor: "var(--fal-red)" }} />
            </div>
            <div>
              <label className="block mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Y (height)</label>
              <input type="range" min={worldBounds.min} max={worldBounds.max} step={sliderStep} value={posY}
                onChange={(e) => setPosY(Number(e.target.value))} className="w-full" style={{ accentColor: "var(--success)" }} />
            </div>
            <div>
              <label className="block mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Z</label>
              <input type="range" min={worldBounds.min} max={worldBounds.max} step={sliderStep} value={posZ}
                onChange={(e) => setPosZ(Number(e.target.value))} className="w-full" style={{ accentColor: "var(--fal-blue-light)" }} />
            </div>
          </div>

          {/* Scale slider */}
          <div className="mb-3">
            <label className="block mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Size</label>
            <input type="range" min={0.001} max={1} step={0.001} value={scale}
              onChange={(e) => setScale(Number(e.target.value))} className="w-full" style={{ accentColor: "var(--fal-purple-light)" }} />
            <div className="flex justify-between text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              <span>Tiny</span>
              <span>Large</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button onClick={onBack} className="px-4 py-2 text-sm transition-all duration-150"
              style={{ background: "transparent", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-color-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
            >Back</button>
            <button onClick={handleStart} className="flex-1 py-2 text-sm font-medium transition-all duration-150"
              style={{ background: "var(--fal-cyan)", color: "white", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--fal-blue-light)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--fal-cyan)"}
            >Start Playing</button>
          </div>
        </div>
      </div>
    </div>
  );
}
