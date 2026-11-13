// =============================================================================
// src/components/NguHanhAssessmentPanel.tsx
// Phase P8.4 — Ngũ Hành Room Assessment Panel (Main Tab View)
//
// DESIGN PRINCIPLES:
// - Comprehensive Five Elements view for UnifiedAssessmentReportModal.
// - Strictly NO numeric harmony score (overallHarmonyScore is always null).
// - Displays harmonyLevel in Vietnamese text only.
// - Accurately categorizes PASS / WARN / FAIL / UNKNOWN / N/A.
// - Displays key issues, cures/remedies, per-object breakdowns, and NH-ROOM-01.
// - Displays source references, heuristic disclaimers, and global academic disclaimer.
// - Pure display: all assessments computed deterministically upstream.
// =============================================================================

import React from 'react';
import {
  DetailedRoomElementAssessment,
} from '../engine/core/nguHanh/elementAssessment.js';
import { NguHanhElement } from '../engine/core/nguHanh/elementTypes.js';
import { NguHanhElementBadge } from './NguHanhElementBadge.js';
import { NguHanhObjectCard } from './NguHanhObjectCard.js';
import { NguHanhVerdictBadge } from './NguHanhVerdictBadge.js';

export interface NguHanhAssessmentPanelProps {
  assessment: DetailedRoomElementAssessment | null;
  personalElement: NguHanhElement | null;
  onOpenProfile?: () => void;
}

const HARMONY_LEVEL_CONFIG: Record<
  string,
  { label: string; className: string; description: string }
> = {
  excellent: {
    label: '🌟 Rất hài hòa',
    className: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    description: 'Không gian có sự tương sinh, tương hòa cao với bản mệnh gia chủ.',
  },
  good: {
    label: '✅ Hài hòa',
    className: 'bg-emerald-950/60 text-emerald-400 border-emerald-600/30',
    description: 'Phần lớn yếu tố màu sắc, chất liệu và vị trí tương thích tốt.',
  },
  neutral: {
    label: '🔵 Trung bình',
    className: 'bg-blue-950/60 text-blue-300 border-blue-500/30',
    description: 'Mức độ tương tác Ngũ Hành ở mức trung tính, có thể hoàn thiện thêm.',
  },
  poor: {
    label: '⚠️ Chưa hài hòa',
    className: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
    description: 'Xuất hiện yếu tố khắc xuất hoặc tương khắc cần điều chỉnh hoặc hóa giải.',
  },
  unknown: {
    label: '❓ Chưa xác định',
    className: 'bg-stone-900 text-stone-400 border-stone-700',
    description: 'Thiếu dữ liệu bản mệnh hoặc thông số đồ vật để kết luận mức độ hài hòa.',
  },
};

