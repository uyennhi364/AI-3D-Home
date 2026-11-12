// =============================================================================
// src/engine/agent/unifiedAgent.ts
// Phase P7 — Unified Gemini AI Agent Orchestrator & Multi-Turn Tool Loop
// =============================================================================

import { GoogleGenAI } from '@google/genai';
import { RoomConfig, RoomObject, UserFengShuiProfile } from '../../types/fengshui.js';
import {
  AgentResponse,
  UnifiedIntentCategory,
  ToolCategory,
  UnifiedAgentConfig,
} from './agentTypes.js';
import {
  AGENT_FUNCTION_DECLARATIONS,
  TOOL_CATEGORY_MAP,
  executeAgentTool,
  ToolExecutionContext,
} from './agentTools.js';
import { computeRobustSceneVersion, computeArgsHash } from './sceneHasher.js';
import { ProposalManager, globalProposalManager } from './proposalManager.js';
import { TransactionManager, globalTransactionManager } from './transactionManager.js';
import { evaluateIntentSafety } from '../../services/intentGuard.js';
import { PersonalProfile } from '../core/personalProfile.js';

export const UNIFIED_SYSTEM_PROMPT = `Bạn là Trợ lý AI Độc Nhất (Unified AI Agent) của AI Feng Shui Studio.
Bạn có chuyên môn sâu về Phong thủy Bát Trạch & Loan Đầu, Kiến trúc Nội thất Hiện đại và Công thái học không gian.

NGUYÊN TẮC HOẠT ĐỘNG:
1. Giao tiếp hoàn toàn bằng tiếng Việt tự nhiên, chuyên nghiệp, ấm áp và khiêm tốn.
2. KHÔNG tự bịa đặt thông số, hướng nhà, số đo hoặc vị trí vật thể. Hãy sử dụng các công cụ READ-ONLY để truy xuất sự thật hiện trạng.
3. THỦ TỤC 3 BƯỚC ĐỐI VỚI THAY ĐỔI 3D:
   - Bước 1 (Đề xuất): Sử dụng các tool nhóm PROPOSE (propose_move_object, propose_rotate_object, propose_add_object, propose_delete_object, propose_optimize_layout). Tool sẽ tạo Proposal an toàn mà KHÔNG làm thay đổi scene thật.
   - Bước 2 (Xem trước): Bật preview_scene_changes để người dùng nhìn thấy bóng mờ 3D (Ghost Mesh) và so sánh trước/sau.
   - Bước 3 (Thực thi): Chỉ thực thi confirm_scene_changes khi người dùng đã xem và đồng ý xác nhận.
4. KHÔNG tự ý thực thi các lệnh phá huỷ (như xóa đồ, tối ưu toàn phòng) nếu chưa có đề xuất và sự chấp thuận của người dùng.
5. Nếu câu hỏi là thắc mắc lý thuyết hoặc tư vấn (THEORY / ANALYZE): giải thích rõ ràng và KHÔNG gọi tool thay đổi scene.
6. Nếu người dùng muốn hoàn tác, gọi tool undo_last_action.
7. Khi giải thích phong thủy, luôn giải thích rõ ràng căn cứ (Loan Đầu điểm tựa, Bát Trạch cung vị, khoảng thông thủy lối đi) và lưu ý đây là kiến thức tham khảo văn hóa, không hứa hẹn kết quả siêu nhiên.`;

export interface RunAgentParams {
  prompt: string;
  sessionId?: string;
  roomConfig: RoomConfig;
  objects: RoomObject[];
  userProfile?: UserFengShuiProfile;
  personalProfile?: PersonalProfile;
  chatHistory?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  genAIClient?: GoogleGenAI | null;
  config?: UnifiedAgentConfig;
  proposalManager?: ProposalManager;
  transactionManager?: TransactionManager;
}

export class UnifiedAgent {
  private proposalManager: ProposalManager;
  private transactionManager: TransactionManager;

  constructor(
    proposalManager: ProposalManager = globalProposalManager,
    transactionManager: TransactionManager = globalTransactionManager
  ) {
    this.proposalManager = proposalManager;
    this.transactionManager = transactionManager;
  }

