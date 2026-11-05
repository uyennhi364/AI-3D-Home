import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { generateOptimizedLayout } from './src/engine/layoutOptimizer';
import { resolveSafePlacement, validatePlacementSafety, findSmartPlacement } from './src/engine/geometryEngine';
import { extractAllActionItems, detectContextReference } from './src/engine/intentClassifier';
import { resolveContextTargets } from './src/engine/contextResolver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load both .env.local (preferred by AI Studio / Vite) and .env
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

/**
 * Helper to obtain an active GoogleGenAI client from either:
 * 1. Request header 'x-gemini-api-key' or body 'apiKey' (configured from UI)
 * 2. Server environment GEMINI_API_KEY (.env.local or .env)
 */
function getGenAIClient(customKey?: string): GoogleGenAI | null {
  const key = (customKey || process.env.GEMINI_API_KEY || '').trim();
  if (!key || key.includes('MY_GEMINI_API_KEY')) {
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Could not initialize GoogleGenAI with key:', err);
    return null;
  }
}

const FURNITURE_DEFAULTS: Record<string, { width: number; length: number; height: number; name: string }> = {
  bed: { width: 1.6, length: 2.0, height: 0.95, name: 'Giường ngủ' },
  desk: { width: 1.3, length: 0.65, height: 0.75, name: 'Bàn làm việc' },
  chair: { width: 0.55, length: 0.55, height: 0.85, name: 'Ghế' },
  wardrobe: { width: 1.8, length: 0.6, height: 2.2, name: 'Tủ quần áo' },
  mirror: { width: 0.55, length: 0.15, height: 1.65, name: 'Gương soi' },
  plant: { width: 0.5, length: 0.5, height: 0.9, name: 'Cây xanh' },
  nightstand: { width: 0.5, length: 0.45, height: 0.5, name: 'Táp đầu giường' },
  sofa: { width: 1.6, length: 0.8, height: 0.75, name: 'Sofa' },
  table: { width: 0.8, length: 0.8, height: 0.5, name: 'Bàn' },
  bookshelf: { width: 1.0, length: 0.35, height: 1.8, name: 'Kệ sách' },
  tv: { width: 1.2, length: 0.2, height: 0.8, name: 'Kệ Tivi' },
  lamp: { width: 0.35, length: 0.35, height: 0.5, name: 'Đèn ngủ' },
  wc: { width: 1.4, length: 1.6, height: 2.1, name: 'Phòng WC khép kín' },
  rug: { width: 2.0, length: 1.6, height: 0.02, name: 'Thảm trải sàn' },
};

const FENG_SHUI_SYSTEM_PROMPT = `Bạn là một AI Assistant duy nhất, đa năng, chuyên nghiệp và thân thiện. Bạn giao tiếp trực tiếp với người dùng bằng tiếng Việt tự nhiên (trừ khi người dùng yêu cầu ngôn ngữ khác).

MỤC TIÊU:
Bạn vừa là trợ lý kiến thức tổng quát, vừa là chuyên gia tư vấn phong thủy Bát Trạch, kiến trúc sư nội thất và trợ lý điều khiển phòng ngủ 3D. Không được giới hạn mọi câu hỏi vào chủ đề phòng ngủ.

PHÂN LOẠI VÀ XỬ LÝ YÊU CẦU:
1. Câu hỏi kiến thức tổng quát, công nghệ, học tập, đời sống hoặc chủ đề bên ngoài: trả lời trực tiếp như một trợ lý AI tổng quát. Không từ chối chỉ vì câu hỏi không liên quan đến phòng ngủ.
2. Câu hỏi phong thủy: giải thích rõ nguyên tắc, giả định và mức độ chắc chắn. Phân biệt quan niệm phong thủy truyền thống với kiến thức khoa học đã được kiểm chứng; không khẳng định phong thủy có thể bảo đảm sức khỏe, tài lộc hay kết quả tương lai.
3. Câu hỏi thiết kế nội thất: cân nhắc kích thước, công năng, lối đi, ánh sáng, thông gió, thẩm mỹ và thông tin thực tế của căn phòng.
4. Câu hỏi về căn phòng hiện tại: ưu tiên dùng dữ liệu BỐI CẢNH PHÒNG được cung cấp. Không tự bịa đồ vật, kích thước, tọa độ, hướng cửa hoặc kết quả đánh giá.
5. Yêu cầu thay đổi mô hình 3D: chỉ tạo hành động khi xác định được đối tượng và ý định đủ rõ.
6. Yêu cầu tối ưu toàn bộ căn phòng: sử dụng công cụ optimize_room_layout để kích hoạt bộ máy tối ưu bố cục.

QUY TẮC HỘI THOẠI & ĐIỀU KHIỂN 3D:
- Khi người dùng yêu cầu thêm đồ vật, di chuyển, xoay, xóa hoặc tối ưu hóa phòng ngủ 3D, bạn BẮT BUỘC phải gọi công cụ (tool) tương ứng (add_furniture, move_furniture, rotate_furniture, delete_furniture, optimize_room_layout, undo_last_action).
- Đặc biệt khi người dùng yêu cầu thêm đồ vật có kích thước rõ ràng (ví dụ: "giường đôi 1m6" -> width: 1.6, length: 2.0; "giường đơn 1m2" -> width: 1.2, length: 2.0; "giường 1m8" -> width: 1.8), hãy truyền chính xác các tham số width và length vào tool add_furniture.
- TUYỆT ĐỐI KHÔNG tự tuyên bố trong câu trả lời ban đầu rằng bạn đã thêm hay thay đổi mô hình 3D nếu chưa nhận được kết quả (functionResponse) từ hệ thống.
- Sau khi hệ thống thực thi công cụ và trả về kết quả:
  + Nếu kết quả báo thành công (status: SUCCESS): giải thích ngắn gọn vị trí đồ vật và ý nghĩa bố trí phong thủy.
  + Nếu kết quả báo thất bại (status: FAILED): giải thích trung thực lý do cho gia chủ (ví dụ phòng quá chật, hết chỗ an toàn hoặc va chạm) và đề xuất phương án giải quyết (ví dụ xóa bớt đồ hoặc thu nhỏ kích thước).`;

/**
 * Intelligent Offline Feng Shui Analysis Generator (Local AI Rule Engine)
 * Generates expert-grade structured reports when Gemini API Key is not set or network fails.
 */
