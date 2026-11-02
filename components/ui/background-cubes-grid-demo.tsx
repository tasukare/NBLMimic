"use client";

import React from "react";
import { BackgroundCubesGrid } from "./background-cubes-grid";

/**
 * Example 1: Isometric Variant (Default)
 * A flat interactive grid of 3D cubes that ripples under pointer movement
 */
export function BackgroundCubesIsometricDemo() {
  return (
    <div className="relative flex h-[32rem] w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-zinc-950">
      <BackgroundCubesGrid
        variant="isometric"
        cellSize={54}
        gap={0.12}
        topColor="#27272a"
        leftColor="#18181b"
        rightColor="#202024"
        glowColor="#38bdf8"
        glow={0.85}
        speed={38}
        amplitude={0.45}
        idleRipples={true}
      />
      <div className="pointer-events-none relative z-10 flex flex-col items-center px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
          Isometric Cubes Grid
        </h2>
        <p className="mt-3 max-w-lg text-sm text-zinc-400 md:text-base">
          Move your cursor across the surface to send physical waves and light pulses through the grid.
        </p>
      </div>
    </div>
  );
}

/**
 * Example 2: Perspective 3D Variant
 * An angled, futuristic perspective field with glowing crests and ripples
 */
export function BackgroundCubesPerspectiveDemo() {
  return (
    <div className="relative flex h-[36rem] w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-[#09090b]">
      <BackgroundCubesGrid
        variant="perspective"
        gridSize={44}
        gap={0.08}
        baseColor="#1f1f23"
        waveColor="#06b6d4"
        backgroundColor="#09090b"
        glow={1.0}
        amplitude={0.55}
        tilt={0.72}
        idleRipples={true}
      />
      <div className="pointer-events-none relative z-10 flex flex-col items-center px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
          Perspective 3D Cubes
        </h2>
        <p className="mt-3 max-w-lg text-sm text-zinc-400 md:text-base">
          Tilted field of cubes rendered in Three.js with soft-edge bevels and trailing wave illumination.
        </p>
      </div>
    </div>
  );
}

export default BackgroundCubesIsometricDemo;