  /**
   * Main entrypoint for processing user messages.
   */
  public async handleUserMessage(params: RunAgentParams): Promise<AgentResponse> {
    const {
      prompt,
      sessionId = 'default_session',
      roomConfig,
      objects,
      userProfile,
      personalProfile,
      chatHistory = [],
      genAIClient = null,
      config = {},
    } = params;

    const maxTurns = config.maxTurns ?? 5;
    const maxToolCalls = config.maxToolCallsPerTurn ?? 8;
    const currentSceneVersion = computeRobustSceneVersion(objects, roomConfig);

    // 1. Evaluate Intent Safety upfront
    const targetObjectFound = objects.some(
      (o) =>
        prompt.toLowerCase().includes(o.type.toLowerCase()) ||
        prompt.toLowerCase().includes(o.name.toLowerCase())
    );
    const guard = evaluateIntentSafety(prompt, targetObjectFound);

    // Map Guard Execution Mode to Unified Intent
    const intent: UnifiedIntentCategory = guard.executionMode === 'THEORY'
      ? 'THEORY'
      : guard.executionMode === 'ANALYZE'
        ? 'ANALYZE'
        : guard.executionMode === 'PROPOSE'
          ? 'PROPOSE'
          : guard.executionMode === 'COMMAND'
            ? 'COMMAND'
            : guard.executionMode === 'UNDO'
              ? 'UNDO'
              : 'CHAT';

    // 2. Ambiguous Target Check for COMMAND mode
    if (intent === 'COMMAND' && guard.requiresTargetClarification) {
      return {
        reply: 'Vui lòng cho biết bạn muốn thao tác với đồ vật nào cụ thể (ví dụ: giường ngủ, bàn làm việc, tủ quần áo...) hoặc nhấp chọn trực tiếp đồ vật trên khung nhìn 3D.',
        intent: 'COMMAND',
        sessionId,
        sceneVersion: currentSceneVersion,
        suggestedFollowUps: ['Di chuyển giường', 'Xoay bàn làm việc 90 độ', 'Xóa cây phong thủy'],
      };
    }

    // 3. Fast-path Undo Execution
    if (intent === 'UNDO') {
      const undoRes = this.transactionManager.undo(sessionId);
      if (undoRes.success) {
        return {
          reply: 'Đã hoàn tác thao tác thay đổi phòng gần nhất. Không gian 3D đã được khôi phục về trạng thái trước đó.',
          intent: 'UNDO',
          sessionId,
          sceneVersion: computeRobustSceneVersion(undoRes.restoredObjects || objects, roomConfig),
          transaction: {
            transactionId: undoRes.transactionId || 'tx_undo',
            proposalId: '',
            sessionId,
            fnName: 'undo_last_action',
            createdAt: Date.now(),
            status: 'committed',
            beforeSnapshot: {
              sceneVersion: currentSceneVersion,
              objects,
              roomConfig,
              timestamp: new Date().toISOString(),
            },
            afterSnapshot: {
              sceneVersion: computeRobustSceneVersion(undoRes.restoredObjects || objects, roomConfig),
              objects: undoRes.restoredObjects || objects,
              roomConfig,
              timestamp: new Date().toISOString(),
            },
            changes: [],
            verificationResult: { passed: true, violations: [] },
          },
        };
      } else {
        return {
          reply: undoRes.error || 'Không có thao tác nào trong lịch sử để hoàn tác.',
          intent: 'UNDO',
          sessionId,
          sceneVersion: currentSceneVersion,
        };
      }
    }

    // 4. Offline Fallback Handling (When Gemini API Client is null / unavailable)
    if (!genAIClient) {
      return this.handleOfflineFallback(prompt, intent, sessionId, currentSceneVersion, roomConfig, objects, userProfile);
    }

    // 5. Online Gemini Agent Loop with Function Calling
    return this.runGeminiAgentLoop({
      prompt,
      sessionId,
      intent,
      roomConfig,
      objects,
      userProfile,
      personalProfile,
      chatHistory,
      genAIClient,
      maxTurns,
      maxToolCalls,
      currentSceneVersion,
    });
  }

