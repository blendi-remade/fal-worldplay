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

      {/* Right sidebar controls */}
      <div className="absolute top-0 right-0 bottom-0 w-56 p-3 flex flex-col justify-center pointer-events-none">
        <div className="pointer-events-auto p-3 space-y-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 10 }}>
          <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Place Character</p>

          {[
            { label: "X", color: "var(--fal-red)", value: posX, set: setPosX, min: worldBounds.min, max: worldBounds.max, step: sliderStep },
            { label: "Y (height)", color: "var(--success)", value: posY, set: setPosY, min: worldBounds.min, max: worldBounds.max, step: sliderStep },
            { label: "Z", color: "var(--fal-blue-light)", value: posZ, set: setPosZ, min: worldBounds.min, max: worldBounds.max, step: sliderStep },
            { label: "Size", color: "var(--fal-purple-light)", value: scale, set: setScale, min: 0.001, max: 1, step: 0.001 },
          ].map((s) => (
            <div key={s.label}>
              <label className="block mb-1 text-[10px]" style={{ color: s.color }}>{s.label}</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => s.set(Math.max(s.min, s.value - s.step))}
                  className="shrink-0 w-5 h-5 flex items-center justify-center text-xs transition-colors duration-100"
                  style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 4, color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border-color-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-color)"}
                >&minus;</button>
                <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))} className="w-full" style={{ accentColor: s.color }} />
                <button
                  onClick={() => s.set(Math.min(s.max, s.value + s.step))}
                  className="shrink-0 w-5 h-5 flex items-center justify-center text-xs transition-colors duration-100"
                  style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 4, color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border-color-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-color)"}
                >+</button>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-2 pt-1">
            <button onClick={handleStart} className="w-full py-2 text-sm font-medium transition-all duration-150"
              style={{ background: "var(--fal-cyan)", color: "white", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--fal-blue-light)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--fal-cyan)"}
            >Start Playing</button>
            <button onClick={onBack} className="w-full py-1.5 text-xs transition-all duration-150"
              style={{ background: "transparent", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-color-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
            >Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}
