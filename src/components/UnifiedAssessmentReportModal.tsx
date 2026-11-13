// =============================================================================
// src/components/UnifiedAssessmentReportModal.tsx
// Unified Feng Shui Assessment Report Modal Component (Phase P5 + P6)
//
// DESIGN PRINCIPLES:
// - Clean, professional architectural report UI in Vietnamese.
// - Strictly NO arbitrary 0-100 score.
// - Complete categorization: Geometric Layout, Traditional FS, Personal Gua/Nạp Âm,
//   Environmental (P6), Ergonomic (P6).
// - Prominent cultural disclaimer on traditional interpretations.
// - Transparent data quality & uncertainty display.
// - Interactive accordion rule cards, category filtering, and source inspection.
// - Browser print ready (window.print()).
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  UnifiedAssessmentReport,
  DataQualityIssue,
} from '../engine/core/unifiedAssessment.js';
import { RuleResult, RuleVerdict } from '../engine/core/ruleTypes.js';
import { SourceReference } from '../engine/core/sourceRegistry.js';
import { DetailedRoomElementAssessment } from '../engine/core/nguHanh/elementAssessment.js';
import { NguHanhElement } from '../engine/core/nguHanh/elementTypes.js';
import { NguHanhAssessmentPanel } from './NguHanhAssessmentPanel.js';
import { RoomConfig, RoomObject } from '../types/fengshui.js';
import { buildUserFacingReportViewModel } from '../engine/core/userFacingReportAdapter.js';
import { UserFacingFengShuiReport } from './UserFacingFengShuiReport.js';

interface UnifiedAssessmentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: UnifiedAssessmentReport | null;
  onRefresh?: () => void;
  nguHanhAssessment?: DetailedRoomElementAssessment | null;
  personalElement?: NguHanhElement | null;
  onOpenProfile?: () => void;
  roomConfig?: RoomConfig;
  objects?: RoomObject[];
}

