import React, { useState, useRef, useEffect } from 'react';
import {
  AIActionCommand,
  FengShuiRoomEvaluation,
  LayoutOptimizationProposal,
  ProposedAdjustment,
  RoomConfig,
  RoomObject,
  UserFengShuiProfile,
} from '../types/fengshui';
import type { StructuredActionHistoryEntry } from '../types/fengshui';
import { generateFengShuiConsultation } from '../engine/geminiFengShuiAI';
import type { ChatHistoryMessage } from '../engine/geminiFengShuiAI';
import { classifyUserIntent } from '../engine/intentClassifier';
import { generateOptimizedLayout } from '../engine/layoutOptimizer';
import { DIRECTION_NAMES_VI } from '../engine/batTrach';
import { getBedHeadboardDirection, getFloorDistance } from '../engine/fengshuiRules';

export interface AnalysisIssueItem {
  id: string;
  targetId?: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  focusLabel?: string;
  focusDist?: string;
  suggestPrompt?: string;
  evidence?: string;
}

export interface AnalysisCardData {
  score: number;
  statusText: string;
  statusLevel: 'excellent' | 'good' | 'neutral' | 'poor';
  issues: AnalysisIssueItem[];
  proposal?: LayoutOptimizationProposal;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: AIActionCommand[];
  proposal?: LayoutOptimizationProposal | null;
  proposedAdjustment?: ProposedAdjustment | null;
  executedSummary?: {
    changes: string[];
    beforeScore?: number;
    afterScore?: number;
  };
  analysisCard?: AnalysisCardData;
}

export interface AIChatConsultantProps {
  userProfile: UserFengShuiProfile;
  roomConfig: RoomConfig;
  objects: RoomObject[];
  evaluation: FengShuiRoomEvaluation;
  selectedObjectId: string | null;
  onPreviewProposal: (proposal: ProposedAdjustment | null, adjustments?: ProposedAdjustment[]) => void;
  onApplyProposal: (proposal: ProposedAdjustment) => void;
  onApplyMultipleAdjustments: (adjustments: ProposedAdjustment[]) => void;
  onExecuteAIAction: (action: AIActionCommand) => boolean | void;
  onExecuteAIActions?: (actions: any[]) => {
    successCount: number;
    failCount: number;
    executedEntries?: StructuredActionHistoryEntry[];
  };
  onOpenOptimizationModal?: (proposal: LayoutOptimizationProposal) => void;
  isPreviewingProposal: boolean;
  externalTriggerPrompt?: string | null;
  onClearExternalTriggerPrompt?: () => void;
  onClose?: () => void;
  onFocusObjects?: (sourceId: string, targetId: string, label: string, distance: string) => void;
}

const QUICK_FEATURE_BADGES = [
  { label: '🔍 Phân tích phong thủy', prompt: 'Phân tích phong thủy chi tiết phòng ngủ hiện tại' },
  { label: '✨ Tối ưu phòng ngủ', prompt: 'Tối ưu phòng ngủ cho tôi' },
  { label: '🛏 Xoay hướng giường', prompt: 'Hãy xoay đầu giường về hướng hợp mệnh gia chủ nhất và cập nhật trên 3D.' },
  { label: '🪞 Xử lý gương soi', prompt: 'Làm sao xử lý việc gương đối diện giường? Hãy gợi ý cách khắc phục và di chuyển trên 3D.' },
  { label: '🌿 Thêm cây xanh', prompt: 'Thêm 2 cây cảnh phong thủy vào phòng' },
  { label: '📐 Sắp xếp nội thất', prompt: 'Sắp xếp lại nội thất phòng ngủ cho gọn gàng và hợp phong thủy' },
];

