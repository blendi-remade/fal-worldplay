"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

interface Props {
  splatUrl: string;
  colliderMeshUrl?: string;
  className?: string;
}

export default function WorldViewer({ splatUrl, colliderMeshUrl, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.001,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // SparkJS
    const spark = new SparkRenderer({ renderer });
    scene.add(spark);

    // Load splat — flip Y for World Labs orientation
    const worldRoot = new THREE.Group();
    worldRoot.scale.set(1, -1, 1);
    scene.add(worldRoot);
    const splat = new SplatMesh({ url: splatUrl });
    worldRoot.add(splat);

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    // Start with a small max distance so orbit stays inside
    controls.maxDistance = 2;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Load collider mesh to find the interior center
    if (colliderMeshUrl) {
      const loader = new GLTFLoader();
      loader.load(colliderMeshUrl, (gltf) => {
        const collider = gltf.scene;
        // Apply same Y-flip to get coordinates in scene space
        collider.scale.set(1, -1, 1);
        collider.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(collider);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Position camera and orbit target at world center
        camera.position.copy(center);
        controls.target.copy(center);
        camera.position.z += maxDim * 0.05;

        controls.maxDistance = maxDim * 0.5;
        controls.minDistance = 0;

        // Don't add collider to scene — we only needed it for measurement
      });
    } else {
      // Fallback: position camera at origin (often near the interior)
      camera.position.set(0, 0, 0.1);
      controls.target.set(0, 0, 0);
    }

    // Resize
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
      renderer.render(scene, camera);
    };
    animate();

    cleanupRef.current = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => cleanupRef.current?.();
  }, [splatUrl, colliderMeshUrl]);

  return <div ref={containerRef} className={className ?? "w-full h-full"} />;
}