  /**
   * Offline Fallback Generator.
   * GUARANTEE: Never executes write mutations locally!
   */
  private handleOfflineFallback(
    prompt: string,
    intent: UnifiedIntentCategory,
    sessionId: string,
    currentSceneVersion: string,
    roomConfig: RoomConfig,
    objects: RoomObject[],
    userProfile?: UserFengShuiProfile
  ): AgentResponse {
    // If the user attempts a COMMAND or PROPOSE in offline mode, decline safely
    if (intent === 'COMMAND' || intent === 'PROPOSE') {
      return {
        reply: `⚠️ **Thông báo bảo mật**: Bạn đang ở chế độ làm việc ngoại tuyến (Offline) hoặc chưa cấu hình API Key.

Để đảm bảo tính toàn vẹn và an toàn cho mô hình 3D, mọi thao tác thay đổi hoặc tối ưu hóa bố cục phòng **bắt buộc phải được thẩm định và xác nhận thông qua máy chủ AI**.

Vui lòng kết nối Internet hoặc cấu hình Gemini API Key để thực hiện thao tác này.`,
        intent,
        sessionId,
        sceneVersion: currentSceneVersion,
        suggestedFollowUps: ['Kiểm tra kết nối mạng', 'Hỏi lý thuyết phong thủy'],
      };
    }

    // Read-only theory / analysis offline response
    const guaName = userProfile?.guaName || 'Cung Mệnh';
    const element = userProfile?.element || 'Ngũ Hành';
    const bed = objects.find((o) => o.type === 'bed');
    const mirror = objects.find((o) => o.type === 'mirror');

    if (prompt.toLowerCase().includes('gương')) {
      return {
        reply: `Theo nguyên lý phong thủy Bát Trạch & Loan Đầu:
• **Gương soi chiếu vào giường ngủ phạm Quang Sát**: Ánh sáng phản chiếu ban đêm kích thích thần kinh, gây ngủ không sâu giấc, bất an.
• **Giải pháp chuẩn**: Di chuyển gương sang vị trí lệch hướng nhìn, che rèm mềm khi ngủ, hoặc lắp gương vào mặt trong cánh tủ quần áo.`,
        intent: 'THEORY',
        sessionId,
        sceneVersion: currentSceneVersion,
      };
    }

    if (prompt.toLowerCase().includes('giường')) {
      return {
        reply: `Về vị trí giường ngủ trong phòng (${roomConfig.width}m × ${roomConfig.length}m):
• **Đầu giường tựa tường đặc (Tọa sơn)**: Giúp người nằm có cảm giác vững chãi, tụ khí an tâm.
• **Tránh trực xung cửa ra vào**: Tránh luồng khí xộc thẳng vào đầu giường.
• **Tránh dưới cửa sổ hoặc dầm xà**: Để không bị hàn khí và áp lực xà ngang đè nén.`,
        intent: 'THEORY',
        sessionId,
        sceneVersion: currentSceneVersion,
      };
    }

    return {
      reply: `Tôi là AI Feng Shui Studio (chế độ tham vấn cơ bản). Gia chủ mệnh **${guaName}** (${element}).
Căn phòng hiện có ${objects.length} đồ vật nội thất. Bạn có thể hỏi tôi về các nguyên lý phong thủy Loan Đầu, Bát Trạch hoặc các tiêu chuẩn lưu thông không gian!`,
      intent: 'THEORY',
      sessionId,
      sceneVersion: currentSceneVersion,
    };
  }

