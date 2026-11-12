import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// @ts-ignore
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
// @ts-ignore
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CompassDirection,
  FengShuiRoomEvaluation,
  ProposedAdjustment,
  RoomConfig,
  RoomObject,
  UserFengShuiProfile,
} from '../types/fengshui';
import {
  createProceduralFurniture,
  getProceduralFloorTexture,
  getProceduralWoodTexture,
  warmLedMat,
} from '../engine/proceduralModels';
import { DIRECTION_NAMES_VI } from '../engine/batTrach';
import { getFengShuiCompassTexture } from '../engine/compassTexture';
import {
  createOBBFromObject,
  checkOBBCollision,
  isOBBInsideRoom,
  isDoorCorridorBlocked,
} from '../engine/geometryEngine';
import { deepDisposeObject } from '../engine/threeResourceUtils';

export { deepDisposeObject };

interface ThreeRoomCanvasProps {
  roomConfig: RoomConfig;
  objects: RoomObject[];
  userProfile: UserFengShuiProfile;
  evaluation: FengShuiRoomEvaluation;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onUpdateObjectPosition: (id: string, x: number, z: number) => { x: number; z: number } | null | void;
  onRotateObject: (id: string, angleDeltaRad: number) => void;
  onSetObjectRotation?: (id: string, rotationY: number) => number | null | void;
  onBeginInteraction?: () => void;
  onDeleteObject: (id: string) => void;
  onDuplicateObject: (id: string) => void;
  proposedAdjustment: ProposedAdjustment | null;
  previewAdjustments?: ProposedAdjustment[];
  isPreviewingProposal: boolean;
  onApplyPreview?: () => void;
  onCancelPreview?: () => void;
  cameraViewMode: '3d' | '2d' | 'top' | 'front' | 'iso';
  onChangeCameraViewMode?: (mode: '3d' | '2d' | 'top' | 'front' | 'iso') => void;
  onResetCamera: () => void;
  showFengShuiOverlay: boolean;
  onToggleFengShuiOverlay: () => void;
  transformMode: 'translate' | 'rotate';
  onChangeTransformMode: (mode: 'translate' | 'rotate') => void;
  onDropFromLibrary?: (item: any, clientX: number, clientY: number) => void;
  activeVisualConnection?: { sourceId: string; targetId: string; label: string; distance: string } | null;
  onClearVisualConnection?: () => void;
  lightingMode?: 'day' | 'night';
}

