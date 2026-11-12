// =============================================================================
// src/engine/threeResourceUtils.ts
// Three.js GPU Memory Management & Deep Disposal Utilities
// =============================================================================

import * as THREE from 'three';

/**
 * Recursively disposes geometries, materials, and textures of a Three.js object
 * to prevent GPU VRAM memory leaks (FINDING-THREE-01 / TASK-P8.2-06).
 */
export function deepDisposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if ((child as any).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            if ((m as any)?.map) (m as any).map.dispose();
            m.dispose();
          });
        } else {
          if ((mesh.material as any)?.map) (mesh.material as any).map.dispose();
          mesh.material.dispose();
        }
      }
    }
  });
}