function buildAnalysisCardData(
  userProfile: UserFengShuiProfile,
  roomConfig: RoomConfig,
  objects: RoomObject[],
  evaluation: FengShuiRoomEvaluation
): AnalysisCardData {
  const issues: AnalysisIssueItem[] = [];

  const mirror = objects.find((o) => o.type === 'mirror');
  const bed = objects.find((o) => o.type === 'bed');
  const desk = objects.find((o) => o.type === 'desk');

  // Check 1: Mirror facing bed
  const mirrorEval = evaluation.items.find((i) => i.type === 'mirror');
  const hasMirrorConflict = Boolean(
    mirrorEval?.hasDirectConflict ||
    (mirror && bed && Math.abs(mirror.position.z - bed.position.z) < 1.6)
  );
  if (hasMirrorConflict && mirror) {
    issues.push({
      id: mirror.id,
      targetId: bed ? bed.id : undefined,
      title: 'Giường đối diện gương',
      description: 'Gương đang nằm đối diện trực tiếp với giường, không tốt cho giấc ngủ và bất an tâm thần.',
      severity: 'high',
      focusLabel: 'Gương đối diện giường',
      focusDist: mirror && bed ? `${getFloorDistance(mirror.position, bed.position).toFixed(1)}m` : '1.4m',
      suggestPrompt: 'Làm sao xử lý việc gương đối diện giường? Hãy gợi ý cách khắc phục và di chuyển trên 3D.',
      evidence: 'Khoảng cách trực diện < 1.6m, xung sát chiếu thẳng vào giường.',
    });
  }

  // Check 2: Bed headboard direction
  if (bed) {
    const headboardDir = getBedHeadboardDirection(bed.rotation.y);
    const isGood = userProfile.auspiciousDirections.includes(headboardDir);
    if (!isGood) {
      issues.push({
        id: bed.id,
        title: 'Hướng đầu giường chưa tối ưu',
        description: `Đầu giường hiện quay về hướng ${DIRECTION_NAMES_VI[headboardDir] || headboardDir}, không thuộc nhóm hướng tốt của gia chủ (${userProfile.guaName} - ${userProfile.group}).`,
        severity: 'medium',
        focusLabel: `Hướng đầu giường: ${DIRECTION_NAMES_VI[headboardDir] || headboardDir}`,
        focusDist: 'Chưa tối ưu',
        suggestPrompt: 'Hãy xoay đầu giường về hướng hợp mệnh gia chủ nhất và cập nhật trên 3D.',
        evidence: `Gia chủ hợp các hướng: ${userProfile.auspiciousDirections.map((d) => DIRECTION_NAMES_VI[d] || d).join(', ')}.`,
      });
    }
  }

  // Check 3: Desk position & circulation
  if (desk) {
    const halfW = roomConfig.width / 2;
    const halfL = roomConfig.length / 2;
    const isNearCenter = Math.abs(desk.position.x) < halfW * 0.35 && Math.abs(desk.position.z) < halfL * 0.35;
    if (isNearCenter) {
      issues.push({
        id: desk.id,
        title: 'Bàn học có thể tối ưu',
        description: 'Bàn học đang nằm gần trung tâm phòng. Có thể di chuyển về khu vực đón sinh khí và ánh sáng tự nhiên.',
        severity: 'low',
        focusLabel: 'Vị trí bàn học',
        focusDist: 'Gần tâm phòng',
        suggestPrompt: 'Hãy di chuyển bàn học về vị trí phong thủy tốt nhất cho học tập và làm việc.',
        evidence: 'Tọa lạc gần Trung Cung gây cản trở dòng khí lưu thông xuyên suốt phòng.',
      });
    }
  }

  // Additional items from evaluation
  evaluation.items.forEach((item) => {
    if (item.status === 'bad' && !issues.some((iss) => iss.id === item.objectId)) {
      issues.push({
        id: item.objectId,
        title: `${item.objectName} cần cải thiện`,
        description: item.issues[0] || 'Vị trí hiện tại chưa hài hòa với cung vị.',
        severity: 'medium',
        focusLabel: item.objectName,
        suggestPrompt: `Tối ưu vị trí cho ${item.objectName}`,
      });
    }
  });

  // Always compute collision-free layout optimization proposal
  const { proposal } = generateOptimizedLayout(userProfile, roomConfig, objects, evaluation);

  return {
    score: evaluation.overallScore,
    statusText: evaluation.statusText,
    statusLevel: evaluation.statusLevel,
    issues,
    proposal,
  };
}

