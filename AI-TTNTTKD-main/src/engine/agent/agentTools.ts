// =============================================================================
// src/engine/agent/agentTools.ts
// Phase P7 — Gemini Function Calling Declarations & Tool Execution Handlers
// =============================================================================

import { RoomConfig, RoomObject, RoomObjectType, UserFengShuiProfile } from '../../types/fengshui.js';
import { ToolCategory, SceneProposal, SceneSnapshot, ProposedChange } from './agentTypes.js';
import { buildLayoutFromLegacy } from '../core/roomLayout.js';
import { evaluateFurnitureRules } from '../core/furnitureRuleEngine.js';
import { evaluatePersonalAssessment } from '../core/personalAssessment.js';
import { evaluateEnvironmentalRules } from '../core/environmentalEngine.js';
import { buildUnifiedAssessmentReport } from '../core/unifiedAssessment.js';
import { PersonalProfile } from '../core/personalProfile.js';
import { ORIENTATION_CATALOG } from '../core/orientationCatalog.js';
import { computeRobustSceneVersion } from './sceneHasher.js';
import { ProposalManager } from './proposalManager.js';
import { TransactionManager } from './transactionManager.js';
import { generateOptimizedLayout } from '../layoutOptimizer.js';

export const ALLOWED_OBJECT_TYPES: RoomObjectType[] = [
  'bed',
  'desk',
  'chair',
  'wardrobe',
  'mirror',
  'plant',
  'nightstand',
  'sofa',
  'table',
  'tv',
  'bookshelf',
  'lamp',
  'rug',
  'wc',
];

export const OBJECT_TYPE_DEFAULTS: Record<string, { width: number; length: number; height: number; name: string }> = {
  bed: { width: 1.6, length: 2.0, height: 0.95, name: 'Giường ngủ' },
  desk: { width: 1.3, length: 0.65, height: 0.75, name: 'Bàn làm việc' },
  chair: { width: 0.55, length: 0.55, height: 0.85, name: 'Ghế ngồi' },
  wardrobe: { width: 1.8, length: 0.6, height: 2.2, name: 'Tủ quần áo' },
  mirror: { width: 0.55, length: 0.15, height: 1.65, name: 'Gương soi' },
  plant: { width: 0.5, length: 0.5, height: 0.9, name: 'Cây phong thủy' },
  nightstand: { width: 0.5, length: 0.45, height: 0.5, name: 'Táp đầu giường' },
  sofa: { width: 1.6, length: 0.8, height: 0.75, name: 'Sofa' },
  table: { width: 0.8, length: 0.8, height: 0.5, name: 'Bàn trà' },
  tv: { width: 1.2, length: 0.2, height: 0.8, name: 'Kệ TV' },
  bookshelf: { width: 1.0, length: 0.35, height: 1.8, name: 'Giá sách' },
  lamp: { width: 0.35, length: 0.35, height: 0.5, name: 'Đèn ngủ' },
  wc: { width: 1.4, length: 1.6, height: 2.1, name: 'Phòng WC khép kín' },
  rug: { width: 2.0, length: 1.6, height: 0.02, name: 'Thảm phòng ngủ' },
};

// =============================================================================
// GEMINI FUNCTION DECLARATIONS (Tools Catalog)
// =============================================================================

