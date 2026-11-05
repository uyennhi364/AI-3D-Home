// =============================================================================
// intentClassifier.ts
// Classifies user intent into 10 distinct operational categories.
// Prevents invoking heavy Feng Shui rules or optimization engines for simple actions.
// =============================================================================

import { RoomObjectType } from '../types/fengshui';

export type UserIntentType =
  | 'CHAT_GENERAL'              // 1. General conversation, greetings, knowledge
  | 'FENG_SHUI_CONSULT'         // 2. Feng Shui questions, Bát Trạch, directions
  | 'INTERIOR_DESIGN_CONSULT'   // 3. Color, material, lighting, interior advice
  | 'ADD_OBJECT'                // 4. Add/create furniture
  | 'DELETE_OBJECT'             // 5. Remove/delete furniture
  | 'MOVE_OBJECT'               // 6. Move/shift furniture
  | 'ROTATE_OBJECT'             // 7. Rotate furniture
  | 'RESIZE_OBJECT'             // 8. Change dimensions/scale
  | 'OPTIMIZE_ROOM'             // 9. Full room layout optimization
  | 'ANALYZE_ROOM';             // 10. Deep full room Feng Shui report

export interface ExtractedActionItem {
  type: RoomObjectType;
  name: string;
  quantity: number;
  dimensions?: { width: number; length: number; height?: number };
  rawText?: string;
}

export interface ContextReferenceInfo {
  type: 'recently_created' | 'recently_modified' | 'ordinal' | 'pronoun' | 'specific_recent' | 'spatial_relation';
  targetObjectType?: RoomObjectType;
  ordinalIndex?: number; // 0-based: 0 for 1st, 1 for 2nd...
  spatialAnchor?: 'window' | 'door' | 'bed' | 'wardrobe' | 'wc';
  rawPhrase: string;
}

export interface ClassifiedIntent {
  intent: UserIntentType;
  confidence: number;
  loadingMessage: string;
  extractedObjectType?: RoomObjectType;
  extractedObjectName?: string;
  extractedDimensions?: { width: number; length: number; height?: number };
  extractedQuantity?: number;
  extractedItems?: ExtractedActionItem[];
  contextReference?: ContextReferenceInfo;
  targetDirection?: 'left' | 'right' | 'forward' | 'backward';
  rotationDegrees?: number;
  needsFengShuiEngine: boolean;
  needsLayoutOptimizer: boolean;
  needs3DExecution: boolean;
}