export const AIChatConsultant: React.FC<AIChatConsultantProps> = ({
  userProfile,
  roomConfig,
  objects,
  evaluation,
  selectedObjectId,
  onPreviewProposal,
  onApplyProposal,
  onApplyMultipleAdjustments,
  onExecuteAIAction,
  onExecuteAIActions,
  onOpenOptimizationModal,
  isPreviewingProposal,
  externalTriggerPrompt,
  onClearExternalTriggerPrompt,
  onClose,
  onFocusObjects,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actionHistory, setActionHistory] = useState<StructuredActionHistoryEntry[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeminiOnline, setIsGeminiOnline] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<string>('AI đang suy nghĩ...');
  const [loadingDetails, setLoadingDetails] = useState<string[]>([]);
  const [apiKeyInput, setApiKeyInput] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : ''
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check Gemini online status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const savedKey = localStorage.getItem('gemini_api_key') || '';
        const headers: Record<string, string> = {};
        if (savedKey) headers['x-gemini-api-key'] = savedKey;
        const res = await fetch('/api/gemini/status', { headers });
        if (res.ok) {
          const data = await res.json();
          setIsGeminiOnline(Boolean(data.isOnline));
        }
      } catch {
        setIsGeminiOnline(false);
      }
    };
    checkStatus();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle external prompt trigger
  useEffect(() => {
    if (externalTriggerPrompt) {
      handleSendMessage(externalTriggerPrompt);
      if (onClearExternalTriggerPrompt) {
        onClearExternalTriggerPrompt();
      }
    }
  }, [externalTriggerPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isLoading) return;

    // Fast-path Intent Classification
    const intentInfo = classifyUserIntent(promptText);
    setCurrentLoadingMessage(intentInfo.loadingMessage);

    if (intentInfo.intent === 'ADD_OBJECT') {
      setLoadingDetails(['Xác định kích thước đồ vật', 'Kiểm tra va chạm & khoảng trống', 'Cập nhật mô hình 3D']);
    } else if (
      intentInfo.intent === 'MOVE_OBJECT' ||
      intentInfo.intent === 'ROTATE_OBJECT' ||
      intentInfo.intent === 'DELETE_OBJECT'
    ) {
      setLoadingDetails(['Xác định đối tượng', 'Kiểm tra tọa độ hợp lệ', 'Cập nhật hướng/vị trí 3D']);
    } else if (intentInfo.intent === 'OPTIMIZE_ROOM') {
      setLoadingDetails(['Đánh giá Bát Trạch', 'Tính toán hoán đổi vị trí', 'Tối ưu luồng khí & công năng']);
    } else if (intentInfo.intent === 'FENG_SHUI_CONSULT' || intentInfo.intent === 'ANALYZE_ROOM') {
      setLoadingDetails(['Tra cứu Quái mệnh gia chủ', 'Kiểm tra hướng cát/hung', 'Phân tích xung sát']);
    } else {
      setLoadingDetails([]);
    }

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: promptText,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    // Cancel Ghost Preview if user explicitly requests cancel/undo preview
    if (/(^|\s)(hủy|huy|tắt xem trước|tat xem truoc|bỏ xem trước|bo xem truoc|dừng xem trước)(\s|$)/i.test(promptText)) {
      onPreviewProposal(null, []);
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: '✓ Đã tắt xem trước bóng mờ 3D và khôi phục hiển thị bình thường.',
        },
      ]);
      setIsLoading(false);
      return;
    }

    // Check if this is an explicit Analysis Request
    const isAnalysisRequest =
      intentInfo.intent === 'ANALYZE_ROOM' ||
      /(phân tích|phan tich|đánh giá|danh gia|báo cáo phong thủy|bao cao phong thuy|điểm phong thủy|diem phong thuy|xem phong thủy|xem phong thuy|hợp phong thủy không|phong thủy thế nào|phòng.*hợp phong thủy)/i.test(
        promptText
      );

    // Check if this is an explicit Optimization Request
    const isOptimizeRequest =
      intentInfo.intent === 'OPTIMIZE_ROOM' ||
      /(tối ưu phòng|tối ưu bố cục|sắp xếp lại|optimize|tối ưu phong thủy|tối ưu cho tôi|tối ưu giúp tôi)/i.test(promptText);

    if (isAnalysisRequest) {
      const analysisCardData = buildAnalysisCardData(userProfile, roomConfig, objects, evaluation);
      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: `Dưới đây là đánh giá phong thủy tổng thể và đề xuất bố cục cho phòng ngủ:`,
        analysisCard: analysisCardData,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
      return;
    }

    if (isOptimizeRequest) {
      const analysisCardData = buildAnalysisCardData(userProfile, roomConfig, objects, evaluation);
      // Auto-trigger ghost preview in 3D so user immediately sees the proposed layout
      if (analysisCardData.proposal) {
        onPreviewProposal(null, analysisCardData.proposal.adjustments);
      }

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: `Tôi đã lập phương án tối ưu bố cục và phong thủy cho phòng ngủ. Đang hiển thị bóng mờ 3D trên không gian:`,
        analysisCard: analysisCardData,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
      return;
    }

    try {
      // Build conversation history (excluding the message we just added)
      const chatHistory: ChatHistoryMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await generateFengShuiConsultation(
        promptText,
        userProfile,
        roomConfig,
        objects,
        evaluation,
        selectedObjectId,
        chatHistory,
        actionHistory
      );

      if (response.isGeminiOnline !== undefined) {
        setIsGeminiOnline(response.isGeminiOnline);
      }

      let executedSummary = undefined;
      if (response.actions && response.actions.length > 0) {
        // Execute validated actions on 3D scene atomically
        const successfulChanges: string[] = [];

        if (onExecuteAIActions) {
          const { successCount, executedEntries } = onExecuteAIActions(response.actions);
          if (executedEntries && executedEntries.length > 0) {
            setActionHistory((prev) => [...prev, ...executedEntries]);
          }
          if (successCount > 0) {
            response.actions.forEach((act: AIActionCommand) => {
              successfulChanges.push(act.description || `Thực hiện ${act.type}`);
            });
          }
        } else {
          response.actions.forEach((act: AIActionCommand) => {
            const res = onExecuteAIAction(act);
            if (res !== false) {
              successfulChanges.push(act.description || `Thực hiện ${act.type}`);
            }
          });
        }

        if (successfulChanges.length > 0) {
          executedSummary = {
            changes: successfulChanges,
          };
        }
      }

      const hasActionCommands = Boolean(
        response.actions &&
        response.actions.length > 0 &&
        response.actions.some((a) =>
          ['add_object', 'delete_object', 'move_object', 'rotate_object'].includes(a.type)
        )
      );

      // If response includes proposal, activate ghost preview (ONLY when not an action-only command)
      if (response.proposal && !hasActionCommands) {
        onPreviewProposal(null, response.proposal.adjustments);
      }

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: response.replyText,
        actions: response.actions,
        proposal: hasActionCommands ? undefined : response.proposal,
        proposedAdjustment: hasActionCommands ? undefined : response.proposedAdjustment,
        executedSummary,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error generating AI response:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'Xin lỗi, hệ thống AI đang bận. Tôi vẫn có thể giúp bạn tối ưu phòng ngủ hoặc phân tích Bát Trạch.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyProposalWithFeedback = (proposal: LayoutOptimizationProposal) => {
    onApplyMultipleAdjustments(proposal.adjustments);
    if (onPreviewProposal) {
      onPreviewProposal(null, []);
    }

    const executedMsg: ChatMessage = {
      id: `exec_${Date.now()}`,
      role: 'assistant',
      content: '✓ Đã cập nhật căn phòng thành công theo phương án tối ưu!',
      executedSummary: {
        changes: proposal.adjustments.map((adj) => adj.reason),
        beforeScore: proposal.beforeScore,
        afterScore: proposal.afterScore,
      },
    };

    setMessages((prev) => [...prev, executedMsg]);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden text-stone-800 select-none bg-white">
      {/* 1. UNIFIED HEADER: Trò chuyện AI */}
      <div className="px-3.5 py-2.5 border-b border-stone-100 flex items-center justify-between gap-2 shrink-0 bg-white">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#00705a] flex items-center justify-center text-sm font-bold shadow-2xs border border-emerald-200/80 shrink-0">
            <svg className="w-4 h-4 text-[#00705a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3v18" />
              <path d="M3 12h18" />
              <path d="m5.6 5.6 12.8 12.8" />
              <path d="m18.4 5.6-12.8 12.8" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-stone-900 tracking-tight leading-none truncate">
              Trò chuyện AI
            </h2>
            <p className="text-[10px] text-stone-500 mt-0.5 leading-none font-medium truncate">
              Tư vấn phong thủy & Thao tác 3D
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pr-0.5">
          {/* Gemini AI Status Badge & Key Button */}
          {isGeminiOnline ? (
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-100 transition-colors shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
              title="Gemini 3.8 Flash đang online. Nhấn để xem/đổi API Key."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Gemini 3.8</span>
            </button>
          ) : (
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-bold flex items-center gap-1 hover:bg-amber-100 transition-colors shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
              title="Chưa kích hoạt Gemini (đang chạy Offline). Nhấn để nhập API Key!"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Offline</span>
            </button>
          )}

          <div className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold whitespace-nowrap shrink-0">
            Live 3D
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center text-xs transition-colors shrink-0 cursor-pointer"
              title="Thu gọn panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. QUICK FEATURE BADGES */}
      <div className="px-3 py-2 bg-stone-50/70 border-b border-stone-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 pr-4">
        {QUICK_FEATURE_BADGES.map((b, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(b.prompt)}
            className="px-2.5 py-1 rounded-xl bg-white border border-stone-200/80 hover:border-emerald-400 hover:bg-emerald-50/50 text-[10px] font-medium text-stone-700 hover:text-emerald-900 whitespace-nowrap transition-all shadow-2xs flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer"
          >
            <span>{b.label}</span>
          </button>
        ))}
        <span className="shrink-0 w-2" />
      </div>

      {/* 3. MESSAGES & DIALOGUE BODY */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin text-xs">
        {/* Intro Greeting when empty */}
        {messages.length === 0 && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-stone-50 to-emerald-50/40 border border-stone-200/80 space-y-2.5">
              <p className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <span>👋</span>
                <span>Xin chào gia chủ {userProfile.birthYear} ({userProfile.guaName} · {userProfile.element} · {userProfile.group})</span>
              </p>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Tôi là Trợ lý AI Phong Thủy Studio. Tôi có thể đọc trực tiếp vị trí các đồ vật trong phòng để phân tích Bát Trạch và thực hiện lệnh điều khiển 3D (thêm, xóa, di chuyển, xoay, tối ưu bố cục).
              </p>

              {/* Real-time score & quick action buttons */}
              <div className="p-2.5 bg-white rounded-xl border border-stone-200/80 shadow-2xs flex items-center justify-between gap-2">
                <div>
                  <span className="text-[9px] text-stone-400 block font-medium">Điểm phong thủy hiện tại</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm font-extrabold text-[#00705a] leading-none">
                      {evaluation.overallScore}/100
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium">({evaluation.statusText})</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSendMessage('Phân tích phong thủy chi tiết phòng ngủ hiện tại')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#00705a] border border-emerald-200 text-[10px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    🔍 Phân tích
                  </button>
                  <button
                    onClick={() => handleSendMessage('Tối ưu phòng ngủ cho tôi')}
                    className="px-2.5 py-1 rounded-lg bg-[#00705a] hover:bg-[#005c4a] text-white text-[10px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    ✨ Tối ưu ngay
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider px-1">
                Gợi ý câu lệnh nhanh
              </p>
              {[
                'Phân tích phong thủy chi tiết phòng ngủ',
                'Tối ưu phòng ngủ cho tôi',
                'Tại sao nên xoay hướng đầu giường?',
                'Thêm bàn làm việc ở góc phòng',
                'Di chuyển gương sang vị trí khác',
                'Xóa những đồ vật vừa tạo',
              ].map((text, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(text)}
                  className="w-full text-left p-2.5 rounded-xl border border-stone-200/80 bg-white hover:bg-stone-50 hover:border-emerald-300 text-[11px] font-medium text-stone-700 transition-all shadow-2xs flex items-center justify-between group cursor-pointer"
                >
                  <span>{text}</span>
                  <span className="text-stone-400 group-hover:text-emerald-700 transition-colors">↗</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dialogue Messages */}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[94%] p-3.5 rounded-2xl leading-relaxed ${
                m.role === 'user'
                  ? 'bg-stone-900 text-white rounded-br-xs font-medium shadow-xs'
                  : 'bg-stone-50/90 border border-stone-200/90 text-stone-800 rounded-bl-xs shadow-2xs'
              }`}
            >
              <div className="whitespace-pre-line text-xs">{m.content}</div>

              {/* CARD TYPE 1: INTEGRATED FENG SHUI ANALYSIS CARD */}
              {m.analysisCard && (
                <div className="mt-3 p-3 bg-white rounded-2xl border border-emerald-300/90 shadow-sm space-y-3 animate-in fade-in zoom-in-95">
                  {/* Status & Score Banner */}
                  <div className="p-2.5 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0] flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        ✓
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          Đã phân tích phong thủy hoàn tất
                        </p>
                        <p className="text-[10px] text-stone-600 truncate">
                          Phát hiện {m.analysisCard.issues.length} điểm cần cải thiện
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] text-stone-400 block font-medium">Hiện tại</span>
                      <span className="text-sm font-extrabold text-[#00705a] leading-none">
                        {m.analysisCard.score}/100
                      </span>
                    </div>
                  </div>

                  {/* Priority Issues List */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <h4 className="text-xs font-bold text-stone-900 tracking-tight">
                        {m.analysisCard.issues.length} điểm cần cải thiện
                      </h4>
                    </div>

                    {m.analysisCard.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-stone-50/80 rounded-xl border border-stone-200/90 shadow-2xs hover:border-[#00705a]/50 transition-all flex items-start justify-between gap-2.5"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div
                            className={`w-4.5 h-4.5 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                              issue.severity === 'high'
                                ? 'bg-rose-500'
                                : issue.severity === 'medium'
                                ? 'bg-orange-500'
                                : 'bg-amber-500'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-stone-900 leading-tight">
                              {issue.title}
                            </h5>
                            <p className="text-[10px] text-stone-500 mt-0.5 leading-snug line-clamp-2">
                              {issue.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {issue.suggestPrompt && (
                                <button
                                  onClick={() => handleSendMessage(issue.suggestPrompt)}
                                  className="text-[10px] font-bold text-[#00705a] hover:text-[#005c4a] flex items-center gap-0.5 transition-colors cursor-pointer"
                                >
                                  <span>Hỏi AI gợi ý</span>
                                  <span className="text-[11px]">›</span>
                                </button>
                              )}
                              {issue.id && onFocusObjects && (
                                <button
                                  onClick={() =>
                                    onFocusObjects(
                                      issue.id,
                                      issue.targetId || '',
                                      issue.focusLabel || issue.title,
                                      issue.focusDist || ''
                                    )
                                  }
                                  className="text-[10px] text-stone-500 hover:text-stone-800 font-medium cursor-pointer"
                                >
                                  Xem trên 3D
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Visual Thumbnail */}
                        <div className="w-10 h-10 rounded-lg bg-white border border-stone-200/80 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          {idx === 0 ? (
                            <svg className="w-7 h-7" viewBox="0 0 64 64" fill="none">
                              <rect x="8" y="24" width="48" height="28" rx="3" fill="#D97706" fillOpacity="0.8" />
                              <rect x="12" y="28" width="40" height="20" rx="2" fill="#FFFFFF" />
                              <rect x="16" y="22" width="14" height="8" rx="2" fill="#FEF3C7" />
                              <rect x="34" y="22" width="14" height="8" rx="2" fill="#FEF3C7" />
                              <rect x="44" y="10" width="12" height="20" rx="1" fill="#94A3B8" stroke="#475569" strokeWidth="1.5" />
                            </svg>
                          ) : idx === 1 ? (
                            <svg className="w-7 h-7" viewBox="0 0 64 64" fill="none">
                              <path d="M10 36 L54 36 L54 48 L10 48 Z" fill="#78350F" />
                              <path d="M10 20 L54 20 L54 36 L10 36 Z" fill="#B45309" />
                              <circle cx="32" cy="18" r="8" stroke="#DC2626" strokeWidth="2" fill="none" />
                              <line x1="32" y1="12" x2="32" y2="24" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
                              <polygon points="32,10 36,16 28,16" fill="#DC2626" />
                            </svg>
                          ) : (
                            <svg className="w-7 h-7" viewBox="0 0 64 64" fill="none">
                              <rect x="8" y="26" width="48" height="6" rx="2" fill="#8D5B4C" />
                              <rect x="12" y="32" width="4" height="22" rx="1" fill="#6A3B2F" />
                              <rect x="48" y="32" width="4" height="22" rx="1" fill="#6A3B2F" />
                              <rect x="22" y="18" width="16" height="8" rx="1" fill="#475569" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Optimization Proposal Section inside Analysis Card */}
                  {m.analysisCard.proposal && (
                    <div className="p-3 bg-[#F9FAFB] rounded-xl border border-stone-200/80 flex flex-col gap-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4.5 h-4.5 rounded-full bg-[#00705a] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                            ✓
                          </div>
                          <h4 className="text-xs font-bold text-stone-900">Đề xuất tối ưu</h4>
                        </div>
                        <span className="text-[10px] font-bold text-[#00705a] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {m.analysisCard.proposal.beforeScore}đ → {m.analysisCard.proposal.afterScore}đ
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 text-[10px] text-stone-700">
                        {m.analysisCard.proposal.improvements.slice(0, 4).map((imp, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="text-[#00705a] font-bold">✓</span>
                            <span className="truncate">{imp}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (isPreviewingProposal) {
                              onPreviewProposal(null, []);
                            } else {
                              onPreviewProposal(null, m.analysisCard!.proposal!.adjustments);
                            }
                          }}
                          className={`px-2.5 py-1.5 font-semibold rounded-lg text-xs transition-all active:scale-98 shadow-xs flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
                            isPreviewingProposal
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                        >
                          <span>{isPreviewingProposal ? '✕' : '👁'}</span>
                          <span>{isPreviewingProposal ? 'Tắt xem' : 'Xem trước 3D'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyProposalWithFeedback(m.analysisCard!.proposal!)}
                          className="flex-1 py-1.5 bg-[#00705a] hover:bg-[#005c4a] text-white font-bold rounded-lg text-xs transition-all active:scale-98 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>✦</span>
                          <span>Áp dụng đề xuất ({m.analysisCard.proposal.adjustments.length})</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CARD TYPE 2: STANDALONE LAYOUT OPTIMIZATION PROPOSAL CARD */}
              {m.proposal && !m.analysisCard && (
                <div className="mt-3 p-3 bg-white rounded-2xl border border-emerald-400/90 shadow-sm space-y-2.5 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                    <span className="font-bold text-emerald-900 text-xs">
                      ✨ {m.proposal.title}
                    </span>
                    <span className="font-bold text-emerald-700 text-xs font-mono bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {m.proposal.beforeScore}đ → {m.proposal.afterScore}đ
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-stone-600">
                    {m.proposal.adjustments.map((adj, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold shrink-0">{i + 1}.</span>
                        <span>{adj.reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* 2 Primary Buttons: Xem trước 3D & Áp dụng */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (isPreviewingProposal) {
                          onPreviewProposal(null, []);
                        } else {
                          onPreviewProposal(null, m.proposal!.adjustments);
                        }
                      }}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs active:scale-95 cursor-pointer ${
                        isPreviewingProposal
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300/80'
                      }`}
                    >
                      <span>{isPreviewingProposal ? '✕' : '👁'}</span>
                      <span>{isPreviewingProposal ? 'Tắt xem trước' : 'Xem trước 3D'}</span>
                    </button>
                    <button
                      onClick={() => handleApplyProposalWithFeedback(m.proposal!)}
                      className="flex-1 py-1.5 px-2.5 bg-[#00705a] hover:bg-[#005c4a] active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>✓</span>
                      <span>Áp dụng</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CARD TYPE 3: EXECUTED ACTION CONFIRMATION SUMMARY */}
              {m.executedSummary && (
                <div className="mt-2.5 p-3 bg-emerald-50/70 rounded-2xl border border-emerald-300 text-[11px] space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between font-bold text-emerald-900 text-xs">
                    <span>✓ Đã cập nhật không gian 3D</span>
                    {m.executedSummary.afterScore && (
                      <span className="font-mono text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                        {m.executedSummary.beforeScore || 51}đ → {m.executedSummary.afterScore}/100
                      </span>
                    )}
                  </div>
                  <ul className="space-y-0.5 text-stone-700">
                    {m.executedSummary.changes.map((chg, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{chg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Dynamic task-based loading state */}
        {isLoading && (
          <div className="p-3 bg-stone-50/90 border border-stone-200/90 rounded-2xl space-y-1.5 text-stone-800 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping shrink-0" />
              <span>{currentLoadingMessage}</span>
            </div>
            {loadingDetails.length > 0 && (
              <div className="pl-4 space-y-0.5 text-[11px] text-stone-600">
                {loadingDetails.map((detail, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <span>✓</span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. INPUT AREA */}
      <div className="p-3 border-t border-stone-100 bg-white space-y-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi phong thủy, yêu cầu tối ưu hoặc ra lệnh cho phòng 3D..."
            disabled={isLoading}
            className="w-full pl-3.5 pr-10 py-2.5 border border-stone-200 rounded-2xl text-xs focus:outline-none focus:ring-1.5 focus:ring-[#00705a] bg-stone-50/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 p-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-white rounded-xl transition-all active:scale-95 shadow-2xs cursor-pointer"
            title="Gửi lệnh"
          >
            <span className="text-xs">↗</span>
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
          <button
            onClick={() => handleSendMessage('Tối ưu phòng ngủ cho tôi')}
            className="flex items-center gap-1 hover:text-[#00705a] transition-colors font-medium cursor-pointer"
          >
            <span>✨ Tối ưu ngay</span>
          </button>
          <button
            onClick={() => handleSendMessage('Phân tích phong thủy chi tiết phòng ngủ hiện tại')}
            className="flex items-center gap-1 hover:text-[#00705a] transition-colors font-medium cursor-pointer"
          >
            <span>🔍 Phân tích</span>
          </button>
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1 hover:text-stone-800 transition-colors cursor-pointer"
          >
            <span>🗑 Xóa đoạn chat</span>
          </button>
        </div>
      </div>

      {/* 5. API KEY CONFIGURATION MODAL */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Kích hoạt Gemini AI</h4>
                  <p className="text-[11px] text-stone-500">Mở khóa trò chuyện tự do đa năng</p>
                </div>
              </div>
              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-stone-600">
              <p>
                Nhập <strong>Google Gemini API Key</strong> để kích hoạt model <strong>Gemini 3.8 Flash</strong>. Khi có API Key, bạn có thể trò chuyện tự do, hỏi bất kỳ điều gì về phong thủy, nội thất và đồ vật trong phòng.
              </p>
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-900">
                💡 <strong>Chưa có key?</strong> Bạn có thể lấy miễn phí tại{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-emerald-700 hover:text-emerald-900"
                >
                  Google AI Studio
                </a>.
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-700">Gemini API Key</label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  localStorage.removeItem('gemini_api_key');
                  setApiKeyInput('');
                  setIsGeminiOnline(false);
                  setIsApiKeyModalOpen(false);
                }}
                className="px-3 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
              >
                Xóa Key
              </button>
              <button
                onClick={async () => {
                  const trimmed = apiKeyInput.trim();
                  if (trimmed) {
                    localStorage.setItem('gemini_api_key', trimmed);
                  } else {
                    localStorage.removeItem('gemini_api_key');
                  }
                  try {
                    const res = await fetch('/api/gemini/status', {
                      headers: trimmed ? { 'x-gemini-api-key': trimmed } : {},
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setIsGeminiOnline(Boolean(data.isOnline));
                    }
                  } catch {
                    setIsGeminiOnline(Boolean(trimmed));
                  }
                  setIsApiKeyModalOpen(false);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-[#00705a] hover:bg-[#005c4a] text-white text-xs font-bold transition-all shadow-sm active:scale-95 text-center cursor-pointer"
              >
                Lưu & Kích hoạt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