function generateLocalFengShuiAnalysis(userProfile: any, roomConfig: any, objects: any[], ruleEngineResult: any) {
  const score = ruleEngineResult.overallScore;
  const issues = ruleEngineResult.keyIssues || [];
  const bed = objects.find((o: any) => o.type === 'bed');
  const mirror = objects.find((o: any) => o.type === 'mirror');
  const desk = objects.find((o: any) => o.type === 'desk');

  const verdict =
    score >= 85 ? 'Tuyệt hảo' : score >= 75 ? 'Rất tốt' : score >= 60 ? 'Cần điều chỉnh' : 'Phạm hung hiểm';

  const objectDetails: any[] = [];

  if (bed) {
    const bedEval = ruleEngineResult.items.find((i: any) => i.objectId === bed.id);
    objectDetails.push({
      objectId: bed.id,
      objectName: bed.name,
      verdict: bedEval?.status === 'good' ? 'Tốt' : 'Cần chú ý',
      explanation: bedEval?.issues?.length
        ? `Giường ngủ hiện tại gặp xung sát: ${bedEval.issues.join(', ')}. Đầu giường cần tựa vững chãi vào tường kiên cố để tụ khí, tránh đón luồng xung khí trực diện.`
        : `Giường ngủ tọa lạc tại cung vị cát lợi (${bedEval?.sectorName || 'Sinh Khí'}), nạp trọn vượng khí của bản mệnh ${userProfile.guaName} ${userProfile.element}.`,
      remedy: bedEval?.issues?.length
        ? 'Dịch chuyển giường áp sát vào diện tường vững chãi, tránh đối diện trực tiếp cửa đi hoặc cửa nhà vệ sinh.'
        : 'Tiếp tục duy trì khoảng thông thủy 50-60cm hai bên thành giường để khí trường lưu thông êm dịu.',
    });
  }

  if (mirror) {
    const mirrorEval = ruleEngineResult.items.find((i: any) => i.objectId === mirror.id);
    const facingBed = mirrorEval?.issues?.some((is: string) => is.toLowerCase().includes('giường'));
    objectDetails.push({
      objectId: mirror.id,
      objectName: mirror.name,
      verdict: facingBed ? 'Xấu' : 'Tốt',
      explanation: facingBed
        ? 'Gương soi chiếu thẳng vào giường ngủ là đại kỵ trong phong thủy Bát Trạch (quang sát), phản xạ năng lượng tán loạn khiến giấc ngủ chập chờn, bất an, hao tổn nguyên thần.'
        : 'Gương bố trí tại vị trí an toàn, không phản chiếu giường ngủ hay cửa ra vào, tạo cảm giác mở rộng không gian thanh lịch.',
      remedy: facingBed
        ? 'Xoay mặt gương 90 độ sang diện tường bên cạnh hoặc bố trí giấu mặt gương vào phía trong cánh tủ quần áo.'
        : 'Giữ mặt gương sạch sẽ, có thể điểm xuyết chậu cây xanh nhỏ bên cạnh để điều hòa khí trường.',
    });
  }

  if (desk) {
    const deskEval = ruleEngineResult.items.find((i: any) => i.objectId === desk.id);
    objectDetails.push({
      objectId: desk.id,
      objectName: desk.name,
      verdict: deskEval?.status === 'good' ? 'Tốt' : 'Cần chú ý',
      explanation: deskEval?.issues?.length
        ? `Bàn học/làm việc chưa tối ưu do: ${deskEval.issues.join(', ')}. Người ngồi học cần thế "Tọa sơn quan thủy" (lưng tựa tường vững, mắt bao quát được cửa vào).`
        : `Bàn học đặt tại cung vị vượng trí tuệ (${deskEval?.sectorName || 'Thiên Y/Phục Vị'}), giúp tinh thần hanh thông, tập trung minh mẫn.`,
      remedy: 'Kê bàn tựa lưng vào tường, hướng mặt nhìn ra hướng cát Sinh Khí hoặc Thiên Y.',
    });
  }

  return {
    summary: `Phòng ngủ kích thước ${roomConfig.width}m × ${roomConfig.length}m của gia chủ mệnh ${userProfile.guaName} (${userProfile.element} - ${userProfile.group}) đạt điểm số ${score}/100. Không gian có tiềm năng phong thủy rất lớn sau khi hóa giải ${issues.length || 'các'} điểm bất lợi.`,
    verdict,
    qiAnalysis: `Trường khí căn phòng chịu ảnh hưởng mạnh bởi trục hướng ${roomConfig.direction}. Khi luồng khí từ cửa nạp vào phòng, việc bố trí giường và gương đóng vai trò cốt lõi để giữ vượng khí lắng đọng (Tàng phong tụ khí), tránh tạo các luồng khí xung cắt gây hao tổn sức khỏe gia chủ.`,
    objectDetails,
    masterAdvice: `Với bản mệnh ${userProfile.guaName} (${userProfile.element}), nên ưu tiên tận dụng các hướng Cát (${userProfile.auspiciousDirections.join(', ')}) cho đầu giường và bàn làm việc. Giữ không gian thông thoáng, ánh sáng ấm dịu để nạp năng lượng bình an mỗi ngày.`,
    recommendedAction: issues.length > 0 ? issues[0] : 'Sử dụng tính năng "Tối ưu giúp tôi" để AI tự động sắp đặt vị trí cát lợi hoàn hảo nhất!',
  };
}

function extractLocalQuantity(text: string): number {
  const t = text.toLowerCase();
  const digitRegex = /(?:xóa|bỏ|thêm|đặt|tạo|di chuyển|xoay)?\s*(\d+)\s*(?:cái|chiếc|chậu|cây|bộ|cặp|món|bàn|ghế|đèn|giường|tủ|gương)?/i;
  const digitMatch = t.match(digitRegex);
  if (digitMatch && digitMatch[1]) {
    const parsed = parseInt(digitMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 20) return parsed;
  }
  const words: Array<{ word: string; num: number }> = [
    { word: 'mười', num: 10 },
    { word: 'chín', num: 9 },
    { word: 'tám', num: 8 },
    { word: 'bảy', num: 7 },
    { word: 'sáu', num: 6 },
    { word: 'năm', num: 5 },
    { word: 'bốn', num: 4 },
    { word: 'tư', num: 4 },
    { word: 'ba', num: 3 },
    { word: 'hai', num: 2 },
    { word: 'một', num: 1 },
  ];
  for (const { word, num } of words) {
    const rx = new RegExp(`(^|\\s|[.,;!?])${word}(\\s|[.,;!?]|$)`, 'i');
    if (rx.test(t)) return num;
  }
  if (t.includes('cặp') || (t.includes('đôi') && !t.includes('giường đôi') && !t.includes('giuong doi'))) {
    return 2;
  }
  return 1;
}

/**
 * Intelligent Offline Conversational AI (Natural Language Command Parser + Layout Optimizer)
 * Handles any free-form question about the room or feng shui when Gemini API is unavailable.
 */