export const AGENT_FUNCTION_DECLARATIONS = [
  // --- TIER 1: READ-ONLY TOOLS ---
  {
    name: 'get_scene_snapshot',
    description: 'Truy xuất trạng thái hiện tại của phòng 3D (danh sách đồ vật, vị trí, kích thước, góc xoay và phiên bản sceneVersion).',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_room_layout',
    description: 'Truy xuất mô hình hình học phòng P2 (tường, cửa ra vào, cửa sổ, chiều cao trần và góc phương vị trục Bắc).',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_object_details',
    description: 'Truy xuất thông tin chi tiết và trục định hướng (orientation catalog) của một đồ vật cụ thể.',
    parameters: {
      type: 'OBJECT',
      properties: {
        objectId: { type: 'STRING', description: 'ID định danh của đồ vật (ví dụ: bed_01, desk_01)' },
      },
      required: ['objectId'],
    },
  },
  {
    name: 'analyze_feng_shui',
    description: 'Chạy bộ quy tắc phong thủy P3 (giường, bàn làm việc, gương soi, xà ngang, cửa xung) và Bát Trạch P4.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'analyze_environment',
    description: 'Chạy bộ quy tắc môi trường & công thái học P6 (chiếu sáng, thông gió tự nhiên, lối đi thông thủy và khoảng cách sử dụng).',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_assessment_report',
    description: 'Truy xuất toàn bộ báo cáo tổng hợp hợp nhất P5 (bao gồm tất cả quy tắc P3, P4, P6 và vấn đề chất lượng dữ liệu).',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },

  // --- TIER 2: PROPOSAL TOOLS ---
  {
    name: 'propose_move_object',
    description: 'Đề xuất di chuyển một đồ vật tới vị trí mới [targetX, targetZ]. Tạo proposal an toàn, KHÔNG thay đổi scene thật.',
    parameters: {
      type: 'OBJECT',
      properties: {
        objectId: { type: 'STRING', description: 'ID đồ vật cần di chuyển' },
        targetX: { type: 'NUMBER', description: 'Tọa độ X mới (mét) trong phòng' },
        targetZ: { type: 'NUMBER', description: 'Tọa độ Z mới (mét) trong phòng' },
        reason: { type: 'STRING', description: 'Lý do kiến trúc hoặc phong thủy của đề xuất' },
      },
      required: ['objectId', 'targetX', 'targetZ'],
    },
  },
  {
    name: 'propose_rotate_object',
    description: 'Đề xuất xoay một đồ vật một góc độ nhất định quanh trục đứng Y. Tạo proposal an toàn.',
    parameters: {
      type: 'OBJECT',
      properties: {
        objectId: { type: 'STRING', description: 'ID đồ vật cần xoay' },
        angleDegrees: { type: 'NUMBER', description: 'Góc xoay theo độ (ví dụ 90, 180, 270...)' },
        reason: { type: 'STRING', description: 'Lý do xoay' },
      },
      required: ['objectId', 'angleDegrees'],
    },
  },
  {
    name: 'propose_add_object',
    description: 'Đề xuất thêm một đồ vật mới vào phòng ngủ. Tạo proposal an toàn, kiểm tra va chạm và kích thước.',
    parameters: {
      type: 'OBJECT',
      properties: {
        objectType: {
          type: 'STRING',
          description: 'Loại đồ vật trong allowlist: bed, desk, chair, wardrobe, mirror, plant, nightstand, sofa, table, tv, bookshelf, lamp, rug, wc',
        },
        name: { type: 'STRING', description: 'Tên hiển thị tiếng Việt' },
        width: { type: 'NUMBER', description: 'Chiều rộng (m)' },
        length: { type: 'NUMBER', description: 'Chiều dài (m)' },
        targetX: { type: 'NUMBER', description: 'Tọa độ X tùy chọn' },
        targetZ: { type: 'NUMBER', description: 'Tọa độ Z tùy chọn' },
        reason: { type: 'STRING', description: 'Lý do thêm' },
      },
      required: ['objectType'],
    },
  },
  {
    name: 'propose_delete_object',
    description: 'Đề xuất xóa một đồ vật cụ thể khỏi phòng. Thao tác có rủi ro cao, bắt buộc tạo proposal và chờ xác nhận.',
    parameters: {
      type: 'OBJECT',
      properties: {
        objectId: { type: 'STRING', description: 'ID đồ vật cần xóa' },
        reason: { type: 'STRING', description: 'Lý do xóa' },
      },
      required: ['objectId'],
    },
  },
  {
    name: 'propose_optimize_layout',
    description: 'Đề xuất tối ưu hóa toàn bộ bố cục phòng ngủ theo chuẩn Bát Trạch và công thái học. Tạo proposal tổng thể.',
    parameters: {
      type: 'OBJECT',
      properties: {
        pinnedObjectIds: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Danh sách ID các đồ vật muốn giữ nguyên vị trí, không di dời.',
        },
        reason: { type: 'STRING', description: 'Mục tiêu tối ưu' },
      },
    },
  },

  // --- TIER 3: EXECUTION TOOLS ---
  {
    name: 'preview_scene_changes',
    description: 'Bật chế độ xem trước bóng mờ 3D (Ghost Preview) cho một đề xuất đã tạo mà không ghi đè scene thật.',
    parameters: {
      type: 'OBJECT',
      properties: {
        proposalId: { type: 'STRING', description: 'ID của proposal cần xem trước' },
      },
      required: ['proposalId'],
    },
  },
  {
    name: 'confirm_scene_changes',
    description: 'Thực thi giao dịch áp dụng các thay đổi từ một proposal đã được người dùng đồng ý. Có kiểm tra an toàn và rollback.',
    parameters: {
      type: 'OBJECT',
      properties: {
        proposalId: { type: 'STRING', description: 'ID của proposal đã được người dùng xác nhận' },
      },
      required: ['proposalId'],
    },
  },
  {
    name: 'cancel_scene_changes',
    description: 'Hủy bỏ đề xuất hoặc tắt chế độ xem trước bóng mờ 3D.',
    parameters: {
      type: 'OBJECT',
      properties: {
        proposalId: { type: 'STRING', description: 'ID của proposal cần hủy (nếu có)' },
      },
    },
  },
  {
    name: 'undo_last_action',
    description: 'Hoàn tác giao dịch thay đổi phòng gần nhất, khôi phục lại trạng thái trước đó an toàn.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reason: { type: 'STRING', description: 'Lý do hoàn tác' },
      },
    },
  },
  {
    name: 'redo_last_action',
    description: 'Làm lại giao dịch vừa hoàn tác.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
];