// Vietnamese keywords for object types - PRIORITY ORDER IS CRITICAL:
// Compound words like 'đèn bàn', 'bàn học' must match before generic 'bàn'
const OBJECT_PATTERNS: Array<{ type: RoomObjectType; name: string; patterns: string[] }> = [
  {
    type: 'wc',
    name: 'Nhà vệ sinh',
    patterns: ['nhà vệ sinh', 'nha ve sinh', 'phòng vệ sinh', 'phong ve sinh', 'toilet', 'wc', 'bồn cầu', 'bon cau'],
  },
  {
    type: 'lamp',
    name: 'Đèn ngủ',
    patterns: ['đèn ngủ', 'den ngu', 'đèn đầu giường', 'đèn để bàn', 'đèn bàn', 'den ban', 'đèn học', 'den hoc', 'đèn cây', 'đèn sàn', 'đèn đứng', 'đèn', 'den', 'lamp'],
  },
  {
    type: 'desk',
    name: 'Bàn làm việc',
    patterns: ['bàn học', 'ban hoc', 'bàn làm việc', 'ban lam viec', 'bàn vi tính', 'bàn máy tính', 'desk'],
  },
  {
    type: 'bed',
    name: 'Giường ngủ',
    patterns: ['giường', 'giuong', 'nệm', 'đệm', 'bed'],
  },
  {
    type: 'wardrobe',
    name: 'Tủ quần áo',
    patterns: ['tủ quần áo', 'tu quan ao', 'tủ áo', 'tủ đồ', 'wardrobe', 'tủ'],
  },
  {
    type: 'table',
    name: 'Bàn trà',
    patterns: ['bàn trà', 'ban tra', 'bàn nước', 'bàn sofa', 'bàn ăn', 'bàn nhỏ', 'table', 'bàn'],
  },
  {
    type: 'chair',
    name: 'Ghế ngồi',
    patterns: ['ghế', 'ghe', 'chair'],
  },
  {
    type: 'mirror',
    name: 'Gương soi',
    patterns: ['gương', 'guong', 'mirror'],
  },
  {
    type: 'plant',
    name: 'Cây xanh',
    patterns: ['cây xanh', 'cay xanh', 'chậu cây', 'cây cảnh', 'plant', 'cây'],
  },
  {
    type: 'nightstand',
    name: 'Táp đầu giường',
    patterns: ['táp', 'tab', 'tủ đầu giường', 'kệ đầu giường', 'nightstand'],
  },
  {
    type: 'sofa',
    name: 'Sofa',
    patterns: ['sofa', 'ghế bành', 'couch'],
  },
  {
    type: 'bookshelf',
    name: 'Kệ sách',
    patterns: ['kệ sách', 'giá sách', 'tủ sách', 'bookshelf'],
  },
  {
    type: 'tv',
    name: 'Kệ Tivi',
    patterns: ['tivi', 'tv', 'kệ tivi'],
  },
  {
    type: 'rug',
    name: 'Thảm trải sàn',
    patterns: ['thảm', 'tham', 'rug', 'carpet'],
  },
];

/**
 * Extracts numeric quantity from Vietnamese prompt (e.g., '2 cái bàn', 'hai chiếc đèn', '3 ghế')
 */
export function extractVietnameseQuantity(text: string): number {
  const t = text.toLowerCase();

  // 1. Look for digit directly before or after unit or action: "xóa 2 cái", "thêm 2 đèn", "2 cái bàn", "3 bàn"
  const digitRegex = /(?:xóa|bỏ|thêm|đặt|tạo|di chuyển|xoay)?\s*(\d+)\s*(?:cái|chiếc|chậu|cây|bộ|cặp|món|bàn|ghế|đèn|giường|tủ|gương)?/i;
  const digitMatch = t.match(digitRegex);
  if (digitMatch && digitMatch[1]) {
    const parsed = parseInt(digitMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
      return parsed;
    }
  }

  // 2. Word-based numbers in Vietnamese
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
    if (rx.test(t)) {
      return num;
    }
  }

  // 3. Check for pairs ("cặp", "đôi" - excluding "giường đôi")
  if (t.includes('cặp') || (t.includes('đôi') && !t.includes('giường đôi') && !t.includes('giuong doi'))) {
    return 2;
  }

  return 1;
}

/**
 * Extracts ALL objects mentioned in a multi-action request.
 * e.g., "Thêm giường, tủ quần áo, nhà vệ sinh, bàn học"
 * -> [bed, wardrobe, wc, desk] with respective quantities and dimensions.
 */
