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
import { evaluateIntentSafety } from '../services/intentGuard.js';

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

    let localApiKey = '';
    if (typeof window !== 'undefined') {
      localApiKey = (sessionStorage.getItem('gemini_api_key') || '').trim();
      if (!localApiKey) {
        const legacyKey = (localStorage.getItem('gemini_api_key') || '').trim();
        if (legacyKey) {
          sessionStorage.setItem('gemini_api_key', legacyKey);
          localStorage.removeItem('gemini_api_key');
          localApiKey = legacyKey;
        }
      }
    }
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
  // Offline fallback (when remote Gemini API call is unreachable or fails)
  // P7 Security Guard: Client offline fallback CANNOT execute write actions on 3D scene
  const isWriteIntent = [
    'ADD_OBJECT',
    'DELETE_OBJECT',
    'MOVE_OBJECT',
    'ROTATE_OBJECT',
    'OPTIMIZE_ROOM',
  ].includes(classified.intent);

  if (isWriteIntent) {
    return {
      replyText: 'Hệ thống đang ở chế độ ngoại tuyến (offline) hoặc không thể kết nối tới máy chủ an toàn. Để bảo vệ mô hình 3D và đảm bảo tính nhất quán dữ liệu, các thao tác thay đổi trực tiếp (thêm, xóa, di chuyển, xoay, tối ưu) chỉ được thực thi thông qua Server Guard và Transaction Manager khi máy chủ hoạt động. Bạn vẫn có thể tra cứu lý thuyết phong thủy và xem báo cáo hiện tại.',
      isGeminiOnline: false,
    };
  }

  // Safe read-only consultation in offline mode
  const sceneState = buildSceneState(roomConfig, objects);
  const intentResult: AIIntentResult = parseIntent(prompt, sceneState, userProfile, evaluation, selectedObjectId);

  return {
    replyText: intentResult.replyText || 'Hệ thống ngoại tuyến hiện hỗ trợ tư vấn lý thuyết phong thủy Bát Trạch và phân tích tổng quan.',
    isGeminiOnline: false,
  };
}

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
