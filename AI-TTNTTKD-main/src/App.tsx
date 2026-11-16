import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Gender,
  RoomConfig,
  RoomObject,
  ProposedAdjustment,
  LayoutOptimizationProposal,
  StructuredActionHistoryEntry,
  UserFengShuiProfile,
} from './types/fengshui';
import { getUserFengShuiProfile } from './engine/batTrach';
import { evaluateRoomFengShui } from './engine/fengshuiRules';
import { ROOM_PRESETS } from './engine/presets';
import {
  generateFengShuiConsultation,
  generateDeepFengShuiReport,
  DeepFengShuiReportData,
} from './engine/geminiFengShuiAI';
import { ThreeRoomCanvas } from './components/ThreeRoomCanvas';
import { AIChatConsultant } from './components/AIChatConsultant';
import { ObjectLibraryDock, LIBRARY_ITEMS } from './components/ObjectLibraryDock';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebarPanel } from './components/RightSidebarPanel';
import { RoomCompassWidget } from './components/RoomCompassWidget';
import { UserProfileModal } from './components/UserProfileModal';
import { LayoutComparisonModal } from './components/LayoutComparisonModal';
import { AIAnalysisReportModal } from './components/AIAnalysisReportModal';
import { UnifiedAssessmentReportModal } from './components/UnifiedAssessmentReportModal';
import { buildUnifiedAssessmentReport, UnifiedAssessmentReport } from './engine/core/unifiedAssessment';
import {
  evaluateRoomElementAssessment,
  DetailedRoomElementAssessment,
} from './engine/core/nguHanh/elementAssessment.js';
import { PersonalProfile } from './engine/core/personalProfile';
import { validateAICommand } from './services/aiCommandHandler';
import {
  clampOBBInsideRoom,
  validatePlacementSafety,
  findSmartPlacement,
  checkOBBCollision,
  createOBBFromObject,
  isOBBInsideRoom,
  isDoorCorridorBlocked,
} from './engine/geometryEngine';
import { validateOptimizedLayout } from './engine/layoutOptimizer';

// Objects that never take part in floor collision when the user moves them by hand.
const FREE_MOVE_TYPES: string[] = ['rug', 'painting', 'curtain', 'door', 'window', 'lamp'];

// Pairs that are meant to overlap (chair tucked under desk/table, ...).
function manualIgnoreTypes(moverType: string): string[] {
  const base = ['door', 'window', 'lamp'];
  if (moverType === 'chair') return [...base, 'desk', 'table'];
  if (moverType === 'desk' || moverType === 'table') return [...base, 'chair'];
  return base;
}