export const ThreeRoomCanvas: React.FC<ThreeRoomCanvasProps> = ({
  roomConfig,
  objects,
  userProfile,
  evaluation,
  selectedObjectId,
  onSelectObject,
  onUpdateObjectPosition,
  onRotateObject,
  onSetObjectRotation,
  onBeginInteraction,
  onDeleteObject,
  onDuplicateObject,
  proposedAdjustment,
  previewAdjustments = [],
  isPreviewingProposal,
  onApplyPreview,
  onCancelPreview,
  cameraViewMode,
  onChangeCameraViewMode,
  onResetCamera,
  showFengShuiOverlay,
  onToggleFengShuiOverlay,
  transformMode,
  onChangeTransformMode,
  onDropFromLibrary,
  activeVisualConnection,
  onClearVisualConnection,
  lightingMode = 'day',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const objectMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const selectionHelperRef = useRef<THREE.BoxHelper | null>(null);
  const previewMeshesRef = useRef<THREE.Group[]>([]);
  const compassMeshRef = useRef<THREE.Mesh | null>(null);
  const wallsRef = useRef<{ north?: THREE.Group; south?: THREE.Group; west?: THREE.Group; east?: THREE.Group }>({});
  const objectsRef = useRef<RoomObject[]>(objects);
  objectsRef.current = objects;
  const lightsRef = useRef<{
    sunLight: THREE.DirectionalLight;
    skyFillLight: THREE.HemisphereLight;
    bounceLight: THREE.DirectionalLight;
    warmLamp: THREE.PointLight;
    deskTaskLight: THREE.PointLight;
    doorSconceLight: THREE.PointLight;
    shelfLight: THREE.PointLight;
    ceilingDownlight: THREE.PointLight;
  } | null>(null);

  // Wall Transparency / Cutaway mode
  const [wallTransparency, setWallTransparency] = useState<number>(0.2); // 0.2 = semi-transparent/cutaway
  const [hasGhostConflicts, setHasGhostConflicts] = useState<boolean>(false);

  // Dragging state for manual pointer drag
  const isDraggingRef = useRef(false);
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const dragOffsetRef = useRef(new THREE.Vector3());
  const draggedObjIdRef = useRef<string | null>(null);

  // Selected object data for floating 3D HUD
  const selectedObject = objects.find((o) => o.id === selectedObjectId);
  const selectedEval = evaluation.items.find((i) => i.objectId === selectedObjectId);

  // Floating Delete Button Ref
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Synchronize In-Scene Delete Button Screen Position directly onto DOM element
  const updateMenuPosition = useCallback(() => {
    if (!selectedObjectId || !mountRef.current || !cameraRef.current) {
      if (contextMenuRef.current) contextMenuRef.current.style.display = 'none';
      return;
    }
    const mesh = objectMeshesRef.current.get(selectedObjectId);
    if (!mesh || !contextMenuRef.current) {
      if (contextMenuRef.current) contextMenuRef.current.style.display = 'none';
      return;
    }

    const rect = mountRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const targetObj = objects.find((o) => o.id === selectedObjectId);
    const objHeight = targetObj?.dimensions?.height || 0.8;

    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    worldPos.y += objHeight + 0.15; // Hovers directly above top of object

    const screenPos = worldPos.clone().project(cameraRef.current);

    // Behind camera: hide button
    if (screenPos.z > 1) {
      contextMenuRef.current.style.display = 'none';
      return;
    }

    contextMenuRef.current.style.display = 'block';

    const btnWidth = 85;
    const btnHeight = 34;

    let px = (screenPos.x * 0.5 + 0.5) * rect.width;
    let py = (-(screenPos.y * 0.5) + 0.5) * rect.height;

    // Viewport boundaries: clamp so button stays comfortably visible
    const minX = Math.max(btnWidth / 2 + 10, 300);
    const maxX = Math.max(minX + 20, rect.width - 430);
    const minY = btnHeight + 65;
    const maxY = Math.max(minY + 20, rect.height - 100);

    const clampedX = Math.max(minX, Math.min(maxX, px));
    const clampedY = Math.max(minY, Math.min(maxY, py));

    contextMenuRef.current.style.left = `${clampedX}px`;
    contextMenuRef.current.style.top = `${clampedY}px`;
  }, [selectedObjectId, objects]);

  // Update position whenever selection changes
  useEffect(() => {
    updateMenuPosition();
  }, [selectedObjectId, updateMenuPosition]);


  // Initialize Scene, Renderer, Lights, OrbitControls & TransformControls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.42; // Radiant natural architectural daylight interior
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Warm golden daylight atmosphere matching user request
    scene.background = new THREE.Color(0x28241d);
    sceneRef.current = scene;

    // Studio Environment for realistic metallic and wood reflection
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Camera setup - High angle 3/4 Interior Perspective occupying ~65-70% of screen
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0.1, 7.6, 6.6);
    cameraRef.current = camera;

    // OrbitControls - Center target on [0, 0.35, 0.1]
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 2.5;
    controls.maxDistance = 28;
    controls.target.set(0, 0.35, 0.1);
    controls.enablePan = false;
    controls.screenSpacePanning = false;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controlsRef.current = controls;

    const dispatchCameraAngle = () => {
      if (!cameraRef.current || !controlsRef.current) return;
      const cam = cameraRef.current;
      const target = controlsRef.current.target;
      const dx = cam.position.x - target.x;
      const dz = cam.position.z - target.z;
      const rad = Math.atan2(dx, dz);
      const deg = Math.round(((rad * 180) / Math.PI) * 10) / 10;
      window.dispatchEvent(new CustomEvent('three-camera-rotation', { detail: { angle: deg } }));
    };

    const handleControlsChange = () => {
      dispatchCameraAngle();
      updateMenuPosition();
    };

    controls.addEventListener('change', handleControlsChange);
    // Initial dispatch after mount
    setTimeout(handleControlsChange, 50);

    const handleCameraReset = () => {
      if (!cameraRef.current || !controlsRef.current) return;
      cameraRef.current.position.set(0.1, 7.6, 6.6);
      controlsRef.current.target.set(0, 0.35, 0.1);
      controlsRef.current.update();
      dispatchCameraAngle();
    };
    window.addEventListener('three-camera-reset', handleCameraReset);

    // TransformControls for direct 3D interactive manipulation (Gizmo)
    const tControls = new TransformControls(camera, renderer.domElement);
    tControls.size = 0.85;
    tControls.setMode(transformMode);
    tControls.setSpace('world');
    if (transformMode === 'rotate') {
      tControls.showX = false;
      tControls.showY = true;
      tControls.showZ = false;
    } else {
      tControls.showX = true;
      tControls.showY = false;
      tControls.showZ = true;
      (tControls as any).showXZ = true;
    }
    scene.add(typeof (tControls as any).getHelper === 'function' ? (tControls as any).getHelper() : (tControls as any));
    transformControlsRef.current = tControls;

    // Disable OrbitControls during gizmo transform
    tControls.addEventListener('dragging-changed', (event: any) => {
      if (event.value) onBeginInteraction?.();
      if (controlsRef.current) {
        controlsRef.current.enabled = !event.value;
      }
      if (!event.value && tControls.object) {
        // Drag or rotate ended: resync mesh position and rotation exactly with validated React state
        const targetMesh = tControls.object as THREE.Group;
        const id = targetMesh.userData?.id;
        if (id) {
          const currentObj = objectsRef.current.find((o) => o.id === id);
          if (currentObj) {
            targetMesh.position.set(currentObj.position.x, 0, currentObj.position.z);
            targetMesh.rotation.y = currentObj.rotation.y;
          }
        }
      }
    });

    tControls.addEventListener('change', () => {
      if (tControls.object && tControls.dragging) {
        const targetMesh = tControls.object as THREE.Group;
        const id = targetMesh.userData?.id;
        if (id) {
          if (transformMode === 'translate') {
            const halfW = roomConfig.width / 2 - 0.25;
            const halfL = roomConfig.length / 2 - 0.25;
            const clampedX = Math.round(Math.max(-halfW, Math.min(halfW, targetMesh.position.x)) * 100) / 100;
            const clampedZ = Math.round(Math.max(-halfL, Math.min(halfL, targetMesh.position.z)) * 100) / 100;
            targetMesh.position.x = clampedX;
            targetMesh.position.y = 0;
            targetMesh.position.z = clampedZ;
            const applied = onUpdateObjectPosition(id, clampedX, clampedZ);
            if (applied) {
              targetMesh.position.x = applied.x;
              targetMesh.position.z = applied.z;
            }
          } else if (transformMode === 'rotate') {
            if (onSetObjectRotation) {
              const appliedRot = onSetObjectRotation(id, targetMesh.rotation.y);
              if (typeof appliedRot === 'number') targetMesh.rotation.y = appliedRot;
            }
          }
        }
      }
    });

    // 1. Natural Sunlight Key Light (Streaming in from the West sliding balcony door at a warm golden morning angle)
    const sunLight = new THREE.DirectionalLight(0xffeaad, 7.5);
    sunLight.position.set(-8.5, 6.0, 0.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.bias = -0.00012;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 35;
    sunLight.shadow.camera.left = -6.5;
    sunLight.shadow.camera.right = 6.5;
    sunLight.shadow.camera.top = 6.5;
    sunLight.shadow.camera.bottom = -6.5;
    sunLight.shadow.radius = 2.0; // Soft diffused shadow edges matching reference render
    scene.add(sunLight);

    // 2. Soft Ambient Skylight Fill - Warm golden daylight
    const skyFillLight = new THREE.HemisphereLight(0xfffaea, 0x6e5033, 1.65);
    skyFillLight.position.set(0, 10, 0);
    scene.add(skyFillLight);

    // 3. Golden East/South bounce fill light
    const bounceLight = new THREE.DirectionalLight(0xffdf99, 1.25);
    bounceLight.position.set(7, 5, 6);
    scene.add(bounceLight);

    // 4. Warm Bedside Table Lamp (Cozy 2800K pool of warm glow on bed and nightstand)
    const warmLamp = new THREE.PointLight(0xffaa4d, 2.2, 4.5, 1.2);
    warmLamp.position.set(1.05, 0.75, 1.15);
    warmLamp.castShadow = true;
    scene.add(warmLamp);

    // 5. Warm Study Desk Task Lamp
    const deskTaskLight = new THREE.PointLight(0xffd699, 1.4, 3.0, 1.2);
    deskTaskLight.position.set(-1.6, 1.15, -0.85);
    scene.add(deskTaskLight);

    // 6. Warm Doorway Sconce Light (above entrance door)
    const doorSconceLight = new THREE.PointLight(0xffae42, 1.5, 4.0, 1.2);
    doorSconceLight.position.set(2.1, 1.85, -0.2);
    scene.add(doorSconceLight);

    // 7. Warm Wardrobe Display Shelving Backlight
    const shelfLight = new THREE.PointLight(0xffc27a, 1.8, 4.0, 1.2);
    shelfLight.position.set(-0.2, 1.6, -2.15);
    scene.add(shelfLight);

    // 8. Central Ceiling Ambient Downlight (Simulates recessed downlights for warm cozy evening illumination without being too dark)
    const ceilingDownlight = new THREE.PointLight(0xffecd1, 0.3, 9.5, 1.0);
    ceilingDownlight.position.set(0, 2.7, 0);
    ceilingDownlight.castShadow = true;
    ceilingDownlight.shadow.bias = -0.0002;
    ceilingDownlight.shadow.mapSize.width = 1024;
    ceilingDownlight.shadow.mapSize.height = 1024;
    scene.add(ceilingDownlight);

    lightsRef.current = {
      sunLight,
      skyFillLight,
      bounceLight,
      warmLamp,
      deskTaskLight,
      doorSconceLight,
      shelfLight,
      ceilingDownlight,
    };

    // Selection Bounding Box Helper
    const boxHelper = new THREE.BoxHelper(new THREE.Mesh(), 0x10b981);
    boxHelper.visible = false;
    // @ts-ignore
    boxHelper.material.depthTest = false;
    scene.add(boxHelper);
    selectionHelperRef.current = boxHelper;

    // Animation loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Dynamic architectural wall fading when camera view is occluded
      if (cameraRef.current && wallsRef.current) {
        const cam = cameraRef.current.position;
        const halfW = roomConfig.width / 2;
        const halfL = roomConfig.length / 2;

        const updateWallOpacity = (group: THREE.Group | undefined, shouldFade: boolean) => {
          if (!group) return;
          const targetOpacity = shouldFade ? 0.22 : 1.0;
          group.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
              if (mat) {
                mat.transparent = true;
                mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.12);
              }
            }
          });
        };

        updateWallOpacity(wallsRef.current.north, cam.z < -halfL * 0.45);
        updateWallOpacity(wallsRef.current.south, cam.z > halfL * 0.45);
        updateWallOpacity(wallsRef.current.west, cam.x < -halfW * 0.45);
        updateWallOpacity(wallsRef.current.east, cam.x > halfW * 0.45);
      }


      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      updateMenuPosition();
    };

    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(() => {
      handleResize();
    });
    ro.observe(container);

    const handleExport3D = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `phoi-canh-phong-ngu-3d-${Date.now()}.png`;
      a.click();
    };

    const handleExport2D = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) return;
      const prevPos = cameraRef.current.position.clone();
      const prevTarget = controlsRef.current.target.clone();
      cameraRef.current.position.set(0, 14.5, 0.001);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `mat-bang-phong-ngu-2d-${Date.now()}.png`;
      a.click();
      cameraRef.current.position.copy(prevPos);
      controlsRef.current.target.copy(prevTarget);
      controlsRef.current.update();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    window.addEventListener('three-export-3d-image', handleExport3D);
    window.addEventListener('three-export-2d-plan', handleExport2D);

    const canvas = renderer.domElement;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('[ThreeRoomCanvas] WebGL context lost! Pausing render loop.');
      cancelAnimationFrame(animId);
    };
    const handleContextRestored = () => {
      console.info('[ThreeRoomCanvas] WebGL context restored! Resuming render loop.');
      animate();
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', handleControlsChange);
      window.removeEventListener('three-camera-reset', handleCameraReset);
      window.removeEventListener('three-export-3d-image', handleExport3D);
      window.removeEventListener('three-export-2d-plan', handleExport2D);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      ro.disconnect();
      // Recursively dispose all scene children to prevent GPU memory leak
      scene.traverse((child) => {
        deepDisposeObject(child);
      });
      tControls.dispose();
      controls.dispose();
      renderer.dispose();
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, []);

  // Update Transform Controls Mode
  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(transformMode);
      if (transformMode === 'rotate') {
        transformControlsRef.current.showX = false;
        transformControlsRef.current.showY = true;
        transformControlsRef.current.showZ = false;
      } else {
        transformControlsRef.current.showX = true;
        transformControlsRef.current.showY = false;
        transformControlsRef.current.showZ = true;
      }
    }
  }, [transformMode]);

  // Update Camera View Mode
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (cameraViewMode === '2d' || cameraViewMode === 'top') {
      // Mặt bằng 2D nhìn thẳng từ trên xuống
      camera.position.set(0, 14.5, 0.001);
      controls.target.set(0, 0, 0);
      controls.maxPolarAngle = 0.01;
    } else if (cameraViewMode === 'front') {
      camera.position.set(0, 2.0, 11.5);
      controls.target.set(0, 1.0, 0);
      controls.maxPolarAngle = Math.PI / 2;
    } else if (cameraViewMode === 'iso') {
      camera.position.set(6.8, 7.5, 6.8);
      controls.target.set(0, 0.35, 0.1);
      controls.maxPolarAngle = Math.PI / 2 - 0.05;
    } else {
      // 3D Perspective standard (Centered perfectly on the room, occupying ~65-70% of viewport)
      camera.position.set(0.1, 7.6, 6.6);
      controls.target.set(0, 0.35, 0.1);
      controls.maxPolarAngle = Math.PI / 2 - 0.05;
    }
    controls.update();
  }, [cameraViewMode]);

  // 3D Visual Connection between conflicting objects (e.g. Mirror & Bed)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const oldLine = scene.getObjectByName('VisualConnectionLine');
    if (oldLine) scene.remove(oldLine);

    if (activeVisualConnection && activeVisualConnection.sourceId) {
      const srcMesh = objectMeshesRef.current.get(activeVisualConnection.sourceId);
      const tgtMesh = activeVisualConnection.targetId
        ? objectMeshesRef.current.get(activeVisualConnection.targetId)
        : null;

      if (srcMesh && tgtMesh) {
        const points = [
          new THREE.Vector3(srcMesh.position.x, 0.45, srcMesh.position.z),
          new THREE.Vector3(tgtMesh.position.x, 0.45, tgtMesh.position.z),
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineDashedMaterial({
          color: 0xf43f5e,
          dashSize: 0.25,
          gapSize: 0.15,
          linewidth: 3,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        line.computeLineDistances();
        line.name = 'VisualConnectionLine';
        scene.add(line);

        if (controlsRef.current && cameraRef.current) {
          const midX = (srcMesh.position.x + tgtMesh.position.x) / 2;
          const midZ = (srcMesh.position.z + tgtMesh.position.z) / 2;
          controlsRef.current.target.set(midX, 0.4, midZ);
          controlsRef.current.update();
        }
      }
    }
  }, [activeVisualConnection]);

  // Build Room Structure & Feng Shui Overlay Plane
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const oldRoom = scene.getObjectByName('RoomStructure');
    if (oldRoom) scene.remove(oldRoom);
    const oldCompass = scene.getObjectByName('AuthenticCompassMesh');
    if (oldCompass) scene.remove(oldCompass);

    const roomGroup = new THREE.Group();
    roomGroup.name = 'RoomStructure';

    const halfW = roomConfig.width / 2;
    const halfL = roomConfig.length / 2;
    const wallH = 1.35; // Cutaway height so furniture is never blocked by walls

    // 1. Hardwood Floor
    const floorGeo = new THREE.PlaneGeometry(roomConfig.width, roomConfig.length);
    const floorTexture = getProceduralFloorTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.5,
      metalness: 0.08,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    floorMesh.name = 'FloorMesh';
    roomGroup.add(floorMesh);

    // 2. Authentic Bát Quái Compass Overlay (Projected on floor surrounding room exactly like reference photo)
    const roomDiag = Math.sqrt(roomConfig.width * roomConfig.width + roomConfig.length * roomConfig.length);
    const compassDiameter = Math.max(11.5, roomDiag * 1.95);

    const compassTexture = getFengShuiCompassTexture({
      userProfile,
      roomDirection: roomConfig.direction,
    });

    const compassGeo = new THREE.PlaneGeometry(compassDiameter, compassDiameter);
    const compassMat = new THREE.MeshBasicMaterial({
      map: compassTexture,
      transparent: true,
      opacity: showFengShuiOverlay ? 0.95 : 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -1.5,
    });
    const compassMesh = new THREE.Mesh(compassGeo, compassMat);
    compassMesh.rotation.x = -Math.PI / 2;
    compassMesh.position.set(0, 0.015, 0); // cleanly on floor plane
    compassMesh.name = 'AuthenticCompassMesh';
    compassMeshRef.current = compassMesh;
    scene.add(compassMesh);

    // 3. Room Walls (Modern Luxury: Warm cream plaster, dark slate cap, walnut baseboards)
    const wallInteriorMat = new THREE.MeshStandardMaterial({
      color: 0xf4eee4, // Warm modern cream alabaster interior plaster matching reference photo
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });

    const wallCapMat = new THREE.MeshStandardMaterial({
      color: 0x22262a, // Architectural dark charcoal slate cap
      roughness: 0.4,
      metalness: 0.35,
    });

    const baseboardMat = new THREE.MeshStandardMaterial({
      color: 0x5a3d24, // Warm American walnut baseboard
      roughness: 0.4,
      metalness: 0.05,
    });

    const wallThick = 0.14;
    const fullWallH = 1.65; // Height matching architectural render

    const createWallSegment = (w: number, h: number, d: number, px: number, py: number, pz: number) => {
      const g = new THREE.Group();
      // Wall Body
      const wallBody = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallInteriorMat.clone());
      wallBody.position.set(px, py, pz);
      wallBody.receiveShadow = true;
      wallBody.castShadow = true;
      g.add(wallBody);

      // Dark Slate Wall Cap
      const capH = 0.04;
      const wallCap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, capH, d + 0.02), wallCapMat.clone());
      wallCap.position.set(px, py + h / 2 + capH / 2, pz);
      g.add(wallCap);

      // Baseboard trim at bottom
      const bbH = 0.08;
      const baseboard = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, bbH, d + 0.015), baseboardMat);
      baseboard.position.set(px, bbH / 2, pz);
      g.add(baseboard);

      return g;
    };

    // North Wall (Z = -halfL) - Solid rear wall
    const northWallGroup = new THREE.Group();
    northWallGroup.add(createWallSegment(roomConfig.width, fullWallH, wallThick, 0, fullWallH / 2, -halfL));
    roomGroup.add(northWallGroup);

    // West Wall (X = -halfW) - Architectural Wall + Floor-to-Ceiling Balcony Sliding Door & Wood Terrace
    const cutawayH = 0.42;
    const westWallGroup = new THREE.Group();
    const westSolidLen = 2.45; // North section with study desk and artwork
    const westDoorLen = roomConfig.length - westSolidLen; // South section with balcony sliding glass door
    const westDoorCenterZ = halfL - westDoorLen / 2;

    // 1. North Solid Wall (Full height for desk and artwork)
    westWallGroup.add(
      createWallSegment(wallThick, fullWallH, westSolidLen, -halfW, fullWallH / 2, -halfL + westSolidLen / 2)
    );

    // Modern Framed Art Print on West Wall above study desk
    const artFrameMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.72, 0.52), wallCapMat);
    artFrameMesh.position.set(-halfW + 0.075, 1.15, -halfL + 1.25);
    artFrameMesh.castShadow = true;
    westWallGroup.add(artFrameMesh);

    const artCanvasMat = new THREE.MeshStandardMaterial({
      color: 0xfaf5ee,
      roughness: 0.6,
    });
    const artCanvasMesh = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.64, 0.44), artCanvasMat);
    artCanvasMesh.position.set(-halfW + 0.08, 1.15, -halfL + 1.25);
    westWallGroup.add(artCanvasMesh);

    // 2. Large Floor-to-Ceiling Balcony Glass Sliding Door with Thin Black Mullions
    const doorTrackMat = wallCapMat;
    const doorGlassMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.08,
      metalness: 0.2,
      transparent: true,
      opacity: 0.35,
    });

    // Top Header Track
    const topTrack = new THREE.Mesh(new THREE.BoxGeometry(wallThick, 0.08, westDoorLen), doorTrackMat);
    topTrack.position.set(-halfW, fullWallH - 0.04, westDoorCenterZ);
    topTrack.castShadow = true;
    westWallGroup.add(topTrack);

    // Bottom Floor Sill Track
    const bottomTrack = new THREE.Mesh(new THREE.BoxGeometry(wallThick, 0.04, westDoorLen), doorTrackMat);
    bottomTrack.position.set(-halfW, 0.02, westDoorCenterZ);
    westWallGroup.add(bottomTrack);

    // Glass Panes
    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(0.02, fullWallH - 0.12, westDoorLen - 0.04), doorGlassMat);
    glassPane.position.set(-halfW, (fullWallH - 0.12) / 2 + 0.04, westDoorCenterZ);
    westWallGroup.add(glassPane);

    // Black Vertical Mullions (Casts realistic window shadow stripes across bedroom)
    const mullionCount = 3;
    for (let m = 0; m <= mullionCount; m++) {
      const mz = westDoorCenterZ - westDoorLen / 2 + (m * westDoorLen) / mullionCount;
      const vMullion = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, fullWallH - 0.12, 0.035),
        doorTrackMat
      );
      vMullion.position.set(-halfW, (fullWallH - 0.12) / 2 + 0.04, mz);
      vMullion.castShadow = true; // Casts shadow grid across room
      westWallGroup.add(vMullion);
    }

    // Horizontal Transom Bar
    const hTransom = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.035, westDoorLen - 0.04),
      doorTrackMat
    );
    hTransom.position.set(-halfW, fullWallH * 0.72, westDoorCenterZ);
    hTransom.castShadow = true;
    westWallGroup.add(hTransom);

    // 3. Exterior Wooden Deck Balcony Terrace (Outside the sliding door matching reference photo)
    const deckW = 1.35;
    const deckL = westDoorLen + 0.35;
    const deckH = 0.09;
    const deckCenterX = -halfW - deckW / 2;
    const deckCenterZ = westDoorCenterZ + 0.1;

    // Deck Substructure Base
    const deckBaseMat = new THREE.MeshStandardMaterial({
      color: 0x33261a,
      roughness: 0.7,
      metalness: 0.1,
    });
    const deckBase = new THREE.Mesh(new THREE.BoxGeometry(deckW - 0.04, 0.04, deckL - 0.04), deckBaseMat);
    deckBase.position.set(deckCenterX, 0.02, deckCenterZ);
    westWallGroup.add(deckBase);

    // Teak Wood Planks running along the terrace
    const teakPlankMat = new THREE.MeshStandardMaterial({
      map: getProceduralWoodTexture(),
      color: 0xb58b5b, // Warm natural teak decking
      roughness: 0.45,
      metalness: 0.04,
    });

    const plankCount = 10;
    const plankWidth = (deckW - 0.06) / plankCount;
    for (let p = 0; p < plankCount; p++) {
      const px = deckCenterX - deckW / 2 + 0.03 + p * plankWidth + plankWidth / 2;
      const plankMesh = new THREE.Mesh(
        new THREE.BoxGeometry(plankWidth - 0.012, 0.04, deckL),
        teakPlankMat
      );
      plankMesh.position.set(px, 0.06, deckCenterZ);
      plankMesh.receiveShadow = true;
      westWallGroup.add(plankMesh);
    }

    roomGroup.add(westWallGroup);

    // East Wall (X = halfW) - With Architectural Doorway & Walnut Door
    const eastWallGroup = new THREE.Group();
    const doorOpeningW = 1.0;
    const doorLintelH = 0.45;
    const wallEastNorthLen = (roomConfig.length - doorOpeningW) / 2 + 0.2;
    const wallEastSouthLen = (roomConfig.length - doorOpeningW) / 2 - 0.2;
    const doorCenterZ = -0.2;

    // East North wall (full height)
    eastWallGroup.add(
      createWallSegment(
        wallThick,
        fullWallH,
        wallEastNorthLen,
        halfW,
        fullWallH / 2,
        -halfL + wallEastNorthLen / 2
      )
    );

    // East South wall (cutaway height matching reference photo)
    eastWallGroup.add(
      createWallSegment(
        wallThick,
        cutawayH,
        wallEastSouthLen,
        halfW,
        cutawayH / 2,
        halfL - wallEastSouthLen / 2
      )
    );

    const lintelMesh = new THREE.Mesh(
      new THREE.BoxGeometry(wallThick, doorLintelH, doorOpeningW),
      wallInteriorMat.clone()
    );
    lintelMesh.position.set(halfW, fullWallH - doorLintelH / 2, doorCenterZ);
    lintelMesh.castShadow = true;
    eastWallGroup.add(lintelMesh);

    // Walnut Interior Door in Doorway
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x7a5232, // Warm American walnut door
      roughness: 0.4,
      metalness: 0.05,
    });
    const doorLeaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, fullWallH - doorLintelH, doorOpeningW - 0.04),
      doorMat
    );
    doorLeaf.position.set(halfW - 0.02, (fullWallH - doorLintelH) / 2, doorCenterZ);
    doorLeaf.castShadow = true;
    eastWallGroup.add(doorLeaf);

    // Modern Black Door Handle
    const doorHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.14, 0.025),
      wallCapMat
    );
    doorHandle.position.set(halfW - 0.06, 0.85, doorCenterZ - 0.35);
    eastWallGroup.add(doorHandle);

    // Warm Brass Sconce Light above Doorway
    const sconceBase = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), baseboardMat);
    sconceBase.position.set(halfW - 0.06, fullWallH - 0.15, doorCenterZ);
    sconceBase.rotation.z = Math.PI / 2;
    eastWallGroup.add(sconceBase);

    roomGroup.add(eastWallGroup);

    // South Wall (Z = halfL) - Architectural low cutaway wall matching reference photo
    const southWallGroup = new THREE.Group();
    southWallGroup.add(
      createWallSegment(roomConfig.width, cutawayH, wallThick, 0, cutawayH / 2, halfL)
    );
    roomGroup.add(southWallGroup);

    wallsRef.current = {
      north: northWallGroup,
      south: southWallGroup,
      west: westWallGroup,
      east: eastWallGroup,
    };

    scene.add(roomGroup);
  }, [roomConfig, userProfile, showFengShuiOverlay]);

  // Dynamic Lighting Filter Transition: Day (Radiant Sunlight) vs Night (Warm, Clear, Cozy Interior)
  useEffect(() => {
    const lights = lightsRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!lights || !renderer || !scene) return;

    if (lightingMode === 'night') {
      // Warm & Clearly Distinct Night Interior (Matching reference render)
      lights.sunLight.intensity = 0.1;
      lights.sunLight.color.setHex(0x384a66); // deep dark blue moonlight from outside window
      lights.sunLight.castShadow = false; // no harsh sun shadow at night

      lights.skyFillLight.intensity = 0.38; // dim exterior night fill
      lights.skyFillLight.color.setHex(0x334155);
      lights.bounceLight.intensity = 0.05;

      // Central warm ceiling downlight illuminating the entire bedroom
      lights.ceilingDownlight.intensity = 3.6;
      lights.ceilingDownlight.color.setHex(0xffedd5);
      lights.ceilingDownlight.castShadow = true;

      // Cozy glowing indoor luminaires
      lights.warmLamp.intensity = 6.5; // radiant warm glow on bed & nightstand
      lights.warmLamp.color.setHex(0xff9a3c);
      lights.warmLamp.castShadow = true;

      lights.deskTaskLight.intensity = 4.8;
      lights.deskTaskLight.color.setHex(0xffbe6d);
      lights.doorSconceLight.intensity = 3.5;
      lights.doorSconceLight.color.setHex(0xffaa42);
      lights.shelfLight.intensity = 4.5;
      lights.shelfLight.color.setHex(0xffb86c);

      // Material Emissive: Lamps, bulbs & LED strips actively glow warmly in the night
      warmLedMat.emissiveIntensity = 3.8;
      warmLedMat.color.setHex(0xffba66);

      renderer.toneMappingExposure = 1.28;
      scene.background = new THREE.Color(0x0e1115);
    } else {
      // Natural Daylight: Luminous warm golden sunlight streaming across floor and bed
      lights.sunLight.intensity = 7.5; // High-intensity radiant architectural sunlight
      lights.sunLight.color.setHex(0xffeaad); // Warm golden morning sunlight
      lights.sunLight.position.set(-8.5, 6.0, 0.2); // Crisp streaming angle through balcony
      lights.sunLight.castShadow = true;

      // Warm golden daylight skylight fill
      lights.skyFillLight.intensity = 1.65;
      lights.skyFillLight.color.setHex(0xfffaea); // bright warm sunny sky
      lights.skyFillLight.groundColor.setHex(0x6e5033); // warm wood/floor bounce

      // Golden sunlight bounce from wood floor
      lights.bounceLight.intensity = 1.25;
      lights.bounceLight.color.setHex(0xffdf99);

      lights.ceilingDownlight.intensity = 0.05;
      lights.ceilingDownlight.castShadow = false;

      // Daytime indoor fixtures (lamps are off during the day)
      lights.warmLamp.intensity = 0.1;
      lights.warmLamp.color.setHex(0xffaa4d);
      lights.warmLamp.castShadow = false;

      lights.deskTaskLight.intensity = 0.1;
      lights.deskTaskLight.color.setHex(0xffd699);
      lights.doorSconceLight.intensity = 0.1;
      lights.doorSconceLight.color.setHex(0xffae42);
      lights.shelfLight.intensity = 0.2;
      lights.shelfLight.color.setHex(0xffc27a);

      // Material Emissive: Inactive during bright daylight
      warmLedMat.emissiveIntensity = 0.1;
      warmLedMat.color.setHex(0xffedd5);

      renderer.toneMappingExposure = 1.48; // Rich, luminous golden daylight highlights
      scene.background = new THREE.Color(0x28241d); // Warm golden architectural daylight background
    }

    // Synchronize WC interior recessed downlight
    scene.traverse((child) => {
      if (child.name === 'WcCeilingLight' && (child as THREE.PointLight).isPointLight) {
        (child as THREE.PointLight).intensity = lightingMode === 'night' ? 3.2 : 0.4;
      }
    });
  }, [lightingMode]);

  // Synchronize 3D Furniture Objects & Attach Transform Controls
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const tControls = transformControlsRef.current;

    const currentIds = new Set(objects.map((o) => o.id));

    // Remove deleted objects with deep VRAM disposal
    for (const [id, mesh] of objectMeshesRef.current.entries()) {
      if (!currentIds.has(id)) {
        deepDisposeObject(mesh);
        scene.remove(mesh);
        objectMeshesRef.current.delete(id);
      }
    }

    // Add or update objects
    objects.forEach((obj) => {
      let mesh = objectMeshesRef.current.get(obj.id);
      if (!mesh) {
        mesh = createProceduralFurniture(obj);
        scene.add(mesh);
        objectMeshesRef.current.set(obj.id, mesh);
      }
      // Always synchronize position and rotation if not currently being actively dragged
      if (!tControls?.dragging || tControls.object !== mesh) {
        mesh.position.set(obj.position.x, obj.position.y || 0, obj.position.z);
        mesh.rotation.y = obj.rotation.y;
      }
    });

    if (selectedObjectId && objectMeshesRef.current.has(selectedObjectId)) {
      const selectedMesh = objectMeshesRef.current.get(selectedObjectId)!;
      if (selectionHelperRef.current) {
        selectionHelperRef.current.setFromObject(selectedMesh);
        // @ts-ignore
        if (selectionHelperRef.current.material) {
          // @ts-ignore
          selectionHelperRef.current.material.color.setHex(0x10b981);
        }
        selectionHelperRef.current.visible = true;
      }
      if (tControls) {
        tControls.attach(selectedMesh);
        tControls.size = 0.85;
        tControls.setMode(transformMode);
        if (transformMode === 'rotate') {
          tControls.showX = false;
          tControls.showY = true;
          tControls.showZ = false;
        } else {
          tControls.showX = true;
          tControls.showY = false;
          tControls.showZ = true;
          (tControls as any).showXZ = true;
        }
        // Ensure gizmo handles render in front of solid furniture
        if (typeof (tControls as any).traverse === 'function') {
          (tControls as any).traverse((child: any) => {
            if (child.material) {
              child.material.depthTest = false;
              child.renderOrder = 999;
            }
          });
        }
      }
    } else {
      if (selectionHelperRef.current) {
        selectionHelperRef.current.visible = false;
      }
      if (tControls) {
        tControls.detach();
      }
    }
  }, [objects, selectedObjectId, transformMode]);

  // Render Proposed Layout Preview Ghost Meshes (Supports single and multiple proposals)
  // Highlights conflicting/overlapping objects in RED and valid objects in GREEN
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old previews with deep VRAM disposal
    previewMeshesRef.current.forEach((m) => {
      deepDisposeObject(m);
      scene.remove(m);
    });
    previewMeshesRef.current = [];

    if (isPreviewingProposal) {
      const activeProposals = previewAdjustments.length > 0
        ? previewAdjustments
        : proposedAdjustment ? [proposedAdjustment] : [];

      let anyConflict = false;
      const doorObj = objects.find((o) => o.type === 'door');
      const nonCollidingTypes = ['rug', 'painting', 'curtain', 'door', 'window', 'lamp'];

      activeProposals.forEach((adj) => {
        const targetObj = objects.find((o) => o.id === adj.objectId);
        if (targetObj) {
          const ghostObj: RoomObject = {
            ...targetObj,
            position: {
              x: adj.suggestedX,
              y: targetObj.position.y,
              z: adj.suggestedZ,
            },
            rotation: {
              x: targetObj.rotation.x,
              y: adj.suggestedRotationY,
              z: targetObj.rotation.z,
            },
          };

          // Check if this ghost object has any collision or constraint violation
          let isConflict = false;
          if (!nonCollidingTypes.includes(targetObj.type)) {
            const ghostOBB = createOBBFromObject(
              { x: adj.suggestedX, z: adj.suggestedZ },
              targetObj.dimensions,
              adj.suggestedRotationY,
              0.02
            );

            // 1. Check inside room bounds
            if (!isOBBInsideRoom(ghostOBB, roomConfig, 0.04)) {
              isConflict = true;
            }

            // 2. Check door clearance
            if (!isConflict && isDoorCorridorBlocked(ghostOBB, roomConfig, doorObj)) {
              isConflict = true;
            }

            // 3. Check collision with other ghost objects in the proposed layout
            if (!isConflict) {
              for (const otherAdj of activeProposals) {
                if (otherAdj.objectId === adj.objectId) continue;
                const otherTarget = objects.find((o) => o.id === otherAdj.objectId);
                if (!otherTarget || nonCollidingTypes.includes(otherTarget.type)) continue;
                const otherOBB = createOBBFromObject(
                  { x: otherAdj.suggestedX, z: otherAdj.suggestedZ },
                  otherTarget.dimensions,
                  otherAdj.suggestedRotationY,
                  0.02
                );
                if (checkOBBCollision(ghostOBB, otherOBB)) {
                  isConflict = true;
                  break;
                }
              }
            }

            // 4. Check collision with unmoved solid objects
            if (!isConflict) {
              for (const otherObj of objects) {
                if (activeProposals.some((a) => a.objectId === otherObj.id)) continue;
                if (nonCollidingTypes.includes(otherObj.type)) continue;
                const otherOBB = createOBBFromObject(
                  otherObj.position,
                  otherObj.dimensions,
                  otherObj.rotation.y,
                  0.02
                );
                if (checkOBBCollision(ghostOBB, otherOBB)) {
                  isConflict = true;
                  break;
                }
              }
            }
          }

          if (isConflict) {
            anyConflict = true;
          }

          const ghostMesh = createProceduralFurniture(ghostObj);
          ghostMesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = child as THREE.Mesh;
              m.material = new THREE.MeshStandardMaterial({
                color: isConflict ? 0xef4444 : 0x10b981,
                emissive: isConflict ? 0xdc2626 : 0x059669,
                emissiveIntensity: isConflict ? 0.6 : 0.45,
                transparent: true,
                opacity: isConflict ? 0.75 : 0.65,
              });
            }
          });

          scene.add(ghostMesh);
          previewMeshesRef.current.push(ghostMesh);
        }
      });

      setHasGhostConflicts(anyConflict);
    } else {
      setHasGhostConflicts(false);
    }
  }, [isPreviewingProposal, proposedAdjustment, previewAdjustments, objects, roomConfig]);

  // Raycasting & Pointer Selection
  const getPointerPos = (e: React.PointerEvent) => {
    if (!mountRef.current) return { x: 0, y: 0 };
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const tControls = transformControlsRef.current;
    if (tControls?.dragging) return;
    if (!cameraRef.current || !sceneRef.current || !mountRef.current) return;

    // In rotate mode, if the user clicked the rotation gizmo circle, let TransformControls handle it
    if (transformMode === 'rotate' && (tControls as any)?.axis) {
      return;
    }

    const { x, y } = getPointerPos(e);
    mouseRef.current.set(x, y);

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    const interactiveMeshes: THREE.Object3D[] = [];
    objectMeshesRef.current.forEach((group) => {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) interactiveMeshes.push(child);
      });
    });

    const intersects = raycasterRef.current.intersectObjects(interactiveMeshes, false);

    // If clicking directly on ANY furniture mesh (chair, potted plant, bed, wardrobe, desk, etc.):
    if (intersects.length > 0) {
      let topGroup: THREE.Object3D | null = intersects[0].object;
      while (topGroup && topGroup.parent && topGroup.parent !== sceneRef.current) {
        topGroup = topGroup.parent;
      }

      if (topGroup && topGroup.userData?.id) {
        const id = topGroup.userData.id;
        onSelectObject(id);

        if (transformMode === 'translate') {
          // Temporarily disable TransformControls so its single-axis constraint doesn't hijack dragging
          if (tControls) {
            (tControls as any).axis = null;
            tControls.enabled = false;
          }

          // Start direct 2D mouse floor drag for ALL objects freely across floor plane (both X and Z)
          onBeginInteraction?.();
          isDraggingRef.current = true;
          draggedObjIdRef.current = id;
          if (controlsRef.current) controlsRef.current.enabled = false;

          const floorIntersection = new THREE.Vector3();
          raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, floorIntersection);
          dragOffsetRef.current.copy(floorIntersection).sub(topGroup.position);
        }
        return;
      }
    }

    // If clicked on a TransformControls gizmo arrow outside the mesh
    if ((tControls as any)?.axis) {
      return;
    }

    // Clicked on empty floor or background: deselect
    onSelectObject(null);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!cameraRef.current || !sceneRef.current || !mountRef.current) return;

    if (isDraggingRef.current && draggedObjIdRef.current) {
      mountRef.current.style.cursor = 'grabbing';
      const { x, y } = getPointerPos(e);
      mouseRef.current.set(x, y);

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const floorIntersection = new THREE.Vector3();
      if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, floorIntersection)) {
        const newPos = floorIntersection.sub(dragOffsetRef.current);

        const halfW = roomConfig.width / 2 - 0.2;
        const halfL = roomConfig.length / 2 - 0.2;
        const clampedX = Math.max(-halfW, Math.min(halfW, newPos.x));
        const clampedZ = Math.max(-halfL, Math.min(halfL, newPos.z));

        // Snap to 5cm grid for smooth, fluid dragging
        const snappedX = Math.round(clampedX * 20) / 20;
        const snappedZ = Math.round(clampedZ * 20) / 20;

        onUpdateObjectPosition(draggedObjIdRef.current, snappedX, snappedZ);
        updateMenuPosition();
      }
      return;
    }

    // Hover cursor feedback when hovering over objects
    const { x, y } = getPointerPos(e);
    mouseRef.current.set(x, y);
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    const interactiveMeshes: THREE.Object3D[] = [];
    objectMeshesRef.current.forEach((group) => {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) interactiveMeshes.push(child);
      });
    });

    const hits = raycasterRef.current.intersectObjects(interactiveMeshes, false);
    if (hits.length > 0) {
      mountRef.current.style.cursor = 'grab';
    } else {
      mountRef.current.style.cursor = 'default';
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    draggedObjIdRef.current = null;
    if (mountRef.current) mountRef.current.style.cursor = 'default';
    if (controlsRef.current) controlsRef.current.enabled = true;
    if (transformControlsRef.current) {
      transformControlsRef.current.enabled = true;
    }
  };

  // Drag-and-drop from external library
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr && onDropFromLibrary) {
        const item = JSON.parse(dataStr);
        onDropFromLibrary(item, e.clientX, e.clientY);
      }
    } catch (err) {
      console.error('Error dropping item:', err);
    }
  };

  // Zoom Handlers
  const handleZoomIn = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.multiplyScalar(0.88);
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.multiplyScalar(1.12);
      controlsRef.current.update();
    }
  };

  const handleRotateRoom = () => {
    if (cameraRef.current && controlsRef.current) {
      const cam = cameraRef.current;
      const angle = Math.PI / 4; // 45 degrees
      const x = cam.position.x;
      const z = cam.position.z;
      cam.position.x = x * Math.cos(angle) - z * Math.sin(angle);
      cam.position.z = x * Math.sin(angle) + z * Math.cos(angle);
      controlsRef.current.update();
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none bg-[#181B1E]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {/* Cinematic Out-of-Focus Botanical Silhouette Framing (Matches reference render bokeh) */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {/* Top-Left Foliage Silhouette */}
        <div className="absolute -top-12 -left-12 w-52 h-52 rounded-full bg-emerald-950/35 blur-3xl opacity-75" />
        {/* Bottom-Left Soft Leaf Silhouette */}
        <div className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-stone-950/50 blur-3xl opacity-80" />
        {/* Right Corner Soft Silhouettes */}
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-emerald-950/25 blur-2xl opacity-60" />
        <div className="absolute -bottom-12 -right-8 w-52 h-52 rounded-full bg-stone-950/45 blur-3xl opacity-75" />
      </div>

      {/* Visual Connection Overlay Banner (When clicking "Xem trên 3D" in Report) */}
      {activeVisualConnection && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-rose-950/95 backdrop-blur-md border border-rose-500/80 text-white px-5 py-3 rounded-2xl shadow-2xl flex flex-col gap-1.5 text-xs animate-in fade-in slide-in-from-top-4 max-w-md pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-bold text-rose-200 text-xs">
                {activeVisualConnection.label}
              </span>
            </div>
            {onClearVisualConnection && (
              <button
                onClick={onClearVisualConnection}
                className="w-5 h-5 rounded-full bg-rose-900/80 hover:bg-rose-800 text-rose-200 flex items-center justify-center text-[10px]"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-rose-300 bg-rose-900/40 px-3 py-1 rounded-lg border border-rose-800/60">
            <span>Khoảng cách trực diện:</span>
            <span className="font-mono font-bold text-white text-xs">{activeVisualConnection.distance}</span>
          </div>
          <p className="text-[11px] text-rose-200/90 leading-tight">
            AI phát hiện gương chiếu trực tiếp vào giường ngủ, dễ gây giật mình, phân tán thần khí và bất an.
          </p>
        </div>
      )}

      {/* 3D In-Scene Compact Delete Button on Selected Object */}
      {selectedObject && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -100%)',
            display: 'none',
          }}
          className="z-30 pointer-events-auto select-none transition-transform duration-75"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="relative group animate-in fade-in zoom-in-95 duration-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteObject(selectedObject.id);
                onSelectObject(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#991B1B] hover:bg-[#7F1D1D] active:scale-95 text-white font-bold text-xs rounded-full shadow-2xl border border-red-500/50 cursor-pointer transition-all duration-150 backdrop-blur-md"
              title="Xóa đồ vật này"
            >
              {/* White Trash Can SVG Icon */}
              <svg
                className="w-3.5 h-3.5 text-white shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span className="leading-none tracking-wide">Xóa</span>
            </button>

            {/* Subtle bottom indicator arrow pointing to the 3D object */}
            <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-[#991B1B]" />
          </div>
        </div>
      )}
    </div>
  );
};