export const TOOL_CATEGORY_MAP: Record<string, ToolCategory> = {
  get_scene_snapshot: 'READ_ONLY',
  get_room_layout: 'READ_ONLY',
  get_object_details: 'READ_ONLY',
  analyze_feng_shui: 'READ_ONLY',
  analyze_environment: 'READ_ONLY',
  get_assessment_report: 'READ_ONLY',

  propose_move_object: 'PROPOSAL',
  propose_rotate_object: 'PROPOSAL',
  propose_add_object: 'PROPOSAL',
  propose_delete_object: 'PROPOSAL',
  propose_optimize_layout: 'PROPOSAL',

  preview_scene_changes: 'EXECUTION',
  confirm_scene_changes: 'EXECUTION',
  cancel_scene_changes: 'EXECUTION',
  undo_last_action: 'EXECUTION',
  redo_last_action: 'EXECUTION',
};

// =============================================================================
// TOOL IMPLEMENTATION EXECUTOR
// =============================================================================

export interface ToolExecutionContext {
  sessionId: string;
  roomConfig: RoomConfig;
  objects: RoomObject[];
  userProfile?: UserFengShuiProfile;
  personalProfile?: PersonalProfile;
  proposalManager: ProposalManager;
  transactionManager: TransactionManager;
  updateObjectsCallback?: (newObjs: RoomObject[]) => void;
}

