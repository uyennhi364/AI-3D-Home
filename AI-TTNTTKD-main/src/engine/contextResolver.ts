// =============================================================================
// contextResolver.ts
// Resolves conversational context & anaphoric references
// ("Xóa những cái vừa tạo", "Di chuyển nó sang trái", "Xoay chiếc giường vừa thêm"...)
// using Structured Action History and live 3D Scene State.
// =============================================================================

import { RoomObject, StructuredActionHistoryEntry, RoomObjectType, RoomConfig } from '../types/fengshui';
import { ContextReferenceInfo } from './intentClassifier';

export interface ResolvedContextTargets {
  resolved: boolean;
  targetObjects: RoomObject[];
  reason: string;
}

/**
 * Resolves context references into actual existing 3D RoomObjects
 */
export function resolveContextTargets(
  contextRef: ContextReferenceInfo | undefined,
  actionHistory: StructuredActionHistoryEntry[] = [],
  currentObjects: RoomObject[] = [],
  selectedObjectId: string | null = null,
  roomConfig?: RoomConfig
): ResolvedContextTargets {
  if (!contextRef) {
    return { resolved: false, targetObjects: [], reason: 'Không có tham chiếu ngữ cảnh.' };
  }

  // Helper: check if object still exists in 3D scene
  const filterExisting = (ids: string[]): RoomObject[] => {
    return currentObjects.filter((o) => ids.includes(o.id));
  };

  // 1. Case: "những cái vừa tạo" / "đồ vật vừa thêm"
  if (contextRef.type === 'recently_created') {
    // Find the latest add_object batch
    const addEntries = actionHistory.filter((e) => e.actionType === 'add_object' && e.executionStatus === 'SUCCESS');
    if (addEntries.length === 0) {
      return {
        resolved: false,
        targetObjects: [],
        reason: 'Chưa có đồ vật nào được tạo gần đây trong lịch sử phiên làm việc.',
      };
    }

    // Get the most recent batchGroupId
    const latestBatchId = addEntries[addEntries.length - 1].batchGroupId;
    const latestBatch = addEntries.filter((e) => e.batchGroupId === latestBatchId);
    const existingTargets = filterExisting(latestBatch.map((e) => e.objectId));

    if (existingTargets.length === 0) {
      return {
        resolved: false,
        targetObjects: [],
        reason: 'Các đồ vật vừa tạo đã không còn tồn tại trong phòng ngủ.',
      };
    }

    return {
      resolved: true,
      targetObjects: existingTargets,
      reason: `Đã xác định được ${existingTargets.length} đồ vật thuộc nhóm vừa tạo gần nhất (${existingTargets.map((o) => o.name).join(', ')}).`,
    };
  }

  // 2. Case: "chiếc giường vừa tạo" / "bàn học vừa thêm" / "xóa bàn vừa mới thêm"
  if (contextRef.type === 'specific_recent') {
    const targetType = contextRef.targetObjectType;
    const isDeskOrTable =
      targetType === 'desk' ||
      targetType === 'table' ||
      contextRef.rawPhrase.toLowerCase().includes('bàn');

    // Search backwards in actionHistory for this specific objectType or desk/table group
    const matchingAdds = actionHistory.filter((e) => {
      if (e.actionType !== 'add_object' || e.executionStatus !== 'SUCCESS') return false;
      if (isDeskOrTable) {
        return (
          e.objectType === 'desk' ||
          e.objectType === 'table' ||
          (e.objectName && e.objectName.toLowerCase().includes('bàn'))
        );
      }
      return e.objectType === targetType;
    });

    if (matchingAdds.length > 0) {
      // Pick the most recent one
      const mostRecentEntry = matchingAdds[matchingAdds.length - 1];
      const found = currentObjects.find((o) => o.id === mostRecentEntry.objectId);
      if (found) {
        return {
          resolved: true,
          targetObjects: [found],
          reason: `Đã xác định được ${found.name} vừa được tạo gần đây (ID: ${found.id}).`,
        };
      }
    }

    // Fallback: search in current room objects of that type
    const fallbacks = currentObjects.filter((o) => {
      if (isDeskOrTable) {
        return o.type === 'desk' || o.type === 'table' || o.name.toLowerCase().includes('bàn');
      }
      return o.type === targetType;
    });

    if (fallbacks.length === 1) {
      return {
        resolved: true,
        targetObjects: [fallbacks[0]],
        reason: `Đã xác định được ${fallbacks[0].name} trong phòng.`,
      };
    } else if (fallbacks.length > 1) {
      return {
        resolved: false,
        targetObjects: [],
        reason: `Trong phòng hiện có nhiều đồ vật loại này (${fallbacks.map((f) => f.name).join(', ')}). Vui lòng nêu rõ tên đồ vật cụ thể bạn muốn xóa.`,
      };
    }

    return {
      resolved: false,
      targetObjects: [],
      reason: `Không tìm thấy đồ vật nào phù hợp vừa được tạo trong phòng.`,
    };
  }

  // 3. Case: Spatial relation ("Xóa chiếc bàn cạnh cửa sổ", "chiếc bàn cạnh giường", "chắn cửa"...)
  if (contextRef.type === 'spatial_relation') {
    const anchor = contextRef.spatialAnchor;
    const targetType = contextRef.targetObjectType;
    const isDeskOrTable =
      targetType === 'desk' ||
      targetType === 'table' ||
      contextRef.rawPhrase.toLowerCase().includes('bàn');

    // Filter candidate objects matching the target
    const candidates = currentObjects.filter((o) => {
      if (isDeskOrTable) {
        return o.type === 'desk' || o.type === 'table' || o.name.toLowerCase().includes('bàn');
      }
      if (targetType) {
        return o.type === targetType;
      }
      return o.type !== 'door' && o.type !== 'window';
    });

    if (candidates.length === 0) {
      return {
        resolved: false,
        targetObjects: [],
        reason: `Không tìm thấy đồ vật nào phù hợp trong phòng để thực hiện thao tác.`,
      };
    }

    // Determine anchor coordinate in room
    let anchorPos: { x: number; z: number } | null = null;
    const halfW = (roomConfig?.width || 5.0) / 2;
    const halfL = (roomConfig?.length || 5.2) / 2;

    if (anchor === 'window') {
      const winObj = currentObjects.find((o) => o.type === 'window');
      // In master layout window is on West wall (x = -halfW, z = 0) or North (z = -halfL)
      anchorPos = winObj ? { x: winObj.position.x, z: winObj.position.z } : { x: -halfW + 0.1, z: 0 };
    } else if (anchor === 'door') {
      const doorObj = currentObjects.find((o) => o.type === 'door');
      anchorPos = doorObj ? { x: doorObj.position.x, z: doorObj.position.z } : { x: halfW - 0.1, z: -0.2 };
    } else if (anchor === 'bed') {
      const bedObj = currentObjects.find((o) => o.type === 'bed');
      if (bedObj) anchorPos = { x: bedObj.position.x, z: bedObj.position.z };
    } else if (anchor === 'wardrobe') {
      const wardObj = currentObjects.find((o) => o.type === 'wardrobe');
      if (wardObj) anchorPos = { x: wardObj.position.x, z: wardObj.position.z };
    } else if (anchor === 'wc') {
      const wcObj = currentObjects.find((o) => o.type === 'wc');
      if (wcObj) anchorPos = { x: wcObj.position.x, z: wcObj.position.z };
    }

    if (!anchorPos) {
      if (candidates.length === 1) {
        return {
          resolved: true,
          targetObjects: [candidates[0]],
          reason: `Đã xác định được ${candidates[0].name}.`,
        };
      }
      return {
        resolved: false,
        targetObjects: [],
        reason: `Không xác định được vị trí chuẩn của ${anchor || 'vật mốc'} để so sánh khoảng cách.`,
      };
    }

    // Sort candidates by Euclidean distance to anchor
    const sorted = [...candidates].sort((a, b) => {
      const distA = Math.hypot(a.position.x - anchorPos!.x, a.position.z - anchorPos!.z);
      const distB = Math.hypot(b.position.x - anchorPos!.x, b.position.z - anchorPos!.z);
      return distA - distB;
    });

    const closest = sorted[0];
    const anchorLabel =
      anchor === 'window'
        ? 'cửa sổ'
        : anchor === 'door'
        ? 'cửa'
        : anchor === 'bed'
        ? 'giường'
        : anchor === 'wardrobe'
        ? 'tủ'
        : 'nhà vệ sinh';

    return {
      resolved: true,
      targetObjects: [closest],
      reason: `Đã xác định được ${closest.name} ở vị trí gần ${anchorLabel} nhất (cách ~${Math.round(Math.hypot(closest.position.x - anchorPos.x, closest.position.z - anchorPos.z) * 10) / 10}m).`,
    };
  }

  // 4. Case: "cái thứ hai", "cái thứ 2", "cái đầu tiên"
  if (contextRef.type === 'ordinal') {
    const idx = contextRef.ordinalIndex ?? 0;
    const addEntries = actionHistory.filter((e) => e.actionType === 'add_object' && e.executionStatus === 'SUCCESS');

    if (addEntries.length > 0) {
      const latestBatchId = addEntries[addEntries.length - 1].batchGroupId;
      let batch = addEntries.filter((e) => e.batchGroupId === latestBatchId);

      if (contextRef.targetObjectType) {
        batch = batch.filter((e) => e.objectType === contextRef.targetObjectType);
      }

      if (idx < batch.length) {
        const targetId = batch[idx].objectId;
        const found = currentObjects.find((o) => o.id === targetId);
        if (found) {
          return {
            resolved: true,
            targetObjects: [found],
            reason: `Đã xác định được đồ vật thứ ${idx + 1}: ${found.name}.`,
          };
        }
      }
    }

    // Fallback: search in currentObjects by type or list order
    let pool = currentObjects;
    if (contextRef.targetObjectType) {
      pool = currentObjects.filter((o) => o.type === contextRef.targetObjectType);
    }
    if (idx < pool.length) {
      return {
        resolved: true,
        targetObjects: [pool[idx]],
        reason: `Đã chọn đồ vật thứ ${idx + 1} (${pool[idx].name}).`,
      };
    }

    return {
      resolved: false,
      targetObjects: [],
      reason: `Không tìm thấy đồ vật thứ ${idx + 1} theo ngữ cảnh yêu cầu.`,
    };
  }

  // 4. Case: "nó", "chúng", "đồ vật đó"
  if (contextRef.type === 'pronoun') {
    // 1st priority: currently selected object
    if (selectedObjectId) {
      const selected = currentObjects.find((o) => o.id === selectedObjectId);
      if (selected) {
        return {
          resolved: true,
          targetObjects: [selected],
          reason: `Đã áp dụng cho đồ vật đang được chọn: ${selected.name}.`,
        };
      }
    }

    // 2nd priority: items from latest batch
    const addEntries = actionHistory.filter((e) => e.actionType === 'add_object' && e.executionStatus === 'SUCCESS');
    if (addEntries.length > 0) {
      const latestBatchId = addEntries[addEntries.length - 1].batchGroupId;
      const latestBatch = addEntries.filter((e) => e.batchGroupId === latestBatchId);
      const existing = filterExisting(latestBatch.map((e) => e.objectId));
      if (existing.length > 0) {
        return {
          resolved: true,
          targetObjects: existing,
          reason: `Đã áp dụng cho ${existing.length} đồ vật vừa được thao tác (${existing.map((o) => o.name).join(', ')}).`,
        };
      }
    }

    return {
      resolved: false,
      targetObjects: [],
      reason: 'Không xác định được đồ vật đang được ám chỉ ("nó"/"chúng"). Hãy chọn một đồ vật trước hoặc nói rõ tên.',
    };
  }

  return { resolved: false, targetObjects: [], reason: 'Ngữ cảnh không xác định.' };
}

