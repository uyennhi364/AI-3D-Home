// =============================================================================
// scripts/verify_live_gemini.ts
// Live Gemini API End-to-End Verification Runner for AI Feng Shui Studio
// Conforms to P9-M1 Hardening Specification (25s Timeout, AbortSignal, Secret Redaction)
// =============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// Load local environment files
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export async function runLiveGeminiVerification() {
  console.log('=============================================================================');
  console.log('AI FENG SHUI STUDIO — LIVE GEMINI API VERIFICATION RUNNER');
  console.log('=============================================================================\n');

  const rawKey = process.env.GEMINI_API_KEY || '';
  const isKeyValid = Boolean(rawKey.trim().length > 0 && !rawKey.includes('MY_GEMINI_API_KEY'));

  if (!isKeyValid) {
    console.log('📋 [STATUS] NOT VERIFIED — Không phát hiện GEMINI_API_KEY hợp lệ trong môi trường.');
    console.log('ℹ️  [NGUYÊN TẮC] Ghi nhận trung thực: KHÔNG dùng Mock để giả mạo PASS Live API.');
    console.log('💡 [HƯỚNG DẪN] Cung cấp GEMINI_API_KEY hợp lệ trong .env.local để kiểm thử mạng thật.\n');
    console.log('=============================================================================');
    console.log('SUMMARY: GEMINI-01: NOT VERIFIED (No Live Key Provided)');
    console.log('=============================================================================\n');
    return { status: 'NOT_VERIFIED', reason: 'NO_LIVE_KEY' };
  }

  const maskedKey = `${rawKey.slice(0, 4)}...${rawKey.slice(-4)} (REDACTED)`;
  console.log(`🔑 [AUTH] Đã tìm thấy GEMINI_API_KEY: ${maskedKey}`);
  console.log('🌐 [TARGET] Upstream endpoint: https://generativelanguage.googleapis.com');
  console.log('🤖 [MODEL] gemini-2.5-flash');
  console.log('⏱️  [TIMEOUT] 25000ms (Hardening Requirement A)\n');

  const startTime = Date.now();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(new Error('TIMEOUT_25S: Request vượt quá 25 giây'));
  }, 25000);

  try {
    const aiClient = new GoogleGenAI({
      apiKey: rawKey,
      httpOptions: { timeout: 25000 },
    });

    console.log('🚀 Đang gửi yêu cầu kiểm tra tới Google Gemini API...');
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Bạn là trợ lý AI Feng Shui Studio. Trả lời đúng từ "READY" để xác nhận mạng sống.',
      config: {
        abortSignal: abortController.signal,
        temperature: 0.1,
      },
    });

    const durationMs = Date.now() - startTime;
    const reply = (response.text || '').trim();

    console.log(`\n📥 [RESPONSE RECEIVED] (Thời gian: ${durationMs}ms)`);
    console.log(`💬 [NỘI DUNG]: "${reply}"`);

    if (reply.length > 0) {
      console.log('\n=============================================================================');
      console.log('✅ LIVE GEMINI API VERIFICATION: PASSED (Mạng sống thật đã được xác thực 100%)');
      console.log('=============================================================================\n');
      return { status: 'PASSED', durationMs, reply };
    } else {
      console.log('\n⚠️ Phản hồi rỗng từ upstream Gemini.');
      return { status: 'EMPTY_RESPONSE', durationMs };
    }
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    console.error(`\n❌ [LIVE GEMINI CALL FAILED] sau ${durationMs}ms:`);
    console.error(`Lỗi: ${err?.message || err}`);
    return { status: 'FAILED', durationMs, error: err?.message || String(err) };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Execute if run directly
if (process.argv[1] && process.argv[1].includes('verify_live_gemini')) {
  runLiveGeminiVerification().then((result) => {
    if (result.status === 'FAILED') {
      process.exit(1);
    }
    process.exit(0);
  });
}

