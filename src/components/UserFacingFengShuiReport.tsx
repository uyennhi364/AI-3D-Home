// =============================================================================
// src/components/UserFacingFengShuiReport.tsx
// AI Feng Shui Studio — Bản Tư Vấn Phong Thủy Phòng Ngủ Dành Cho Gia Chủ
// =============================================================================

import React from 'react';
import { UserFacingReportViewModel } from '../engine/core/userFacingReportAdapter.js';

interface UserFacingFengShuiReportProps {
  data: UserFacingReportViewModel;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md select-text overflow-hidden print:p-0 print:bg-white print:static print:inset-auto">
      <div className="w-full max-w-4xl h-[94vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200 print:h-auto print:border-none print:shadow-none print:bg-white print:text-stone-900 print:max-w-none">
        
        {/* =====================================================================
            HEADER THANH CÔNG CỤ (Ẩn khi in ấn / xuất PDF)
           ===================================================================== */}
        <header className="px-6 py-4 border-b border-stone-800 bg-stone-950/90 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-xl shadow-xs">
              📜
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">
                Bản Tư Vấn Phong Thủy Phòng Ngủ
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
                title="Cập nhật lại kết quả tư vấn"
              >
                <span>🔄</span>
                <span>Làm mới</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg border border-emerald-600 bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="In bản tư vấn hoặc lưu thành file PDF A4"
            >
              <span>🖨</span>
              <span>In / Lưu PDF</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-base transition-colors cursor-pointer ml-1"
              title="Đóng bản tư vấn"
            >
              ✕
            </button>
          </div>
        </header>

        {/* =====================================================================
            NỘI DUNG BẢN TƯ VẤN (6 PHẦN RÕ RÀNG, CHUẨN A4 KHI IN)
           ===================================================================== */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7 text-stone-200 print:overflow-visible print:p-8 print:text-stone-900 print:space-y-6">

          {/* TIÊU ĐỀ TRANG KHI IN RA GIẤY / PDF */}
          <div className="hidden print:block border-b-2 border-emerald-800 pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-emerald-950">
                  Bản Tư Vấn Phong Thủy Phòng Ngủ
                </h1>
                <p className="text-sm text-stone-600 mt-1">
                  Không gian: {data.overview.roomName} • Kích thước: {data.overview.dimensionsText} ({data.overview.areaM2}m²)
                </p>
              </div>
              <div className="text-right text-xs text-stone-500">
                <p className="font-semibold text-stone-800">AI Feng Shui Studio</p>
                <p>{data.createdAtFormatted}</p>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              PHẦN 1: TỔNG QUAN PHÒNG NGỦ
             ------------------------------------------------------------------- */}
          <section className="p-5 rounded-2xl bg-stone-950/70 border border-stone-800/90 shadow-xs print:border print:border-stone-300 print:bg-stone-50/50 print:p-5 print:rounded-xl">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-2.5 mb-3 print:border-stone-300">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏡</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-900">
                  Phần 1: Tổng Quan Phòng Ngủ
                </h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-stone-800/80 text-stone-300 font-medium print:bg-stone-200 print:text-stone-800">
                Diện tích: {data.overview.dimensionsText} ({data.overview.areaM2}m²)
              </span>
            </div>

            <p className="text-sm leading-relaxed text-stone-300 print:text-stone-800 font-normal">
              {data.overview.narrativeSummary}
            </p>
          </section>

          {/* -------------------------------------------------------------------
              PHẦN 2: PHONG THỦY GIA CHỦ
             ------------------------------------------------------------------- */}
          <section className="p-5 rounded-2xl bg-stone-950/70 border border-stone-800/90 shadow-xs print:border print:border-stone-300 print:bg-white print:p-5 print:rounded-xl">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-2.5 mb-3.5 print:border-stone-300">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-900">
                  Phần 2: Phong Thủy Gia Chủ
                </h2>
              </div>
              {onOpenProfile && (
                <button
                  onClick={onOpenProfile}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline cursor-pointer print:hidden"
                >
                  Thay đổi năm sinh / hồ sơ
                </button>
              )}
            </div>

