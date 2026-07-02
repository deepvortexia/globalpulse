"use client";

import { Component, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import type { Group } from "three";

// ── Globy, the GlobeVortex light-spirit mascot ────────────────────────────────
// Real 3D: a Blender-modeled, rigged and animated GLB (~120 KB, ~2k tris)
// played through React Three Fiber. The GLB ships one looping clip
// ("GlobyIdle", 3s: vertical bob + arm sway + head tilt + comet-trail lag).
// Scroll travel is split in two, mirroring the CSS parallax layers:
//   - the .gv-globy wrapper drifts upward via --gvs in CSS (see globals.css),
//   - the mesh itself sways/turns here from window.scrollY — the same value
//     --gvs mirrors, so the two motions stay in sync by construction.
// Reduced motion: the clip never starts, scroll sway is skipped, and the
// canvas renders a single static frame (frameloop="demand"); the CSS drift is
// already frozen because --gvs stays 0 without the scroll listener.

const MODEL_URL = "/models/globy.glb";

// Base yaw shows the comet trail's silhouette instead of hiding it behind him.
const BASE_YAW = 0.35;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function GlobyMesh({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (reducedMotion) return;
    const idle = actions.GlobyIdle;
    idle?.reset().fadeIn(0.6).play();
    return () => {
      idle?.fadeOut(0.3);
    };
  }, [actions, reducedMotion]);

  // Gentle scroll-linked sway. window.scrollY is exactly what VortexJourney
  // publishes as --gvs each frame, so this tracks the other parallax layers
  // without another listener. Bounded (sine), unlike a raw multiplier, so
  // Globy never drifts off frame however long the journey gets.
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    if (reducedMotion) {
      g.rotation.set(0, BASE_YAW, 0);
      return;
    }
    const y = window.scrollY;
    g.rotation.y = BASE_YAW + Math.sin(y * 0.0006) * 0.28;
    g.rotation.z = Math.sin(y * 0.00042) * 0.05;
  });

  // The GLB stands on the origin (~1.5 units tall); recenter it on the camera.
  return (
    <group ref={group}>
      <primitive object={scene} position={[0, -0.88, 0]} />
    </group>
  );
}

// A mascot is decoration: if WebGL is unavailable or the model fails to load,
// render nothing rather than an error card in the middle of the journey.
class GlobyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function GlobyModel() {
  const reducedMotion = usePrefersReducedMotion();

  // The wrapper is display:none below sm (640px), but CSS alone would still
  // let React mount the canvas and create a WebGL context there — skip the
  // mount entirely on phones.
  const [wideEnough, setWideEnough] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setWideEnough(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Defer mounting the canvas until the browser is idle so the WebGL context
  // and model fetch never compete with the hero's first paint.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setReady(true), 350);
    return () => window.clearTimeout(id);
  }, []);

  if (!ready || !wideEnough) return null;

  return (
    <GlobyBoundary>
      <Canvas
        // `flat` (no tone mapping) keeps the emissive gold saturated instead
        // of filmic-washed; dpr capped so 4K screens don't quadruple the work.
        flat
        dpr={[1, 1.75]}
        frameloop={reducedMotion ? "demand" : "always"}
        camera={{ position: [0, 0.12, 2.7], fov: 32 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[2, 2.5, 3]} intensity={6} color="#E8C96D" />
        <Suspense fallback={null}>
          <GlobyMesh reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
    </GlobyBoundary>
  );
}

useGLTF.preload(MODEL_URL);