function handleLocalAIChat(userText: string, userProfile: any, roomConfig: any, objects: any[], ruleEngineResult: any, selectedObjectId: string | null, actionHistory: any[] = []) {
  const lower = userText.toLowerCase().trim();
  const halfW = roomConfig.width / 2;
  const halfL = roomConfig.length / 2;

  // 00. Undo request (works without Gemini): the client executes 'undo_action' against its history stack
  if (/(^|\s)(undo|hoàn tác|hoàn lại|khôi phục|quay lại như cũ|trở lại như cũ|như lúc trước|bỏ thao tác|huỷ thao tác|hủy thao tác)/.test(lower)) {
    return {
      reply: 'Tôi sẽ hoàn tác thao tác gần nhất trên mô hình 3D. Nếu không còn thao tác nào để hoàn tác, hệ thống sẽ báo cho bạn.',
      aiActions: { actions: [{ type: 'undo_action', description: 'Hoàn tác thao tác trước đó' }] },
    };
  }

  // 0. "Hiển thị / Liệt kê / Cho biết / Có những gì" — list room objects
  if (
    lower.includes('hiển thị') || lower.includes('liệt kê') || lower.includes('có gì') ||
    lower.includes('có những gì') || lower.includes('danh sách') || lower.includes('cho biết') ||
    (lower.includes('đồ vật') && (lower.includes('trong phòng') || lower.includes('hiện có') || lower.includes('hiện tại'))) ||
    lower.includes('có bao nhiêu') || lower.includes('những đồ') || lower.includes('trong phòng có')
  ) {
    if (objects.length === 0) {
      return { reply: 'Hiện tại phòng ngủ của bạn chưa có đồ vật nào. Bạn có thể dùng thư viện nội thất ở phía dưới để thêm giường, bàn, gương...' };
    }
    const objectList = objects.map((o: any, i: number) => {
      const rot = Math.round((o.rotation.y * 180) / Math.PI);
      return `${i + 1}. **${o.name}** (${o.type})\n   • Vị trí: X=${o.position.x.toFixed(2)}m, Z=${o.position.z.toFixed(2)}m\n   • Kích thước: ${o.dimensions.width}m × ${o.dimensions.length}m × ${o.dimensions.height}m\n   • Góc xoay: ${rot}°`;
    }).join('\n\n');
    return {
      reply: `Phòng ngủ hiện tại có **${objects.length} đồ vật**:\n\n${objectList}\n\nĐiểm phong thủy tổng thể: **${ruleEngineResult.overallScore}/100** (${ruleEngineResult.statusText}).`,
    };
  }

  // 0b. "Điểm phong thủy / Đánh giá"
  if (
    lower.includes('điểm phong thủy') || lower.includes('bao nhiêu điểm') ||
    lower.includes('đánh giá phòng') || lower.includes('tổng điểm') || lower.includes('điểm số')
  ) {
    const issues = ruleEngineResult.keyIssues || [];
    return {
      reply: `**Điểm phong thủy hiện tại: ${ruleEngineResult.overallScore}/100** — ${ruleEngineResult.statusText}.\n\n${issues.length > 0 ? `**Các vấn đề phát hiện:**\n${issues.map((is: string, i: number) => `${i + 1}. ${is}`).join('\n')}` : 'Không có xung sát nghiêm trọng.'}\n\nBạn có muốn tôi **tối ưu tự động** để nâng điểm không?`,
    };
  }

  // 0c. "Thông tin gia chủ / Quái mệnh"
  if (
    lower.includes('quái mệnh') || lower.includes('bản mệnh') || lower.includes('thông tin gia chủ') ||
    lower.includes('sinh năm') || lower.includes('mệnh của tôi') || lower.includes('hướng tốt') || lower.includes('hướng xấu')
  ) {
    return {
      reply: `**Thông tin gia chủ:**\n• Năm sinh: ${userProfile.birthYear} (${userProfile.gender === 'male' ? 'Nam' : 'Nữ'})\n• Quái mệnh: **${userProfile.guaName}** — Ngũ hành: **${userProfile.element}**\n• Nhóm: ${userProfile.group}\n\n**Hướng cát (tốt):** ${userProfile.auspiciousDirections?.join(', ') || 'N/A'}\n**Hướng hung (xấu):** ${userProfile.inauspiciousDirections?.join(', ') || 'N/A'}\n\nĐầu giường và bàn làm việc nên hướng về các hướng cát để tối ưu vượng khí.`,
    };
  }

  // 1. Command: "Tối ưu phòng" / "Tối ưu giúp tôi" / "Tối ưu"
  if (lower.includes('tối ưu') || lower.includes('optimize') || lower.includes('sắp xếp lại')) {
    const { proposal, optimizedObjects } = generateOptimizedLayout(
      userProfile,
      roomConfig,
      objects,
      ruleEngineResult
    );

    const improvementList = proposal.improvements.map((imp: string, i: number) => `${i + 1}. ${imp}`).join('\n');
    const replyText = `Tôi đã sử dụng Layout Optimization Engine để phân tích toàn bộ ${objects.length} đồ vật trong phòng ${roomConfig.width}m × ${roomConfig.length}m của gia chủ mệnh ${userProfile.guaName} (${userProfile.element} - ${userProfile.group}).

Đề xuất phương án tối ưu hình học & phong thủy:
• Điểm phong thủy: nâng từ **${proposal.beforeScore}** lên **${proposal.afterScore}/100**
${improvementList ? `\nCác cải tiến chính:\n${improvementList}` : ''}

Bạn có thể bấm **Xem trước** để xem bóng mờ 3D hoặc bấm **Áp dụng** để cập nhật toàn bộ vị trí mới!`;

    return {
      reply: replyText,
      aiActions: {
        actions: [
          {
            type: 'optimize_room',
            description: 'Tối ưu toàn bộ bố cục phòng ngủ',
            adjustments: proposal.adjustments,
          },
        ],
        optimizationProposal: proposal,
      },
      proposedAdjustment: proposal.adjustments[0] || null,
      optimizationProposal: proposal,
    };
  }

  // 2. Command: Multi-Action Add Furniture (e.g., "Thêm giường, tủ quần áo, nhà vệ sinh, bàn học")
  // CRITICAL: Guard against "xóa bàn vừa mới thêm" accidentally matching 'thêm'
  const isDeleteCommandServer = lower.includes('xóa') || lower.includes('bỏ đi') || lower.includes('loại bỏ') || lower.includes('gỡ bỏ') || lower.includes('delete') || lower.includes('gỡ');
  const isRecentReferenceServer = /(vừa|mới|vừa\s*mới|đã)\s*thêm/.test(lower);

  if (!isDeleteCommandServer && !isRecentReferenceServer && (lower.includes('thêm') || lower.includes('tạo') || lower.includes('đặt thêm') || lower.includes('mua thêm') || lower.includes('bổ sung'))) {
    const extractedItems = extractAllActionItems(lower);
    const itemsToAdd = extractedItems.length > 0 ? extractedItems : [
      {
        type: 'bed' as any,
        name: 'Giường ngủ',
        quantity: Math.max(1, Math.min(5, extractLocalQuantity(lower))),
        dimensions: { width: 1.6, length: 2.0, height: 0.95 },
      },
    ];

    const posX = lower.includes('trái') ? -Math.max(1.0, halfW - 1.2) : lower.includes('phải') ? Math.max(1.0, halfW - 1.2) : 0;
    const posZ = lower.includes('trên') || lower.includes('sau') ? -halfL + 1.0 : lower.includes('dưới') || lower.includes('trước') ? halfL - 1.2 : 0;
    const initialPos = { x: posX, z: posZ };
    const rConfig = { width: Number(roomConfig.width) || 5.0, length: Number(roomConfig.length) || 5.2 };

    const actions: any[] = [];
    const workingCurrentObjects = [...objects];
    const itemReports: Array<{ name: string; status: 'SUCCESS' | 'FAILED'; reason?: string }> = [];

    for (const item of itemsToAdd) {
      const type = item.type;
      const dims = item.dimensions || FURNITURE_DEFAULTS[type] || { width: 1.2, length: 0.8, height: 0.75, name: 'Đồ vật mới' };
      const name = item.name;
      const quantity = Math.max(1, Math.min(5, item.quantity || 1));

      // Architectural & plumbing constraint check for WC / Bathroom
      if (type === 'wc') {
        const hasExistingWc = workingCurrentObjects.some((o) => o.type === 'wc');
        if (hasExistingWc) {
          itemReports.push({
            name,
            status: 'FAILED',
            reason: 'Phòng ngủ hiện đã có sẵn khu vực WC Master khép kín cố định; không thể bố trí thêm nhà vệ sinh thứ 2 trong phòng ngủ do ràng buộc kỹ thuật cấp thoát nước và công năng.',
          });
          continue;
        }
      }

      let addedForItem = 0;
      for (let i = 0; i < quantity; i++) {
        const placement = findSmartPlacement(type, dims, workingCurrentObjects, rConfig, initialPos);
        if (!placement.resolved) break;

        const finalPos = placement.safePos;
        const finalDims = placement.dimensions;
        const finalRotY = placement.rotationY;
        const finalName = placement.adapted && type === 'bed' && !name.includes('đơn') ? `${name} (cỡ vừa)` : name;
        const itemTitle = quantity > 1 ? `${finalName} #${i + 1}` : finalName;
        const newId = `${type}_${Date.now()}_${actions.length}_${Math.floor(Math.random() * 1000)}`;

        const newAction = {
          type: 'add_object',
          objectId: newId,
          objectType: type,
          name: itemTitle,
          dimensions: finalDims,
          position: { x: Number(finalPos.x.toFixed(2)), y: 0, z: Number(finalPos.z.toFixed(2)) },
          rotationY: finalRotY,
          description: `Thêm ${itemTitle}`,
        };

        actions.push(newAction);
        workingCurrentObjects.push({
          id: newId,
          type,
          name: itemTitle,
          dimensions: finalDims,
          position: { x: finalPos.x, y: 0, z: finalPos.z },
          rotation: { x: 0, y: finalRotY, z: 0 },
        });

        addedForItem++;
      }

      if (addedForItem === quantity) {
        itemReports.push({
          name: quantity > 1 ? `${quantity} ${name}` : name,
          status: 'SUCCESS',
        });
      } else if (addedForItem > 0) {
        itemReports.push({
          name,
          status: 'SUCCESS',
          reason: `Chỉ thêm được ${addedForItem}/${quantity} do không gian an toàn bị giới hạn.`,
        });
      } else {
        itemReports.push({
          name,
          status: 'FAILED',
          reason: `Không tìm được vị trí an toàn cho ${name} (${dims.width}m × ${dims.length}m) mà không bị chồng lấn đồ nội thất khác hoặc chắn cửa ra vào.`,
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
      replyText = `Đã thực thi thành công toàn bộ ${totalCount} yêu cầu của gia chủ:\n\n${reportDetails}\n\nMô hình 3D đã được cập nhật an toàn, đảm bảo khoảng thông thủy di chuyển êm dịu.`;
    } else if (successCount > 0) {
      replyText = `Kết quả thực thi theo yêu cầu của gia chủ (${successCount}/${totalCount} thành công):\n\n${reportDetails}\n\nMô hình 3D đã được cập nhật đồng bộ các đồ vật hợp lệ.`;
    } else {
      replyText = `Không thể thực thi các yêu cầu:\n\n${reportDetails}\n\nGia chủ có thể dọn bớt đồ hoặc điều chỉnh kích thước để có đủ không gian.`;
    }

    return {
      reply: replyText,
      aiActions: actions.length > 0 ? { actions } : null,
    };
  }

  // 3. Command: "Xoay" (Xoay giường, xoay bàn, xoay 90 độ, xoay nó...)
  if (lower.includes('xoay') || lower.includes('rotate')) {
    let targetObj: any = null;

    // 1st priority: context reference ("nó", "đồ vật đó", "vừa điều chỉnh"...)
    const contextRef = detectContextReference(lower);
    if (contextRef) {
      const resolved = resolveContextTargets(contextRef, actionHistory, objects, selectedObjectId, roomConfig);
      if (resolved.resolved && resolved.targetObjects.length > 0) {
        targetObj = resolved.targetObjects[0];
      }
    }

    // 2nd priority: selected object
    if (!targetObj && selectedObjectId) {
      targetObj = objects.find((o: any) => o.id === selectedObjectId);
    }

    // 3rd priority: match name/type in prompt
    if (!targetObj) {
      const sortedByNameLen = [...objects].sort((a: any, b: any) => b.name.length - a.name.length);
      for (const o of sortedByNameLen) {
        if (lower.includes(o.name.toLowerCase()) || lower.includes(o.type.toLowerCase())) {
          targetObj = o;
          break;
        }
      }
    }

    if (!targetObj) {
      return {
        reply: 'Vui lòng cho biết đồ vật nào cần xoay. Ví dụ: "Xoay giường 90 độ", "Xoay tủ quần áo 180 độ", hoặc nhấp chọn đồ vật trên 3D.',
        aiActions: null,
      };
    }

    // Trích xuất góc xoay chính xác từ câu
    let deg = 90;
    const degMatch = lower.match(/(\d+)\s*(?:độ|degree|deg)/);
    if (degMatch) deg = Math.min(360, Math.max(1, parseInt(degMatch[1], 10)));
    else if (lower.includes('180')) deg = 180;
    else if (lower.includes('270')) deg = 270;
    else if (lower.includes('45')) deg = 45;

    const angle = (deg * Math.PI) / 180;
    const newRotDeg = Math.round(((targetObj.rotation?.y || 0) + angle) * 180 / Math.PI) % 360;

    return {
      reply: `Đã xoay **${targetObj.name}** ${deg}°. Góc xoay hiện tại: ${newRotDeg}°. Hướng đón khí trường mới giúp tối ưu trường khí trong phòng.`,
      aiActions: {
        actions: [
          {
            type: 'rotate_object',
            objectId: targetObj.id,
            rotationDelta: angle,
            description: `Xoay ${targetObj.name} ${deg}°`,
          },
        ],
      },
    };
  }

  // 4. Command: "Di chuyển" / "Dời" / "Kê" / "Dịch" / "Điều chỉnh"
  if (lower.includes('di chuyển') || lower.includes('kê') || lower.includes('dời') || lower.includes('dịch') || lower.includes('điều chỉnh')) {
    let targetObj: any = null;

    // 1st priority: context reference ("nó", "đồ vật đó", "vừa xoay"...)
    const contextRef = detectContextReference(lower);
    if (contextRef) {
      const resolved = resolveContextTargets(contextRef, actionHistory, objects, selectedObjectId, roomConfig);
      if (resolved.resolved && resolved.targetObjects.length > 0) {
        targetObj = resolved.targetObjects[0];
      }
    }

    // 2nd priority: selected object
    if (!targetObj && selectedObjectId) {
      targetObj = objects.find((o: any) => o.id === selectedObjectId);
    }

    // 3rd priority: match name/type in prompt (bỏ qua đồ vật sau vế "giữ nguyên")
    if (!targetObj) {
      // Tách vế giữ nguyên nếu có
      let actionPortion = lower;
      const keepMatch = lower.match(/(?:giữ\s*nguyên|cố\s*định|không\s*thay\s*đổi|không\s*đổi)\s+([^,;.]+?)(?:[,;]|\bvà\b|\bchỉ\b|\bnhưng\b|$)/i);
      if (keepMatch) {
        actionPortion = lower.replace(keepMatch[0], ' ');
      }

      const sortedByNameLen = [...objects].sort((a: any, b: any) => b.name.length - a.name.length);
      for (const o of sortedByNameLen) {
        if (actionPortion.includes(o.name.toLowerCase()) || actionPortion.includes(o.type.toLowerCase())) {
          targetObj = o;
          break;
        }
      }
      // Fallback nếu không thấy trong actionPortion
      if (!targetObj) {
        for (const o of sortedByNameLen) {
          if (lower.includes(o.name.toLowerCase()) || lower.includes(o.type.toLowerCase())) {
            targetObj = o;
            break;
          }
        }
      }
    }

    if (!targetObj) {
      return {
        reply: 'Vui lòng cho biết đồ vật nào cần di chuyển. Ví dụ: "Di chuyển giường sang trái 50cm", "Dời tủ sát tường", hoặc nhấp chọn đồ vật trên 3D.',
        aiActions: null,
      };
    }

    let newX = targetObj.position.x;
    let newZ = targetObj.position.z;

    // Trích xuất khoảng cách cm/m từ câu (ví dụ: "50 cm", "0.5m", "1m", "một chút")
    let shiftAmount = 0.5; // mặc định 50cm nếu không có số cụ thể
    const cmMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*cm/);
    const mMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*m(?!ét)/);
    if (cmMatch) shiftAmount = parseFloat(cmMatch[1].replace(',', '.')) / 100;
    else if (mMatch) shiftAmount = parseFloat(mMatch[1].replace(',', '.'));
    else if (lower.includes('một chút') || lower.includes('một ít') || lower.includes('nhẹ') || lower.includes('nhích')) shiftAmount = 0.3;
    else if (lower.includes('nhiều') || lower.includes('xa')) shiftAmount = 1.0;

    // Áp dụng hướng di chuyển
    if (lower.includes('trái') || lower.includes('bên trái')) {
      newX = Math.max(-halfW + (targetObj.dimensions?.width || 0.5) / 2 + 0.1, newX - shiftAmount);
    } else if (lower.includes('phải') || lower.includes('bên phải')) {
      newX = Math.min(halfW - (targetObj.dimensions?.width || 0.5) / 2 - 0.1, newX + shiftAmount);
    } else if (lower.includes('lên') || lower.includes('phía trên') || lower.includes('về phía trước')) {
      newZ = Math.max(-halfL + (targetObj.dimensions?.length || 0.5) / 2 + 0.1, newZ - shiftAmount);
    } else if (lower.includes('xuống') || lower.includes('phía dưới') || lower.includes('về phía sau')) {
      newZ = Math.min(halfL - (targetObj.dimensions?.length || 0.5) / 2 - 0.1, newZ + shiftAmount);
    }

    // Vị trí đặc biệt
    if (lower.includes('sát tường') || lower.includes('tựa tường')) {
      newZ = -halfL + (targetObj.dimensions?.length || 1) / 2 + 0.1;
    } else if (lower.includes('cửa sổ')) {
      newX = halfW - (targetObj.dimensions?.width || 1) / 2 - 0.2;
    } else if (lower.includes('giữa') || lower.includes('trung tâm')) {
      newX = 0; newZ = 0;
    } else if (lower.includes('góc trái')) {
      newX = -halfW + (targetObj.dimensions?.width || 1) / 2 + 0.1;
      newZ = -halfL + (targetObj.dimensions?.length || 1) / 2 + 0.1;
    } else if (lower.includes('góc phải')) {
      newX = halfW - (targetObj.dimensions?.width || 1) / 2 - 0.1;
      newZ = -halfL + (targetObj.dimensions?.length || 1) / 2 + 0.1;
    }

    const finalX = Math.round(newX * 100) / 100;
    const finalZ = Math.round(newZ * 100) / 100;

    return {
      reply: `Đã di chuyển **${targetObj.name}** đến tọa độ [X=${finalX}m, Z=${finalZ}m]. Vị trí mới giúp căn phòng thông thoáng, tăng cường khoảng tụ khí.`,
      aiActions: {
        actions: [
          {
            type: 'move_object',
            objectId: targetObj.id,
            position: { x: finalX, z: finalZ },
            description: `Di chuyển ${targetObj.name} sang vị trí mới`,
          },
        ],
      },
    };
  }

  // 5. Command: Multi-Item & Context-Aware Delete (e.g. "Xóa giường, tủ quần áo, cây", "Xóa những cái vừa tạo")
  if (lower.includes('xóa') || lower.includes('bỏ') || lower.includes('delete') || lower.includes('gỡ') || lower.includes('loại bỏ')) {
    // 5A. Context-Aware Reference Deletion ("Xóa những cái vừa tạo", "Xóa chiếc giường vừa thêm", "Xóa cái thứ 2"...)
    const contextRef = detectContextReference(lower);
    if (contextRef) {
      const resolved = resolveContextTargets(contextRef, actionHistory, objects, selectedObjectId, roomConfig);
      if (resolved.resolved && resolved.targetObjects.length > 0) {
        const targetIds = resolved.targetObjects.map((o: any) => o.id);
        const targetNames = resolved.targetObjects.map((o: any) => o.name).join(', ');
        const reports = resolved.targetObjects.map((o: any) => `• ${o.name}: ✓ SUCCESS (Đã xóa thành công)`);

        return {
          reply: `Đã thực thi yêu cầu xóa theo ngữ cảnh:\n\n${reports.join('\n')}\n\nĐã xóa toàn bộ ${targetIds.length} đồ vật phù hợp khỏi không gian 3D.`,
          aiActions: {
            actions: [
              {
                type: 'delete_object',
                objectId: targetIds[0],
                objectIds: targetIds,
                description: `Xóa ${targetNames}`,
              },
            ],
          },
        };
      } else {
        return {
          reply: `Chưa thể xóa: ${resolved.reason}\n\nGia chủ có thể nói rõ tên đồ vật cần xóa (ví dụ: "Xóa giường", "Xóa bàn học").`,
          aiActions: null,
        };
      }
    }

    // 5B. Multi-Item Lexical Deletion ("Xóa giường, tủ quần áo, cây" / "Xóa bàn học")
    const extractedDeleteItems = extractAllActionItems(lower);
    const itemsToDelete = extractedDeleteItems.length > 0
      ? extractedDeleteItems
      : [
          {
            type: 'desk' as any,
            name: 'đồ vật',
            quantity: extractLocalQuantity(lower),
          },
        ];

    let workingCurrentObjects = [...objects];
    const allDeletedIds: string[] = [];
    const reports: string[] = [];

    for (const item of itemsToDelete) {
      const matching = workingCurrentObjects.filter((o: any) => o.type === item.type);
      const reqQty = item.quantity || 1;

      if (matching.length === 0) {
        reports.push(`• ${item.name}: ✕ FAILED (Không tìm thấy đồ vật này trong phòng ngủ)`);
        continue;
      }

      // If user listed multiple types (e.g. "Xóa giường, tủ, cây"), delete 1 item of each mentioned type by default
      const qtyToDelete = itemsToDelete.length > 1 && reqQty === 1
        ? Math.min(matching.length, 1)
        : Math.min(matching.length, reqQty);

      const targets = matching.slice(0, qtyToDelete);
      const targetIds = targets.map((t: any) => t.id);

      allDeletedIds.push(...targetIds);
      workingCurrentObjects = workingCurrentObjects.filter((o: any) => !targetIds.includes(o.id));

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
      reply: replyText,
      aiActions: allDeletedIds.length > 0
        ? {
            actions: [
              {
                type: 'delete_object',
                objectId: allDeletedIds[0],
                objectIds: allDeletedIds,
                description: `Xóa ${allDeletedIds.length} đồ vật`,
              },
            ],
          }
        : null,
    };
  }

  // 6. Generic reply with context — more informative offline response
  const objectNames = objects.map((o: any) => o.name).join(', ') || 'chưa có đồ vật';
  const issues = ruleEngineResult.keyIssues || [];
  return {
    reply: `Chào gia chủ mệnh ${userProfile.guaName} (${userProfile.element} — ${userProfile.group}).\n\nPhòng ngủ ${roomConfig.width}m × ${roomConfig.length}m, hướng ${roomConfig.direction} hiện có: ${objectNames}.\nĐiểm phong thủy: ${ruleEngineResult.overallScore}/100 — ${ruleEngineResult.statusText}.${issues.length > 0 ? `\nVấn đề phát hiện: ${issues[0]}` : ''}\n\nTôi có thể giúp bạn:\n• "Hiển thị đồ vật trong phòng" — xem danh sách chi tiết\n• "Tối ưu giúp tôi" — AI tự xếp layout đạt điểm cao nhất\n• "Thêm bàn học ở góc trái" — thêm đồ vật\n• "Xoay giường 90 độ" — xoay đồ vật\n• "Điểm phong thủy là bao nhiêu?" — xem đánh giá\n\n(Hãy kết nối GEMINI_API_KEY để tôi có thể trả lời bất kỳ câu hỏi tự do nào!)`,
  };
}

const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'move_furniture',
        description: 'Di chuyển một đồ vật trong phòng ngủ 3D tới tọa độ cụ thể hoặc vị trí an toàn.',
        parameters: {
          type: 'OBJECT',
          properties: {
            objectId: { type: 'STRING', description: 'ID của đồ vật cần di chuyển (ví dụ: bed_01, desk_window, wardrobe_north...)' },
            targetX: { type: 'NUMBER', description: 'Tọa độ trục X (mét), từ -rộng/2 đến +rộng/2' },
            targetZ: { type: 'NUMBER', description: 'Tọa độ trục Z (mét), từ -dài/2 đến +dài/2' },
            reason: { type: 'STRING', description: 'Giải thích lý do kiến trúc / phong thủy của vị trí mới' },
          },
          required: ['objectId'],
        },
      },
      {
        name: 'rotate_furniture',
        description: 'Xoay một đồ vật trong phòng ngủ 3D quanh trục đứng Y.',
        parameters: {
          type: 'OBJECT',
          properties: {
            objectId: { type: 'STRING', description: 'ID của đồ vật cần xoay' },
            angleDegrees: { type: 'NUMBER', description: 'Góc xoay theo độ (ví dụ 90, 180, 270...)' },
            reason: { type: 'STRING', description: 'Lý do xoay đồ vật' },
          },
          required: ['objectId'],
        },
      },
      {
        name: 'add_furniture',
        description: 'Thêm một hoặc nhiều đồ vật nội thất mới vào phòng ngủ 3D.',
        parameters: {
          type: 'OBJECT',
          properties: {
            objectType: {
              type: 'STRING',
              description: 'Loại đồ vật: bed, desk, chair, wardrobe, mirror, plant, nightstand, sofa, table, tv, bookshelf, lamp, rug, wc',
            },
            quantity: { type: 'INTEGER', description: 'Số lượng đồ vật cần thêm (ví dụ 1, 2, 3... mặc định 1)' },
            name: { type: 'STRING', description: 'Tên hiển thị tiếng Việt của đồ vật (ví dụ: Giường đôi 1m6, Đèn ngủ, Bàn học...)' },
            width: { type: 'NUMBER', description: 'Chiều rộng theo mét (ví dụ giường đôi 1.6, giường đơn 1.2, bàn làm việc 1.3...)' },
            length: { type: 'NUMBER', description: 'Chiều dài theo mét (ví dụ giường 2.0, bàn 0.65...)' },
            height: { type: 'NUMBER', description: 'Chiều cao theo mét (ví dụ giường 0.95, bàn 0.75...)' },
            targetX: { type: 'NUMBER', description: 'Tọa độ X tùy chọn' },
            targetZ: { type: 'NUMBER', description: 'Tọa độ Z tùy chọn' },
            reason: { type: 'STRING', description: 'Lý do thêm đồ vật vào không gian' },
          },
          required: ['objectType'],
        },
      },
      {
        name: 'delete_furniture',
        description: 'Xóa một hoặc nhiều đồ vật ra khỏi phòng ngủ 3D.',
        parameters: {
          type: 'OBJECT',
          properties: {
            objectId: { type: 'STRING', description: 'ID của đồ vật cần xóa hoặc từ khóa tìm kiếm (ví dụ desk_01, bed_01)' },
            objectType: {
              type: 'STRING',
              description: 'Loại đồ vật cần xóa: desk, bed, chair, wardrobe, lamp, table, mirror, plant, nightstand, sofa, tv, rug, wc',
            },
            quantity: { type: 'INTEGER', description: 'Số lượng đồ vật cần xóa (ví dụ 1, 2, 3... mặc định 1)' },
            reason: { type: 'STRING', description: 'Lý do xóa đồ vật' },
          },
        },
      },
      {
        name: 'optimize_room_layout',
        description: 'Kích hoạt Layout Optimization Engine để tự động sắp xếp lại toàn bộ nội thất trong phòng ngủ theo chuẩn phong thủy Bát Trạch và công năng kiến trúc.',
        parameters: {
          type: 'OBJECT',
          properties: {
            reason: { type: 'STRING', description: 'Lý do tối ưu phòng' },
          },
        },
      },
      {
        name: 'undo_last_action',
        description: 'Hoàn tác lại thao tác thay đổi phòng 3D vừa thực hiện khi người dùng muốn quay lại hoặc hủy thao tác.',
        parameters: {
          type: 'OBJECT',
          properties: {
            reason: { type: 'STRING', description: 'Lý do hoàn tác' },
          },
        },
      },
    ],
  },
];