export function extractAllActionItems(prompt: string): ExtractedActionItem[] {
  const p = (prompt || '').trim().toLowerCase();

  interface RawMatch {
    type: RoomObjectType;
    name: string;
    start: number;
    end: number;
    matchedPattern: string;
  }

  const rawMatches: RawMatch[] = [];

  for (const obj of OBJECT_PATTERNS) {
    for (const pat of obj.patterns) {
      let searchIndex = 0;
      while (searchIndex < p.length) {
        let foundIdx = -1;
        if (pat.includes(' ')) {
          foundIdx = p.indexOf(pat, searchIndex);
        } else {
          const rx = new RegExp(`(?:^|\\s|[.,;!?])(${pat})(?:\\s|[.,;!?]|$)`, 'gi');
          rx.lastIndex = searchIndex;
          const m = rx.exec(p);
          if (m) {
            foundIdx = m.index + m[0].indexOf(m[1]);
          }
        }

        if (foundIdx === -1) break;

        rawMatches.push({
          type: obj.type,
          name: obj.name,
          start: foundIdx,
          end: foundIdx + pat.length,
          matchedPattern: pat,
        });

        searchIndex = foundIdx + pat.length;
      }
    }
  }

  // Filter overlapping matches: prefer longer/more specific pattern
  rawMatches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });

  const filteredMatches: RawMatch[] = [];
  for (const match of rawMatches) {
    const isOverlapped = filteredMatches.some((kept) => {
      return Math.max(match.start, kept.start) < Math.min(match.end, kept.end);
    });
    if (!isOverlapped) {
      filteredMatches.push(match);
    }
  }

  // Sort chronologically from left to right in the sentence
  filteredMatches.sort((a, b) => a.start - b.start);

  if (filteredMatches.length === 0) return [];

  const items: ExtractedActionItem[] = [];

  for (let i = 0; i < filteredMatches.length; i++) {
    const m = filteredMatches[i];
    const prevEnd = i > 0 ? filteredMatches[i - 1].end : 0;
    const nextStart = i < filteredMatches.length - 1 ? filteredMatches[i + 1].start : p.length;

    const segment = p.substring(prevEnd, nextStart).trim();
    const qty = extractVietnameseQuantity(segment);

    let dims: { width: number; length: number; height?: number } | undefined;
    let finalName = m.name;

    if (m.type === 'bed') {
      if (segment.includes('1m6') || segment.includes('1.6m') || segment.includes('đôi') || segment.includes('queen')) {
        dims = { width: 1.6, length: 2.0, height: 0.95 };
        finalName = 'Giường đôi 1m6';
      } else if (segment.includes('1m8') || segment.includes('1.8m')) {
        dims = { width: 1.8, length: 2.0, height: 0.95 };
        finalName = 'Giường đôi 1m8';
      } else if (segment.includes('1m2') || segment.includes('1.2m') || segment.includes('đơn') || segment.includes('single')) {
        dims = { width: 1.2, length: 2.0, height: 0.95 };
        finalName = 'Giường đơn 1m2';
      } else if (segment.includes('2m') || segment.includes('king')) {
        dims = { width: 2.0, length: 2.2, height: 0.95 };
        finalName = 'Giường King 2m';
      } else {
        dims = { width: 1.6, length: 2.0, height: 0.95 };
      }
    } else if (m.type === 'lamp') {
      if (segment.includes('cây') || segment.includes('sàn') || segment.includes('đứng')) {
        dims = { width: 0.4, length: 0.4, height: 1.4 };
        finalName = 'Đèn sàn';
      } else {
        dims = { width: 0.35, length: 0.35, height: 0.5 };
        finalName = segment.includes('học') ? 'Đèn học' : 'Đèn ngủ';
      }
    } else if (m.type === 'desk') {
      dims = { width: 1.3, length: 0.65, height: 0.75 };
      finalName = segment.includes('làm việc') ? 'Bàn làm việc' : 'Bàn học';
    } else if (m.type === 'chair') {
      dims = { width: 0.55, length: 0.55, height: 0.85 };
      finalName = 'Ghế ngồi';
    } else if (m.type === 'wardrobe') {
      dims = { width: 1.8, length: 0.6, height: 2.2 };
      finalName = 'Tủ quần áo';
    } else if (m.type === 'wc') {
      if (segment.includes('bồn cầu') || segment.includes('toilet')) {
        dims = { width: 0.5, length: 0.7, height: 0.75 };
        finalName = 'Bồn cầu thông minh';
      } else {
        dims = { width: 1.4, length: 1.6, height: 2.1 };
        finalName = 'Phòng WC khép kín';
      }
    } else if (m.type === 'mirror') {
      dims = { width: 0.55, length: 0.15, height: 1.65 };
      finalName = 'Gương soi';
    } else if (m.type === 'plant') {
      dims = { width: 0.5, length: 0.5, height: 0.9 };
      finalName = 'Cây xanh phong thủy';
    }

    items.push({
      type: m.type,
      name: finalName,
      quantity: Math.max(1, qty),
      dimensions: dims,
      rawText: segment,
    });
  }

  return items;
}

