import {
  AIActionCommand,
  FengShuiRoomEvaluation,
  LayoutOptimizationProposal,
  ProposedAdjustment,
  RoomConfig,
  RoomObject,
  RoomObjectType,
  StructuredActionHistoryEntry,
  UserFengShuiProfile,
} from '../types/fengshui';
import { getFloorDistance } from './fengshuiRules';
import { generateOptimizedLayout } from './layoutOptimizer';
import { parseIntent, buildSceneState } from './sceneIntentParser';
import { executeSceneCommand } from './sceneCommandExecutor';
import {
  AIIntentResult,
  SceneCommand,
  DeleteCommand,
  MoveCommand,
  RotateCommand,
  AddCommand,
} from './sceneCommandTypes';
import { classifyUserIntent } from './intentClassifier';
import { findSmartPlacement } from './geometryEngine';
import { resolveContextTargets } from './contextResolver';

export interface FengShuiConsultationResult {
  replyText: string;
  actions?: AIActionCommand[];
  proposal?: LayoutOptimizationProposal | null;
  proposedAdjustment?: ProposedAdjustment | null;
  isGeminiOnline?: boolean;
}

export interface DetailedObjectEvidence {
  objectId: string;
  objectName: string;
  type: string;
  coords: string;
  rotationDeg: number;
  dimensions: string;
  sector: string;
  score: number;
  status: 'good' | 'warning' | 'bad';
  distToDoor?: number;
  distToWindow?: number;
  distToWc?: number;
  mirrorDirectView?: boolean;
  solidWall?: boolean;
  pros: string[];
  issues: string[];
  recommendation: string;
}