// API: Check Gemini AI Status
app.get('/api/gemini/status', (req, res) => {
  const customKey = req.headers['x-gemini-api-key'] as string | undefined;
  const client = getGenAIClient(customKey);
  res.json({
    hasServerKey: Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('MY_GEMINI_API_KEY')),
    isOnline: Boolean(client),
  });
});

// API: Detailed Feng Shui Analysis
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { userProfile, roomConfig, objects, ruleEngineResult, apiKey } = req.body;
    const customKey = (req.headers['x-gemini-api-key'] as string | undefined) || apiKey;
    const aiClient = getGenAIClient(customKey);

    if (aiClient) {
      try {
        const prompt = `Phân tích toàn diện phong thủy phòng ngủ sau đây:

THÔNG TIN GIA CHỦ:
- Năm sinh: ${userProfile.birthYear} (${userProfile.gender === 'male' ? 'Nam' : 'Nữ'})
- Quái mệnh: ${userProfile.guaName} (${userProfile.element}) - Nhóm: ${userProfile.group}
- Hướng Cát (Tốt): ${userProfile.auspiciousDirections.join(', ')} (Sinh Khí, Thiên Y, Diên Niên, Phục Vị)
- Hướng Hung (Xấu): ${userProfile.inauspiciousDirections.join(', ')} (Tuyệt Mệnh, Ngũ Quỷ, Lục Sát, Họa Hại)

THÔNG SỐ PHÒNG:
- Kích thước: Dài ${roomConfig.length}m, Rộng ${roomConfig.width}m, Cao ${roomConfig.height}m
- Hướng phòng: ${roomConfig.direction}

DANH SÁCH ĐỒ VẬT HIỆN TẠI TRONG PHÒNG:
${JSON.stringify(objects, null, 2)}

KẾT QUẢ ĐÁNH GIÁ TỪ RULE ENGINE TOÁN HỌC:
- Điểm tổng thể: ${ruleEngineResult.overallScore}/100
- Đánh giá: ${ruleEngineResult.statusText}
- Các vấn đề phát hiện:
${ruleEngineResult.keyIssues.map((issue: string, idx: number) => `  ${idx + 1}. ${issue}`).join('\n')}
- Điểm từng đồ vật:
${ruleEngineResult.items.map((it: any) => `  * ${it.objectName}: ${it.score}/100 (Cung: ${it.sector}, Hướng mặt: ${it.facingDirection}, Trạng thái: ${it.status})`).join('\n')}

HÃY ĐƯA RA BÁO CÁO PHÂN TÍCH CHUYÊN GIA PHONG THỦY:
1. Đánh giá tổng quan về trường khí căn phòng và sự tương hợp với bản mệnh gia chủ.
2. Đi sâu vào từng đồ vật quan trọng (Giường, Bàn làm việc/học, Gương, Cửa, Tủ, WC): lý giải tường tận vì sao đạt điểm tốt hoặc bị điểm xấu.
3. Chỉ ra 2-3 giải pháp hóa giải hoặc phương án dịch chuyển đồ đạc cụ thể để nâng cao vượng khí, tài lộc và giấc ngủ.
4. Một lời khuyên tâm huyết từ Thầy phong thủy dành riêng cho mệnh ${userProfile.guaName} ${userProfile.element}.

Trả về dưới định dạng JSON với cấu trúc:
{
  "summary": "Tóm tắt ngắn gọn 2-3 câu",
  "verdict": "Tuyệt hảo | Rất tốt | Khá tốt | Cần điều chỉnh | Phạm hung hiểm",
  "qiAnalysis": "Phân tích khí trường tổng thể",
  "objectDetails": [
    {
      "objectId": "id_cua_do_vat",
      "objectName": "Ten do vat",
      "verdict": "Tot / Can chu y / Xau",
      "explanation": "Giai thich can ke",
      "remedy": "Cach hoa giai hoac vi tri de xuat"
    }
  ],
  "masterAdvice": "Lời khuyên đúc kết từ chuyên gia",
  "recommendedAction": "Hành động ưu tiên số 1 người dùng nên làm ngay"
}`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: FENG_SHUI_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({ success: true, data: parsed, isGeminiOnline: true });
      } catch (geminiError: any) {
        console.warn('Gemini cloud call failed, using intelligent local engine:', geminiError.message);
      }
    }

    // Fallback: Intelligent Local Analysis (Always works smoothly even without API key)
    const localReport = generateLocalFengShuiAnalysis(userProfile, roomConfig, objects, ruleEngineResult);
    return res.json({ success: true, data: localReport, isGeminiOnline: false });
  } catch (error: any) {
    console.error('Error during Feng Shui analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi phân tích phong thủy',
    });
  }
});