/**
 * Detects conversational context references such as:
 * - "Xóa những cái vừa tạo", "những đồ vật vừa thêm" (recently_created)
 * - "Chiếc giường vừa tạo", "bàn học vừa thêm" (specific_recent)
 * - "Cái thứ hai", "cái thứ 2", "cái đầu tiên" (ordinal)
 * - "Nó", "chúng", "những cái đó", "mấy cái đó" (pronoun)
 */
export function detectContextReference(prompt: string): ContextReferenceInfo | undefined {
  const p = (prompt || '').trim().toLowerCase();

  // 1. Ordinals: "cái thứ 2", "cái thứ hai", "cái đầu tiên", "chiếc thứ ba"...
  const ordinalMap: Array<{ pattern: RegExp; idx: number }> = [
    { pattern: /(?:cái|chiếc|đồ|món)?\s*(?:thứ\s*nhất|đầu\s*tiên|thứ\s*1)/i, idx: 0 },
    { pattern: /(?:cái|chiếc|đồ|món)?\s*(?:thứ\s*hai|thứ\s*2)/i, idx: 1 },
    { pattern: /(?:cái|chiếc|đồ|món)?\s*(?:thứ\s*ba|thứ\s*3)/i, idx: 2 },
    { pattern: /(?:cái|chiếc|đồ|món)?\s*(?:thứ\s*tư|thứ\s*bốn|thứ\s*4)/i, idx: 3 },
  ];
  for (const { pattern, idx } of ordinalMap) {
    if (pattern.test(p)) {
      let targetObj: RoomObjectType | undefined;
      for (const obj of OBJECT_PATTERNS) {
        if (obj.patterns.some((pat) => p.includes(pat))) {
          targetObj = obj.type;
          break;
        }
      }
      return {
        type: 'ordinal',
        ordinalIndex: idx,
        targetObjectType: targetObj,
        rawPhrase: p,
      };
    }
  }

  // 2. Specific recent or general recent: "chiếc giường vừa tạo", "những cái vừa tạo", "xóa bàn vừa mới thêm"
  const isRecentPhrase = /(?:vừa\s*tạo|vừa\s*thêm|vừa\s*đặt|mới\s*tạo|mới\s*thêm|vừa\s*mới\s*thêm|vừa\s*mới\s*tạo|vừa\s*rồi|mới\s*rồi|vừa\s*làm|đã\s*thêm)/i.test(p);
  if (isRecentPhrase) {
    let targetObj: RoomObjectType | undefined;
    for (const obj of OBJECT_PATTERNS) {
      if (obj.patterns.some((pat) => p.includes(pat))) {
        targetObj = obj.type;
        break;
      }
    }
    if (targetObj) {
      return {
        type: 'specific_recent',
        targetObjectType: targetObj,
        rawPhrase: p,
      };
    }
    return {
      type: 'recently_created',
      rawPhrase: p,
    };
  }

  // 3. Spatial relation: "chiếc bàn cạnh cửa sổ", "cạnh giường", "chắn cửa ra vào"...
  let spatialAnchor: 'window' | 'door' | 'bed' | 'wardrobe' | 'wc' | undefined;
  if (/(?:cạnh|gần|sát|bên|dưới|phía)\s*(?:cửa\s*sổ|ban\s*công|ô\s*kính|vách\s*kính)/i.test(p)) {
    spatialAnchor = 'window';
  } else if (/(?:cạnh|gần|sát|trước|chắn|đối\s*diện)\s*(?:cửa|cửa\s*chính|cửa\s*ra\s*vào|cửa\s*phòng)/i.test(p)) {
    spatialAnchor = 'door';
  } else if (/(?:cạnh|gần|sát|đầu|cuối|chân)\s*(?:giường|nệm|đệm)/i.test(p)) {
    spatialAnchor = 'bed';
  } else if (/(?:cạnh|gần|sát)\s*(?:tủ|tủ\s*quần\s*áo|tủ\s*áo)/i.test(p)) {
    spatialAnchor = 'wardrobe';
  } else if (/(?:cạnh|gần|sát)\s*(?:wc|nhà\s*vệ\s*sinh|phòng\s*vệ\s*sinh|toilet)/i.test(p)) {
    spatialAnchor = 'wc';
  }

  if (spatialAnchor) {
    let targetObj: RoomObjectType | undefined;
    for (const obj of OBJECT_PATTERNS) {
      if (obj.patterns.some((pat) => p.includes(pat))) {
        targetObj = obj.type;
        break;
      }
    }
    return {
      type: 'spatial_relation',
      spatialAnchor,
      targetObjectType: targetObj,
      rawPhrase: p,
    };
  }

  // 4. Pronouns: "nó", "chúng", "chúng nó", "những cái đó", "mấy cái đó", "đồ vật đó"
  const isPronoun = /(?:^|\s|[.,;!?])(nó|chúng|chúng\s*nó|những\s*cái\s*đó|mấy\s*cái\s*đó|đồ\s*vật\s*đó|những\s*thứ\s*đó)(?:\s|[.,;!?]|$)/i.test(p);
  if (isPronoun) {
    return {
      type: 'pronoun',
      rawPhrase: p,
    };
  }

  return undefined;
}