  /**
   * Online Gemini Multi-Turn Agent Loop.
   */
  private async runGeminiAgentLoop(params: {
    prompt: string;
    sessionId: string;
    intent: UnifiedIntentCategory;
    roomConfig: RoomConfig;
    objects: RoomObject[];
    userProfile?: UserFengShuiProfile;
    personalProfile?: PersonalProfile;
    chatHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
    genAIClient: GoogleGenAI;
    maxTurns: number;
    maxToolCalls: number;
    currentSceneVersion: string;
  }): Promise<AgentResponse> {
    const {
      prompt,
      sessionId,
      intent,
      roomConfig,
      objects,
      userProfile,
      personalProfile,
      chatHistory,
      genAIClient,
      maxTurns,
      maxToolCalls,
      currentSceneVersion,
    } = params;

    let workingObjects = [...objects];
    let latestProposal: any = null;
    let latestTransaction: any = null;
    let latestPreview: any = null;
    const toolActivity: Array<{ name: string; category: ToolCategory; success: boolean }> = [];
    const calledSignatures = new Set<string>();

    const contextHeader = `BỐI CẢNH PHÒNG HIỆN TẠI:
- Kích thước: ${roomConfig.width}m × ${roomConfig.length}m × ${roomConfig.height}m.
- Hướng phòng: ${roomConfig.direction}.
- Số lượng đồ vật: ${workingObjects.length}.
- Phiên bản sceneVersion: ${currentSceneVersion}.
- Gia chủ: ${userProfile ? `${userProfile.guaName} (${userProfile.element} - ${userProfile.group})` : 'Chưa nhập'}.
- Intent phát hiện: ${intent}.`;

    const contents: any[] = [
      { role: 'user', parts: [{ text: contextHeader }] },
      { role: 'model', parts: [{ text: 'Tôi đã nắm rõ bối cảnh phòng và sẵn sàng hỗ trợ bạn theo đúng quy trình an toàn.' }] },
      ...chatHistory.slice(-4),
      { role: 'user', parts: [{ text: prompt }] },
    ];

    let turnsCount = 0;
    let totalCallsCount = 0;
    let finalReply = '';

    while (turnsCount < maxTurns) {
      turnsCount++;

      const response = await genAIClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: UNIFIED_SYSTEM_PROMPT,
          tools: [{ functionDeclarations: AGENT_FUNCTION_DECLARATIONS as any }],
          temperature: 0.6,
        },
      });

      if (response.text) {
        finalReply = response.text;
      }

      const functionCalls = (response as any).functionCalls || [];
      if (!Array.isArray(functionCalls) || functionCalls.length === 0) {
        // No more tool calls; agent loop complete
        break;
      }

      const functionResponseParts: any[] = [];

      for (const call of functionCalls) {
        if (totalCallsCount >= maxToolCalls) {
          functionResponseParts.push({
            functionResponse: {
              name: call.name,
              response: { error: 'Đã vượt quá giới hạn gọi công cụ trong một lượt (Max tool calls reached).' },
            },
          });
          continue;
        }

        totalCallsCount++;
        const toolName = call.name;
        const args = (call.args || {}) as Record<string, unknown>;
        const category = TOOL_CATEGORY_MAP[toolName] || 'READ_ONLY';

        // 1. Loop Deduplication Guard: Detect repeated calls with identical args
        const callSig = `${toolName}:${computeArgsHash(args)}`;
        if (calledSignatures.has(callSig)) {
          functionResponseParts.push({
            functionResponse: {
              name: toolName,
              response: { error: 'Thao tác bị bỏ qua do gọi trùng lặp công cụ và tham số trong cùng một phiên xử lý.' },
            },
          });
          continue;
        }
        calledSignatures.add(callSig);

        // 2. Intent Safety Policy Gating:
        // THEORY, ANALYZE and CHAT cannot invoke PROPOSAL or EXECUTION tools
        if ((intent === 'THEORY' || intent === 'ANALYZE' || intent === 'CHAT') && category !== 'READ_ONLY') {
          toolActivity.push({ name: toolName, category, success: false });
          functionResponseParts.push({
            functionResponse: {
              name: toolName,
              response: {
                error: `BỊ TỪ CHỐI BỞI SECURITY GUARD: Ý định của người dùng là "${intent}". Không được phép kích hoạt công cụ ghi hoặc đề xuất thay đổi không gian (${category}).`,
              },
            },
          });
          continue;
        }

        // 3. Execute Tool
        const execContext: ToolExecutionContext = {
          sessionId,
          roomConfig,
          objects: workingObjects,
          userProfile,
          personalProfile,
          proposalManager: this.proposalManager,
          transactionManager: this.transactionManager,
          updateObjectsCallback: (newObjs) => {
            workingObjects = newObjs;
          },
        };

        const execResult = executeAgentTool(toolName, args, execContext);
        toolActivity.push({ name: toolName, category, success: execResult.success });

        if (execResult.success && execResult.result) {
          if (toolName.startsWith('propose_')) {
            const propId = execResult.result.proposalId;
            if (propId) {
              latestProposal = this.proposalManager.getProposal(propId);
            }
          }
          if (toolName === 'preview_scene_changes') {
            latestPreview = execResult.result;
          }
          if (toolName === 'confirm_scene_changes') {
            latestTransaction = this.transactionManager.getLatestTransaction(sessionId);
          }
        }

        functionResponseParts.push({
          functionResponse: {
            name: toolName,
            response: execResult.success ? execResult.result : { error: execResult.error },
          },
        });
      }

      // Add model's function calls and the function responses to the contents for next turn
      contents.push({
        role: 'model',
        parts: functionCalls.map((fc: any) => ({
          functionCall: { name: fc.name, args: fc.args },
        })),
      });

      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });
    }

    return {
      reply: finalReply || 'Tôi đã xử lý yêu cầu của bạn dựa trên hệ thống phân tích không gian.',
      intent,
      sessionId,
      sceneVersion: computeRobustSceneVersion(workingObjects, roomConfig),
      proposal: latestProposal,
      transaction: latestTransaction,
      previewState: latestPreview,
      toolActivity,
    };
  }
}

export const globalUnifiedAgent = new UnifiedAgent();
