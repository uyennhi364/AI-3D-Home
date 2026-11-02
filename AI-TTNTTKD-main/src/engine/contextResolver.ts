// =============================================================================
// contextResolver.ts
// Resolves conversational context & anaphoric references
// ("Xóa những cái vừa tạo", "Di chuyển nó sang trái", "Xoay chiếc giường vừa thêm"...)
// using Structured Action History and live 3D Scene State.
// =============================================================================

import { RoomObject, StructuredActionHistoryEntry, RoomObjectType } from '../types/fengshui';
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
  selectedObjectId: string | null = null
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

  // 2. Case: "chiếc giường vừa tạo" / "bàn học vừa thêm"
  if (contextRef.type === 'specific_recent') {
    const targetType = contextRef.targetObjectType;
    if (!targetType) {
      return { resolved: false, targetObjects: [], reason: 'Không xác định được loại đồ vật cụ thể.' };
    }

    // Search backwards in actionHistory for this specific objectType
    const matchingAdds = actionHistory.filter(
      (e) => e.actionType === 'add_object' && e.objectType === targetType && e.executionStatus === 'SUCCESS'
    );

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
    const fallbacks = currentObjects.filter((o) => o.type === targetType);
    if (fallbacks.length > 0) {
      return {
        resolved: true,
        targetObjects: [fallbacks[fallbacks.length - 1]],
        reason: `Đã xác định được ${fallbacks[fallbacks.length - 1].name} trong phòng.`,
      };
    }

    return {
      resolved: false,
      targetObjects: [],
      reason: `Không tìm thấy đồ vật loại "${targetType}" nào vừa được tạo trong phòng.`,
    };
  }

  // 3. Case: "cái thứ hai", "cái thứ 2", "cái đầu tiên"
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