/**
 * Classifies the user's natural language input into one of 10 categories
 * and extracts critical dimensions and parameters.
 */
export function classifyUserIntent(prompt: string): ClassifiedIntent {
  const p = (prompt || '').trim().toLowerCase();

  // Helper: check if any of the keywords match using word boundaries to prevent 'xoa' matching 'xoay'
  const hasWord = (word: string) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s|[.,;!?])${escaped}(\\s|[.,;!?]|$)`, 'i');
    return regex.test(p);
  };
  const matches = (keywords: string[]) => keywords.some((kw) => kw.includes(' ') ? p.includes(kw) : hasWord(kw));

  // Theory question detection (e.g. "Gương đối diện giường có sao không?", "Tại sao nên kê đầu giường sát tường?")
  const isTheoryQuestion = /(có sao không|có tốt không|có nên|tại sao|vì sao|ảnh hưởng gì|ý nghĩa gì|thế nào|như thế nào|hóa giải thế nào|làm sao để|có bị phạm)/i.test(p);

  // Delete action detection: MUST take precedence over ADD to avoid "vừa mới thêm" matching "thêm"
  const isDeleteAction = matches([
    'xóa', 'xoa', 'bỏ', 'loại bỏ', 'bỏ đi', 'vứt bỏ', 'gỡ', 'gỡ bỏ', 'xóa bỏ', 'xoa bo', 'remove', 'delete'
  ]);

  // 1. Check OPTIMIZE_ROOM (Highest priority for room-wide layout command)
  if (
    !isTheoryQuestion &&
    matches([
      'tối ưu toàn bộ', 'tối ưu phòng', 'tối ưu giúp tôi', 'tối ưu bố cục',
      'sắp xếp lại toàn bộ', 'sap xep lai toan bo', 'tối ưu lại', 'optimize room',
      'bố trí lại phòng', 'tối ưu không gian', 'tối ưu phong thủy'
    ])
  ) {
    return {
      intent: 'OPTIMIZE_ROOM',
      confidence: 0.95,
      loadingMessage: 'Đang tối ưu bố cục phòng ngủ theo chuẩn Bát Trạch...',
      needsFengShuiEngine: true,
      needsLayoutOptimizer: true,
      needs3DExecution: true,
    };
  }

  // 2. Check ANALYZE_ROOM (Explicit report/evaluation request)
  if (
    !isTheoryQuestion &&
    matches([
      'phân tích toàn bộ', 'báo cáo phong thủy', 'đánh giá toàn bộ',
      'phân tích phòng', 'điểm phong thủy là bao nhiêu', 'xem báo cáo',
      'phân tích vị trí', 'phân tích bố trí', 'hợp phong thủy không',
      'có hợp phong thủy không', 'đánh giá phong thủy', 'xem phong thủy'
    ])
  ) {
    return {
      intent: 'ANALYZE_ROOM',
      confidence: 0.9,
      loadingMessage: 'Đang phân tích phong thủy căn phòng...',
      needsFengShuiEngine: true,
      needsLayoutOptimizer: false,
      needs3DExecution: false,
    };
  }

  // Detect object type and specific dimensions if present
  let detectedType: RoomObjectType | undefined;
  let detectedName: string | undefined;

  for (const obj of OBJECT_PATTERNS) {
    if (obj.patterns.some((pat) => pat.includes(' ') ? p.includes(pat) : hasWord(pat))) {
      detectedType = obj.type;
      detectedName = obj.name;
      break;
    }
  }

  // Extract dimensions (e.g. 1m6, 1.6m, 1m2, 1m8, 2m, 1.4m)
  let extractedDims: { width: number; length: number; height?: number } | undefined;
  if (detectedType === 'bed') {
    if (p.includes('1m6') || p.includes('1.6m') || p.includes('đôi') || p.includes('queen')) {
      extractedDims = { width: 1.6, length: 2.0, height: 0.95 };
      detectedName = 'Giường đôi 1m6';
    } else if (p.includes('1m8') || p.includes('1.8m')) {
      extractedDims = { width: 1.8, length: 2.0, height: 0.95 };
      detectedName = 'Giường đôi 1m8';
    } else if (p.includes('1m2') || p.includes('1.2m') || p.includes('đơn') || p.includes('single')) {
      extractedDims = { width: 1.2, length: 2.0, height: 0.95 };
      detectedName = 'Giường đơn 1m2';
    } else if (p.includes('2m') || p.includes('king')) {
      extractedDims = { width: 2.0, length: 2.2, height: 0.95 };
      detectedName = 'Giường King 2m';
    } else {
      extractedDims = { width: 1.6, length: 2.0, height: 0.95 };
    }
  } else if (detectedType === 'lamp') {
    if (p.includes('cây') || p.includes('sàn') || p.includes('đứng')) {
      extractedDims = { width: 0.4, length: 0.4, height: 1.4 };
      detectedName = 'Đèn sàn';
    } else {
      extractedDims = { width: 0.35, length: 0.35, height: 0.5 };
      detectedName = p.includes('học') ? 'Đèn học' : 'Đèn ngủ';
    }
  } else if (detectedType === 'desk') {
    extractedDims = { width: 1.3, length: 0.65, height: 0.75 };
    detectedName = p.includes('làm việc') ? 'Bàn làm việc' : 'Bàn học';
  } else if (detectedType === 'chair') {
    extractedDims = { width: 0.55, length: 0.55, height: 0.85 };
    detectedName = 'Ghế ngồi';
  } else if (detectedType === 'wardrobe') {
    extractedDims = { width: 1.8, length: 0.6, height: 2.2 };
    detectedName = 'Tủ quần áo';
  }

  // Extract quantity from Vietnamese natural language (e.g., '2 cái', 'hai chiếc', '3 ghế')
  const extractedQuantity = extractVietnameseQuantity(p);

  // 3. Check ROTATE_OBJECT (Before delete to avoid 'xoay' collision)
  if (
    matches(['xoay', 'quay', 'đổi hướng', 'doi huong', 'rotate'])
  ) {
    let deg = 90;
    if (p.includes('180')) deg = 180;
    else if (p.includes('270')) deg = 270;
    else if (p.includes('45')) deg = 45;

    const contextRef = detectContextReference(p);

    return {
      intent: 'ROTATE_OBJECT',
      confidence: 0.95,
      loadingMessage: `Đang xoay ${detectedName || 'đồ vật'} ${deg} độ...`,
      extractedObjectType: detectedType,
      extractedObjectName: detectedName,
      extractedQuantity,
      rotationDegrees: deg,
      contextReference: contextRef,
      needsFengShuiEngine: false,
      needsLayoutOptimizer: false,
      needs3DExecution: true,
    };
  }

  // 4. Check DELETE_OBJECT (CRITICAL: MUST RUN BEFORE ADD_OBJECT to handle "xóa bàn vừa mới thêm")
  if (isDeleteAction) {
    const contextRef = detectContextReference(p);
    const allItems = extractAllActionItems(p);

    let summaryText = '';
    if (contextRef?.type === 'recently_created') {
      summaryText = 'những đồ vật vừa tạo';
    } else if (contextRef?.type === 'specific_recent') {
      summaryText = `${detectedName || 'đồ vật'} vừa tạo`;
    } else if (contextRef?.type === 'spatial_relation') {
      const anchorName = contextRef.spatialAnchor === 'window' ? 'cạnh cửa sổ' : contextRef.spatialAnchor === 'door' ? 'cạnh cửa' : contextRef.spatialAnchor === 'bed' ? 'cạnh giường' : 'ở vị trí chỉ định';
      summaryText = `${detectedName || 'đồ vật'} ${anchorName}`;
    } else if (contextRef?.type === 'ordinal') {
      summaryText = `đồ vật thứ ${(contextRef.ordinalIndex ?? 0) + 1}`;
    } else if (allItems.length > 1) {
      summaryText = allItems.map((it) => `${it.quantity > 1 ? `${it.quantity} ` : ''}${it.name}`).join(', ');
    } else {
      const qtyText = extractedQuantity > 1 ? `${extractedQuantity} ` : '';
      summaryText = `${qtyText}${detectedName || 'đồ vật'}`;
    }

    return {
      intent: 'DELETE_OBJECT',
      confidence: 0.95,
      loadingMessage: `Đang xóa ${summaryText} khỏi phòng...`,
      extractedObjectType: allItems[0]?.type || detectedType,
      extractedObjectName: allItems[0]?.name || detectedName,
      extractedQuantity: allItems[0]?.quantity || extractedQuantity,
      extractedItems: allItems.length > 0 ? allItems : undefined,
      contextReference: contextRef,
      needsFengShuiEngine: false,
      needsLayoutOptimizer: false,
      needs3DExecution: true,
    };
  }

  // 5. Check ADD_OBJECT (Strictly guarded against delete action and "vừa mới thêm" phrases)
  if (
    !isDeleteAction &&
    !/(vừa|mới|vừa\s*mới|đã)\s*thêm/i.test(p) &&
    matches(['thêm', 'them', 'tạo thêm', 'đặt thêm', 'dat them', 'kê thêm', 'ke them', 'bổ sung', 'mua thêm', 'add'])
  ) {
    const allItems = extractAllActionItems(p);
    const primaryItem = allItems[0];
    const itemType = primaryItem ? primaryItem.type : (detectedType || 'bed');
    const itemName = primaryItem ? primaryItem.name : (detectedName || 'Đồ vật mới');
    const itemDims = primaryItem?.dimensions || extractedDims;
    const itemQty = primaryItem ? primaryItem.quantity : extractedQuantity;

    const summaryText = allItems.length > 1
      ? allItems.map((it) => `${it.quantity > 1 ? `${it.quantity} ` : ''}${it.name}`).join(', ')
      : `${itemQty > 1 ? `${itemQty} ` : ''}${itemName}`;

    return {
      intent: 'ADD_OBJECT',
      confidence: 0.95,
      loadingMessage: `Đang kiểm tra vị trí an toàn và thêm ${summaryText}...`,
      extractedObjectType: itemType,
      extractedObjectName: itemName,
      extractedDimensions: itemDims,
      extractedQuantity: itemQty,
      extractedItems: allItems.length > 0 ? allItems : undefined,
      needsFengShuiEngine: false, // Critical: do NOT run full Bát Trạch report
      needsLayoutOptimizer: false,
      needs3DExecution: true,
    };
  }

  // 6. Check MOVE_OBJECT
  if (
    matches(['di chuyển', 'chuyển', 'dời', 'kê sang', 'kéo sang', 'đẩy sang', 'dịch', 'move'])
  ) {
    let dir: 'left' | 'right' | 'forward' | 'backward' | undefined;
    if (p.includes('trái') || p.includes('trai')) dir = 'left';
    else if (p.includes('phải') || p.includes('phai')) dir = 'right';
    else if (p.includes('lên') || p.includes('trên') || p.includes('sau')) dir = 'forward';
    else if (p.includes('xuống') || p.includes('dưới') || p.includes('trước')) dir = 'backward';

    const contextRef = detectContextReference(p);

    return {
      intent: 'MOVE_OBJECT',
      confidence: 0.92,
      loadingMessage: `Đang kiểm tra vị trí và di chuyển ${detectedName || (contextRef ? 'đồ vật' : 'đồ vật')}...`,
      extractedObjectType: detectedType,
      extractedObjectName: detectedName,
      extractedQuantity,
      targetDirection: dir,
      contextReference: contextRef,
      needsFengShuiEngine: false,
      needsLayoutOptimizer: false,
      needs3DExecution: true,
    };
  }

  // 7. Check RESIZE_OBJECT
  if (
    matches(['thu nhỏ', 'phóng to', 'đổi kích thước', 'kích thước thành', 'rộng thành', 'dài thành', 'resize'])
  ) {
    return {
      intent: 'RESIZE_OBJECT',
      confidence: 0.88,
      loadingMessage: `Đang điều chỉnh kích thước ${detectedName || 'đồ vật'}...`,
      extractedObjectType: detectedType,
      extractedDimensions: extractedDims,
      needsFengShuiEngine: false,
      needsLayoutOptimizer: false,
      needs3DExecution: true,
    };
  }

  // 8. Check FENG_SHUI_CONSULT (Specific Feng Shui theory questions, e.g. "Gương đối diện giường có sao không?")
  if (
    isTheoryQuestion ||
    matches([
      'phong thủy', 'bát trạch', 'quái mệnh', 'ngũ hành', 'sinh khí', 'thiên y',
      'diên niên', 'phục vị', 'tuyệt mệnh', 'ngũ quỷ', 'lục sát', 'họa hại',
      'hướng cát', 'hướng hung', 'xung sát', 'gương chiếu', 'đầu giường hướng',
      'hóa giải', 'hoa giai'
    ])
  ) {
    return {
      intent: 'FENG_SHUI_CONSULT',
      confidence: 0.9,
      loadingMessage: 'Đang tra cứu nguyên lý phong thủy Bát Trạch...',
      needsFengShuiEngine: true,
      needsLayoutOptimizer: false,
      needs3DExecution: false,
    };
  }

  // 9. Check INTERIOR_DESIGN_CONSULT
  if (
    matches([
      'màu sắc', 'chất liệu', 'ánh sáng', 'phong cách', 'hiện đại', 'tối giản',
      'nordic', 'decor', 'trang trí', 'gợi ý mẫu', 'tone màu'
    ])
  ) {
    return {
      intent: 'INTERIOR_DESIGN_CONSULT',
      confidence: 0.85,
      loadingMessage: 'Đang phân tích thẩm mỹ và kiến trúc nội thất...',
      needsFengShuiEngine: false,
      needsLayoutOptimizer: false,
      needs3DExecution: false,
    };
  }

  // 10. Default: CHAT_GENERAL
  return {
    intent: 'CHAT_GENERAL',
    confidence: 0.75,
    loadingMessage: 'AI đang suy nghĩ...',
    needsFengShuiEngine: false,
    needsLayoutOptimizer: false,
    needs3DExecution: false,
  };
}

