// =============================================================================
// src/components/UserFacingFengShuiReport.tsx
// AI Feng Shui Studio — Simplified & Professional User-Facing Assessment Report
// =============================================================================

import React from 'react';
import { UserFacingReportViewModel } from '../engine/core/userFacingReportAdapter.js';
import { UnifiedAssessmentReport } from '../engine/core/unifiedAssessment.js';

interface UserFacingFengShuiReportProps {
  data: UserFacingReportViewModel;
  rawReport?: UnifiedAssessmentReport;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenProfile?: () => void;
}

export const UserFacingFengShuiReport: React.FC<UserFacingFengShuiReportProps> = ({
  data,
  onClose,
  onRefresh,
  onOpenProfile,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md select-text overflow-hidden print:p-0 print:bg-white print:static print:inset-auto print:w-full print:h-auto print:overflow-visible">
      <div className="w-full max-w-5xl h-[94vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200 print:h-auto print:w-full print:border-none print:shadow-none print:bg-white print:text-stone-900 print:max-w-none print:overflow-visible print-container">
        
        {/* =====================================================================
            HEADER CONTROLS (Hidden in print)
           ===================================================================== */}
        <header className="px-6 py-4 border-b border-stone-800 bg-stone-950/90 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-xl shadow-xs">
              📜
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">
                {data.overview.reportTitle}
              </h1>
              <p className="text-xs text-stone-400">
                {data.overview.roomName} • {data.createdAtFormatted}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-900 hover:bg-stone-800 text-xs font-medium text-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Tính toán lại toàn bộ"
              >
                <span>🔄</span>
                <span>Làm mới</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg border border-emerald-600 bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="In báo cáo ra giấy hoặc lưu thành file PDF A4"
            >
              <span>🖨</span>
              <span>Xuất PDF / In</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-base transition-colors cursor-pointer ml-1"
              title="Đóng báo cáo"
            >
              ✕
            </button>
          </div>
        </header>

        {/* =====================================================================
            SCROLLABLE REPORT BODY (Print-friendly)
           ===================================================================== */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 text-stone-200 print:overflow-visible print:h-auto print:p-0 print:text-stone-900 print:space-y-6">

          {/* PRINT-ONLY HEADER */}
          <div className="hidden print:block border-b-2 border-emerald-800 pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-emerald-950">
                  {data.overview.reportTitle}
                </h1>
                <p className="text-sm text-stone-600 mt-1">
                  Không gian: {data.overview.roomName} • Diện tích: {data.overview.dimensionsFormatted}
                </p>
              </div>
              <div className="text-right text-xs text-stone-500">
                <p className="font-semibold text-stone-800">AI Feng Shui Studio</p>
                <p>{data.createdAtFormatted}</p>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              PHẦN 1: TỔNG QUAN PHONG THỦY
             ------------------------------------------------------------------- */}
          <section className="p-5 rounded-2xl bg-stone-950/70 border border-stone-800/90 shadow-sm print:border print:border-stone-300 print:bg-stone-50/50 print:p-5 print:rounded-xl print-avoid-break">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-3 mb-4 print:border-stone-300">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏡</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-900">
                  Phần 1: Tổng Quan Phong Thủy Phòng Ngủ
                </h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-stone-800/80 text-stone-300 font-medium print:bg-stone-200 print:text-stone-800">
                Diện tích: {data.overview.dimensionsFormatted} ({data.overview.areaM2}m²)
              </span>
            </div>

            <p className="text-sm leading-relaxed text-stone-300 print:text-stone-800 font-normal">
              {data.overview.executiveSummary}
            </p>

            {data.overview.highlights.length > 0 && (
              <div className="mt-4 pt-3 border-t border-stone-800/60 print:border-stone-200">
                <h4 className="text-xs font-semibold text-stone-400 print:text-stone-700 uppercase tracking-wide mb-2">
                  Điểm Đáng Chú Ý Nhất:
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {data.overview.highlights.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded-lg bg-stone-900/60 border border-stone-800/60 print:bg-white print:border-stone-200"
                    >
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span className="text-stone-300 print:text-stone-800">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* -------------------------------------------------------------------
              PHẦN 2: THÔNG TIN PHONG THỦY GIA CHỦ
             ------------------------------------------------------------------- */}
          <section className="p-5 rounded-2xl bg-stone-950/70 border border-stone-800/90 shadow-sm print:border print:border-stone-300 print:bg-white print:p-5 print:rounded-xl print-avoid-break">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-3 mb-4 print:border-stone-300">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-900">
                  Phần 2: Thông Tin Bản Mệnh & Cung Quái Gia Chủ
                </h2>
              </div>
              {onOpenProfile && (
                <button
                  onClick={onOpenProfile}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline cursor-pointer print:hidden"
                >
                  Hiệu chỉnh hồ sơ
                </button>
              )}
            </div>

            {data.homeowner.hasData ? (
              <div className="space-y-4">
                {/* Profile Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800/80 print:bg-stone-50 print:border-stone-200">
                    <span className="text-stone-400 print:text-stone-500 block text-[11px]">Năm sinh & Giới tính</span>
                    <span className="text-sm font-bold text-white print:text-stone-900 mt-0.5 block">
                      {data.homeowner.birthYear} • {data.homeowner.genderText}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800/80 print:bg-stone-50 print:border-stone-200">
                    <span className="text-stone-400 print:text-stone-500 block text-[11px]">Quái mệnh (Bát Trạch)</span>
                    <span className="text-sm font-bold text-emerald-400 print:text-emerald-800 mt-0.5 block">
                      Cung {data.homeowner.guaName} ({data.homeowner.group})
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800/80 print:bg-stone-50 print:border-stone-200">
                    <span className="text-stone-400 print:text-stone-500 block text-[11px]">Ngũ hành bản mệnh</span>
                    <span className="text-sm font-bold text-amber-400 print:text-amber-800 mt-0.5 block">
                      Hành {data.homeowner.element}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800/80 print:bg-stone-50 print:border-stone-200">
                    <span className="text-stone-400 print:text-stone-500 block text-[11px]">Nạp Âm Can Chi</span>
                    <span className="text-sm font-bold text-sky-400 print:text-sky-800 mt-0.5 block">
                      {data.homeowner.canChi} ({data.homeowner.napAm})
                    </span>
                  </div>
                </div>

                {/* Auspicious & Inauspicious Directions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 print:bg-emerald-50/60 print:border-emerald-200">
                    <h4 className="text-xs font-bold text-emerald-400 print:text-emerald-900 flex items-center gap-1.5 mb-2">
                      <span>✓</span>
                      <span>Bốn Hướng Cát Lành (Ưu Tiên Đón Khí):</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {data.homeowner.auspiciousDirections.map((d, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md bg-emerald-900/50 text-emerald-200 border border-emerald-700/50 print:bg-emerald-100 print:text-emerald-900 font-semibold"
                        >
                          {d.name}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-stone-400 print:text-stone-600 mt-2">
                      Thích hợp đặt đầu giường ngủ, hướng ngồi bàn làm việc để đón vượng khí.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 print:bg-rose-50/60 print:border-rose-200">
                    <h4 className="text-xs font-bold text-rose-400 print:text-rose-900 flex items-center gap-1.5 mb-2">
                      <span>✕</span>
                      <span>Bốn Hướng Cần Tránh Xung Đối:</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {data.homeowner.inauspiciousDirections.map((d, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md bg-rose-900/50 text-rose-200 border border-rose-700/50 print:bg-rose-100 print:text-rose-900 font-semibold"
                        >
                          {d.name}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-stone-400 print:text-stone-600 mt-2">
                      Tránh quay đầu giường hoặc quay mặt khi làm việc về các phương vị này.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-stone-400 print:text-stone-600 italic">
                  {data.homeowner.briefExplanation}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-300 print:bg-amber-50 print:text-amber-900">
                <p className="font-semibold">{data.homeowner.missingDataNotice}</p>
                <p className="mt-1 text-[11px] text-stone-400 print:text-stone-600">
                  Hệ thống vẫn thực hiện đầy đủ các phân tích hình thế phòng ngủ (Loan Đầu, cửa, gương, thông gió, công thái học) theo nguyên lý chung.
                </p>
              </div>
            )}
          </section>

          {/* -------------------------------------------------------------------
              PHẦN 3: ĐÁNH GIÁ PHONG THỦY KHÔNG GIAN (8 Nhóm)
             ------------------------------------------------------------------- */}
          <section className="space-y-4">
            <div className="border-b border-stone-800 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-900 flex items-center gap-2">
                <span>📐</span>
                <span>Phần 3: Đánh Giá Chi Tiết 8 Khu Vực Không Gian</span>
              </h2>
              <p className="text-xs text-stone-400 print:text-stone-600 mt-0.5">
                Tổng hợp khách quan từ các tiêu chuẩn hình học, phong thủy cổ truyền và tiện nghi công thái học.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
              {data.spaceGroups.map((group) => {
                const isGood = group.status === 'good';
                const isWarn = group.status === 'warning';
                const isBad = group.status === 'needs_improvement';

                const badgeBg = isGood
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 print:bg-emerald-100 print:text-emerald-900'
                  : isWarn
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 print:bg-amber-100 print:text-amber-900'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-300 print:bg-rose-100 print:text-rose-900';

                return (
                  <div
                    key={group.id}
                    className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 flex flex-col justify-between print:border-stone-300 print:bg-white print:p-4 print-avoid-break print:break-inside-avoid shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-white print:text-stone-900">
                          <span className="text-base">{group.icon}</span>
                          <span>{group.title}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeBg}`}>
                          {group.statusLabel}
                        </span>
                      </div>

                      <p className="text-xs text-stone-300 print:text-stone-700 font-medium mb-3">
                        {group.summary}
                      </p>

                      <ul className="space-y-1.5 text-xs text-stone-400 print:text-stone-600 border-t border-stone-800/80 print:border-stone-200 pt-2.5">
                        {group.observations.map((obs, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-stone-500 print:text-stone-400 shrink-0">•</span>
                            <span className="leading-snug">{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* -------------------------------------------------------------------
              PHẦN 4: ĐIỂM TỐT VÀ VẤN ĐỀ CẦN LƯU Ý
             ------------------------------------------------------------------- */}
          <section className="space-y-4 print-avoid-break print:break-inside-avoid">
            <div className="border-b border-stone-800 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-900 flex items-center gap-2">
                <span>⚖️</span>
                <span>Phần 4: Đối Soát Điểm Thuận Lợi & Vấn Đề Cần Cải Thiện</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Điểm tốt */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 print:bg-emerald-50/50 print:border-emerald-300">
                <h3 className="text-xs font-bold text-emerald-400 print:text-emerald-900 flex items-center gap-1.5 mb-3 uppercase tracking-wide">
                  <span>✓</span>
                  <span>A. Những Yếu Tố Đang Tốt (Nên Giữ Nguyên)</span>
                </h3>
                <div className="space-y-3">
                  {data.favorableAndConcerns.favorablePoints.map((pt, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-stone-900/60 print:bg-white border border-emerald-900/30 print:border-emerald-200 text-xs">
                      <p className="font-bold text-emerald-300 print:text-emerald-950">{pt.title}</p>
                      <p className="text-stone-300 print:text-stone-700 mt-1 leading-snug">{pt.description}</p>
                      <p className="text-[11px] text-emerald-400 print:text-emerald-800 font-medium mt-1.5 italic">
                        Lời khuyên: {pt.advice}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Điểm cần lưu ý */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 print:bg-amber-50/50 print:border-amber-300">
                <h3 className="text-xs font-bold text-amber-400 print:text-amber-900 flex items-center gap-1.5 mb-3 uppercase tracking-wide">
                  <span>⚠</span>
                  <span>B. Những Vấn Đề Cần Lưu Ý & Cải Thiện</span>
                </h3>
                <div className="space-y-3">
                  {data.favorableAndConcerns.concernPoints.map((pt, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-stone-900/60 print:bg-white border border-amber-900/30 print:border-amber-200 text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-bold text-amber-300 print:text-amber-950">{pt.title}</p>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/50 text-amber-200 print:bg-amber-100 print:text-amber-900">
                          Ưu tiên {pt.priority}
                        </span>
                      </div>
                      <p className="text-stone-300 print:text-stone-700 leading-snug">{pt.impact}</p>
                      <p className="text-[11px] text-stone-400 print:text-stone-600 mt-1.5">
                        Căn cứ thực tế: {pt.evidence}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* -------------------------------------------------------------------
              PHẦN 5: KHUYẾN NGHỊ ĐIỀU CHỈNH
             ------------------------------------------------------------------- */}
          <section className="space-y-4 print:break-inside-avoid">
            <div className="border-b border-stone-800 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-900 flex items-center gap-2">
                <span>💡</span>
                <span>Phần 5: Khuyến Nghị & Lộ Trình Điều Chỉnh Cụ Thể</span>
              </h2>
              <p className="text-xs text-stone-400 print:text-stone-600 mt-0.5">
                Các giải pháp bố trí thiết thực, an toàn và dễ thực hiện để nâng cao vượng khí cho căn phòng.
              </p>
            </div>

            <div className="space-y-3.5">
              {data.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 hover:border-emerald-500/40 transition-colors print:bg-white print:border-stone-300 shadow-xs print-avoid-break print:break-inside-avoid"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/80 print:border-stone-200 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-emerald-950 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30 print:bg-emerald-100 print:text-emerald-900">
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-sm text-white print:text-stone-900">
                        {rec.targetArea}
                      </h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      rec.priority === 'Cao'
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/50 print:bg-rose-100 print:text-rose-900'
                        : rec.priority === 'Trung bình'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/50 print:bg-amber-100 print:text-amber-900'
                        : 'bg-stone-800 text-stone-300 border border-stone-700 print:bg-stone-100 print:text-stone-800'
                    }`}>
                      Mức ưu tiên: {rec.priority}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
                    <div className="space-y-2">
                      <div>
                        <span className="text-stone-400 print:text-stone-500 font-semibold block text-[11px]">
                          Vấn đề ghi nhận:
                        </span>
                        <p className="text-stone-200 print:text-stone-800">{rec.issue}</p>
                      </div>
                      <div>
                        <span className="text-stone-400 print:text-stone-500 font-semibold block text-[11px]">
                          Vì sao nên điều chỉnh:
                        </span>
                        <p className="text-stone-300 print:text-stone-700">{rec.explanation}</p>
                      </div>
                    </div>

                    <div className="space-y-2 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 print:bg-emerald-50/50 print:border-emerald-200">
                      <div>
                        <span className="text-emerald-400 print:text-emerald-900 font-bold block text-[11px]">
                          👉 Đề xuất phương án thực hiện:
                        </span>
                        <p className="text-emerald-200 print:text-emerald-950 font-medium">{rec.proposal}</p>
                      </div>
                      <div>
                        <span className="text-stone-400 print:text-stone-600 font-semibold block text-[11px]">
                          Kết quả mong đợi:
                        </span>
                        <p className="text-stone-300 print:text-stone-700 italic">{rec.expectedBenefit}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* -------------------------------------------------------------------
              PHẦN 6: KẾT LUẬN TỔNG THỂ
             ------------------------------------------------------------------- */}
          <section className="p-5 rounded-2xl bg-stone-950/90 border border-emerald-500/30 shadow-md print:border-stone-400 print:bg-white print:p-5 print:rounded-xl print-avoid-break print:break-inside-avoid">
            <div className="border-b border-stone-800 pb-3 mb-3 print:border-stone-300">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-900 flex items-center gap-2">
                <span>🏁</span>
                <span>Phần 6: Kết Luận Tổng Thể & Lời Khuyên Chuyên Gia</span>
              </h2>
            </div>

            <p className="text-sm leading-relaxed text-stone-200 print:text-stone-900 font-medium mb-4">
              {data.conclusion.overallAssessment}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-stone-900/60 print:bg-stone-50 border border-stone-800 print:border-stone-200">
                <h4 className="font-bold text-amber-400 print:text-amber-900 mb-2 flex items-center gap-1.5">
                  <span>📌</span>
                  <span>Thay Đổi Nên Ưu Tiên Hàng Đầu:</span>
                </h4>
                <ul className="space-y-1.5 text-stone-300 print:text-stone-700">
                  {data.conclusion.topPriorities.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">1.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-stone-900/60 print:bg-stone-50 border border-stone-800 print:border-stone-200">
                <h4 className="font-bold text-emerald-400 print:text-emerald-900 mb-2 flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>Các Điểm Thuận Lợi Nên Duy Trì:</span>
                </h4>
                <ul className="space-y-1.5 text-stone-300 print:text-stone-700">
                  {data.conclusion.elementsToKeep.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-800/60 print:border-stone-300 text-[11px] text-stone-400 print:text-stone-500 italic">
              {data.conclusion.dataIntegrityNotice}
            </div>
          </section>

          {/* FOOTER NOTICE */}
          <footer className="pt-4 border-t border-stone-800 text-center text-[11px] text-stone-500 print:text-stone-400">
            AI Feng Shui Studio • Bản quyền nghiên cứu kiến trúc phong thủy khoa học • Báo cáo xuất ngày {data.createdAtFormatted}
          </footer>

        </div>
      </div>
    </div>
  );
};