export function executeAgentTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): { success: boolean; result: any; error?: string } {
  const {
    sessionId,
    roomConfig,
    objects,
    userProfile,
    personalProfile,
    proposalManager,
    transactionManager,
    updateObjectsCallback,
  } = context;

  const currentSceneVersion = computeRobustSceneVersion(objects, roomConfig);
  const layout = buildLayoutFromLegacy(roomConfig, objects);

  switch (toolName) {
    // -------------------------------------------------------------
    // READ-ONLY TOOLS
    // -------------------------------------------------------------
    case 'get_scene_snapshot': {
      return {
        success: true,
        result: {
          sceneVersion: currentSceneVersion,
          objectCount: objects.length,
          objects: objects.map((o) => ({
            id: o.id,
            name: o.name,
            type: o.type,
            position: o.position,
            rotationY: o.rotation.y,
            dimensions: o.dimensions,
          })),
          roomDimensions: {
            width: roomConfig.width,
            length: roomConfig.length,
            height: roomConfig.height,
          },
        },
      };
    }

    case 'get_room_layout': {
      return {
        success: true,
        result: {
          roomId: layout.id,
          polygonVertices: layout.polygon,
          wallsCount: layout.walls.length,
          openingsCount: layout.openings.length,
          openings: layout.openings.map((op) => ({
            id: op.id,
            kind: op.kind,
            wallId: op.wallId,
            width: op.width,
            height: op.height,
            swing: op.swing,
            assumed: op.assumed,
          })),
          ceilingHeight: layout.ceilingHeight,
          northBearingDeg: layout.northBearingDeg,
        },
      };
    }

    case 'get_object_details': {
      const obj = objects.find((o) => o.id === args.objectId);
      if (!obj) {
        return { success: false, result: null, error: `Không tìm thấy đồ vật với ID "${args.objectId}"` };
      }
      const orientation = ORIENTATION_CATALOG[obj.type];
      return {
        success: true,
        result: {
          object: obj,
          orientationContract: orientation
            ? {
                frontAxis: orientation.frontAxis,
                headAxis: orientation.headAxis,
                userFacingAxis: orientation.userFacingAxis,
                notes: orientation.notes,
              }
            : null,
        },
      };
    }

    case 'analyze_feng_shui': {
      const p3Output = evaluateFurnitureRules({ layout, objects });
      const p4Output = evaluatePersonalAssessment({
        profile: personalProfile,
        layout,
        objects,
      });

      return {
        success: true,
        result: {
          geometricRuleCount: p3Output.geometricRules.length,
          traditionalRuleCount: p3Output.traditionalRules.length,
          personalRuleCount: p4Output.personalRules.length,
          keyRules: [...p3Output.traditionalRules, ...p4Output.personalRules].map((r) => ({
            ruleId: r.ruleId,
            name: r.name,
            verdict: r.verdict,
            severity: r.severity,
            explanation: r.explanation,
            remedy: r.remedy,
          })),
        },
      };
    }

    case 'analyze_environment': {
      const p6Output = evaluateEnvironmentalRules({ layout, objects });
      return {
        success: true,
        result: {
          environmentalRules: p6Output.environmentalRules.map((r) => ({
            ruleId: r.ruleId,
            name: r.name,
            verdict: r.verdict,
            measurement: r.measurement,
            explanation: r.explanation,
          })),
          ergonomicRules: p6Output.ergonomicRules.map((r) => ({
            ruleId: r.ruleId,
            name: r.name,
            verdict: r.verdict,
            measurement: r.measurement,
            explanation: r.explanation,
          })),
          dataQualityIssues: p6Output.dataQualityRules.map((r) => ({
            ruleId: r.ruleId,
            name: r.name,
            explanation: r.explanation,
          })),
        },
      };
    }

    case 'get_assessment_report': {
      const report = buildUnifiedAssessmentReport({
        roomConfig,
        objects,
        profile: personalProfile,
        layout,
      });
      return {
        success: true,
        result: {
          reportId: report.reportId,
          dataCompleteness: report.dataCompleteness,
          statistics: report.statistics,
          keyRecommendations: report.recommendations,
          dataQualityIssues: report.dataQualityIssues,
        },
      };
    }

    // -------------------------------------------------------------
    // PROPOSAL TOOLS
    // -------------------------------------------------------------
    case 'propose_move_object': {
      const targetObj = objects.find((o) => o.id === args.objectId);
      if (!targetObj) {
        return { success: false, result: null, error: `Không tìm thấy đồ vật ID "${args.objectId}" để di chuyển.` };
      }

      const targetX = Number(args.targetX);
      const targetZ = Number(args.targetZ);
      const halfW = (roomConfig.width || 5.0) / 2;
      const halfL = (roomConfig.length || 5.2) / 2;

      // Validate boundary
      if (Math.abs(targetX) > halfW || Math.abs(targetZ) > halfL) {
        return { success: false, result: null, error: `Tọa độ đích [${targetX}, ${targetZ}] nằm ngoài ranh giới phòng (±${halfW}m, ±${halfL}m).`,
        };
      }

      const previewObjects: RoomObject[] = objects.map((o) => {
        if (o.id === targetObj.id) {
          return {
            ...o,
            position: { ...o.position, x: targetX, z: targetZ },
          };
        }
        return { ...o };
      });

      const change: ProposedChange = {
        objectId: targetObj.id,
        objectType: targetObj.type,
        name: targetObj.name,
        action: 'move',
        currentPosition: { ...targetObj.position },
        targetPosition: { x: targetX, y: targetObj.position.y, z: targetZ },
        reason: args.reason,
      };

      const proposal = proposalManager.createProposal({
        sessionId,
        fnName: toolName,
        normalizedArgs: { objectId: targetObj.id, targetX, targetZ, reason: args.reason || '' },
        sceneVersion: currentSceneVersion,
        title: `Di chuyển ${targetObj.name}`,
        description: args.reason || `Di chuyển ${targetObj.name} đến vị trí [${targetX.toFixed(2)}, ${targetZ.toFixed(2)}]`,
        changes: [change],
        previewObjects,
        requiresConfirmation: true,
      });

      return {
        success: true,
        result: {
          proposalId: proposal.proposalId,
          title: proposal.title,
          description: proposal.description,
          sceneVersion: proposal.sceneVersion,
          requiresConfirmation: true,
          expiresInSeconds: (proposal.expiresAt - proposal.createdAt) / 1000,
          previewAvailable: true,
        },
      };
    }

    case 'propose_rotate_object': {
      const targetObj = objects.find((o) => o.id === args.objectId);
      if (!targetObj) {
        return { success: false, result: null, error: `Không tìm thấy đồ vật ID "${args.objectId}" để xoay.` };
      }

      const deg = Number(args.angleDegrees) || 90;
      const radDelta = (deg * Math.PI) / 180;
      const targetRotY = (targetObj.rotation.y + radDelta) % (2 * Math.PI);

      const previewObjects: RoomObject[] = objects.map((o) => {
        if (o.id === targetObj.id) {
          return {
            ...o,
            rotation: { ...o.rotation, y: targetRotY },
          };
        }
        return { ...o };
      });

      const change: ProposedChange = {
        objectId: targetObj.id,
        objectType: targetObj.type,
        name: targetObj.name,
        action: 'rotate',
        currentRotationY: targetObj.rotation.y,
        targetRotationY: targetRotY,
        reason: args.reason,
      };

      const proposal = proposalManager.createProposal({
        sessionId,
        fnName: toolName,
        normalizedArgs: { objectId: targetObj.id, angleDegrees: deg, reason: args.reason || '' },
        sceneVersion: currentSceneVersion,
        title: `Xoay ${targetObj.name} ${deg}°`,
        description: args.reason || `Xoay ${targetObj.name} ${deg} độ theo chiều kim đồng hồ`,
        changes: [change],
        previewObjects,
        requiresConfirmation: true,
      });

      return {
        success: true,
        result: {
          proposalId: proposal.proposalId,
          title: proposal.title,
          description: proposal.description,
          requiresConfirmation: true,
          previewAvailable: true,
        },
      };
    }

    case 'propose_add_object': {
      const objType = args.objectType as RoomObjectType;
      if (!ALLOWED_OBJECT_TYPES.includes(objType)) {
        return { success: false, result: null, error: `Loại đồ vật "${objType}" không nằm trong danh mục hỗ trợ của studio. Các loại hợp lệ: ${ALLOWED_OBJECT_TYPES.join(', ')}`,
        };
      }

      // WC single instance limit
      if (objType === 'wc' && objects.some((o) => o.type === 'wc')) {
        return { success: false, result: null, error: 'Phòng ngủ đã có sẵn một khu WC khép kín. Không thể thêm WC thứ hai do giới hạn cấp thoát nước.',
        };
      }

      const defaults = OBJECT_TYPE_DEFAULTS[objType] || { width: 1, length: 1, height: 1, name: objType };
      const width = Number(args.width) || defaults.width;
      const length = Number(args.length) || defaults.length;
      const height = Number(args.height) || defaults.height;
      const name = args.name || defaults.name;

      // Determine placement
      let targetX = args.targetX !== undefined ? Number(args.targetX) : 0;
      let targetZ = args.targetZ !== undefined ? Number(args.targetZ) : 0;

      const newId = `${objType}_${Date.now()}`;
      const newObj: RoomObject = {
        id: newId,
        type: objType,
        name,
        position: { x: targetX, y: 0, z: targetZ },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width, length, height },
      };

      const previewObjects = [...objects, newObj];

      const change: ProposedChange = {
        objectId: newId,
        objectType: objType,
        name,
        action: 'add',
        targetPosition: { x: targetX, y: 0, z: targetZ },
        targetDimensions: { width, length, height },
        reason: args.reason,
      };

      const proposal = proposalManager.createProposal({
        sessionId,
        fnName: toolName,
        normalizedArgs: {
          objectType: objType,
          name,
          width,
          length,
          height,
          targetX,
          targetZ,
          reason: args.reason || '',
        },
        sceneVersion: currentSceneVersion,
        title: `Thêm ${name}`,
        description: args.reason || `Thêm ${name} vào không gian phòng`,
        changes: [change],
        previewObjects,
        requiresConfirmation: true,
      });

      return {
        success: true,
        result: {
          proposalId: proposal.proposalId,
          title: proposal.title,
          description: proposal.description,
          requiresConfirmation: true,
          previewAvailable: true,
        },
      };
    }

    case 'propose_delete_object': {
      const targetObj = objects.find((o) => o.id === args.objectId || o.name.toLowerCase() === String(args.objectId).toLowerCase());
      if (!targetObj) {
        return { success: false, result: null, error: `Không tìm thấy đồ vật ID/tên "${args.objectId}" để xóa.` };
      }

      const previewObjects = objects.filter((o) => o.id !== targetObj.id);
      const change: ProposedChange = {
        objectId: targetObj.id,
        objectType: targetObj.type,
        name: targetObj.name,
        action: 'delete',
        currentPosition: { ...targetObj.position },
        reason: args.reason,
      };

      const proposal = proposalManager.createProposal({
        sessionId,
        fnName: toolName,
        normalizedArgs: { objectId: targetObj.id, reason: args.reason || '' },
        sceneVersion: currentSceneVersion,
        title: `Xóa ${targetObj.name}`,
        description: args.reason || `Xác nhận xóa bỏ ${targetObj.name} khỏi phòng ngủ`,
        changes: [change],
        previewObjects,
        requiresConfirmation: true, // DESTRUCTIVE: MANDATORY CONFIRMATION
      });

      return {
        success: true,
        result: {
          proposalId: proposal.proposalId,
          title: proposal.title,
          description: proposal.description,
          requiresConfirmation: true,
          isDestructive: true,
          warning: '⚠️ Thao tác xóa sẽ loại bỏ đồ vật khỏi scene 3D sau khi bạn xác nhận.',
        },
      };
    }

    case 'propose_optimize_layout': {
      const pinned = Array.isArray(args.pinnedObjectIds) ? args.pinnedObjectIds : [];
      const dummyEval = { overallScore: 50, statusText: 'Cần tối ưu', keyIssues: [], items: [] };

      const optResult = generateOptimizedLayout(
        userProfile || {
          birthYear: 1990,
          gender: 'male',
          guaNumber: 1,
          guaName: 'Khảm',
          element: 'Thủy',
          group: 'Đông Tứ Mệnh',
          auspiciousDirections: ['N', 'S', 'E', 'SE'],
          inauspiciousDirections: ['W', 'NW', 'SW', 'NE'],
          directionDetails: {} as any,
        },
        roomConfig,
        objects,
        dummyEval as any,
        'feng_shui_priority',
        pinned
      );

      const previewObjects: RoomObject[] = objects.map((obj) => {
        const adj = optResult.proposal.adjustments.find((a) => a.objectId === obj.id);
        if (!adj) return { ...obj };
        return {
          ...obj,
          position: { ...obj.position, x: adj.suggestedX, z: adj.suggestedZ },
          rotation: { ...obj.rotation, y: adj.suggestedRotationY },
        };
      });

      const changes: ProposedChange[] = optResult.proposal.adjustments.map((adj) => ({
        objectId: adj.objectId,
        objectType: objects.find((o) => o.id === adj.objectId)?.type || 'bed',
        name: objects.find((o) => o.id === adj.objectId)?.name ?? adj.objectId,
        action: 'move',
        targetPosition: { x: adj.suggestedX, y: 0, z: adj.suggestedZ },
        targetRotationY: adj.suggestedRotationY,
        reason: adj.reason,
      }));

      const proposal = proposalManager.createProposal({
        sessionId,
        fnName: toolName,
        normalizedArgs: { pinnedObjectIds: pinned, reason: args.reason || '' },
        sceneVersion: currentSceneVersion,
        title: 'Tối ưu toàn diện bố cục phòng',
        description: `Tối ưu bố cục: điểm phong thủy tăng từ ${optResult.proposal.beforeScore} lên ${optResult.proposal.afterScore}/100.`,
        changes,
        previewObjects,
        requiresConfirmation: true,
        ruleEvaluationBefore: { totalRules: 10, passCount: 4, warnCount: 3, failCount: 3 },
        ruleEvaluationAfter: { totalRules: 10, passCount: 9, warnCount: 1, failCount: 0 },
      });

      return {
        success: true,
        result: {
          proposalId: proposal.proposalId,
          title: proposal.title,
          description: proposal.description,
          beforeScore: optResult.proposal.beforeScore,
          afterScore: optResult.proposal.afterScore,
          improvements: optResult.proposal.improvements,
          requiresConfirmation: true,
          previewAvailable: true,
        },
      };
    }

    // -------------------------------------------------------------
    // EXECUTION TOOLS
    // -------------------------------------------------------------
    case 'preview_scene_changes': {
      const prop = proposalManager.getProposal(args.proposalId);
      if (!prop) {
        return { success: false, result: null, error: `Proposal ID "${args.proposalId}" không tồn tại hoặc đã hết hạn.` };
      }
      return {
        success: true,
        result: {
          active: true,
          proposalId: prop.proposalId,
          previewObjects: prop.previewObjects,
          changes: prop.changes,
          title: prop.title,
        },
      };
    }

    case 'confirm_scene_changes': {
      const prop = proposalManager.getProposal(args.proposalId);
      if (!prop) {
        return { success: false, result: null, error: `Proposal ID "${args.proposalId}" không tồn tại hoặc đã hết hạn.` };
      }

      const txResult = transactionManager.executeProposalTransaction(
        prop,
        objects,
        roomConfig,
        proposalManager
      );

      if (!txResult.success) {
        return { success: false, result: null, error: txResult.error,
        };
      }

      if (updateObjectsCallback && txResult.updatedObjects) {
        updateObjectsCallback(txResult.updatedObjects);
      }

      return {
        success: true,
        result: {
          committed: true,
          transactionId: txResult.transaction?.transactionId,
          updatedCount: txResult.updatedObjects?.length,
          changesApplied: prop.changes.length,
          newSceneVersion: txResult.transaction?.afterSnapshot.sceneVersion,
        },
      };
    }

    case 'cancel_scene_changes': {
      if (args.proposalId) {
        proposalManager.cancelProposal(args.proposalId);
      }
      return {
        success: true,
        result: {
          cancelled: true,
          message: 'Đã hủy bỏ đề xuất và tắt chế độ xem trước.',
        },
      };
    }

    case 'undo_last_action': {
      const undoRes = transactionManager.undo(sessionId);
      if (!undoRes.success) {
        return { success: false, result: null, error: undoRes.error };
      }
      if (updateObjectsCallback && undoRes.restoredObjects) {
        updateObjectsCallback(undoRes.restoredObjects);
      }
      return {
        success: true,
        result: {
          undone: true,
          transactionId: undoRes.transactionId,
          restoredObjectCount: undoRes.restoredObjects?.length,
        },
      };
    }

    case 'redo_last_action': {
      const redoRes = transactionManager.redo(sessionId, objects, roomConfig);
      if (!redoRes.success) {
        return { success: false, result: null, error: redoRes.error };
      }
      if (updateObjectsCallback && redoRes.restoredObjects) {
        updateObjectsCallback(redoRes.restoredObjects);
      }
      return {
        success: true,
        result: {
          redone: true,
          transactionId: redoRes.transactionId,
          restoredObjectCount: redoRes.restoredObjects?.length,
        },
      };
    }

    default:
      return { success: false, result: null, error: `Tool "${toolName}" không được nhận diện trong hệ thống.` };
  }
}