export default function App() {
  // 1. User Profile State (Defaults to 2004 Female = Khôn Thổ / Tây Tứ Mệnh as in Mockup)
  const [birthYear, setBirthYear] = useState<number>(2004);
  const [gender, setGender] = useState<Gender>('female');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Compute Feng Shui Profile dynamically
  const userProfile = useMemo<UserFengShuiProfile>(() => {
    return getUserFengShuiProfile(birthYear, gender);
  }, [birthYear, gender]);

  // 2. Room Configuration & Objects State
  const [roomConfig, setRoomConfig] = useState<RoomConfig>(ROOM_PRESETS.master.config);
  const [objects, setObjects] = useState<RoomObject[]>(ROOM_PRESETS.master.objects);

  // 3. Selection & Viewport State (Default bed_01 selected to match mockup)
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>('bed_01');
  const [cameraViewMode, setCameraViewMode] = useState<'3d' | '2d' | 'iso' | 'top' | 'front'>('3d');
  const [showFengShuiOverlay, setShowFengShuiOverlay] = useState<boolean>(true);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate'>('translate');
  const [lightingMode, setLightingMode] = useState<'day' | 'night'>('day');

  // 4. Panels & UI States
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [chatTriggerPrompt, setChatTriggerPrompt] = useState<string | null>(null);
  const [activeVisualConnection, setActiveVisualConnection] = useState<{
    sourceId: string;
    targetId: string;
    label: string;
    distance: string;
  } | null>(null);

  // 5. AI Proposal, Ghost Preview & Modals
  const [proposedAdjustment, setProposedAdjustment] = useState<ProposedAdjustment | null>(null);
  const [previewAdjustments, setPreviewAdjustments] = useState<ProposedAdjustment[]>([]);
  const [isPreviewingProposal, setIsPreviewingProposal] = useState<boolean>(false);
  const [activeOptimizationProposal, setActiveOptimizationProposal] = useState<LayoutOptimizationProposal | null>(null);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [unifiedReport, setUnifiedReport] = useState<UnifiedAssessmentReport | null>(null);
  const [nguHanhAssessment, setNguHanhAssessment] = useState<DetailedRoomElementAssessment | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [aiReportData, setAiReportData] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 6. History Stack for Undo / Redo
  const [historyPast, setHistoryPast] = useState<RoomObject[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<RoomObject[][]>([]);

  const pushSnapshot = (current: RoomObject[]) => {
    setHistoryPast((prev) => [...prev.slice(-19), current]);
    setHistoryFuture([]);
  };

  const handleUndo = () => {
    if (historyPast.length === 0) {
      showToast('Không có thao tác nào để hoàn tác.');
      return;
    }
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [objects, ...prev]);
    setObjects(previous);
    showToast('↶ Đã hoàn tác thao tác trước đó.');
  };

  const handleRedo = () => {
    if (historyFuture.length === 0) {
      showToast('Không có thao tác nào để làm lại.');
      return;
    }
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev, objects]);
    setObjects(next);
    showToast('↷ Đã làm lại thao tác.');
  };

  const handleExport3DImage = () => {
    window.dispatchEvent(new CustomEvent('three-export-3d-image'));
    showToast('✓ Đang xuất ảnh 3D phòng ngủ...');
  };

  const handleExport2DPlan = () => {
    window.dispatchEvent(new CustomEvent('three-export-2d-plan'));
    showToast('✓ Đang xuất sơ đồ mặt bằng 2D...');
  };

  const handleLoadLayout = (config: RoomConfig, loadedObjects: RoomObject[], profile?: UserFengShuiProfile) => {
    pushSnapshot(objects);
    setRoomConfig(config);
    setObjects(loadedObjects);
    setSelectedObjectId(null);
    if (profile) {
      if (profile.birthYear) setBirthYear(profile.birthYear);
      if (profile.gender) setGender(profile.gender);
    }
    showToast(`✓ Đã nạp bố cục thành công (${loadedObjects.length} đồ vật).`);
  };

  // Keyboard shortcut for Undo (Ctrl+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyPast, historyFuture, objects]);

  // Calculate Real-Time Feng Shui Evaluation
  const evaluation = useMemo(() => {
    return evaluateRoomFengShui(userProfile, roomConfig, objects);
  }, [roomConfig, objects, userProfile]);

  // Expose live state to window for ground-truth verification and automated QA inspection
  useEffect(() => {
    (window as any).__STUDIO_STATE__ = {
      objects,
      roomConfig,
      evaluation,
      selectedObjectId,
    };
  }, [objects, roomConfig, evaluation, selectedObjectId]);

  // Toast auto-clear
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  // Always-fresh copies for handlers that are captured by long-lived 3D listeners
  const objectsRef = useRef<RoomObject[]>(objects);
  const roomConfigRef = useRef<RoomConfig>(roomConfig);
  objectsRef.current = objects;
  roomConfigRef.current = roomConfig;
  const lastBlockToastRef = useRef<number>(0);

  const notifyBlocked = (msg: string) => {
    const now = Date.now();
    if (now - lastBlockToastRef.current > 1500) {
      lastBlockToastRef.current = now;
      showToast(msg);
    }
  };

  // Snapshot once per drag / gizmo gesture so manual moves are undoable
  const handleBeginInteraction = () => {
    pushSnapshot(objectsRef.current);
  };

  /**
   * Returns true when the object pose is free of wall / furniture / door-corridor conflicts.
   */
  const isPoseValid = (
    target: RoomObject,
    pos: { x: number; z: number },
    rotY: number,
    all: RoomObject[],
    room: RoomConfig
  ) =>
    validatePlacementSafety(
      pos,
      target.dimensions,
      rotY,
      all,
      { width: room.width, length: room.length },
      target.id,
      manualIgnoreTypes(target.type)
    );

  // Handler: Update Object Position (manual drag / gizmo). Returns the position actually applied.
  const handleUpdateObjectPosition = (id: string, x: number, z: number): { x: number; z: number } | null => {
    const all = objectsRef.current;
    const room = roomConfigRef.current;
    const target = all.find((o) => o.id === id);
    if (!target) return null;

    const halfW = room.width / 2;
    const halfL = room.length / 2;
    const padding = 0.25;
    const wantX = Math.max(-halfW + padding, Math.min(halfW - padding, x));
    const wantZ = Math.max(-halfL + padding, Math.min(halfL - padding, z));

    let finalPos = { x: wantX, z: wantZ };

    if (!FREE_MOVE_TYPES.includes(target.type)) {
      const currentlyValid = isPoseValid(target, target.position, target.rotation.y, all, room).valid;
      if (currentlyValid) {
        // 1) keep the object fully inside the room, 2) reject / slide if it hits something
        const inside = clampOBBInsideRoom(finalPos, target.dimensions, target.rotation.y, room);
        const candidates = [
          inside,
          { x: inside.x, z: target.position.z }, // slide along X
          { x: target.position.x, z: inside.z }, // slide along Z
        ];
        const ok = candidates.find((c) => isPoseValid(target, c, target.rotation.y, all, room).valid);
        if (!ok) {
          notifyBlocked(
            isPoseValid(target, inside, target.rotation.y, all, room).reason || 'Vị trí này bị cản bởi đồ vật khác.'
          );
          return { x: target.position.x, z: target.position.z };
        }
        finalPos = ok;
      }
      // If the object already overlaps something (e.g. legacy preset), let it move freely so it can escape.
    }

    const fx = Math.round(finalPos.x * 100) / 100;
    const fz = Math.round(finalPos.z * 100) / 100;
    setObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, position: { ...obj.position, x: fx, z: fz } } : obj))
    );
    return { x: fx, z: fz };
  };

  // Shared rotation logic: validates the new yaw, nudges the object off the wall if needed.
  const applyRotation = (id: string, newRotY: number): number | null => {
    const all = objectsRef.current;
    const room = roomConfigRef.current;
    const target = all.find((o) => o.id === id);
    if (!target) return null;

    let pos = { x: target.position.x, z: target.position.z };
    if (!FREE_MOVE_TYPES.includes(target.type)) {
      const currentlyValid = isPoseValid(target, target.position, target.rotation.y, all, room).valid;
      if (currentlyValid) {
        pos = clampOBBInsideRoom(pos, target.dimensions, newRotY, room);
        const check = isPoseValid(target, pos, newRotY, all, room);
        if (!check.valid) {
          notifyBlocked(check.reason || 'Không đủ chỗ để xoay đồ vật tại vị trí này.');
          return target.rotation.y;
        }
      }
    }

    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === id
          ? { ...obj, position: { ...obj.position, x: pos.x, z: pos.z }, rotation: { ...obj.rotation, y: newRotY } }
          : obj
      )
    );
    return newRotY;
  };

  // Handler: Rotate Object by a delta (buttons)
  const handleRotateObject = (id: string, deltaRad: number) => {
    const target = objectsRef.current.find((o) => o.id === id);
    if (!target) return;
    pushSnapshot(objectsRef.current);
    applyRotation(id, (target.rotation.y + deltaRad) % (Math.PI * 2));
  };

  // Handler: Set Object Rotation directly (from 3D gizmo). Returns the yaw actually applied.
  const handleSetObjectRotation = (id: string, rotationY: number): number | null => {
    return applyRotation(id, rotationY);
  };

  // Handler: Delete Object
  const handleDeleteObject = (id: string) => {
    pushSnapshot(objects);
    setObjects((prev) => prev.filter((obj) => obj.id !== id));
    if (selectedObjectId === id) {
      setSelectedObjectId(null);
    }
    showToast('✓ Đã xóa đồ vật khỏi phòng.');
  };

  // Handler: Duplicate Object
  const handleDuplicateObject = (id: string) => {
    const target = objects.find((o) => o.id === id);
    if (!target) return;

    pushSnapshot(objects);

    // Try finding smart non-overlapping placement
    const candidatePlacement = findSmartPlacement(
      target.type,
      target.dimensions,
      objects,
      roomConfig,
      { x: target.position.x + 0.6, z: target.position.z + 0.6 }
    );

    const safePos = candidatePlacement.resolved
      ? candidatePlacement.safePos
      : {
        x: Math.max(-roomConfig.width / 2 + 0.4, Math.min(roomConfig.width / 2 - 0.4, target.position.x + 0.5)),
        z: Math.max(-roomConfig.length / 2 + 0.4, Math.min(roomConfig.length / 2 - 0.4, target.position.z + 0.5)),
      };

    const newObj: RoomObject = {
      ...target,
      id: `${target.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${target.name} (Bản sao)`,
      position: {
        x: Math.round(safePos.x * 100) / 100,
        y: target.position.y || 0,
        z: Math.round(safePos.z * 100) / 100,
      },
      rotation: {
        ...target.rotation,
        y: candidatePlacement.resolved ? candidatePlacement.rotationY : target.rotation.y,
      },
    };

    setObjects((prev) => [...prev, newObj]);
    setSelectedObjectId(newObj.id);
    showToast(`✓ Đã nhân bản "${newObj.name}" tại vị trí hợp lệ.`);
  };

  // Handler: Add object from library
  const handleAddObjectFromLibrary = (item: {
    type: any;
    name: string;
    dimensions: { width: number; length: number; height: number };
  }) => {
    pushSnapshot(objects);
    const newId = `${item.type}_${Date.now()}`;
    const newObj: RoomObject = {
      id: newId,
      type: item.type,
      name: item.name,
      dimensions: item.dimensions,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    };

    setObjects((prev) => [...prev, newObj]);
    setSelectedObjectId(newId);
    showToast(`✓ Đã thêm ${newObj.name} vào phòng.`);
  };

  // Handler: Drop from library to coordinates
  const handleDropFromLibrary = (item: any, clientX: number, clientY: number) => {
    pushSnapshot(objects);
    const normX = (clientX / window.innerWidth - 0.5) * roomConfig.width * 0.7;
    const normZ = (clientY / window.innerHeight - 0.5) * roomConfig.length * 0.7;

    const newId = `${item.type}_${Date.now()}`;
    const newObj: RoomObject = {
      id: newId,
      type: item.type,
      name: item.name,
      dimensions: item.dimensions,
      position: { x: normX, y: 0, z: normZ },
      rotation: { x: 0, y: 0, z: 0 },
    };

    setObjects((prev) => [...prev, newObj]);
    setSelectedObjectId(newId);
    showToast(`✓ Đã đặt ${newObj.name} vào vị trí.`);
  };

  // Handler: Execute a BATCH of AI Action Commands atomically.
  // All add/delete operations are applied in a single setObjects call to avoid stale-state issues
  // where a second action in the batch uses outdated objects that don't include items from action #1.
  const handleExecuteAIActions = (
    rawActions: any[]
  ): { successCount: number; failCount: number; executedEntries: StructuredActionHistoryEntry[] } => {
    if (!rawActions || rawActions.length === 0) return { successCount: 0, failCount: 0, executedEntries: [] };

    // Handle undo as a special case (always first)
    if (rawActions.some((a) => a?.type === 'undo_action' || a?.action === 'undo_action')) {
      handleUndo();
      return { successCount: 1, failCount: 0, executedEntries: [] };
    }

    // One snapshot for the entire batch
    pushSnapshot(objects);

    let successCount = 0;
    let failCount = 0;
    let lastAddedId: string | null = null;
    const deleteIds: string[] = [];
    const newObjects: RoomObject[] = [];
    const moves: Array<{ id: string; x: number; z: number }> = [];
    const rotations: Array<{ id: string; rotY: number; rotDelta?: number }> = [];
    const executedEntries: StructuredActionHistoryEntry[] = [];
    const batchGroupId = `batch_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Use current objects + accumulated newObjects for validation of each step
    let workingObjects = [...objects];

    for (const rawAction of rawActions) {
      if (!rawAction || typeof rawAction !== 'object') { failCount++; continue; }

      const validation = validateAICommand(rawAction, roomConfig, workingObjects);
      if (!validation.valid || !validation.sanitizedCommand) {
        showToast(`⚠ Lệnh AI không hợp lệ: ${validation.error || 'Dữ liệu sai định dạng'}`);
        failCount++;
        continue;
      }

      const action = validation.sanitizedCommand;
      if (action.type === 'add_object') {
        const matchedLib = LIBRARY_ITEMS.find((it) => it.type === action.objectType);
        const newId = action.objectId || `${action.objectType || 'item'}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const newObj: RoomObject = {
          id: newId,
          type: (action.objectType as any) || 'bed',
          name: action.name || matchedLib?.name || 'Đồ vật mới',
          dimensions: action.dimensions || matchedLib?.dimensions || { width: 1.2, length: 0.8, height: 0.75 },
          position: { x: action.position?.x ?? 0, y: 0, z: action.position?.z ?? 0 },
          rotation: { x: 0, y: action.rotationY ?? 0, z: 0 },
        };
        newObjects.push(newObj);
        workingObjects = [...workingObjects, newObj]; // update working copy so next action avoids overlap
        lastAddedId = newId;
        successCount++;

        executedEntries.push({
          actionId: `act_add_${newId}`,
          actionType: 'add_object',
          objectId: newId,
          objectType: newObj.type,
          objectName: newObj.name,
          quantity: 1,
          timestamp: Date.now(),
          batchGroupId,
          executionStatus: 'SUCCESS',
        });
      } else if (action.type === 'delete_object') {
        const ids = action.objectIds || (action.objectId ? [action.objectId] : []);
        deleteIds.push(...ids);

        for (const did of ids) {
          const existingObj = objects.find((o) => o.id === did);
          executedEntries.push({
            actionId: `act_del_${did}_${Date.now()}`,
            actionType: 'delete_object',
            objectId: did,
            objectType: (existingObj?.type || 'desk') as any,
            objectName: existingObj?.name || 'Đồ vật',
            quantity: 1,
            timestamp: Date.now(),
            batchGroupId,
            executionStatus: 'SUCCESS',
          });
        }

        workingObjects = workingObjects.filter((o) => !ids.includes(o.id));
        successCount++;
      } else if (action.type === 'move_object' && action.objectId && action.position) {
        moves.push({ id: action.objectId, x: action.position.x, z: action.position.z });
        successCount++;
        const targetObj = objects.find((o) => o.id === action.objectId);
        executedEntries.push({
          actionId: `act_move_${action.objectId}_${Date.now()}`,
          actionType: 'move_object',
          objectId: action.objectId,
          objectType: (targetObj?.type || 'desk') as any,
          objectName: targetObj?.name || 'Đồ vật',
          quantity: 1,
          timestamp: Date.now(),
          batchGroupId,
          executionStatus: 'SUCCESS',
        });
      } else if (action.type === 'rotate_object' && action.objectId) {
        rotations.push({ id: action.objectId, rotY: action.rotationY ?? 0, rotDelta: action.rotationDelta });
        successCount++;
        const targetObj = objects.find((o) => o.id === action.objectId);
        executedEntries.push({
          actionId: `act_rot_${action.objectId}_${Date.now()}`,
          actionType: 'rotate_object',
          objectId: action.objectId,
          objectType: (targetObj?.type || 'desk') as any,
          objectName: targetObj?.name || 'Đồ vật',
          quantity: 1,
          timestamp: Date.now(),
          batchGroupId,
          executionStatus: 'SUCCESS',
        });
      }
    }

    // Apply all mutations in one setObjects call
    if (newObjects.length > 0 || deleteIds.length > 0 || moves.length > 0 || rotations.length > 0) {
      setObjects((prev) => {
        let updated = [...prev];
        // Delete
        if (deleteIds.length > 0) updated = updated.filter((o) => !deleteIds.includes(o.id));
        // Moves
        for (const m of moves) {
          updated = updated.map((o) => o.id === m.id ? { ...o, position: { ...o.position, x: m.x, z: m.z } } : o);
        }
        // Rotations
        for (const r of rotations) {
          updated = updated.map((o) => {
            if (o.id !== r.id) return o;
            const newRotY = r.rotDelta !== undefined ? (o.rotation.y + r.rotDelta) % (Math.PI * 2) : r.rotY;
            return { ...o, rotation: { ...o.rotation, y: newRotY } };
          });
        }
        // Add new objects
        updated = [...updated, ...newObjects];
        return updated;
      });

      if (deleteIds.length > 0 && selectedObjectId && deleteIds.includes(selectedObjectId)) {
        setSelectedObjectId(null);
      }
      // Đồng bộ focus vào đồ vật vừa được thao tác gần nhất (thêm, di chuyển hoặc xoay)
      // Giúp duy trì ngữ cảnh cho các lệnh tiếp theo ("Xoay nó", "Dịch nó sang trái...")
      const lastInteractedId =
        lastAddedId ||
        (rotations.length > 0 ? rotations[rotations.length - 1].id : null) ||
        (moves.length > 0 ? moves[moves.length - 1].id : null);

      if (lastInteractedId) {
        setSelectedObjectId(lastInteractedId);
      }
    }

    return { successCount, failCount, executedEntries };
  };

  // Handler: Execute AI Action Command (single — kept for backward compatibility)
  const handleExecuteAIAction = (rawAction: any): boolean => {
    // Check if AI requested undo
    if (rawAction?.type === 'undo_action' || rawAction?.action === 'undo_action') {
      handleUndo();
      return true;
    }

    const validation = validateAICommand(rawAction, roomConfig, objects);
    if (!validation.valid || !validation.sanitizedCommand) {
      showToast(`⚠ Lệnh AI không hợp lệ: ${validation.error || 'Dữ liệu sai định dạng'}`);
      return false;
    }

    const action = validation.sanitizedCommand;

    // Save snapshot before executing state-changing action
    pushSnapshot(objects);

    if (action.type === 'add_object') {
      const matchedLib = LIBRARY_ITEMS.find((it) => it.type === action.objectType);
      const newId = action.objectId || `${action.objectType || 'item'}_${Date.now()}`;
      const newObj: RoomObject = {
        id: newId,
        type: (action.objectType as any) || 'bed',
        name: action.name || matchedLib?.name || 'Đồ vật mới',
        dimensions: action.dimensions || matchedLib?.dimensions || { width: 1.2, length: 0.8, height: 0.75 },
        position: {
          x: action.position?.x ?? 0,
          y: 0,
          z: action.position?.z ?? 0,
        },
        rotation: {
          x: 0,
          y: action.rotationY ?? 0,
          z: 0,
        },
      };
      setObjects((prev) => [...prev, newObj]);
      setSelectedObjectId(newId);
      showToast(`✓ AI đã thêm ${newObj.name} vào phòng.`);
      return true;
    } else if (action.type === 'move_object' && action.objectId) {
      if (action.position) {
        handleUpdateObjectPosition(action.objectId, action.position.x, action.position.z);
        showToast(`✓ AI đã di chuyển đồ vật.`);
        return true;
      }
    } else if (action.type === 'rotate_object' && action.objectId) {
      if (action.rotationDelta !== undefined) {
        handleRotateObject(action.objectId, action.rotationDelta);
        showToast(`✓ AI đã xoay đồ vật.`);
        return true;
      } else if (action.rotationY !== undefined) {
        setObjects((prev) =>
          prev.map((o) => (o.id === action.objectId ? { ...o, rotation: { ...o.rotation, y: action.rotationY! } } : o))
        );
        showToast(`✓ AI đã chỉnh góc xoay.`);
        return true;
      }
    } else if (action.type === 'delete_object') {
      const targetIds = action.objectIds || (action.objectId ? [action.objectId] : []);
      if (targetIds.length > 0) {
        setObjects((prev) => prev.filter((o) => !targetIds.includes(o.id)));
        if (selectedObjectId && targetIds.includes(selectedObjectId)) {
          setSelectedObjectId(null);
        }
        showToast(`✓ AI đã xóa ${targetIds.length} đồ vật khỏi phòng.`);
        return true;
      }
    }
    return false;
  };

  // Handler: Preview Proposal (clean toggle for single; tab-switch for multi-adjustments)
  const handlePreviewProposal = (single: ProposedAdjustment | null, adjustments?: ProposedAdjustment[]) => {
    if (adjustments && adjustments.length > 0) {
      // Distinguish "toggle same proposal off" vs "switch to different proposal" (tab switching PA1→PA2→PA3)
      const firstAdj = adjustments[0];
      const curFirst = previewAdjustments[0];
      const isSameProposal =
        isPreviewingProposal &&
        curFirst &&
        curFirst.objectId === firstAdj?.objectId &&
        previewAdjustments.length === adjustments.length &&
        Math.abs((curFirst.suggestedX ?? 0) - (firstAdj?.suggestedX ?? 0)) < 0.001 &&
        Math.abs((curFirst.suggestedZ ?? 0) - (firstAdj?.suggestedZ ?? 0)) < 0.001;

      if (isSameProposal) {
        // Toggle off: same proposal card clicked again
        setIsPreviewingProposal(false);
        setPreviewAdjustments([]);
        return;
      }
      // Switch to new candidate (tab switching PA1/PA2/PA3) OR activate new preview
      setPreviewAdjustments([...adjustments]); // spread to ensure new array reference
      setProposedAdjustment(null);
      setIsPreviewingProposal(true);
    } else if (single) {
      if (isPreviewingProposal && proposedAdjustment?.objectId === single.objectId) {
        setIsPreviewingProposal(false);
        setProposedAdjustment(null);
        return;
      }
      setProposedAdjustment(single);
      setPreviewAdjustments([]);
      setIsPreviewingProposal(true);
    } else {
      setIsPreviewingProposal(false);
      setProposedAdjustment(null);
      setPreviewAdjustments([]);
    }
  };

  // Handler: Apply Proposal (single adjustment)
  const handleApplyProposal = (adj: ProposedAdjustment) => {
    const target = objects.find((o) => o.id === adj.objectId);
    if (!target) return;

    pushSnapshot(objects);
    const objName = target.name;
    setObjects((prev) =>
      prev.map((o) => {
        if (o.id === adj.objectId) {
          return {
            ...o,
            position: { ...o.position, x: adj.suggestedX, z: adj.suggestedZ },
            rotation: { ...o.rotation, y: adj.suggestedRotationY },
          };
        }
        return o;
      })
    );
    setIsPreviewingProposal(false);
    setProposedAdjustment(null);
    setPreviewAdjustments([]);
    showToast(`✓ Đã áp dụng vị trí tối ưu cho ${objName}!`);
  };

  // Handler: Apply Multiple Adjustments (layout optimizer proposal)
  // Directly and reliably applies the collision-free layout generated by the optimizer
  const handleApplyMultipleAdjustments = (adjs: ProposedAdjustment[]) => {
    if (!adjs || adjs.length === 0) return;

    pushSnapshot(objects);
    setObjects((prev) =>
      prev.map((obj) => {
        const adj = adjs.find((a) => a.objectId === obj.id);
        if (!adj) return obj;
        return {
          ...obj,
          position: { ...obj.position, x: adj.suggestedX, z: adj.suggestedZ },
          rotation: { ...obj.rotation, y: adj.suggestedRotationY },
        };
      })
    );

    setIsPreviewingProposal(false);
    setPreviewAdjustments([]);
    setProposedAdjustment(null);
    setIsComparisonModalOpen(false);

    showToast(`✓ Đã áp dụng toàn bộ phương án tối ưu phong thủy (${adjs.length} đồ vật)!`);
  };

  // Handler: Trigger Unified Feng Shui Report (Phase P5)
  const handleTriggerAiAnalysis = () => {
    try {
      const profile: PersonalProfile = {
        id: 'user_profile_active',
        displayName: 'Gia chủ',
        birthDate: `${birthYear}-07-01`,
        genderForTraditionalCalculation: gender,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const report = buildUnifiedAssessmentReport({
        roomConfig,
        objects,
        profile,
        roomName: 'Phòng ngủ Master',
      });

      const nhAssessment = evaluateRoomElementAssessment(
        roomConfig,
        objects,
        userProfile.element,
        { northBearingDeg: (roomConfig as any).northBearingDeg ?? null }
      );

      setUnifiedReport(report);
      setNguHanhAssessment(nhAssessment);
      setIsReportModalOpen(true);
      showToast('✓ Đã cập nhật báo cáo phong thủy không gian sống.');
    } catch (e) {
      console.error(e);
      showToast('⚠ Lỗi khi tổng hợp báo cáo phong thủy.');
    }
  };

  const handleFocusObjects = (sourceId: string, targetId: string, label: string, distance: string) => {
    setActiveVisualConnection({ sourceId, targetId, label, distance });
    setSelectedObjectId(sourceId);
    showToast(`👁 Đang phân tích liên kết 3D: ${label} (${distance})`);
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#14171A] font-sans antialiased select-none print:h-auto print:w-full print:overflow-visible print:bg-white">
      {/* =========================================================================
          1. TOP APP BAR (Professional Interior Architecture Toolbar)
         ========================================================================= */}
      <header className="h-14 bg-[#14171A] border-b border-stone-800/80 px-4 flex items-center justify-between shrink-0 z-30 shadow-md text-stone-200 print:hidden app-topbar">
        {/* Left: Lotus Icon & Studio Title & Panel Toggle */}
        <div className="flex items-center gap-3">
          <div className="w-8.5 h-8.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center shadow-xs">
            <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C12 3 7.5 8 7.5 13.5C7.5 16.5 9.5 18.5 12 18.5C14.5 18.5 16.5 16.5 16.5 13.5C16.5 8 12 3 12 3Z" fill="#10B981" fillOpacity="0.85" />
              <path d="M12 8.5C12 8.5 4.5 10.5 3.5 15.5C3 18 5 19.5 7.5 19.5C10 19.5 11.5 17.5 12 15.5" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 8.5C12 8.5 19.5 10.5 20.5 15.5C21 18 19 19.5 16.5 19.5C14 19.5 12.5 17.5 12 15.5" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">
              AI Feng Shui Studio
            </h1>
            <p className="text-[11px] text-stone-400 mt-0.5 leading-none font-medium">
              Thiết kế không gian sống hài hòa
            </p>
          </div>

          {/* Toggle Left Sidebar */}
          <button
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className={`ml-2 px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isLeftPanelOpen
                ? 'bg-stone-800 text-white border-stone-700 shadow-xs'
                : 'text-stone-400 hover:text-white hover:bg-stone-800 border-stone-800/60'
            }`}
            title={isLeftPanelOpen ? 'Thu gọn cột trái' : 'Mở cột trái (Hồ sơ & Hướng)'}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
            <span className="hidden md:inline text-[11px]">Hồ sơ</span>
          </button>
        </div>

        {/* Center: Camera View Modes & Day/Night Toggle (Exact match to reference photo) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-[#1E2124] rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => setCameraViewMode('3d')}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${cameraViewMode === '3d'
                ? 'bg-[#005C4A] text-white shadow-xs border border-emerald-500/50'
                : 'text-stone-300 hover:text-white'
                }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>3D Phối Cảnh</span>
            </button>
            <button
              onClick={() => setCameraViewMode('2d')}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${cameraViewMode === '2d'
                ? 'bg-[#005C4A] text-white shadow-xs border border-emerald-500/50'
                : 'text-stone-300 hover:text-white'
                }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              <span>Mặt Bằng 2D</span>
            </button>
            <button
              onClick={() => setCameraViewMode('iso')}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${cameraViewMode === 'iso'
                ? 'bg-[#005C4A] text-white shadow-xs border border-emerald-500/50'
                : 'text-stone-300 hover:text-white'
                }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m12 3-8 4.5v9L12 21l8-4.5v-9L12 3Z" />
              </svg>
              <span>Isometric</span>
            </button>
          </div>

          {/* Undo / Redo Actions */}
          <div className="flex items-center p-1 bg-[#1E2124] rounded-xl border border-stone-800 text-xs gap-0.5">
            <button
              onClick={handleUndo}
              disabled={historyPast.length === 0}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Hoàn tác (Ctrl+Z)"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={historyFuture.length === 0}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Làm lại (Ctrl+Y)"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
              </svg>
            </button>
          </div>

          {/* Day / Night Button matching reference layout */}
          {lightingMode === 'day' ? (
            <button
              onClick={() => setLightingMode('night')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#26221A] border border-amber-600/40 text-amber-300 hover:bg-[#2e2a1e] transition-all text-xs font-semibold shadow-xs select-none active:scale-95 cursor-pointer"
              title="Nhấp để chuyển sang chế độ Ban đêm"
            >
              <span className="text-amber-400 text-sm">☼</span>
              <span>Ban ngày</span>
            </button>
          ) : (
            <button
              onClick={() => setLightingMode('day')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#191D24] border border-amber-500/35 text-amber-200 hover:bg-[#20252e] transition-all text-xs font-semibold shadow-xs select-none active:scale-95 cursor-pointer"
              title="Nhấp để chuyển sang chế độ Ban ngày"
            >
              <span className="text-amber-300 text-sm">☾</span>
              <span>Ban đêm</span>
            </button>
          )}
        </div>

        {/* Right: Report, Avatar, Toggle Right Sidebar */}
        <div className="flex items-center gap-2">
          {/* Toggle Right Sidebar */}
          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isRightPanelOpen
                ? 'bg-[#005C4A] text-white border-emerald-500/50 shadow-xs'
                : 'text-stone-400 hover:text-white hover:bg-stone-800 border-stone-800/60'
            }`}
            title={isRightPanelOpen ? 'Thu gọn cột phải (Trợ lý phong thủy)' : 'Mở cột phải (Trợ lý phong thủy)'}
          >
            <span className="text-xs">🪷</span>
            <span className="hidden md:inline text-[11px]">Trợ lý AI</span>
          </button>

          {/* High-Contrast Report Button */}
          <button
            onClick={() => handleTriggerAiAnalysis()}
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-100 text-stone-900 border border-stone-200 text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Tạo & xem báo cáo phong thủy mới nhất"
          >
            <span>📄</span>
            <span>Báo cáo</span>
          </button>

          {/* User Profile Avatar */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-7.5 h-7.5 rounded-full bg-[#005C4A] text-white flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer"
            title="Hồ sơ người dùng"
          >
            N
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. THREE-COLUMN ARCHITECTURAL FLEXBOX LAYOUT (NO ABSOLUTE OVERLAP)
         ========================================================================= */}
      <main className="flex-1 w-full h-[calc(100vh-56px)] flex overflow-hidden bg-[#14171A] p-2.5 sm:p-3 gap-2.5 sm:gap-3 select-none print:hidden app-main-workspace">
        {/* -------------------------------------------------------------------
            COLUMN 1: LEFT SIDEBAR (Hồ sơ gia chủ & Hướng phòng)
           ------------------------------------------------------------------- */}
        {isLeftPanelOpen && (
          <div className="w-[270px] lg:w-[280px] shrink-0 h-full flex flex-col gap-2.5 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-150">
            <div className="flex-1 min-h-0 overflow-auto rounded-2xl shadow-2xl flex flex-col">
              <LeftSidebar
                userProfile={userProfile}
                onEditProfile={() => setIsProfileModalOpen(true)}
                roomDirection={roomConfig.direction}
                onClose={() => setIsLeftPanelOpen(false)}
              />
            </div>

            <div className="shrink-0">
              <RoomCompassWidget
                roomDirection={roomConfig.direction}
                userProfile={userProfile}
                onChangeRoomDirection={(newDir) => setRoomConfig((prev) => ({ ...prev, direction: newDir }))}
                onResetCamera={() => {
                  window.dispatchEvent(new CustomEvent('three-camera-reset'));
                }}
              />
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            COLUMN 2: CENTER WORKSPACE (Toolbar, 3D Canvas, Object Library Dock)
           ------------------------------------------------------------------- */}
        <div className="flex-1 min-w-0 h-full relative flex flex-col overflow-hidden rounded-2xl bg-[#181B1E] shadow-2xl border border-stone-800/80">
          {/* 3D Canvas - fills the entire center workspace */}
          <div className="absolute inset-0 z-0">
            <ThreeRoomCanvas
              roomConfig={roomConfig}
              objects={objects}
              userProfile={userProfile}
              evaluation={evaluation}
              selectedObjectId={selectedObjectId}
              onSelectObject={(id) => setSelectedObjectId(id)}
              onUpdateObjectPosition={handleUpdateObjectPosition}
              onRotateObject={handleRotateObject}
              onSetObjectRotation={handleSetObjectRotation}
              onBeginInteraction={handleBeginInteraction}
              onDeleteObject={handleDeleteObject}
              onDuplicateObject={handleDuplicateObject}
              proposedAdjustment={proposedAdjustment}
              previewAdjustments={previewAdjustments}
              isPreviewingProposal={isPreviewingProposal}
              onApplyPreview={() => {
                if (previewAdjustments.length > 0) {
                  handleApplyMultipleAdjustments(previewAdjustments);
                } else if (proposedAdjustment) {
                  handleApplyProposal(proposedAdjustment);
                }
              }}
              onCancelPreview={() => {
                setIsPreviewingProposal(false);
                setProposedAdjustment(null);
                setPreviewAdjustments([]);
              }}
              cameraViewMode={cameraViewMode}
              onChangeCameraViewMode={setCameraViewMode}
              onResetCamera={() => setCameraViewMode('3d')}
              showFengShuiOverlay={showFengShuiOverlay}
              onToggleFengShuiOverlay={() => setShowFengShuiOverlay(!showFengShuiOverlay)}
              transformMode={transformMode}
              onChangeTransformMode={setTransformMode}
              onDropFromLibrary={handleDropFromLibrary}
              activeVisualConnection={activeVisualConnection}
              onClearVisualConnection={() => setActiveVisualConnection(null)}
              lightingMode={lightingMode}
            />
          </div>

          {/* Top Floating Controls inside Center Workspace */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-1 p-1 bg-[#1E2124]/90 backdrop-blur-md rounded-xl border border-stone-800 text-xs text-stone-300 shadow-lg">
              <button
                onClick={() => setTransformMode('translate')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  transformMode === 'translate'
                    ? 'bg-[#005C4A] text-white shadow-xs border border-emerald-500/50'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
                title="Chế độ di chuyển đồ vật"
              >
                <span>✥</span>
                <span>Di chuyển</span>
              </button>
              <button
                onClick={() => setTransformMode('rotate')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  transformMode === 'rotate'
                    ? 'bg-[#005C4A] text-white shadow-xs border border-emerald-500/50'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
                title="Chế độ xoay đồ vật"
              >
                <span>↻</span>
                <span>Xoay</span>
              </button>
            </div>
          </div>

          {/* Object Library Dock: Constrained STRICTLY within Center Workspace! */}
          <div className="absolute bottom-3 left-3 right-3 z-20 flex justify-center pointer-events-none">
            <div className="w-full max-w-[680px] pointer-events-auto shadow-2xl">
              <ObjectLibraryDock onAddObject={handleAddObjectFromLibrary} />
            </div>
          </div>

          {/* Toast Notification Alert */}
          {toastMessage && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-stone-900/95 backdrop-blur-md text-white text-xs font-semibold shadow-2xl border border-stone-700/80 animate-in fade-in slide-in-from-top-2 pointer-events-none">
              {toastMessage}
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------------
            COLUMN 3: RIGHT SIDEBAR (Trợ lý Phong Thủy)
           ------------------------------------------------------------------- */}
        {isRightPanelOpen && (
          <div className="w-[340px] md:w-[360px] xl:w-[390px] shrink-0 h-full flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-150">
            <RightSidebarPanel
              userProfile={userProfile}
              roomConfig={roomConfig}
              objects={objects}
              evaluation={evaluation}
              selectedObjectId={selectedObjectId}
              onPreviewProposal={handlePreviewProposal}
              onApplyProposal={handleApplyProposal}
              onApplyMultipleAdjustments={handleApplyMultipleAdjustments}
              onExecuteAIAction={handleExecuteAIAction}
              onExecuteAIActions={handleExecuteAIActions}
              onOpenOptimizationModal={(prop) => {
                setActiveOptimizationProposal(prop);
                setIsComparisonModalOpen(true);
              }}
              externalTriggerPrompt={chatTriggerPrompt}
              onClearExternalTriggerPrompt={() => setChatTriggerPrompt(null)}
              onFocusObjects={handleFocusObjects}
              isPreviewingProposal={isPreviewingProposal}
              onClose={() => setIsRightPanelOpen(false)}
            />
          </div>
        )}
      </main>

      {/* =========================================================================
          3. COMPREHENSIVE MODALS & REPORTS
         ========================================================================= */}
      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        onChangeBirthYear={setBirthYear}
        onChangeGender={setGender}
        roomConfig={roomConfig}
        onChangeRoomConfig={(cfg) => setRoomConfig((prev) => ({ ...prev, ...cfg }))}
      />

      {/* Before / After Layout Comparison Modal */}
      <LayoutComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        proposal={activeOptimizationProposal}
        currentObjects={objects}
        onApply={handleApplyMultipleAdjustments}
      />

      {/* Unified Assessment Report Modal (Phase P5 + P8.4) */}
      <UnifiedAssessmentReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={unifiedReport}
        onRefresh={handleTriggerAiAnalysis}
        nguHanhAssessment={nguHanhAssessment}
        personalElement={userProfile.element}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        roomConfig={roomConfig}
        objects={objects}
      />
    </div>
  );
}
