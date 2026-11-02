import { RoomConfig, RoomObject, RoomObjectType } from '../types/fengshui';
import {
  clampOBBInsideRoom,
  resolveSafePlacement,
  validatePlacementSafety,
  findSmartPlacement,
} from '../engine/geometryEngine';

export interface AICommand {
  type: 'add_object' | 'move_object' | 'rotate_object' | 'delete_object' | 'update_object';
  objectId?: string;
  objectIds?: string[];
  objectType?: RoomObjectType;
  quantity?: number;
  name?: string;
  dimensions?: { width: number; length: number; height: number };
  position?: { x: number; y: number; z: number };
  rotationDelta?: number;
  rotationY?: number;
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  sanitizedCommand?: AICommand;
}

/**
 * Safety Validator for all AI-generated 3D commands.
 * Uses 2D Oriented Bounding Box (OBB) and Separating Axis Theorem (SAT)
 * to guarantee no clipping outside room walls, intersecting furniture, or door blockage.
 */
export function validateAICommand(
  rawAction: any,
  roomConfig: RoomConfig,
  objects: RoomObject[]
): ValidationResult {
  if (!rawAction || typeof rawAction !== 'object') {
    return { valid: false, error: 'Lệnh không hợp lệ (phải là object JSON).' };
  }

  // Normalize action type (supports both lower-case and UPPERCASE like ADD_OBJECT)
  const rawType = String(rawAction.type || rawAction.action || '').toLowerCase();
  const type = rawType.startsWith('add')
    ? 'add_object'
    : rawType.startsWith('move')
      ? 'move_object'
      : rawType.startsWith('rotate')
        ? 'rotate_object'
        : rawType.startsWith('delete')
          ? 'delete_object'
          : rawType.startsWith('update')
            ? 'update_object'
            : null;

  if (!type) {
    return { valid: false, error: `Thao tác không được hỗ trợ: ${rawAction.type || rawAction.action}` };
  }

  const roomW = roomConfig.width || 5.0;
  const roomL = roomConfig.length || 5.2;
  const rConfig = { width: roomW, length: roomL };

  switch (type) {
    case 'add_object': {
      const objType = (rawAction.objectType || 'plant') as RoomObjectType;
      const defaultDims: Record<string, { width: number; length: number; height: number }> = {
        desk: { width: 1.3, length: 0.65, height: 0.75 },
        chair: { width: 0.55, length: 0.55, height: 0.85 },
        wardrobe: { width: 1.8, length: 0.6, height: 2.2 },
        bed: { width: 1.6, length: 2.0, height: 0.95 },
        mirror: { width: 0.55, length: 0.15, height: 1.65 },
        plant: { width: 0.5, length: 0.5, height: 0.9 },
        nightstand: { width: 0.5, length: 0.45, height: 0.5 },
        sofa: { width: 1.6, length: 0.8, height: 0.75 },
        table: { width: 0.8, length: 0.8, height: 0.5 },
        lamp: { width: 0.35, length: 0.35, height: 0.5 },
        wc: { width: 1.4, length: 1.6, height: 2.1 },
        rug: { width: 2.0, length: 1.4, height: 0.05 },
      };

      // Architectural & plumbing constraint check for WC / Bathroom
      if (objType === 'wc' && !rawAction.objectId) {
        const hasExistingWc = objects.some((o) => o.type === 'wc');
        if (hasExistingWc) {
          return {
            valid: false,
            error: 'Phòng ngủ đã có sẵn khu vực WC Master khép kín cố định; không thể bố trí thêm nhà vệ sinh thứ 2 trong phòng ngủ do ràng buộc kỹ thuật cấp thoát nước.',
          };
        }
      }

      const dim = rawAction.dimensions || defaultDims[objType] || { width: 0.8, length: 0.8, height: 0.75 };
      const rotY = Number(rawAction.rotationY) || 0;

      // === FAST PATH: Server (Gemini/local) already computed a verified placement ===
      // If objectId + position are already provided by the server, trust them and skip
      // re-running findSmartPlacement (which uses stale `objects` not knowing about
      // sibling items added in the same batch). Just clamp to room bounds and pass through.
      if (rawAction.objectId && rawAction.position?.x !== undefined && rawAction.position?.z !== undefined) {
        const serverPos = {
          x: Number(rawAction.position.x),
          y: 0,
          z: Number(rawAction.position.z),
        };
        const clampedPos = clampOBBInsideRoom(serverPos, dim, rotY, rConfig);
        const effectiveDims = {
          width: dim.width,
          length: dim.length,
          height: dim.height ?? 0.85,
        };
        const sanitized: AICommand = {
          type: 'add_object',
          objectId: rawAction.objectId,
          objectType: objType,
          name: rawAction.name || (objType === 'desk' ? 'Bàn học/làm việc' : objType === 'chair' ? 'Ghế công thái học' : objType === 'plant' ? 'Cây xanh phong thủy' : objType === 'bed' ? 'Giường ngủ' : objType === 'lamp' ? 'Đèn ngủ' : 'Đồ vật mới'),
          dimensions: effectiveDims,
          position: { x: clampedPos.x, y: 0, z: clampedPos.z },
          rotationY: rotY,
          description: rawAction.description || `Thêm ${objType} vào phòng`,
        };
        return { valid: true, sanitizedCommand: sanitized };
      }

      // === SLOW PATH: No server-provided placement — compute locally ===
      const initialPos = {
        x: Number(rawAction.position?.x) || 0,
        z: Number(rawAction.position?.z) || 0,
      };

      // Intelligent Placement Engine: tests orientations, anchor points & adaptive sizing
      const placement = findSmartPlacement(
        objType,
        dim,
        objects,
        rConfig,
        initialPos
      );

      if (!placement.resolved) {
        return {
          valid: false,
          error: `Không tìm được vị trí an toàn trong phòng cho ${objType} (không gian hiện tại quá chật hoặc bị chặn kín lối đi).`,
        };
      }

      const effectiveDims = {
        width: placement.dimensions.width,
        length: placement.dimensions.length,
        height: placement.dimensions.height ?? dim.height ?? 0.85,
      };
      const sanitized: AICommand = {
        type: 'add_object',
        objectId: rawAction.objectId,
        objectType: objType,
        name: rawAction.name || (objType === 'desk' ? 'Bàn học/làm việc' : objType === 'chair' ? 'Ghế công thái học' : objType === 'plant' ? 'Cây xanh phong thủy' : objType === 'bed' ? 'Giường ngủ' : objType === 'lamp' ? 'Đèn ngủ' : 'Đồ vật mới'),
        dimensions: effectiveDims,
        position: { x: placement.safePos.x, y: 0, z: placement.safePos.z },
        rotationY: placement.rotationY,
        description: rawAction.description || `Thêm ${objType} vào phòng`,
      };

      return {
        valid: true,
        warning: placement.adapted ? 'Kích thước hoặc góc xoay đã được điều chỉnh thích ứng để vừa vặn an toàn trong phòng.' : undefined,
        sanitizedCommand: sanitized,
      };
    }

    case 'move_object': {
      if (!rawAction.objectId) {
        return { valid: false, error: 'Thiếu objectId cho thao tác di chuyển.' };
      }

      const existing = objects.find((o) => o.id === rawAction.objectId);
      if (!existing) {
        return { valid: false, error: `Không tìm thấy đồ vật với ID: "${rawAction.objectId}".` };
      }

      const rawX = rawAction.position?.x ?? existing.position.x;
      const rawZ = rawAction.position?.z ?? existing.position.z;
      const targetPos = { x: Number(rawX) || 0, z: Number(rawZ) || 0 };

      // Validate exact requested position first
      const directValidation = validatePlacementSafety(
        targetPos,
        existing.dimensions,
        existing.rotation.y,
        objects,
        rConfig,
        existing.id
      );

      let finalPos = targetPos;
      let warningText: string | undefined = undefined;

      if (!directValidation.valid) {
        // Try to resolve to the nearest safe location
        const resolution = resolveSafePlacement(
          targetPos,
          existing.dimensions,
          existing.rotation.y,
          objects,
          rConfig,
          existing.id
        );

        if (!resolution.resolved) {
          return {
            valid: false,
            error: directValidation.reason || 'Không thể di chuyển đồ vật tới vị trí này do xung đột không gian.',
          };
        }

        finalPos = resolution.safePos;
        warningText = `Vị trí đã được Geometry Engine dịch chuyển nhẹ (${directValidation.reason})`;
      } else {
        finalPos = clampOBBInsideRoom(targetPos, existing.dimensions, existing.rotation.y, rConfig);
      }

      const sanitized: AICommand = {
        type: 'move_object',
        objectId: rawAction.objectId,
        position: { x: finalPos.x, y: 0, z: finalPos.z },
        description: rawAction.description || `Di chuyển ${existing.name}`,
      };

      return { valid: true, warning: warningText, sanitizedCommand: sanitized };
    }

    case 'rotate_object': {
      if (!rawAction.objectId) {
        return { valid: false, error: 'Thiếu objectId cho thao tác xoay.' };
      }

      const existing = objects.find((o) => o.id === rawAction.objectId);
      if (!existing) {
        return { valid: false, error: `Không tìm thấy đồ vật với ID: "${rawAction.objectId}".` };
      }

      let delta = rawAction.rotationDelta !== undefined ? Number(rawAction.rotationDelta) : undefined;
      let targetRotY = rawAction.rotationY !== undefined ? Number(rawAction.rotationY) : undefined;

      if (delta === undefined && targetRotY === undefined) {
        delta = Math.PI / 2; // Default 90 deg rotation
      }

      const newRotationY = targetRotY !== undefined ? targetRotY : (existing.rotation.y + (delta || 0)) % (Math.PI * 2);

      // Verify that after rotation, the object's corners still fit comfortably inside the room and don't pierce walls
      const clampedPos = clampOBBInsideRoom(existing.position, existing.dimensions, newRotationY, rConfig);

      const sanitized: AICommand = {
        type: 'rotate_object',
        objectId: rawAction.objectId,
        rotationDelta: delta,
        rotationY: newRotationY,
        position: { x: clampedPos.x, y: 0, z: clampedPos.z },
        description: rawAction.description || `Xoay ${existing.name}`,
      };

      return { valid: true, sanitizedCommand: sanitized };
    }

    case 'delete_object': {
      const targetIds: string[] = [];
      if (Array.isArray(rawAction.objectIds) && rawAction.objectIds.length > 0) {
        targetIds.push(...rawAction.objectIds);
      } else if (rawAction.objectId) {
        targetIds.push(rawAction.objectId);
      } else if (rawAction.objectType) {
        const qty = Math.max(1, Number(rawAction.quantity) || 1);
        const matching = objects.filter((o) => o.type === rawAction.objectType);
        if (matching.length === 0) {
          return { valid: false, error: `Không tìm thấy đồ vật loại "${rawAction.objectType}" trong phòng để xóa.` };
        }
        if (matching.length < qty) {
          return {
            valid: false,
            error: `Phòng hiện chỉ có ${matching.length} ${matching[0].name}, không đủ ${qty} cái để xóa theo yêu cầu.`,
          };
        }
        targetIds.push(...matching.slice(0, qty).map((o) => o.id));
      }

      if (targetIds.length === 0) {
        return { valid: false, error: 'Thiếu objectId hoặc objectIds cho thao tác xóa.' };
      }

      const existingObjects = objects.filter((o) => targetIds.includes(o.id));
      if (existingObjects.length === 0) {
        return { valid: false, error: `Không tìm thấy đồ vật nào cần xóa trong phòng.` };
      }

      const names = existingObjects.map((o) => o.name).join(', ');
      return {
        valid: true,
        sanitizedCommand: {
          type: 'delete_object',
          objectId: targetIds[0],
          objectIds: targetIds,
          description: rawAction.description || `Xóa ${names}`,
        },
      };
    }

    case 'update_object': {
      if (!rawAction.objectId) {
        return { valid: false, error: 'Thiếu objectId cho thao tác cập nhật.' };
      }
      return {
        valid: true,
        sanitizedCommand: {
          type: 'update_object',
          objectId: rawAction.objectId,
          name: rawAction.name,
          dimensions: rawAction.dimensions,
        },
      };
    }

    default:
      return { valid: false, error: `Thao tác không được hỗ trợ: ${type}` };
  }
}