export const UnifiedAssessmentReportModal: React.FC<UnifiedAssessmentReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onRefresh,
  nguHanhAssessment,
  personalElement,
  onOpenProfile,
  roomConfig,
  objects,
}) => {
  const [viewMode, setViewMode] = useState<'user_friendly' | 'technical'>('user_friendly');
  const [activeTab, setActiveTab] = useState<'all' | 'geometric' | 'traditional' | 'personal' | 'environmental' | 'ergonomic' | 'data_quality' | 'sources' | 'ngu_hanh'>('all');
  const [verdictFilter, setVerdictFilter] = useState<'all' | RuleVerdict>('all');
  const [expandedRuleIds, setExpandedRuleIds] = useState<Set<string>>(new Set());

  // Build simplified, professional user-facing report view model
  const userFacingData = useMemo(() => {
    if (!report) return null;
    return buildUserFacingReportViewModel({
      report,
      nguHanhAssessment,
      roomConfig,
      objects,
    });
  }, [report, nguHanhAssessment, roomConfig, objects]);

  // Filter rules by active tab and verdict (Hook must run unconditionally on every render)
  const displayedRules = useMemo(() => {
    if (!report) return [];
    let list: RuleResult[] = [];
    if (activeTab === 'all') {
      list = report.allRules;
    } else if (activeTab === 'geometric') {
      list = report.geometricRules;
    } else if (activeTab === 'traditional') {
      list = report.traditionalRules;
    } else if (activeTab === 'personal') {
      list = report.personalRules;
    } else if (activeTab === 'environmental') {
      list = report.environmentalRules ?? [];
    } else if (activeTab === 'ergonomic') {
      list = report.ergonomicRules ?? [];
    }

    if (verdictFilter !== 'all') {
      list = list.filter((r) => r.verdict === verdictFilter);
    }
    return list;
  }, [report, activeTab, verdictFilter]);

  // Check if developer debug mode is explicitly requested via URL (?debug=true)
  const isDebugMode = typeof window !== 'undefined' && window.location.search.includes('debug=true');

  if (!isOpen || !report) return null;

  // Always present clean, professional User-Facing Feng Shui Consultation Report for end users
  if (!isDebugMode && userFacingData) {
    return (
      <UserFacingFengShuiReport
        data={userFacingData}
        onClose={onClose}
        onRefresh={onRefresh}
        onOpenProfile={onOpenProfile}
      />
    );
  }

  const toggleExpand = (ruleId: string) => {
    setExpandedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!report) return;
    setExpandedRuleIds(new Set(report.allRules.map((r) => r.ruleId)));
  };

  const collapseAll = () => {
    setExpandedRuleIds(new Set());
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-xs select-text overflow-hidden print:p-0 print:bg-white print:static print:inset-auto">
      <div className="w-full max-w-5xl h-[92vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200 print:h-auto print:border-none print:shadow-none print:bg-white print:text-stone-900">
        
        {/* =========================================================================
            1. HEADER BAR
           ========================================================================= */}
        <header className="px-6 py-4 border-b border-stone-800 bg-stone-950/80 flex items-center justify-between shrink-0 print:border-stone-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-lg shadow-xs">
              📜
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white print:text-black">
                  Báo Cáo Phân Tích Phong Thủy Không Gian
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-800 text-stone-300 border border-stone-700">
                  {report.engineVersions.p6 ?? report.engineVersions.p5}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {report.roomSummary.roomName} • Khởi tạo: {new Date(report.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => setViewMode('user_friendly')}
              className="px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-950/80 hover:bg-emerald-900 text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Quay lại giao diện Báo cáo tư vấn tổng quan dễ hiểu"
            >
              <span>📖</span>
              <span>Báo cáo tư vấn</span>
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-800/80 hover:bg-stone-700 text-xs font-medium text-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Tính toán lại toàn bộ quy tắc"
              >
                <span>🔄</span>
                <span>Làm mới</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-800/80 hover:bg-stone-700 text-xs font-medium text-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="In báo cáo ra giấy hoặc lưu PDF"
            >
              <span>🖨</span>
              <span>In báo cáo</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-base transition-colors cursor-pointer"
              title="Đóng báo cáo"
            >
              ✕
            </button>
          </div>
        </header>

        {/* =========================================================================
            2. TOP STATS OVERVIEW (Strictly NO arbitrary 0-100 score)
           ========================================================================= */}
        <div className="px-6 py-3.5 bg-stone-900/60 border-b border-stone-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0 text-xs">
          <div className="p-2.5 rounded-xl bg-stone-950/60 border border-stone-800/80 flex flex-col justify-between">
            <span className="text-[11px] text-stone-400">Tổng quy tắc</span>
            <span className="text-lg font-bold text-white mt-1">{report.statistics.totalRules}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col justify-between">
            <span className="text-[11px] text-emerald-400 font-medium">✓ Thuận lợi</span>
            <span className="text-lg font-bold text-emerald-300 mt-1">{report.statistics.passCount}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex flex-col justify-between">
            <span className="text-[11px] text-amber-400 font-medium">⚠ Cần lưu ý</span>
            <span className="text-lg font-bold text-amber-300 mt-1">{report.statistics.warnCount}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 flex flex-col justify-between">
            <span className="text-[11px] text-rose-400 font-medium">✕ Không thuận</span>
            <span className="text-lg font-bold text-rose-300 mt-1">{report.statistics.failCount}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-stone-800/40 border border-stone-700/60 flex flex-col justify-between">
            <span className="text-[11px] text-stone-400">? Thiếu dữ liệu</span>
            <span className="text-lg font-bold text-stone-300 mt-1">{report.statistics.unknownCount}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-500/30 flex flex-col justify-between">
            <span className="text-[11px] text-sky-400">Độ đủ dữ liệu</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-lg font-bold text-sky-300">{report.dataCompleteness}%</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. TAB NAVIGATION & FILTERS
           ========================================================================= */}
        <div className="px-6 py-2.5 bg-stone-950 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs print:hidden">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-stone-100 text-stone-900 font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              Tất cả ({report.allRules.length})
            </button>
            <button
              onClick={() => setActiveTab('geometric')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'geometric'
                  ? 'bg-stone-100 text-stone-900 font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              📐 Bố trí hình học ({report.geometricRules.length})
            </button>
            <button
              onClick={() => setActiveTab('traditional')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'traditional'
                  ? 'bg-stone-100 text-stone-900 font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              ☯ Phong thủy truyền thống ({report.traditionalRules.length})
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-stone-100 text-stone-900 font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              👤 Bản mệnh ({report.personalRules.length})
            </button>
            <button
              onClick={() => setActiveTab('environmental')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'environmental'
                  ? 'bg-sky-100 text-sky-900 font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              🌿 Chiếu sáng & Thông gió ({(report.environmentalRules ?? []).length})
            </button>
            <button
              onClick={() => setActiveTab('ergonomic')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'ergonomic'
                  ? 'bg-teal-100 text-teal-900 font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              🚶 Lối đi & Công thái học ({(report.ergonomicRules ?? []).length})
            </button>
            <button
              onClick={() => setActiveTab('data_quality')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'data_quality'
                  ? 'bg-stone-100 text-stone-900 font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              ℹ Độ tin cậy ({report.dataQualityIssues.length})
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'sources'
                  ? 'bg-stone-100 text-stone-900 font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              📚 Nguồn tài liệu ({Object.keys(report.sourcesMap).length})
            </button>
            <button
              onClick={() => setActiveTab('ngu_hanh')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'ngu_hanh'
                  ? 'bg-emerald-100 text-emerald-900 font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              🌿 Ngũ Hành {nguHanhAssessment ? `(${nguHanhAssessment.totalEvaluated})` : ''}
            </button>
          </div>

          {/* Quick Verdict Filters & Expand Buttons */}
          {activeTab !== 'data_quality' && activeTab !== 'sources' && activeTab !== 'ngu_hanh' && (
            <div className="flex items-center gap-2">
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-700 text-[11px] text-stone-200 cursor-pointer"
              >
                <option value="all">Mọi trạng thái</option>
                <option value="pass">Chỉ xem: Thuận lợi</option>
                <option value="warn">Chỉ xem: Cần lưu ý</option>
                <option value="fail">Chỉ xem: Không thuận lợi</option>
                <option value="unknown">Chỉ xem: Thiếu dữ liệu</option>
              </select>

              <button
                onClick={expandAll}
                className="text-[11px] text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                Mở hết
              </button>
              <span className="text-stone-700">|</span>
              <button
                onClick={collapseAll}
                className="text-[11px] text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                Thu gọn
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            4. MAIN SCROLLABLE CONTENT BODY
           ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-stone-300">

          {/* P8.4: NGŨ HÀNH TAB VIEW */}
          {activeTab === 'ngu_hanh' && (
            <NguHanhAssessmentPanel
              assessment={nguHanhAssessment ?? null}
              personalElement={personalElement ?? null}
              onOpenProfile={onOpenProfile}
            />
          )}

          {/* 4.1 CULTURAL DISCLAIMER FOR TRADITIONAL FENG SHUI */}
          {(activeTab === 'all' || activeTab === 'traditional' || activeTab === 'personal') && (
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-600/30 text-amber-200/90 text-xs flex items-start gap-2.5 leading-relaxed">
              <span className="text-base shrink-0 mt-0.5">ℹ️</span>
              <div>
                <strong className="text-amber-100 font-semibold block mb-0.5">
                  Chú thích về phương pháp đánh giá phong thủy truyền thống:
                </strong>
                Các quy tắc phong thủy Loan Đầu và Bát Trạch được tổng hợp nhằm phản ánh diễn giải văn hóa cổ truyền phương Đông và nhân trắc học không gian sống. Đây là dữ liệu mang tính tham khảo kiến trúc và văn hóa, không phải kết luận khoa học thực nghiệm hoặc cam kết về vận mệnh, sức khỏe hay tài chính.
              </div>
            </div>
          )}

          {/* P6: DISCLAIMER FOR ERGONOMIC TAB */}
          {(activeTab === 'ergonomic') && (
            <div className="p-3.5 rounded-xl bg-teal-950/20 border border-teal-600/30 text-teal-200/90 text-xs flex items-start gap-2.5 leading-relaxed">
              <span className="text-base shrink-0 mt-0.5">📐</span>
              <div>
                <strong className="text-teal-100 font-semibold block mb-0.5">
                  Chú thích về đánh giá công thái học và lưu thông không gian:
                </strong>
                Các đánh giá công thái học dựa trên tiêu chuẩn kiến trúc nội thất (TCVN 4451:2012, Neufert) và hình học không gian. Kết quả phụ thuộc vào độ chính xác của kích thước vật thể và vị trí đã nhập trong mô hình 3D.
              </div>
            </div>
          )}

          {/* P6: DISCLAIMER FOR ENVIRONMENTAL TAB */}
          {(activeTab === 'environmental') && (
            <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-600/30 text-sky-200/90 text-xs flex items-start gap-2.5 leading-relaxed">
              <span className="text-base shrink-0 mt-0.5">🌿</span>
              <div>
                <strong className="text-sky-100 font-semibold block mb-0.5">
                  Chú thích về đánh giá chiếu sáng và thông gió:
                </strong>
                Đánh giá này dựa trên hình học cửa sổ/cửa ra vào trong mô hình 3D. Hệ thống KHÔNG tính toán lux thực tế hay tốc độ gió — cần thiết bị đo chuyên dụng hoặc phần mềm mô phỏng (Dialux, OpenFOAM) để có số liệu chính xác.
              </div>
            </div>
          )}

          {/* 4.2 PERSONAL PROFILE & HOUSE/ROOM SUMMARY CARD */}
          {(activeTab === 'all' || activeTab === 'personal') && report.personalSummary && (
            <section className="p-4 rounded-xl bg-stone-950 border border-stone-800/90 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👤</span>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                    Hồ Sơ Bản Mệnh Gia Chủ & Phương Vị Bát Trạch
                  </h2>
                </div>
                {report.personalSummary.isCertain ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Đã xác định chắc chắn
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">
                    Giáp Lập Xuân (Cần thêm giờ sinh)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                  <span className="text-stone-400 block mb-0.5">Quái Mệnh (Gua)</span>
                  <span className="text-sm font-bold text-white">
                    {report.personalSummary.guaName} (Số {report.personalSummary.guaNumber})
                  </span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    Hành {report.personalSummary.element}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                  <span className="text-stone-400 block mb-0.5">Nhóm Mệnh Trạch</span>
                  <span className="text-sm font-bold text-emerald-300">
                    {report.personalSummary.group}
                  </span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    {report.personalSummary.group === 'Đông Tứ Mệnh' ? 'Hợp Bắc, Nam, Đông, Đ.Nam' : 'Hợp Tây, T.Bắc, T.Nam, Đ.Bắc'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                  <span className="text-stone-400 block mb-0.5">Can Chi & Nạp Âm</span>
                  <span className="text-sm font-bold text-amber-300">
                    {report.personalSummary.canChi || 'Chưa tính'}
                  </span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    {report.personalSummary.napAm} ({report.personalSummary.napAmElement})
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                  <span className="text-stone-400 block mb-0.5">Năm sinh hiệu lực</span>
                  <span className="text-sm font-bold text-white">
                    {report.personalSummary.effectiveSolarYear || report.personalSummary.birthDate}
                  </span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    Tiết khí: {report.personalSummary.calendarPolicy}
                  </span>
                </div>
              </div>

              {report.personalSummary.auspiciousDirections && (
                <div className="pt-1 flex flex-wrap gap-4 text-[11px]">
                  <div>
                    <span className="text-emerald-400 font-semibold mr-1.5">✓ 4 Hướng Cát:</span>
                    <span className="text-stone-300">
                      {report.personalSummary.auspiciousDirections.join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-rose-400 font-semibold mr-1.5">✕ 4 Hướng Hung:</span>
                    <span className="text-stone-300">
                      {report.personalSummary.inauspiciousDirections?.join(', ')}
                    </span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 4.3 DATA QUALITY & UNCERTAINTY SECTION */}
          {activeTab === 'data_quality' && (
            <section className="space-y-4">
              <div className="border-b border-stone-800 pb-2">
                <h2 className="text-sm font-bold text-white">
                  Độ Tin Cậy & Dữ Liệu Còn Thiếu
                </h2>
                <p className="text-xs text-stone-400">
                  Phân tích mức độ hoàn thiện của các thông số đầu vào và tính chắc chắn của kết luận
                </p>
              </div>

              {report.dataQualityIssues.length === 0 ? (
                <div className="p-6 rounded-xl bg-stone-950 border border-stone-800 text-center text-stone-400">
                  ✓ Toàn bộ dữ liệu khảo sát và thông số bản mệnh đã hoàn thiện đầy đủ.
                </div>
              ) : (
                <div className="space-y-3">
                  {report.dataQualityIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-4 rounded-xl border ${
                        issue.severity === 'critical'
                          ? 'bg-rose-950/20 border-rose-600/40'
                          : issue.severity === 'warning'
                          ? 'bg-amber-950/20 border-amber-600/40'
                          : 'bg-stone-950 border-stone-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-white text-xs">{issue.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-stone-800 text-stone-300">
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 leading-relaxed">{issue.description}</p>
                      {issue.impactedRuleIds.length > 0 && (
                        <div className="mt-2 text-[11px] text-stone-500">
                          Ảnh hưởng đến các quy tắc: <span className="text-stone-400 font-mono">{issue.impactedRuleIds.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 4.4 SOURCE REGISTRY BROWSER TAB */}
          {activeTab === 'sources' && (
            <section className="space-y-4">
              <div className="border-b border-stone-800 pb-2">
                <h2 className="text-sm font-bold text-white">
                  Danh Mục Nguồn Tài Liệu & Tiêu Chuẩn Tham Chiếu
                </h2>
                <p className="text-xs text-stone-400">
                  Tất cả nhận định trong báo cáo đều được đối chiếu với mã nguồn tài liệu đăng ký chính thức
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {Object.values(report.sourcesMap).map((src) => (
                  <div key={src.id} className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-emerald-400 font-bold">{src.code}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          src.status === 'verified'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {src.status === 'verified' ? 'Đã xác minh' : 'Chờ thẩm định'}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-white">{src.title}</h3>
                    {src.authorOrOrigin && (
                      <p className="text-[11px] text-stone-400">Tác giả / Cơ quan: {src.authorOrOrigin}</p>
                    )}
                    <p className="text-[11px] text-stone-400 leading-relaxed">{src.description}</p>
                    {src.notes && (
                      <div className="p-2 rounded bg-stone-900 border border-stone-800 text-[10px] text-stone-500 italic">
                        {src.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4.5 ACTIONABLE RECOMMENDATIONS SUMMARY (If any rules failed or warned) */}
          {(activeTab === 'all' || activeTab === 'geometric' || activeTab === 'traditional') && report.recommendations.length > 0 && (
            <section className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
                <span className="text-sm">💡</span>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Khuyến Nghị Điều Chỉnh Không Gian ({report.recommendations.length})
                </h2>
              </div>

              <div className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <div key={`${rec.ruleId}_${i}`} className="p-3 rounded-lg bg-stone-900 border border-stone-800 flex items-start gap-2.5">
                    <span className="text-amber-400 font-bold text-xs shrink-0 mt-0.5">#{i + 1}</span>
                    <div className="text-xs space-y-0.5">
                      <span className="font-semibold text-white mr-1.5">{rec.ruleName}:</span>
                      <span className="text-stone-300">{rec.remedy}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4.6 EVALUATED RULE CARDS LIST */}
          {activeTab !== 'data_quality' && activeTab !== 'sources' && activeTab !== 'ngu_hanh' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Chi Tiết Từng Quy Tắc ({displayedRules.length})
                </h2>
                <span className="text-[11px] text-stone-500">
                  Nhấn vào từng thẻ để xem chi tiết đo lường hình học và nguồn dẫn
                </span>
              </div>

              {displayedRules.length === 0 ? (
                <div className="p-8 text-center text-stone-500 bg-stone-950 rounded-xl border border-stone-800">
                  Không có quy tắc nào khớp với bộ lọc hiện tại.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {displayedRules.map((rule) => {
                    const isExpanded = expandedRuleIds.has(rule.ruleId);
                    const verdictConfig = {
                      pass: { label: 'Thuận lợi', bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-600/40', icon: '✓' },
                      warn: { label: 'Cần lưu ý', bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-600/40', icon: '⚠' },
                      fail: { label: 'Không thuận', bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-600/40', icon: '✕' },
                      unknown: { label: 'Thiếu dữ liệu', bg: 'bg-stone-800/40', text: 'text-stone-400', border: 'border-stone-700/60', icon: '?' },
                      'n/a': { label: 'Không áp dụng', bg: 'bg-stone-900/40', text: 'text-stone-500', border: 'border-stone-800', icon: '–' },
                    }[rule.verdict];

                    return (
                      <div
                        key={rule.ruleId}
                        className={`rounded-xl border transition-all overflow-hidden ${
                          rule.verdict === 'fail'
                            ? 'bg-stone-950 border-rose-900/40'
                            : rule.verdict === 'warn'
                            ? 'bg-stone-950 border-amber-900/40'
                            : 'bg-stone-950 border-stone-800/80'
                        }`}
                      >
                        {/* Card Header (Click to toggle) */}
                        <button
                          onClick={() => toggleExpand(rule.ruleId)}
                          className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-stone-900/60 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${verdictConfig.bg} ${verdictConfig.text} ${verdictConfig.border}`}>
                              {verdictConfig.icon}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold text-white">{rule.name}</h3>
                                <span className="font-mono text-[10px] text-stone-500 font-normal">[{rule.ruleId}]</span>
                              </div>
                              <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-1">{rule.explanation}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${verdictConfig.bg} ${verdictConfig.text} ${verdictConfig.border}`}>
                              {verdictConfig.label}
                            </span>
                            <span className="text-stone-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </button>

                        {/* Expandable Card Body */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-stone-800/80 space-y-3.5 bg-stone-900/30 text-xs">
                            {/* Explanation Detail */}
                            <div>
                              <span className="text-stone-400 text-[11px] font-bold block mb-1">Diễn giải chi tiết:</span>
                              <p className="text-stone-200 leading-relaxed bg-stone-950 p-2.5 rounded-lg border border-stone-800">
                                {rule.explanation}
                              </p>
                            </div>

                            {/* Measurement Evidence */}
                            {rule.measurement && (
                              <div className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 space-y-1.5">
                                <span className="text-stone-400 text-[11px] font-bold block">Số liệu đo lường hình học (Measurement):</span>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                                  <div>
                                    <span className="text-stone-500">Chỉ số: </span>
                                    <span className="font-mono text-stone-300">{rule.measurement.metric}</span>
                                  </div>
                                  <div>
                                    <span className="text-stone-500">Giá trị đo: </span>
                                    <span className="font-bold text-white font-mono">
                                      {String(rule.measurement.value)} {rule.measurement.unit || ''}
                                    </span>
                                  </div>
                                  {rule.measurement.threshold !== undefined && (
                                    <div>
                                      <span className="text-stone-500">Ngưỡng: </span>
                                      <span className="font-mono text-stone-300">{String(rule.measurement.threshold)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Remedy Action */}
                            {rule.remedy && (
                              <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-600/30 text-emerald-200">
                                <strong className="font-bold text-emerald-300 block mb-0.5 text-[11px]">Hướng khắc phục đề xuất:</strong>
                                <p className="text-[11px] leading-relaxed">{rule.remedy}</p>
                              </div>
                            )}

                            {/* Missing inputs warning if any */}
                            {rule.missingInputs && rule.missingInputs.length > 0 && (
                              <div className="p-2 rounded bg-stone-950 border border-stone-800 text-[11px] text-stone-400">
                                <span className="text-amber-400 font-bold">Thông tin còn thiếu: </span>
                                {rule.missingInputs.join(', ')}
                              </div>
                            )}

                            {/* Metadata & Sources Footer */}
                            <div className="pt-2 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-500 font-mono">
                              <div>
                                <span>Trường phái: <span className="text-stone-400">{rule.school}</span></span> • 
                                <span> Danh mục: <span className="text-stone-400">{rule.category}</span></span> • 
                                <span> Mức độ: <span className="text-stone-400 uppercase">{rule.severity}</span></span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span>Nguồn:</span>
                                {rule.sources.map((srcId) => {
                                  const src = report.sourcesMap[srcId];
                                  return (
                                    <span
                                      key={srcId}
                                      className={`px-1.5 py-0.5 rounded font-bold ${
                                        src?.status === 'verified'
                                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                          : 'bg-stone-800 text-amber-300 border border-stone-700'
                                      }`}
                                      title={src?.title || srcId}
                                    >
                                      {src?.code || srcId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

        </div>

        {/* =========================================================================
            5. FOOTER STATUS BAR
           ========================================================================= */}
        <footer className="px-6 py-3 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between shrink-0 text-xs text-stone-400 print:hidden">
          <div className="flex items-center gap-4">
            <span>📐 Phòng: {report.roomSummary.dimensions.width}m × {report.roomSummary.dimensions.length}m ({report.roomSummary.dimensions.areaM2}m²)</span>
            <span>🛋 Vật thể: {report.roomSummary.objectCount}</span>
            <span>🧭 Hướng phòng: {report.roomSummary.roomOrientation}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Đóng báo cáo
          </button>
        </footer>

      </div>
    </div>
  );
};