export interface DeepFengShuiReportData {
  summary: string;
  verdict: string;
  overallScore: number;
  qiAnalysis: string;
  objectDetails: DetailedObjectEvidence[];
  topIssues: string[];
  recommendations: string[];
  masterAdvice: string;
  recommendedAction: string;
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Natural language intent parser & 3D Feng Shui Interior Designer.
 * Understands 3D room state, user Kua, furniture geometry, and generates safe structured actions.
 * Supports full multi-turn conversation history for contextual memory.
 */
export async function generateFengShuiConsultation(
  prompt: string,
  userProfile: UserFengShuiProfile,
  roomConfig: RoomConfig,
  objects: RoomObject[],
  evaluation: FengShuiRoomEvaluation,
  selectedObjectId: string | null,
  chatHistory?: ChatHistoryMessage[],
  actionHistory?: StructuredActionHistoryEntry[]
): Promise<FengShuiConsultationResult> {
  const classified = classifyUserIntent(prompt);
  const lowerPrompt = prompt.toLowerCase();
  if (/(^|\s)(undo|hoàn tác|hoàn lại|khôi phục|quay lại như cũ|trở lại như cũ|như lúc trước|bỏ thao tác|huỷ thao tác|hủy thao tác)/.test(lowerPrompt)) {
    return {
      replyText: 'Tôi sẽ hoàn tác thao tác gần nhất trên mô hình 3D. Nếu không còn thao tác nào để hoàn tác, hệ thống sẽ báo cho bạn.',
      actions: [{ type: 'undo_action', description: 'Hoàn tác thao tác trước đó' }],
    };
  }
  if (classified.intent === 'OPTIMIZE_ROOM' || lowerPrompt.includes('tối ưu') || lowerPrompt.includes('optimize') || lowerPrompt.includes('sắp xếp lại')) {
    const { proposal } = generateOptimizedLayout(userProfile, roomConfig, objects, evaluation);
    return {
      replyText: `Tôi đã phân tích toàn bộ bố cục phòng ${roomConfig.width}m × ${roomConfig.length}m của gia chủ mệnh ${userProfile.guaName} (${userProfile.element}) và tạo phương án tối ưu nâng điểm phong thủy từ ${proposal.beforeScore} lên ${proposal.afterScore}/100.\n\nCác cải tiến:\n${proposal.improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}\n\nBạn có thể bấm Xem trước để kiểm tra bóng mờ 3D hoặc Áp dụng ngay!`,
      proposal,
      proposedAdjustment: proposal.adjustments[0] || null,
      actions: [
        {
          type: 'optimize_room',
          description: 'Tối ưu toàn bộ bố cục phòng ngủ theo Bát Trạch',
          adjustments: proposal.adjustments,
        },
      ],
    };
  }

  // Fast path for ADD_OBJECT in offline fallback (supports multi-action commands)
  if (classified.intent === 'ADD_OBJECT') {
    const itemsToAdd = (classified.extractedItems && classified.extractedItems.length > 0)
      ? classified.extractedItems
      : [
          {
            type: classified.extractedObjectType || ('bed' as RoomObjectType),
            name: classified.extractedObjectName || 'Đồ vật mới',
            quantity: Math.max(1, Math.min(5, classified.extractedQuantity || 1)),
            dimensions: classified.extractedDimensions || { width: 1.2, length: 1.9, height: 0.85 },
          },
        ];

    const actions: any[] = [];
    const currentObjects = [...objects];
    const itemReports: Array<{ name: string; status: 'SUCCESS' | 'FAILED'; reason?: string }> = [];

    for (const item of itemsToAdd) {
      const objType = item.type;
      const dims = item.dimensions || { width: 1.2, length: 1.9, height: 0.85 };
      const quantity = Math.max(1, Math.min(5, item.quantity || 1));

      // Architectural & Plumbing constraint check for WC / Bathroom
      if (objType === 'wc') {
        const hasExistingWc = currentObjects.some((o) => o.type === 'wc');
        if (hasExistingWc) {
          itemReports.push({
            name: item.name,
            status: 'FAILED',
            reason: 'Phòng ngủ hiện đã có sẵn khu vực WC Master khép kín cố định; không thể bố trí thêm nhà vệ sinh thứ 2 trong phòng ngủ do ràng buộc kỹ thuật cấp thoát nước và công năng.',
          });
          continue;
        }
      }

      let addedForItem = 0;
      for (let i = 0; i < quantity; i++) {
        const placement = findSmartPlacement(objType, dims, currentObjects, roomConfig);
        if (!placement.resolved) break;

        const safePos = placement.safePos;
        const effectiveDims = {
          width: placement.dimensions.width,
          length: placement.dimensions.length,
          height: placement.dimensions.height || dims.height || 0.85,
        };
        const itemTitle = quantity > 1 ? `${item.name} #${i + 1}` : item.name;
        const newId = `${objType}_${Date.now()}_${actions.length}_${Math.floor(Math.random() * 1000)}`;

        actions.push({
          type: 'add_object',
          objectId: newId,
          objectType: objType,
          name: itemTitle,
          dimensions: effectiveDims,
          position: safePos,
          rotationY: placement.rotationY,
          description: `Thêm ${itemTitle}`,
        });

        currentObjects.push({
          id: newId,
          type: objType,
          name: itemTitle,
          dimensions: effectiveDims,
          position: { x: safePos.x, y: 0, z: safePos.z },
          rotation: { x: 0, y: placement.rotationY, z: 0 },
        });

        addedForItem++;
      }

      if (addedForItem === quantity) {
        itemReports.push({
          name: quantity > 1 ? `${quantity} ${item.name}` : item.name,
          status: 'SUCCESS',
        });
      } else if (addedForItem > 0) {
        itemReports.push({
          name: item.name,
          status: 'SUCCESS',
          reason: `Chỉ thêm được ${addedForItem}/${quantity} do không đủ không gian an toàn cho số lượng còn lại.`,
        });
      } else {
        itemReports.push({
          name: item.name,
          status: 'FAILED',
          reason: 'Không tìm được vị trí an toàn trong phòng ngủ mà không bị chồng lấn đồ nội thất khác hoặc chắn cửa ra vào.',
        });
      }
    }

    const successCount = itemReports.filter((r) => r.status === 'SUCCESS').length;
    const totalCount = itemReports.length;
    const reportDetails = itemReports
      .map((r) => (r.status === 'SUCCESS' ? `• ${r.name}: ✓ SUCCESS${r.reason ? ` (${r.reason})` : ''}` : `• ${r.name}: ✕ FAILED (${r.reason})`))
      .join('\n');

    let replyText = '';
    if (successCount === totalCount && totalCount > 0) {
      replyText = `Đã thực thi thành công toàn bộ ${totalCount} yêu cầu của gia chủ:\n\n${reportDetails}\n\nCác đồ vật đã được bố trí an toàn trên mô hình 3D, đảm bảo khoảng thông thủy lưu thông khí trường.`;
    } else if (successCount > 0) {
      replyText = `Kết quả thực thi theo yêu cầu của gia chủ (${successCount}/${totalCount} thành công):\n\n${reportDetails}\n\nMô hình 3D đã được cập nhật đồng bộ các đồ vật hợp lệ.`;
    } else {
      replyText = `Không thể thực thi các yêu cầu:\n\n${reportDetails}\n\nGia chủ vui lòng dọn bớt đồ hoặc điều chỉnh kích thước để có đủ không gian.`;
    }

    return {
      replyText,
      actions: actions.length > 0 ? actions : undefined,
    };
  }

  // Fast path for DELETE_OBJECT (supports multi-item delete & context references)
  if (classified.intent === 'DELETE_OBJECT') {
    // A. Context-aware deletion: "Xóa những cái vừa tạo", "Xóa chiếc giường vừa thêm", "Xóa cái thứ 2"...
    if (classified.contextReference) {
      const resolvedContext = resolveContextTargets(
        classified.contextReference,
        actionHistory,
        objects,
        selectedObjectId
      );

      if (resolvedContext.resolved && resolvedContext.targetObjects.length > 0) {
        const toDeleteIds = resolvedContext.targetObjects.map((o) => o.id);
        const toDeleteNames = resolvedContext.targetObjects.map((o) => o.name).join(', ');
        const reports = resolvedContext.targetObjects.map((o) => `• ${o.name}: ✓ SUCCESS (Đã xóa thành công)`);

        return {
          replyText: `Đã thực thi yêu cầu xóa theo ngữ cảnh:\n\n${reports.join('\n')}\n\nĐã xóa toàn bộ ${toDeleteIds.length} đồ vật phù hợp khỏi không gian 3D.`,
          actions: [
            {
              type: 'delete_object',
              objectId: toDeleteIds[0],
              objectIds: toDeleteIds,
              description: `Xóa ${toDeleteNames}`,
            },
          ],
        };
      } else {
        return {
          replyText: `Chưa thể xóa: ${resolvedContext.reason}\n\nBạn có thể chỉ rõ tên đồ vật cần xóa (ví dụ: "Xóa giường", "Xóa bàn học").`,
        };
      }
    }

    // B. Multi-item lexical deletion: "Xóa giường, tủ quần áo, cây"
    const itemsToDelete = (classified.extractedItems && classified.extractedItems.length > 0)
      ? classified.extractedItems
      : [
          {
            type: classified.extractedObjectType || ('desk' as RoomObjectType),
            name: classified.extractedObjectName || 'đồ vật',
            quantity: classified.extractedQuantity || 1,
          },
        ];

    let currentObjects = [...objects];
    const allDeletedIds: string[] = [];
    const reports: string[] = [];

    for (const item of itemsToDelete) {
      const matching = currentObjects.filter((o) => o.type === item.type);
      const reqQty = item.quantity || 1;

      if (matching.length === 0) {
        reports.push(`• ${item.name}: ✕ FAILED (Không tìm thấy đồ vật này trong phòng ngủ)`);
        continue;
      }

      const qtyToDelete = itemsToDelete.length > 1 && reqQty === 1
        ? Math.min(matching.length, 1)
        : Math.min(matching.length, reqQty);

      const targets = matching.slice(0, qtyToDelete);
      const targetIds = targets.map((t) => t.id);

      allDeletedIds.push(...targetIds);
      currentObjects = currentObjects.filter((o) => !targetIds.includes(o.id));

      reports.push(`• ${item.name}: ✓ SUCCESS (Đã xóa thành công ${targets.length}/${matching.length})`);
    }

    const successCount = reports.filter((r) => r.includes('SUCCESS')).length;
    const totalCount = reports.length;

    let replyText = '';
    if (successCount === totalCount && totalCount > 0) {
      replyText = `Đã thực thi xóa thành công toàn bộ ${totalCount} loại đồ vật theo yêu cầu:\n\n${reports.join('\n')}\n\nMô hình 3D đã được cập nhật đồng bộ.`;
    } else if (successCount > 0) {
      replyText = `Kết quả thực thi yêu cầu xóa (${successCount}/${totalCount} loại thành công):\n\n${reports.join('\n')}\n\nMô hình 3D đã cập nhật các đồ vật được xóa thành công.`;
    } else {
      replyText = `Không thể thực hiện yêu cầu xóa:\n\n${reports.join('\n')}\n\nVui lòng kiểm tra lại danh sách đồ vật hiện có trong phòng.`;
    }

    return {
      replyText,
      actions: allDeletedIds.length > 0 ? [
        {
          type: 'delete_object',
          objectId: allDeletedIds[0],
          objectIds: allDeletedIds,
          description: `Xóa ${allDeletedIds.length} đồ vật`,
        },
      ] : undefined,
    };
  }

  // Fast path for MOVE_OBJECT / ROTATE_OBJECT with context reference
  if (classified.contextReference && (classified.intent === 'MOVE_OBJECT' || classified.intent === 'ROTATE_OBJECT')) {
    const resolvedContext = resolveContextTargets(
      classified.contextReference,
      actionHistory,
      objects,
      selectedObjectId
    );

    if (resolvedContext.resolved && resolvedContext.targetObjects.length > 0) {
      const target = resolvedContext.targetObjects[0];
      if (classified.intent === 'ROTATE_OBJECT') {
        const deg = classified.rotationDegrees || 90;
        const rad = (deg * Math.PI) / 180;
        return {
          replyText: `Đã xoay ${target.name} góc ${deg}° theo yêu cầu.`,
          actions: [
            {
              type: 'rotate_object',
              objectId: target.id,
              rotationDelta: rad,
              description: `Xoay ${target.name} ${deg}°`,
            },
          ],
        };
      } else if (classified.intent === 'MOVE_OBJECT') {
        const dir = classified.targetDirection || 'left';
        const shiftAmount = 0.5;
        const newX = dir === 'left' ? target.position.x - shiftAmount : dir === 'right' ? target.position.x + shiftAmount : target.position.x;
        const newZ = dir === 'forward' ? target.position.z - shiftAmount : dir === 'backward' ? target.position.z + shiftAmount : target.position.z;

        return {
          replyText: `Đã di chuyển ${target.name} sang ${dir === 'left' ? 'bên trái' : dir === 'right' ? 'bên phải' : dir === 'forward' ? 'phía trên' : 'phía dưới'} theo yêu cầu.`,
          actions: [
            {
              type: 'move_object',
              objectId: target.id,
              position: { x: Number(newX.toFixed(2)), z: Number(newZ.toFixed(2)) },
              description: `Di chuyển ${target.name}`,
            },
          ],
        };
      }
    }
  }

  // Remote Gemini Consultation Endpoint for conversational queries & feng shui advice
  try {
    const rawHistory = chatHistory || [];
    const slicedHistory = rawHistory.slice(-4);
    const historyMessages = slicedHistory.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      content: m.content,
    }));
    const messages = [
      ...historyMessages,
      { role: 'user', content: prompt },
    ];

    const localApiKey = typeof window !== 'undefined' ? (localStorage.getItem('gemini_api_key') || '').trim() : '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (localApiKey) {
      headers['x-gemini-api-key'] = localApiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        messages,
        intent: classified.intent,
        classified,
        actionHistory,
        userProfile: classified.needsFengShuiEngine ? userProfile : undefined,
        roomConfig,
        objects,
        ruleEngineResult: classified.needsFengShuiEngine ? evaluation : undefined,
        selectedObjectId,
        apiKey: localApiKey || undefined,
      }),
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return {
          replyText: data.reply || data.replyText || 'Đã phân tích căn phòng.',
          actions: data.aiActions?.actions || data.actions,
          proposal: data.optimizationProposal || data.proposal,
          proposedAdjustment: data.proposedAdjustment,
          isGeminiOnline: Boolean(data.isGeminiOnline),
        };
      }
    }
  } catch (_e) {
    // Offline, timeout or server error -> fall back to local intent parser
  }

  // Build scene state snapshot and delegate to intent parser
  const sceneState = buildSceneState(roomConfig, objects);
  const intentResult: AIIntentResult = parseIntent(prompt, sceneState, userProfile, evaluation, selectedObjectId);

  // Convert AIIntentResult → FengShuiConsultationResult (backward-compatible)
  if (intentResult.commands.length === 0 || intentResult.requiresClarification) {
    return { replyText: intentResult.replyText };
  }

  // Convert SceneCommands → legacy AIActionCommand[] so existing UI still works
  const actions: AIActionCommand[] = [];
  for (const cmd of intentResult.commands) {
    if (cmd.action === 'delete_object') {
      const dc = cmd as DeleteCommand;
      // Single action with objectIds array — handled atomically by batch handler
      actions.push({
        type: 'delete_object',
        objectId: dc.object_ids[0],
        objectIds: dc.object_ids,
        description: cmd.reason,
      } as any);
    } else if (cmd.action === 'move_object') {
      const mc = cmd as MoveCommand;
      const execOut = executeSceneCommand(cmd, objects, roomConfig);
      const moved = execOut.updatedObjects.find((o) => o.id === mc.object_id);
      if (moved) {
        actions.push({
          type: 'move_object',
          objectId: mc.object_id,
          position: { x: moved.position.x, z: moved.position.z },
          description: cmd.reason,
        });
      }
    } else if (cmd.action === 'rotate_object') {
      const rc = cmd as RotateCommand;
      actions.push({
        type: 'rotate_object',
        objectId: rc.object_id,
        rotationDelta: (rc.rotation.degrees * Math.PI) / 180,
        description: cmd.reason,
      });
    } else if (cmd.action === 'add_object') {
      const ac = cmd as AddCommand;
      const dims = ac.dimensions || { width: 1.2, length: 1.9, height: 0.85 };
      const placement = findSmartPlacement(ac.object_type, dims, objects, roomConfig);
      const safePos = placement.resolved ? placement.safePos : { x: 0, z: -1.0 };
      const effectiveDims = {
        width: placement.dimensions.width,
        length: placement.dimensions.length,
        height: placement.dimensions.height || 0.85,
      };
      const newId = `${ac.object_type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      actions.push({
        type: 'add_object',
        objectId: newId,
        objectType: ac.object_type as any,
        name: ac.object_name,
        dimensions: effectiveDims,
        position: safePos,
        rotationY: placement.rotationY,
        description: cmd.reason,
      });
    }
  }

  return { replyText: intentResult.replyText, actions: actions.length > 0 ? actions : undefined };
}

/**
 * Generates an Evidence-Based Deep Feng Shui Report from actual 3D scene data.
 */
export async function generateDeepFengShuiReport(
  userProfile: UserFengShuiProfile,
  roomConfig: RoomConfig,
  objects: RoomObject[],
  evaluation: FengShuiRoomEvaluation
): Promise<DeepFengShuiReportData> {
  const door = objects.find((o) => o.type === 'door');
  const windowObj = objects.find((o) => o.type === 'window');
  const wc = objects.find((o) => o.type === 'wc');
  const bed = objects.find((o) => o.type === 'bed');

  const halfW = roomConfig.width / 2;
  const halfL = roomConfig.length / 2;

  // Build exact geometric evidence for all objects
  const objectDetails: DetailedObjectEvidence[] = objects.map((obj) => {
    const itemEval = evaluation.items.find((i) => i.objectId === obj.id);

    const distToDoor = door ? Math.round(getFloorDistance(obj.position, door.position) * 10) / 10 : undefined;
    const distToWindow = windowObj ? Math.round(getFloorDistance(obj.position, windowObj.position) * 10) / 10 : undefined;
    const distToWc = wc ? Math.round(getFloorDistance(obj.position, wc.position) * 10) / 10 : undefined;

    const rotDeg = Math.round(((obj.rotation.y * 180) / Math.PI + 360) % 360);
    const coordsStr = `X: ${obj.position.x >= 0 ? '+' : ''}${obj.position.x.toFixed(2)}m, Z: ${obj.position.z >= 0 ? '+' : ''}${obj.position.z.toFixed(2)}m`;
    const dimsStr = `${Math.round(obj.dimensions.width * 100)} × ${Math.round(obj.dimensions.length * 100)} × ${Math.round(obj.dimensions.height * 100)} cm`;

    let solidWall = false;
    if (obj.type === 'bed') {
      const minDist = Math.min(
        Math.abs(obj.position.x - (-halfW)),
        Math.abs(obj.position.x - halfW),
        Math.abs(obj.position.z - (-halfL)),
        Math.abs(obj.position.z - halfL)
      );
      solidWall = minDist <= 0.45;
    }

    let mirrorDirectView = false;
    if (obj.type === 'mirror' && bed) {
      mirrorDirectView = Boolean(itemEval?.hasDirectConflict || Math.abs(obj.position.z - bed.position.z) < 1.4);
    }

    return {
      objectId: obj.id,
      objectName: obj.name,
      type: obj.type,
      coords: coordsStr,
      rotationDeg: rotDeg,
      dimensions: dimsStr,
      sector: itemEval?.sectorName || itemEval?.sector || 'Trung Cung',
      score: itemEval?.score || 80,
      status: itemEval?.status || 'good',
      distToDoor,
      distToWindow,
      distToWc,
      mirrorDirectView,
      solidWall,
      pros: itemEval?.pros || ['Bố trí hài hòa với tổng thể không gian'],
      issues: itemEval?.issues || [],
      recommendation: itemEval?.recommendation || 'Giữ nguyên vị trí hiện tại để bảo toàn trường khí ổn định.',
    };
  });

  // Try calling server endpoint for enhanced deep analysis text
  try {
    const res = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userProfile,
        roomConfig,
        objects,
        ruleEngineResult: evaluation,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.data) {
        return {
          summary: data.data.summary || 'Trường khí căn phòng tương đối hài hòa với bản mệnh gia chủ.',
          verdict: data.data.verdict || evaluation.statusText,
          overallScore: evaluation.overallScore,
          qiAnalysis: data.data.qiAnalysis || 'Dòng năng lượng lưu thông êm dịu, cần lưu ý điểm tựa đầu giường và hướng phản chiếu gương.',
          objectDetails,
          topIssues: evaluation.keyIssues.slice(0, 3),
          recommendations: evaluation.cures.slice(0, 3),
          masterAdvice: data.data.masterAdvice || 'Nên ưu tiên củng cố thế Tọa Sơn cho đầu giường để gia tăng sự an định trong tâm trí.',
          recommendedAction: data.data.recommendedAction || 'Dịch chuyển đầu giường tựa sát tường phía Bắc và xoay gương tránh chiếu vào giường.',
        };
      }
    }
  } catch (_e) {
    // Offline mode
  }

  return {
    summary: `Phòng ngủ của gia chủ sinh năm ${userProfile.birthYear} (${userProfile.gender === 'female' ? 'Nữ' : 'Nam'}, Quái ${userProfile.guaName} - ${userProfile.element}) đạt ${evaluation.overallScore}/100 điểm (${evaluation.statusText}).`,
    verdict: evaluation.statusText,
    overallScore: evaluation.overallScore,
    qiAnalysis: `Trường khí căn phòng rộng ${roomConfig.width}m × ${roomConfig.length}m tiếp nhận sinh khí tốt từ hướng chính. Tuy nhiên cần tối ưu hóa vị trí kê đầu giường tựa vách kiên cố và triệt tiêu góc chiếu của gương để đạt thế Tàng Phong Tụ Khí trọn vẹn.`,
    objectDetails,
    topIssues: evaluation.keyIssues.length > 0 ? evaluation.keyIssues.slice(0, 3) : ['Chưa có xung sát nghiêm trọng'],
    recommendations: evaluation.cures.length > 0 ? evaluation.cures.slice(0, 3) : ['Bố trí hiện tại đã tương đối cát lợi'],
    masterAdvice: `Với bản mệnh ${userProfile.guaName} ${userProfile.element} thuộc Tây Tứ Mệnh, giường ngủ và bàn học nên ưu tiên tọa lạc tại các cung Tây, Tây Nam, Tây Bắc hoặc Đông Bắc để tiếp nhận năng lượng tương sinh mạnh nhất.`,
    recommendedAction: 'Áp dụng phương án bố trí tự động của AI để tối ưu hóa đồng bộ tất cả đồ vật trong phòng.',
  };
}