// API: Conversational Chat with Feng Shui Master
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { intent, messages, userProfile, roomConfig, objects, ruleEngineResult, selectedObjectId, apiKey, actionHistory } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0 || typeof messages[messages.length - 1]?.content !== 'string') {
      return res.status(400).json({ success: false, error: 'Dữ liệu hội thoại không hợp lệ.' });
    }
    const safeObjects = Array.isArray(objects) ? objects : [];
    const safeProfile = userProfile || {};
    const safeRoom = roomConfig || {};
    const safeEvaluation = ruleEngineResult || { overallScore: 0, statusText: 'Chưa có đánh giá', keyIssues: [], items: [] };
    const safeActionHistory = Array.isArray(actionHistory) ? actionHistory : [];
    const customKey = (req.headers['x-gemini-api-key'] as string | undefined) || apiKey;
    const aiClient = getGenAIClient(customKey);
    const latestUserMessage = String(messages[messages.length - 1].content).trim();
    if (!latestUserMessage) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập nội dung câu hỏi.' });
    }

    if (aiClient) {
      try {
        const selectedObject = safeObjects.find((o: any) => o.id === selectedObjectId);
        const isActionIntent = ['ADD_OBJECT', 'MOVE_OBJECT', 'ROTATE_OBJECT', 'DELETE_OBJECT'].includes(intent);
        const isGeneralChat = intent === 'CHAT_GENERAL';

        // Intent-adaptive contextual header to avoid prompt pollution & boost speed
        let contextHeader = '';
        if (isActionIntent) {
          const recentActionSummary = safeActionHistory.slice(-6).map((h: any) => `[${h.actionType}] ${h.objectName} (id: "${h.objectId}", loại: ${h.objectType})`).join('; ');
          contextHeader = `THÔNG SỐ PHÒNG 3D HIỆN TẠI:
- Kích thước phòng: ${safeRoom.width || 5.0}m × ${safeRoom.length || 5.2}m.
- Đang chọn: ${selectedObject ? `${selectedObject.name} (id: ${selectedObject.id})` : 'Không'}.
- Danh sách ${safeObjects.length} đồ vật: ${safeObjects.map((o: any) => `${o.name} (id: "${o.id}", loại: ${o.type}, vị trí: [${o.position.x.toFixed(2)}, ${o.position.z.toFixed(2)}], kích thước: [${o.dimensions.width}×${o.dimensions.length}])`).join('; ')}.${recentActionSummary ? `\n- LỊCH SỬ THAO TÁC GẦN ĐÂY: ${recentActionSummary}.\n(Nếu người dùng yêu cầu "xóa những cái vừa tạo" hoặc tham chiếu, hãy gọi tool delete_furniture với các objectId tương ứng trong lịch sử này).` : ''}
HÃY GỌI TOOL THÍCH HỢP ĐỂ THỰC THI THAO TÁC.`;
        } else if (isGeneralChat) {
          contextHeader = `Bạn là trợ lý AI thông minh, hiểu biết đa năng và thân thiện. Trả lời trực tiếp, rõ ràng bằng tiếng Việt.`;
        } else {
          contextHeader = `BỐI CẢNH PHÒNG NGỦ 3D & PHONG THỦY BÁT TRẠCH:
- Gia chủ: Sinh năm ${safeProfile.birthYear} (${safeProfile.gender === 'male' ? 'Nam' : 'Nữ'}), Quái ${safeProfile.guaName} (${safeProfile.element}), ${safeProfile.group}.
- Hướng cát (tốt): ${safeProfile.auspiciousDirections?.join(', ') || 'N/A'}.
- Hướng hung (xấu): ${safeProfile.inauspiciousDirections?.join(', ') || 'N/A'}.
- Kích thước phòng: ${safeRoom.width}m × ${safeRoom.length}m, Hướng: ${safeRoom.direction}.
- Điểm phong thủy hiện tại: ${safeEvaluation.overallScore}/100 (${safeEvaluation.statusText}).
- Cảnh báo xung sát: ${safeEvaluation.keyIssues?.join('; ') || 'Không có xung sát nghiêm trọng'}.
- Danh sách đồ vật: ${safeObjects.map((o: any) => `${o.name} (id: "${o.id}", loại: ${o.type})`).join(', ')}.`;
        }

        // Build focused conversation contents
        const historyTurns = messages.slice(-4, -1);
        const formattedContents = [
          { role: 'user', parts: [{ text: contextHeader }] },
          { role: 'model', parts: [{ text: isActionIntent ? 'Tôi đã nhận thông số không gian 3D và sẵn sàng gọi tool điều khiển.' : isGeneralChat ? 'Tôi sẵn sàng giải đáp câu hỏi của bạn.' : 'Tôi đã nắm rõ bối cảnh phong thủy và sẵn sàng tư vấn chuyên sâu.' }] },
          ...historyTurns.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
          { role: 'user', parts: [{ text: latestUserMessage }] },
        ];

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: formattedContents,
          config: {
            systemInstruction: FENG_SHUI_SYSTEM_PROMPT,
            // Only attach tools when not purely general chat
            tools: !isGeneralChat ? (GEMINI_TOOLS as any) : undefined,
            temperature: 0.7,
          },
        });

        const replyText = response.text || '';
        let aiActions: any = null;
        let proposedAdjustment = null;
        let optimizationProposal = null;
        let cleanedReply = replyText;

        // 1. Process Official Gemini Function Calls with Full Lifecycle (Turn 1 -> Execute -> Turn 2)
        const rawFunctionCalls = (response as any).functionCalls || [];
        if (Array.isArray(rawFunctionCalls) && rawFunctionCalls.length > 0) {
          const parsedActions: any[] = [];
          const functionResponseParts: any[] = [];
          let workingObjects = [...safeObjects];
          const rConfig = { width: Number(safeRoom.width) || 5.0, length: Number(safeRoom.length) || 5.2 };

          for (const call of rawFunctionCalls) {
            const fnName = call.name;
            const args: any = call.args || {};

            if (fnName === 'add_furniture') {
              const objType = String(args.objectType || 'bed').toLowerCase().trim();
              const defaults = FURNITURE_DEFAULTS[objType] || { width: 1.2, length: 0.8, height: 0.75, name: 'Đồ vật mới' };
              let w = args.width ? Number(args.width) : defaults.width;
              let l = args.length ? Number(args.length) : defaults.length;
              let h = args.height ? Number(args.height) : defaults.height;
              let name = args.name || defaults.name;
              const quantity = Math.max(1, Math.min(5, Number(args.quantity) || 1));

              // Architectural & plumbing constraint check for WC / Bathroom
              if (objType === 'wc') {
                const hasExistingWc = workingObjects.some((o: any) => o.type === 'wc');
                if (hasExistingWc) {
                  functionResponseParts.push({
                    functionResponse: {
                      name: fnName,
                      response: {
                        status: 'FAILED',
                        success: false,
                        name,
                        reason: 'Phòng ngủ hiện đã có sẵn khu vực WC Master khép kín cố định; không thể bố trí thêm nhà vệ sinh thứ 2 trong phòng ngủ do ràng buộc kỹ thuật cấp thoát nước và công năng.',
                      },
                    },
                  });
                  continue;
                }
              }

              // Smart dimension resolution for Vietnamese furniture requests (e.g., "giường đôi 1m6", "đèn ngủ", "đèn sàn")
              const combinedText = `${name} ${latestUserMessage}`.toLowerCase();
              if (objType === 'bed') {
                if (combinedText.includes('1m6') || combinedText.includes('1.6m') || combinedText.includes('đôi')) {
                  w = 1.6;
                  l = 2.0;
                  if (!args.name) name = 'Giường đôi 1m6';
                } else if (combinedText.includes('1m8') || combinedText.includes('1.8m')) {
                  w = 1.8;
                  l = 2.0;
                  if (!args.name) name = 'Giường đôi 1m8';
                } else if (combinedText.includes('1m2') || combinedText.includes('1.2m') || combinedText.includes('đơn')) {
                  w = 1.2;
                  l = 2.0;
                  if (!args.name) name = 'Giường đơn 1m2';
                } else if (combinedText.includes('2m') || combinedText.includes('king')) {
                  w = 2.0;
                  l = 2.2;
                  if (!args.name) name = 'Giường King 2m';
                }
              } else if (objType === 'lamp') {
                if (combinedText.includes('sàn') || combinedText.includes('cây') || combinedText.includes('đứng')) {
                  w = 0.4;
                  l = 0.4;
                  h = 1.4;
                  if (!args.name) name = 'Đèn sàn';
                } else {
                  w = 0.35;
                  l = 0.35;
                  h = 0.5;
                  if (!args.name) name = combinedText.includes('học') ? 'Đèn học' : 'Đèn ngủ';
                }
              }

              const dims = {
                width: Number(w.toFixed(2)),
                length: Number(l.toFixed(2)),
                height: Number(h.toFixed(2)),
              };

              const targetX = args.targetX !== undefined ? Number(args.targetX) : 0;
              const targetZ = args.targetZ !== undefined ? Number(args.targetZ) : 0;
              const initialPos = { x: targetX, z: targetZ };

              let addedCount = 0;
              const addedIds: string[] = [];

              for (let q = 0; q < quantity; q++) {
                const placement = findSmartPlacement(objType, dims, workingObjects, rConfig, initialPos);
                if (!placement.resolved) break;

                const newId = `${objType}_${Date.now()}_${q}_${Math.floor(Math.random() * 1000)}`;
                const safePos = {
                  x: Number(placement.safePos.x.toFixed(2)),
                  y: 0,
                  z: Number(placement.safePos.z.toFixed(2)),
                };
                const effectiveDims = placement.dimensions;
                const effectiveRotY = placement.rotationY;
                const effectiveName = placement.adapted && objType === 'bed' && !name.includes('đơn') ? `${name} (cỡ vừa)` : name;
                const itemTitle = quantity > 1 ? `${effectiveName} #${q + 1}` : effectiveName;

                const newAction = {
                  type: 'add_object',
                  objectId: newId,
                  objectType: objType,
                  name: itemTitle,
                  dimensions: effectiveDims,
                  position: safePos,
                  rotationY: effectiveRotY,
                  description: args.reason || `Thêm ${itemTitle} (${effectiveDims.width}m × ${effectiveDims.length}m)`,
                };

                parsedActions.push(newAction);
                addedIds.push(newId);
                addedCount++;

                // Add to workingObjects so next item in the same turn doesn't overlap
                workingObjects.push({
                  id: newId,
                  type: objType as any,
                  name: itemTitle,
                  dimensions: effectiveDims,
                  position: { x: safePos.x, y: 0, z: safePos.z },
                  rotation: { x: 0, y: effectiveRotY, z: 0 },
                });
              }

              if (addedCount > 0) {
                functionResponseParts.push({
                  functionResponse: {
                    name: fnName,
                    response: {
                      status: 'SUCCESS',
                      success: true,
                      objectIds: addedIds,
                      count: addedCount,
                      name,
                      dimensions: dims,
                      message: `Đã thêm thành công ${addedCount} ${name} vào không gian 3D tại tọa độ an toàn, không va chạm.`,
                    },
                  },
                });
              } else {
                functionResponseParts.push({
                  functionResponse: {
                    name: fnName,
                    response: {
                      status: 'FAILED',
                      success: false,
                      name,
                      reason: `Không tìm được vị trí an toàn cho ${name} (${dims.width}m × ${dims.length}m) trong phòng ${rConfig.width}m × ${rConfig.length}m do không gian đã bị chiếm hoặc chắn cửa ra vào.`,
                    },
                  },
                });
              }
            } else if (fnName === 'move_furniture') {
              const target = workingObjects.find(
                (o: any) => o.id === args.objectId || o.name.toLowerCase().includes((args.objectId || '').toLowerCase())
              );

              if (target) {
                const targetX = args.targetX !== undefined ? Number(args.targetX) : target.position.x;
                const targetZ = args.targetZ !== undefined ? Number(args.targetZ) : target.position.z;
                const initialPos = { x: targetX, z: targetZ };
                const resolution = resolveSafePlacement(
                  initialPos,
                  target.dimensions,
                  target.rotation?.y || 0,
                  workingObjects,
                  rConfig,
                  target.id
                );

                if (resolution.resolved) {
                  const safePos = {
                    x: Number(resolution.safePos.x.toFixed(2)),
                    y: 0,
                    z: Number(resolution.safePos.z.toFixed(2)),
                  };

                  parsedActions.push({
                    type: 'move_object',
                    objectId: target.id,
                    position: safePos,
                    description: args.reason || `Di chuyển ${target.name} tới vị trí mới`,
                  });

                  target.position = { ...target.position, ...safePos };

                  functionResponseParts.push({
                    functionResponse: {
                      name: fnName,
                      response: {
                        status: 'SUCCESS',
                        success: true,
                        objectId: target.id,
                        name: target.name,
                        newPosition: safePos,
                        message: `Đã di chuyển ${target.name} tới X=${safePos.x}m, Z=${safePos.z}m an toàn.`,
                      },
                    },
                  });
                } else {
                  functionResponseParts.push({
                    functionResponse: {
                      name: fnName,
                      response: {
                        status: 'FAILED',
                        success: false,
                        reason: `Không thể di chuyển ${target.name} tới vị trí yêu cầu do va chạm hoặc vượt ranh giới tường.`,
                      },
                    },
                  });
                }
              } else {
                functionResponseParts.push({
                  functionResponse: {
                    name: fnName,
                    response: {
                      status: 'FAILED',
                      success: false,
                      reason: `Không tìm thấy đồ vật có ID hoặc tên: "${args.objectId}" trong phòng.`,
                    },
                  },
                });
              }
            } else if (fnName === 'rotate_furniture') {
              const target = workingObjects.find(
                (o: any) => o.id === args.objectId || o.name.toLowerCase().includes((args.objectId || '').toLowerCase())
              );

              if (target) {
                const deg = args.angleDegrees !== undefined ? Number(args.angleDegrees) : 90;
                const rad = (deg * Math.PI) / 180;
                parsedActions.push({
                  type: 'rotate_object',
                  objectId: target.id,
                  rotationDelta: rad,
                  description: args.reason || `Xoay ${target.name} ${deg}°`,
                });

                functionResponseParts.push({
                  functionResponse: {
                    name: fnName,
                    response: {
                      status: 'SUCCESS',
                      success: true,
                      objectId: target.id,
                      name: target.name,
                      rotatedDegrees: deg,
                      message: `Đã xoay ${target.name} ${deg} độ thành công.`,
                    },
                  },
                });
              } else {
                functionResponseParts.push({
                  functionResponse: {
                    name: fnName,
                    response: {
                      status: 'FAILED',
                      success: false,
                      reason: `Không tìm thấy đồ vật có ID: "${args.objectId}".`,
                    },
                  },
                });
              }
            } else if (fnName === 'delete_furniture') {
              const reqQty = Math.max(1, Number(args.quantity) || 1);
              const targetQuery = String(args.objectId || args.objectType || '').toLowerCase().trim();

              const matching = workingObjects.filter((o: any) => {
                if (args.objectId && o.id === args.objectId) return true;
                if (args.objectType && o.type === args.objectType) return true;
                if (targetQuery && (
                  o.id.toLowerCase().includes(targetQuery) ||
                  o.type.toLowerCase().includes(targetQuery) ||
                  o.name.toLowerCase().includes(targetQuery)
                )) return true;
                return false;
              });

              if (matching.length === 0) {
                functionResponseParts.push({
                  functionResponse: {
                    name: fnName,
                    response: {
                      status: 'FAILED',
                      success: false,
                      reason: `Không tìm thấy đồ vật nào phù hợp với yêu cầu: "${args.objectId || args.objectType || ''}" trong phòng.`,
                    },
                  },
                });
              } else if (matching.length < reqQty) {
                functionResponseParts.push({
                  functionResponse: {
                    name: fnName,
                    response: {
                      status: 'FAILED',
                      success: false,
                      reason: `Phòng hiện chỉ có ${matching.length} ${matching[0].name}, không đủ ${reqQty} cái để xóa theo yêu cầu.`,
                    },
                  },
                });
              } else {
                const toDelete = matching.slice(0, reqQty);
                const deletedIds = toDelete.map((o: any) => o.id);
                const deletedNames = toDelete.map((o: any) => o.name).join(', ');

                parsedActions.push({
                  type: 'delete_object',
                  objectId: toDelete[0].id,
                  objectIds: deletedIds,
                  description: args.reason || `Xóa ${reqQty > 1 ? `${reqQty} ` : ''}${toDelete[0].name}`,
                });

                workingObjects = workingObjects.filter((o: any) => !deletedIds.includes(o.id));

                functionResponseParts.push({
                  functionResponse: {
                    name: fnName,
                    response: {
                      status: 'SUCCESS',
                      success: true,
                      objectIds: deletedIds,
                      count: reqQty,
                      names: deletedNames,
                      message: `Đã xóa thành công ${reqQty} đồ vật (${deletedNames}) khỏi phòng.`,
                    },
                  },
                });
              }
            } else if (fnName === 'optimize_room_layout') {
              const { proposal } = generateOptimizedLayout(safeProfile, safeRoom, workingObjects, safeEvaluation);
              optimizationProposal = proposal;
              proposedAdjustment = proposal.adjustments[0] || null;

              parsedActions.push({
                type: 'optimize_room',
                description: args.reason || 'Tối ưu toàn bộ bố cục phòng ngủ theo Bát Trạch',
                adjustments: proposal.adjustments,
              });

              functionResponseParts.push({
                functionResponse: {
                  name: fnName,
                  response: {
                    status: 'SUCCESS',
                    success: true,
                    beforeScore: proposal.beforeScore,
                    afterScore: proposal.afterScore,
                    adjustmentsCount: proposal.adjustments.length,
                    message: `Đã tối ưu bố cục phòng ngủ, nâng điểm từ ${proposal.beforeScore} lên ${proposal.afterScore}/100.`,
                  },
                },
              });
            } else if (fnName === 'undo_last_action') {
              parsedActions.push({
                type: 'undo_action',
                description: args.reason || 'Hoàn tác thao tác trước',
              });

              functionResponseParts.push({
                functionResponse: {
                  name: fnName,
                  response: {
                    status: 'SUCCESS',
                    success: true,
                    message: 'Đã hoàn tác thao tác gần nhất.',
                  },
                },
              });
            }
          }

          // High-speed Multi-Action Instant Execution Summary:
          // Immediately return clear Vietnamese confirmation without second network roundtrip
          const successes = parsedActions.map((a: any) => `• ${a.name || a.description}: ✓ SUCCESS`);
          const failures = functionResponseParts
            .filter((p: any) => p.functionResponse?.response?.status === 'FAILED')
            .map((p: any) => `• ${p.functionResponse.response.name || 'Thao tác'}: ✕ FAILED (${p.functionResponse.response.reason})`);

          const totalReq = successes.length + failures.length;

          if (parsedActions.length > 0) {
            let summaryTitle = '';
            if (failures.length === 0) {
              summaryTitle = `Đã thực thi thành công toàn bộ ${parsedActions.length} yêu cầu của gia chủ:`;
            } else {
              summaryTitle = `Kết quả thực thi theo yêu cầu của gia chủ (${successes.length}/${totalReq} thành công):`;
            }

            cleanedReply = `${summaryTitle}\n\n${[...successes, ...failures].join('\n')}\n\n${successes.length > 0 ? 'Mô hình 3D đã được cập nhật đồng bộ các đồ vật thành công.' : ''}`;
            aiActions = {
              actions: parsedActions,
              ...(optimizationProposal ? { optimizationProposal } : {}),
            };
          } else if (functionResponseParts.length > 0) {
            const firstFail = failures.join('\n') || functionResponseParts[0]?.functionResponse?.response?.reason || 'Không tìm được vị trí an toàn trong phòng.';
            cleanedReply = `Chưa thể thực hiện các thao tác:\n\n${firstFail}\n\nGia chủ có thể điều chỉnh lại vị trí hoặc kích thước đồ vật để phù hợp với không gian phòng.`;
            aiActions = null;
          }
        }

        // 2. Secondary Regex Fallback (in case Gemini formats JSON in text blocks)
        const actionMatch = replyText.match(/\[AI_ACTIONS\]([\s\S]*?)\[\/AI_ACTIONS\]/);
        if (actionMatch && !aiActions) {
          try {
            aiActions = JSON.parse(actionMatch[1].trim());
            cleanedReply = cleanedReply.replace(/\[AI_ACTIONS\][\s\S]*?\[\/AI_ACTIONS\]/, '').trim();
            if (aiActions.optimizationProposal) {
              optimizationProposal = aiActions.optimizationProposal;
              if (optimizationProposal.adjustments && optimizationProposal.adjustments.length > 0) {
                proposedAdjustment = optimizationProposal.adjustments[0];
              }
            }
          } catch (err) {
            console.error('Failed to parse [AI_ACTIONS] JSON:', err);
          }
        }

        const match = replyText.match(/\[PROPOSED_LAYOUT\]([\s\S]*?)\[\/PROPOSED_LAYOUT\]/);
        if (match && !proposedAdjustment) {
          try {
            proposedAdjustment = JSON.parse(match[1].trim());
            cleanedReply = cleanedReply.replace(/\[PROPOSED_LAYOUT\][\s\S]*?\[\/PROPOSED_LAYOUT\]/, '').trim();
          } catch (err) {
            console.error('Failed to parse proposed layout JSON:', err);
          }
        }

        // Safe Fallback summary if Gemini returned empty text after function execution
        if (!cleanedReply && aiActions?.actions?.length) {
          const actionSummary = aiActions.actions.map((a: any) => `• ${a.description}`).join('\n');
          cleanedReply = `Tôi đã thực thi các điều chỉnh theo yêu cầu của bạn:\n${actionSummary}`;
        }

        return res.json({
          success: true,
          reply: cleanedReply || 'Đã xử lý yêu cầu của bạn.',
          aiActions,
          proposedAdjustment,
          optimizationProposal,
          isGeminiOnline: true,
        });
      } catch (geminiError: any) {
        console.warn('Gemini chat call failed, using intelligent local chat parser:', geminiError.message);
      }
    }

    // Fallback: Intelligent Local Natural Language Chat & 3D Commander
    const localChatResult = handleLocalAIChat(latestUserMessage, safeProfile, safeRoom, safeObjects, safeEvaluation, selectedObjectId, safeActionHistory);
    return res.json({
      success: true,
      ...localChatResult,
      isGeminiOnline: false,
    });
  } catch (error: any) {
    console.error('Error in chat:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi kết nối với Thầy Phong Thủy AI',
    });
  }
});

// Serve frontend in production or integrate with Vite dev
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const hasApiKey = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('MY_GEMINI_API_KEY'));
  app.listen(port, () => {
    console.log(`Feng Shui 3D Studio Server running on port ${port} (API Key: ${hasApiKey ? 'Configured' : 'Offline AI Engine Active'})`);
  });
}

startServer();
