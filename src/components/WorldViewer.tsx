"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

interface Props {
  splatUrl: string;
  colliderMeshUrl?: string;
  className?: string;
}

// Fly controls: drag to look, WASD to move, scroll to zoom
export default function WorldViewer({ splatUrl, colliderMeshUrl, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.001, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // SparkJS
    const spark = new SparkRenderer({ renderer });
    scene.add(spark);

    // Load splat
    const worldRoot = new THREE.Group();
    worldRoot.scale.set(1, -1, 1);
    scene.add(worldRoot);
    worldRoot.add(new SplatMesh({ url: splatUrl }));

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // --- Fly camera state ---
    let yaw = 0;
    let pitch = 0;
    const keys: Record<string, boolean> = {};
    const FLY_SPEED = 0.5;
    const ZOOM_STEP = 0.4;
    const MOUSE_SENS = 0.003;
    let isDragging = false;

    // Load collider to find center
    if (colliderMeshUrl) {
      const loader = new GLTFLoader();
      loader.load(colliderMeshUrl, (gltf) => {
        const collider = gltf.scene;
        collider.scale.set(1, -1, 1);
        collider.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(collider);
        const center = box.getCenter(new THREE.Vector3());
        camera.position.copy(center);
      });
    }

    // --- Mouse drag to look ---
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onPointerUp = () => { isDragging = false; };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      yaw -= e.movementX * MOUSE_SENS;
      pitch -= e.movementY * MOUSE_SENS;
      pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
    };

    // --- Scroll to move forward/back ---
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const move = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      camera.position.addScaledVector(dir, move);
    };

    // --- WASD ---
    const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Resize
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Apply yaw/pitch to camera
      const euler = new THREE.Euler(pitch, yaw, 0, "YXZ");
      camera.quaternion.setFromEuler(euler);

      // WASD movement relative to camera direction
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      if (keys["KeyW"]) camera.position.addScaledVector(forward, FLY_SPEED * 0.016);
      if (keys["KeyS"]) camera.position.addScaledVector(forward, -FLY_SPEED * 0.016);
      if (keys["KeyD"]) camera.position.addScaledVector(right, FLY_SPEED * 0.016);
      if (keys["KeyA"]) camera.position.addScaledVector(right, -FLY_SPEED * 0.016);
      if (keys["KeyQ"]) camera.position.y -= FLY_SPEED * 0.016;
      if (keys["KeyE"]) camera.position.y += FLY_SPEED * 0.016;

      renderer.render(scene, camera);
    };
    animate();

    cleanupRef.current = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => cleanupRef.current?.();
  }, [splatUrl, colliderMeshUrl]);

  return <div ref={containerRef} className={className ?? "w-full h-full"} />;
}
