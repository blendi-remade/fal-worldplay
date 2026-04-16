"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import type { GenerationState } from "@/lib/types";

interface Props {
  state: GenerationState;
  onExit: () => void;
}

const MOUSE_SENSITIVITY = 0.002;
const CROSSFADE_DURATION = 0.25;
// Character should be about 1/8 the world height (e.g. human in a room)
const CHAR_TO_WORLD_RATIO = 1 / 8;

export default function GameplayView({ state, onExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(false);
  const [speedDisplay, setSpeedDisplay] = useState(1);

  // Listen for speed changes from the game loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: Event) => setSpeedDisplay((e as CustomEvent).detail);
    container.addEventListener("speedchange", handler);
    return () => container.removeEventListener("speedchange", handler);
  }, []);

  const handleExit = useCallback(() => {
    document.exitPointerLock?.();
    onExit();
  }, [onExit]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;

    // --- Input state (local to this effect) ---
    const keys: Record<string, boolean> = {};
    let yaw = 0;
    let pitch = 0.3;

    // --- Scene setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.001,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: state.settings.pixelRatio >= 1 });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(state.settings.pixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sunLight.position.set(10, 20, 10);
    scene.add(sunLight);

    // --- Load world splat ---
    const spark = new SparkRenderer({ renderer });
    scene.add(spark);

    const spzUrls = state.worldData?.assets?.splats?.spz_urls;
    const splatUrl =
      state.settings.splatQuality === "full_res"
        ? (spzUrls?.full_res ?? spzUrls?.["500k"])
        : (spzUrls?.["500k"] ?? spzUrls?.full_res);

    // World Labs splats use an inverted Y axis — flip around X
    const worldRoot = new THREE.Group();
    worldRoot.scale.set(1, -1, 1);
    scene.add(worldRoot);

    if (splatUrl) {
      const splat = new SplatMesh({ url: splatUrl });
      worldRoot.add(splat);
    }

    // --- World-relative scaling ---
    // These get set once we measure the collider mesh
    let worldScale = 1; // size of the world's bounding box max dimension
    let worldCenter = new THREE.Vector3(0, 0, 0);
    let worldFloorY = 0;
    let charHeight = 0.2; // will be set after scaling
    let moveSpeed = 0.5;
    let runSpeed = 1.0;
    let camDistance = 0.5;
    let camHeight = 0.3;

    // --- Collider + character loading ---
    const colliderMeshUrl = state.worldData?.assets?.mesh?.collider_mesh_url;
    let colliderMesh: THREE.Object3D | null = null;

    const gltfLoader = new GLTFLoader();

    const animationGlbUrl = state.characterData?.animation_glb?.url;
    const riggedGlbUrl = state.characterData?.rigged_character_glb?.url;
    const modelGlbUrl = state.characterData?.model_glb?.url;
    const primaryCharUrl = animationGlbUrl ?? riggedGlbUrl ?? modelGlbUrl;

    const walkingGlbUrl = state.characterData?.basic_animations?.walking_glb?.url;
    const runningGlbUrl = state.characterData?.basic_animations?.running_glb?.url;

    let characterModel: THREE.Object3D | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let currentAction: THREE.AnimationAction | null = null;
    let idleClip: THREE.AnimationClip | null = null;
    let walkClip: THREE.AnimationClip | null = null;
    let runClip: THREE.AnimationClip | null = null;

    const timer = new THREE.Clock();

    function fadeToAction(clip: THREE.AnimationClip | null) {
      if (!mixer || !clip) return;
      const newAction = mixer.clipAction(clip);
      if (newAction === currentAction) return;
      newAction.reset().setEffectiveWeight(1).play();
      if (currentAction) {
        currentAction.crossFadeTo(newAction, CROSSFADE_DURATION, true);
      }
      currentAction = newAction;
    }

    // Raycaster to find floor
    const raycaster = new THREE.Raycaster();
    const downDir = new THREE.Vector3(0, -1, 0);

    function findFloorY(pos: THREE.Vector3): number | null {
      if (!colliderMesh) return null;
      raycaster.set(
        new THREE.Vector3(pos.x, pos.y + worldScale * 2, pos.z),
        downDir
      );
      const hits = raycaster.intersectObject(colliderMesh, true);
      return hits.length > 0 ? hits[0].point.y : null;
    }

    function spawnCharacter(gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }) {
      if (destroyed) return;
      characterModel = gltf.scene;

      // Measure character's raw height
      const charBox = new THREE.Box3().setFromObject(characterModel);
      const rawHeight = charBox.getSize(new THREE.Vector3()).y;

      // Use placement data from state if available, otherwise fall back to auto
      const hasPlacement = state.spawnPosition !== null;
      const targetHeight = hasPlacement ? state.characterScale : worldScale * CHAR_TO_WORLD_RATIO;

      if (rawHeight > 0) {
        const s = targetHeight / rawHeight;
        characterModel.scale.setScalar(s);
      }

      charHeight = targetHeight;

      // Derive speeds and camera from character size
      moveSpeed = charHeight * 2.5;
      runSpeed = charHeight * 5;
      camDistance = charHeight * 3;
      camHeight = charHeight * 1.5;

      // Spawn position
      let spawnPos: THREE.Vector3;
      if (hasPlacement && state.spawnPosition) {
        spawnPos = new THREE.Vector3(...state.spawnPosition);
      } else {
        spawnPos = worldCenter.clone();
        const floorY = findFloorY(spawnPos);
        if (floorY !== null) {
          spawnPos.y = floorY;
          worldFloorY = floorY;
        } else {
          spawnPos.y = worldFloorY;
        }
      }

      // Offset so feet touch ground
      const scaledBox = new THREE.Box3().setFromObject(characterModel);
      characterModel.position.copy(spawnPos);
      characterModel.position.y -= scaledBox.min.y;

      scene.add(characterModel);

      // Place camera initially
      camera.position.set(
        spawnPos.x,
        spawnPos.y + camHeight,
        spawnPos.z + camDistance
      );
      camera.lookAt(spawnPos);

      mixer = new THREE.AnimationMixer(characterModel);

      if (gltf.animations.length > 0) {
        idleClip = gltf.animations[0];
        currentAction = mixer.clipAction(idleClip);
        currentAction.play();
      }

      if (walkingGlbUrl) {
        gltfLoader.load(walkingGlbUrl, (walkGltf) => {
          if (walkGltf.animations.length > 0) walkClip = walkGltf.animations[0];
        });
      }
      if (runningGlbUrl) {
        gltfLoader.load(runningGlbUrl, (runGltf) => {
          if (runGltf.animations.length > 0) runClip = runGltf.animations[0];
        });
      }
    }

    // Load collider mesh first, then character
    if (colliderMeshUrl) {
      gltfLoader.load(colliderMeshUrl, (gltf) => {
        if (destroyed) return;
        colliderMesh = gltf.scene;
        colliderMesh.visible = false;
        // Flip Y to match the splat orientation, but keep in scene root for raycasting
        colliderMesh.scale.set(1, -1, 1);
        scene.add(colliderMesh);

        // Measure the world
        const worldBox = new THREE.Box3().setFromObject(colliderMesh);
        const worldSize = worldBox.getSize(new THREE.Vector3());
        worldScale = Math.max(worldSize.x, worldSize.y, worldSize.z);
        worldCenter = worldBox.getCenter(new THREE.Vector3());
        worldFloorY = worldBox.min.y;

        console.log("World bounds:", {
          size: worldSize,
          center: worldCenter,
          scale: worldScale,
        });

        // Now load character with world measurements available
        if (primaryCharUrl) {
          gltfLoader.load(primaryCharUrl, (charGltf) => spawnCharacter(charGltf));
        } else {
          // No character — place camera at world center
          camera.position.copy(worldCenter);
          camera.position.y += worldScale * 0.2;
        }
      });
    } else if (primaryCharUrl) {
      // No collider mesh — fallback: guess world scale from splat
      worldScale = 10;
      gltfLoader.load(primaryCharUrl, (charGltf) => spawnCharacter(charGltf));
    }

    // --- Speed multiplier ([ and ] to adjust) ---
    let speedMultiplier = 1;

    // --- Input handling ---
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === "Escape") handleExit();
      if (e.code === "BracketLeft") {
        speedMultiplier = Math.max(0.1, speedMultiplier * 0.7);
        container.dispatchEvent(new CustomEvent("speedchange", { detail: speedMultiplier }));
      }
      if (e.code === "BracketRight") {
        speedMultiplier = Math.min(5, speedMultiplier * 1.4);
        container.dispatchEvent(new CustomEvent("speedchange", { detail: speedMultiplier }));
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        yaw -= e.movementX * MOUSE_SENSITIVITY;
        pitch = Math.max(-0.5, Math.min(1.2, pitch + e.movementY * MOUSE_SENSITIVITY));
      }
    };
    const onClick = () => {
      if (!destroyed && container.contains(renderer.domElement)) {
        renderer.domElement.requestPointerLock();
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1 + e.deltaY * 0.001;
      camDistance = Math.max(charHeight * 0.5, Math.min(charHeight * 20, camDistance * zoomFactor));
      camHeight = camDistance * 0.5;
    };
    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === renderer.domElement;
      setLocked(isLocked);
      if (isLocked && overlayRef.current) {
        overlayRef.current.style.display = "none";
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // --- Resize ---
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // --- Track previous movement state for animation transitions ---
    let prevMoving = false;
    let prevRunning = false;

    // --- Game loop ---
    let animId: number;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = timer.getDelta();

      if (characterModel) {
        // Movement direction based on yaw
        const forward = new THREE.Vector3(
          -Math.sin(yaw), 0, -Math.cos(yaw)
        );
        const right = new THREE.Vector3(
          -Math.sin(yaw - Math.PI / 2), 0, -Math.cos(yaw - Math.PI / 2)
        );

        tempVec.set(0, 0, 0);
        if (keys["KeyW"]) tempVec.add(forward);
        if (keys["KeyS"]) tempVec.sub(forward);
        if (keys["KeyD"]) tempVec.add(right);
        if (keys["KeyA"]) tempVec.sub(right);

        const isMoving = tempVec.lengthSq() > 0.001;
        const isRunning = isMoving && (keys["ShiftLeft"] || keys["ShiftRight"]);
        const speed = (isRunning ? runSpeed : moveSpeed) * speedMultiplier;

        if (isMoving) {
          tempVec.normalize().multiplyScalar(speed * delta);
          // Only move on XZ plane — keep Y locked
          const savedY = characterModel.position.y;
          characterModel.position.add(tempVec);

          if (state.spawnPosition) {
            // Manual placement: lock to placed Y
            characterModel.position.y = savedY;
          } else {
            // Auto placement: snap to collider floor
            const floorY = findFloorY(characterModel.position);
            if (floorY !== null) {
              characterModel.position.y = floorY;
            } else {
              characterModel.position.y = savedY;
            }
          }

          // Smoothly rotate character to face movement direction
          const targetAngle = Math.atan2(tempVec.x, tempVec.z);
          let angleDiff = targetAngle - characterModel.rotation.y;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          characterModel.rotation.y += angleDiff * 0.15;
        }

        // Animation transitions
        if (isMoving !== prevMoving || isRunning !== prevRunning) {
          if (!isMoving) {
            fadeToAction(idleClip);
          } else if (isRunning) {
            fadeToAction(runClip ?? walkClip ?? idleClip);
          } else {
            fadeToAction(walkClip ?? idleClip);
          }
          prevMoving = isMoving;
          prevRunning = isRunning;
        }

        mixer?.update(delta);

        // Third-person camera (distances scale with character)
        const camOffset = new THREE.Vector3(
          camDistance * Math.sin(yaw) * Math.cos(pitch),
          camHeight + camDistance * Math.sin(pitch),
          camDistance * Math.cos(yaw) * Math.cos(pitch)
        );
        const targetCamPos = characterModel.position.clone().add(camOffset);
        camera.position.copy(targetCamPos);

        const lookTarget = characterModel.position.clone();
        lookTarget.y += charHeight * 0.7;
        camera.lookAt(lookTarget);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      destroyed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("wheel", onWheel);
      document.exitPointerLock?.();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [state.worldData, state.characterData, handleExit]);

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="w-full h-full" />

      {/* HUD overlay */}
      <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="pointer-events-auto px-3 py-1.5" style={{ background: "rgba(10,10,11,0.7)", border: "1px solid var(--border-color)", borderRadius: 6 }}>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              <kbd style={{ background: "var(--bg-tertiary)", padding: "0.1rem 0.35rem", borderRadius: 3, border: "1px solid var(--border-color)", fontFamily: "monospace", color: "var(--text-secondary)", fontSize: "0.7rem" }}>WASD</kbd>
              <span className="ml-1 mr-2.5">Move</span>
              <kbd style={{ background: "var(--bg-tertiary)", padding: "0.1rem 0.35rem", borderRadius: 3, border: "1px solid var(--border-color)", fontFamily: "monospace", color: "var(--text-secondary)", fontSize: "0.7rem" }}>Shift</kbd>
              <span className="ml-1 mr-2.5">Run</span>
              <kbd style={{ background: "var(--bg-tertiary)", padding: "0.1rem 0.35rem", borderRadius: 3, border: "1px solid var(--border-color)", fontFamily: "monospace", color: "var(--text-secondary)", fontSize: "0.7rem" }}>Mouse</kbd>
              <span className="ml-1 mr-2.5">Look</span>
              <kbd style={{ background: "var(--bg-tertiary)", padding: "0.1rem 0.35rem", borderRadius: 3, border: "1px solid var(--border-color)", fontFamily: "monospace", color: "var(--text-secondary)", fontSize: "0.7rem" }}>Scroll</kbd>
              <span className="ml-1 mr-2.5">Zoom</span>
              <kbd style={{ background: "var(--bg-tertiary)", padding: "0.1rem 0.35rem", borderRadius: 3, border: "1px solid var(--border-color)", fontFamily: "monospace", color: "var(--text-secondary)", fontSize: "0.7rem" }}>[</kbd>
              <kbd style={{ background: "var(--bg-tertiary)", padding: "0.1rem 0.35rem", borderRadius: 3, border: "1px solid var(--border-color)", fontFamily: "monospace", color: "var(--text-secondary)", fontSize: "0.7rem" }}>]</kbd>
              <span className="ml-1 mr-2.5">Speed ({speedDisplay.toFixed(1)}x)</span>
              <kbd style={{ background: "var(--bg-tertiary)", padding: "0.1rem 0.35rem", borderRadius: 3, border: "1px solid var(--border-color)", fontFamily: "monospace", color: "var(--text-secondary)", fontSize: "0.7rem" }}>Esc</kbd>
              <span className="ml-1">Exit</span>
            </p>
          </div>
          <button
            onClick={handleExit}
            className="pointer-events-auto px-3 py-1.5 text-xs transition-all duration-150"
            style={{ background: "transparent", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-color-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
          >
            Exit World
          </button>
        </div>
      </div>

      {/* Click to focus overlay */}
      {!locked && (
        <div
          ref={overlayRef}
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(10,10,11,0.85)" }}
          onClick={() => {
            const canvas = containerRef.current?.querySelector("canvas");
            if (canvas) canvas.requestPointerLock();
          }}
        >
          <div className="text-center">
            <p className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Click to Enter</p>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Click anywhere to capture mouse</p>
          </div>
        </div>
      )}
    </div>
  );
}