export const NguHanhAssessmentPanel: React.FC<NguHanhAssessmentPanelProps> = ({
  assessment,
  personalElement,
  onOpenProfile,
}) => {
  // 1. Missing Profile State
  if (!personalElement) {
    return (
      <div className="p-8 rounded-2xl bg-stone-950 border border-stone-800 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-950/40 border border-amber-600/30 flex items-center justify-center text-xl text-amber-400">
          👤
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white">Chưa Cung Cấp Bản Mệnh Gia Chủ</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
            Hệ thống cần thông tin năm sinh và giới tính để xác định Quái Mệnh / Ngũ Hành bản mệnh trước khi phân tích tương tác với đồ vật trong phòng.
          </p>
        </div>
        {onOpenProfile && (
          <button
            onClick={onOpenProfile}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Cập nhật Hồ Sơ Bản Mệnh
          </button>
        )}
      </div>
    );
  }

  // 2. No Assessment Computed Yet
  if (!assessment) {
    return (
      <div className="p-8 rounded-2xl bg-stone-950 border border-stone-800 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center text-xl text-stone-400">
          🌿
        </div>
        <h3 className="text-sm font-bold text-white">Chưa Chạy Phân Tích Ngũ Hành</h3>
        <p className="text-xs text-stone-400 max-w-md mx-auto">
          Nhấn nút &ldquo;Phân tích AI&rdquo; hoặc cập nhật không gian để hệ thống tính toán ma trận Ngũ Hành cho toàn phòng.
        </p>
      </div>
    );
  }

  const harmonyConfig =
    HARMONY_LEVEL_CONFIG[assessment.harmonyLevel] ?? HARMONY_LEVEL_CONFIG.unknown;

  const roomRule = assessment.allRules.find((r) => r.ruleId === 'NH-ROOM-01');

  return (
    <div className="space-y-6 text-xs text-stone-300">
      {/* =========================================================================
          1. ROOM OVERVIEW CARD (Strictly text-only harmony level, NO numeric score)
         ========================================================================= */}
      <section className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
              Tổng quan Ngũ Hành không gian
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold text-white">Bản mệnh gia chủ:</span>
              <NguHanhElementBadge element={personalElement} size="md" />
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
              Mức độ hài hòa
            </span>
            <span
              className={`px-3 py-1 rounded-xl text-xs font-bold border ${harmonyConfig.className}`}
            >
              {harmonyConfig.label}
            </span>
          </div>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed italic">
          {harmonyConfig.description}
        </p>

        {/* Audit Counts Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1">
          <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
            <span className="text-[10px] text-emerald-400 block font-semibold">HỢP CÁCH (PASS)</span>
            <span className="text-base font-extrabold font-mono text-emerald-300">
              {assessment.passCount}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-900/40">
            <span className="text-[10px] text-amber-400 block font-semibold">CẢNH BÁO (WARN)</span>
            <span className="text-base font-extrabold font-mono text-amber-300">
              {assessment.warnCount}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/40">
            <span className="text-[10px] text-rose-400 block font-semibold">XUNG KHẮC (FAIL)</span>
            <span className="text-base font-extrabold font-mono text-rose-300">
              {assessment.failCount}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800">
            <span className="text-[10px] text-stone-400 block font-semibold">CHƯA RÕ (?)</span>
            <span className="text-base font-extrabold font-mono text-stone-300">
              {assessment.unknownCount}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-stone-900/40 border border-stone-800/60">
            <span className="text-[10px] text-stone-500 block font-semibold">KHÔNG ÁP DỤNG</span>
            <span className="text-base font-extrabold font-mono text-stone-400">
              {assessment.naCount}
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. KEY ISSUES & REMEDIES
         ========================================================================= */}
      {(assessment.keyIssues.length > 0 || assessment.cures.length > 0) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Key Issues */}
          {assessment.keyIssues.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-950/15 border border-rose-900/40 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wide">
                <span>⚠️</span>
                <span>Vấn đề Ngũ Hành trọng yếu ({assessment.keyIssues.length})</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-stone-300 text-[11px] leading-relaxed">
                {assessment.keyIssues.map((issue, idx) => (
                  <li key={idx} className="marker:text-rose-400">
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Remedies / Cures */}
          {assessment.cures.length > 0 && (
            <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-900/40 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wide">
                <span>💡</span>
                <span>Phương án hóa giải / cân bằng ({assessment.cures.length})</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-stone-300 text-[11px] leading-relaxed">
                {assessment.cures.map((cure, idx) => (
                  <li key={idx} className="marker:text-emerald-400">
                    {cure}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          3. WHOLE ROOM ENVIRONMENT (NH-ROOM-01)
         ========================================================================= */}
      {roomRule && (
        <section className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">🏠</span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Màu sắc không gian phòng (NH-ROOM-01)
              </h3>
            </div>
            <NguHanhVerdictBadge verdict={roomRule.verdict as any} size="sm" />
          </div>

          <div className="text-xs text-stone-300 space-y-1 leading-relaxed">
            <p>{roomRule.explanation}</p>
            {roomRule.measurement && (
              <p className="text-[11px] text-stone-400">
                <span className="text-stone-500 font-semibold">Đo lường: </span>
                {String(roomRule.measurement)}
              </p>
            )}
            {roomRule.remedy && (
              <p className="text-[11px] text-amber-300/90">
                <span className="font-semibold">Khắc phục: </span>
                {roomRule.remedy}
              </p>
            )}
          </div>
        </section>
      )}

      {/* =========================================================================
          4. PER-OBJECT DETAILED ASSESSMENT CARDS
         ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">🪑</span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Đánh giá Ngũ Hành từng đồ vật ({assessment.furnitureSummaries.length})
            </h3>
          </div>
          <span className="text-[10px] text-stone-500">
            Bao gồm Màu sắc, Chất liệu, Hình khối OBB và Phương vị
          </span>
        </div>

        {assessment.furnitureSummaries.length === 0 ? (
          <div className="p-6 rounded-xl bg-stone-950 border border-stone-800 text-center text-stone-500">
            Phòng chưa có đồ nội thất nào được thiết lập.
          </div>
        ) : (
          <div className="space-y-2.5">
            {assessment.furnitureSummaries.map((summary) => (
              <NguHanhObjectCard
                key={summary.profile.objectId}
                summary={summary}
                personalElement={personalElement}
              />
            ))}
          </div>
        )}
      </section>

      {/* =========================================================================
          5. SOURCE REGISTRY & CITATIONS
         ========================================================================= */}
      <section className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
        <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
          <span className="text-sm">📚</span>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Nguồn thư tịch tham chiếu P8
          </h3>
        </div>

        <p className="text-[11px] text-stone-400 leading-relaxed">
          Được đối chiếu trực tiếp với hệ thống văn bản phong thủy cổ điển và quy chuẩn kiến trúc hiện đại đã đăng ký trong Source Registry:
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="px-2 py-1 rounded-md bg-stone-900 border border-stone-800 font-mono text-[10px] text-emerald-400">
            SRC-NGU-HANH-DAI-NGHIA (Quyển 2 & 3)
          </span>
          <span className="px-2 py-1 rounded-md bg-stone-900 border border-stone-800 font-mono text-[10px] text-emerald-400">
            SRC-BAT-TRACH-MINH-KINH
          </span>
          <span className="px-2 py-1 rounded-md bg-stone-900 border border-stone-800 font-mono text-[10px] text-sky-400">
            SRC-PHONG-THUY-NOI-THAT-HIEN-DAI
          </span>
          <span className="px-2 py-1 rounded-md bg-stone-900 border border-stone-800 font-mono text-[10px] text-stone-400">
            SRC-TCVN-4451-2012
          </span>
        </div>
      </section>

      {/* =========================================================================
          6. MANDATORY DISCLAIMERS
         ========================================================================= */}
      <section className="p-4 rounded-xl bg-amber-950/20 border border-amber-600/30 text-amber-200/90 text-xs space-y-2 leading-relaxed">
        <div className="flex items-center gap-2 font-bold text-amber-100">
          <span>ℹ️</span>
          <span>Khuyến cáo học thuật & Ghi chú giới hạn</span>
        </div>

        <p className="text-[11px]">
          1. <strong>Tính chất tham khảo:</strong> Phân tích Ngũ Hành do AI Feng Shui Studio thực hiện dựa trên tổng hợp thư tịch cổ điển và nhân trắc học không gian. Kết quả mang tính tham khảo kiến trúc văn hóa, không thay thế tư vấn chuyên sâu tại thực địa của chuyên gia phong thủy.
        </p>

        <p className="text-[11px]">
          2. <strong>Quy tắc Heuristic (NH-SHAPE-01):</strong> Phân loại hình khối 3D theo tỉ lệ chiều cao/rộng/dài là mô hình xấp xỉ nội bộ của AI Studio nhằm hỗ trợ trực quan hóa, chưa có định nghĩa nguyên văn trong thư tịch cổ. Các thẻ quy tắc này đều được đánh dấu nhãn <span className="font-mono text-amber-300">heuristic</span> minh bạch.
        </p>

        <p className="text-[11px]">
          3. <strong>Bảo toàn điểm số:</strong> Kết quả Ngũ Hành hoàn toàn độc lập, không cộng gộp nhân tạo vào điểm tổng thể P5 (overallScore) và không làm thay đổi chuẩn nghiệm thu Master Preset (89/51).
        </p>
      </section>
    </div>
  );
};