            {data.homeowner.hasData ? (
              <div className="space-y-4">
                {/* 4 Thẻ thông tin nhanh */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800/80 print:bg-stone-50 print:border-stone-200">
                    <span className="text-stone-400 print:text-stone-500 block text-[11px]">Năm sinh & Giới tính</span>
                    <span className="text-sm font-bold text-white print:text-stone-900 mt-0.5 block">
                      {data.homeowner.birthYear} ({data.homeowner.genderText})
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800/80 print:bg-stone-50 print:border-stone-200">
                    <span className="text-stone-400 print:text-stone-500 block text-[11px]">Quái mệnh</span>
                    <span className="text-sm font-bold text-emerald-400 print:text-emerald-800 mt-0.5 block">
                      Cung {data.homeowner.guaName}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800/80 print:bg-stone-50 print:border-stone-200">
                    <span className="text-stone-400 print:text-stone-500 block text-[11px]">Ngũ hành bản mệnh</span>
                    <span className="text-sm font-bold text-amber-400 print:text-amber-800 mt-0.5 block">
                      Hành {data.homeowner.element}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800/80 print:bg-stone-50 print:border-stone-200">
                    <span className="text-stone-400 print:text-stone-500 block text-[11px]">Nhóm hướng</span>
                    <span className="text-sm font-bold text-sky-400 print:text-sky-800 mt-0.5 block">
                      {data.homeowner.groupText}
                    </span>
                  </div>
                </div>

                {/* Hướng nên ưu tiên & Hướng cần lưu ý */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 print:bg-emerald-50/60 print:border-emerald-200">
                    <h4 className="text-xs font-bold text-emerald-400 print:text-emerald-900 flex items-center gap-1.5 mb-2">
                      <span>✓</span>
                      <span>Các hướng nên ưu tiên xem xét:</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {data.homeowner.prioritizedDirections.map((d, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md bg-emerald-900/50 text-emerald-200 border border-emerald-700/50 print:bg-emerald-100 print:text-emerald-900 font-semibold"
                        >
                          Hướng {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 print:bg-rose-50/60 print:border-rose-200">
                    <h4 className="text-xs font-bold text-rose-400 print:text-rose-900 flex items-center gap-1.5 mb-2">
                      <span>✕</span>
                      <span>Các hướng cần lưu ý tránh đối diện:</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {data.homeowner.cautionDirections.map((d, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md bg-rose-900/40 text-rose-200 border border-rose-700/40 print:bg-rose-100 print:text-rose-900 font-semibold"
                        >
                          Hướng {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-stone-300 print:text-stone-700 leading-relaxed italic">
                  {data.homeowner.friendlyExplanation}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-300 print:bg-amber-50 print:text-amber-900">
                <p className="font-semibold">{data.homeowner.missingDataMessage}</p>
                <p className="mt-1 text-[11px] text-stone-400 print:text-stone-600">
                  Hệ thống vẫn tư vấn đầy đủ về hình khối phòng, vị trí giường, bàn, gương và ánh sáng tự nhiên theo nguyên lý kiến trúc phong thủy chung.
                </p>
              </div>
            )}
          </section>

          {/* -------------------------------------------------------------------
              PHẦN 3: ĐÁNH GIÁ PHONG THỦY PHÒNG NGỦ (8 nhóm cụ thể)
             ------------------------------------------------------------------- */}
          <section className="space-y-3.5">
            <div className="border-b border-stone-800 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-900 flex items-center gap-2">
                <span>📐</span>
                <span>Phần 3: Đánh Giá Phong Thủy Chi Tiết Theo Từng Khu Vực</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 print:grid-cols-2 print:gap-3">
              {data.spaceGroups.map((group) => {
                const isGood = group.status === 'good';
                const isWarn = group.status === 'warning';
                const isBad = group.status === 'needs_improvement';

                const badgeBg = isGood
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 print:bg-emerald-100 print:text-emerald-900'
                  : isWarn
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 print:bg-amber-100 print:text-amber-900'
                  : isBad
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 print:bg-rose-100 print:text-rose-900'
                  : 'bg-stone-800 text-stone-300 print:bg-stone-100 print:text-stone-700';

                return (
                  <div
                    key={group.id}
                    className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 flex flex-col justify-between print:border-stone-300 print:bg-white print:p-4 print:break-inside-avoid shadow-2xs"
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

                      <p className="text-xs leading-relaxed text-stone-300 print:text-stone-700">
                        {group.comment}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* -------------------------------------------------------------------
              PHẦN 4: ĐIỂM TỐT CỦA PHÒNG NGỦ (3–5 điểm nổi bật nhất)
             ------------------------------------------------------------------- */}
          <section className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 shadow-xs print:border-emerald-300 print:bg-emerald-50/50 print:p-5 print:rounded-xl print:break-inside-avoid">
            <div className="border-b border-emerald-900/40 print:border-emerald-200 pb-2.5 mb-3.5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-900 flex items-center gap-2">
                <span>🌟</span>
                <span>Phần 4: Những Điểm Tốt Nổi Bật Của Phòng Ngủ</span>
              </h2>
            </div>

            <div className="space-y-2.5 text-xs">
              {data.favorablePoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-stone-900/60 print:bg-white border border-emerald-900/40 print:border-emerald-200"
                >
                  <p className="font-bold text-emerald-300 print:text-emerald-950 flex items-center gap-1.5">
                    <span>✓</span>
                    <span>{pt.title}</span>
                  </p>
                  <p className="text-stone-300 print:text-stone-700 mt-1 pl-4 leading-relaxed">
                    {pt.explanation}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* -------------------------------------------------------------------
              PHẦN 5: NHỮNG ĐIỀU NÊN ĐIỀU CHỈNH (Tối đa 3–5 khuyến nghị)
             ------------------------------------------------------------------- */}
          <section className="space-y-3.5 print:break-inside-avoid">
            <div className="border-b border-stone-800 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-900 flex items-center gap-2">
                <span>💡</span>
                <span>Phần 5: Những Điều Bạn Nên Điều Chỉnh</span>
              </h2>
              <p className="text-xs text-stone-400 print:text-stone-600 mt-0.5">
                Các bước điều chỉnh thiết thực và dễ thực hiện nhất giúp nâng cao chất lượng phòng ngủ.
              </p>
            </div>

            <div className="space-y-3">
              {data.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 hover:border-emerald-500/40 transition-colors print:bg-white print:border-stone-300 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/80 print:border-stone-200 pb-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-emerald-950 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30 print:bg-emerald-100 print:text-emerald-900">
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-xs text-white print:text-stone-900">
                        {rec.title}
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      rec.priority === 'Cao'
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/50 print:bg-rose-100 print:text-rose-900'
                        : rec.priority === 'Trung bình'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/50 print:bg-amber-100 print:text-amber-900'
                        : 'bg-stone-800 text-stone-300 border border-stone-700 print:bg-stone-100 print:text-stone-800'
                    }`}>
                      Mức ưu tiên: {rec.priority}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs leading-relaxed">
                    <div>
                      <span className="text-stone-400 print:text-stone-500 font-semibold block text-[11px]">
                        Hiện tại:
                      </span>
                      <p className="text-stone-200 print:text-stone-800">{rec.currentIssue}</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 print:bg-emerald-50/50 print:border-emerald-200">
                      <span className="text-emerald-400 print:text-emerald-900 font-bold block text-[11px]">
                        👉 Đề xuất:
                      </span>
                      <p className="text-emerald-200 print:text-emerald-950 font-medium">{rec.proposal}</p>
                    </div>

                    <div>
                      <span className="text-stone-400 print:text-stone-500 font-semibold block text-[11px]">
                        Lý do:
                      </span>
                      <p className="text-stone-300 print:text-stone-700 italic">{rec.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* -------------------------------------------------------------------
              PHẦN 6: LỜI KẾT VÀ TƯ VẤN
             ------------------------------------------------------------------- */}
          <section className="p-5 rounded-2xl bg-stone-950/90 border border-emerald-500/30 shadow-xs print:border-stone-400 print:bg-white print:p-5 print:rounded-xl print:break-inside-avoid">
            <div className="border-b border-stone-800 pb-2.5 mb-3 print:border-stone-300">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-900 flex items-center gap-2">
                <span>🏁</span>
                <span>Phần 6: Lời Kết & Lời Khuyên Dành Cho Bạn</span>
              </h2>
            </div>

            <p className="text-xs leading-relaxed text-stone-200 print:text-stone-900 font-medium mb-3.5">
              {data.conclusion.closingSummary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              <div className="p-3 rounded-xl bg-stone-900/60 print:bg-stone-50 border border-stone-800 print:border-stone-200">
                <h4 className="font-bold text-amber-400 print:text-amber-900 mb-2 flex items-center gap-1.5">
                  <span>📌</span>
                  <span>Những việc bạn nên ưu tiên làm trước:</span>
                </h4>
                <ul className="space-y-1.5 text-stone-300 print:text-stone-700">
                  {data.conclusion.keyPriorities.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-stone-900/60 print:bg-stone-50 border border-stone-800 print:border-stone-200">
                <h4 className="font-bold text-emerald-400 print:text-emerald-900 mb-2 flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>Những điểm tốt bạn nên giữ nguyên:</span>
                </h4>
                <ul className="space-y-1.5 text-stone-300 print:text-stone-700">
                  {data.conclusion.elementsToPreserve.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {data.conclusion.compassNotice && (
              <div className="mt-3.5 pt-3 border-t border-stone-800/60 print:border-stone-300 text-[11px] text-stone-400 print:text-stone-600 italic">
                {data.conclusion.compassNotice}
              </div>
            )}
          </section>

          {/* DÒNG CUỐI TRANG IN */}
          <footer className="pt-3 border-t border-stone-800 text-center text-[11px] text-stone-500 print:text-stone-400">
            AI Feng Shui Studio • Bản tư vấn phong thủy không gian sống • Ngày lập: {data.createdAtFormatted}
          </footer>

        </div>
      </div>
    </div>
  );
};
