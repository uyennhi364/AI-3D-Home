// =============================================================================
// src/components/NguHanhObjectCard.tsx
// Phase P8.4 — Per-Object Ngũ Hành Assessment Card
//
// DESIGN PRINCIPLES:
// - Displays FurnitureAssessmentSummary from deterministic P8-M3 engine.
// - Shows 4 attribute rows (color, material, shape, direction) with badges.
// - Shows all rule results with verdict badges.
// - Heuristic rules (NH-SHAPE-01) show mandatory disclaimer.
// - Expandable: summary collapsed by default, full 9-field explanation on expand.
// - Zero inline logic — all verdicts come from engine output.
// =============================================================================

import React, { useState } from 'react';
import { FurnitureAssessmentSummary } from '../engine/core/nguHanh/elementAssessment.js';
import { NguHanhElement } from '../engine/core/nguHanh/elementTypes.js';
import { NguHanhVerdictBadge, NguHanhVerdict } from './NguHanhVerdictBadge.js';
import { NguHanhElementBadge } from './NguHanhElementBadge.js';
import { ElementRuleResult } from '../engine/core/nguHanh/elementRuleEngine.js';

interface NguHanhObjectCardProps {
  summary: FurnitureAssessmentSummary;
  personalElement: NguHanhElement | null;
  defaultExpanded?: boolean;
}

function toNguHanhVerdict(verdict: string): NguHanhVerdict {
  if (verdict === 'pass' || verdict === 'warn' || verdict === 'fail' || verdict === 'unknown' || verdict === 'n/a') {
    return verdict as NguHanhVerdict;
  }
  return 'unknown';
}

const RULE_ATTRIBUTE_LABEL: Record<string, string> = {
  'NH-COLOR-01': 'Màu sắc (hỗ trợ)',
  'NH-COLOR-02': 'Màu sắc (xung khắc)',
  'NH-MAT-01': 'Chất liệu (hỗ trợ)',
  'NH-MAT-02': 'Chất liệu (xung khắc)',
  'NH-SHAPE-01': 'Hình khối 3D',
  'NH-DIR-01': 'Phương vị đặt đồ',
  'NH-ROOM-01': 'Màu phòng',
};

export const NguHanhObjectCard: React.FC<NguHanhObjectCardProps> = ({
  summary,
  personalElement,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  const { profile, rules, passCount, warnCount, failCount, unknownCount, naCount } = summary;

  const toggleRule = (ruleId: string) => {
    setExpandedRuleId((prev) => (prev === ruleId ? null : ruleId));
  };

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 overflow-hidden text-xs">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between p-3 hover:bg-stone-800 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-stone-100 truncate max-w-[140px]">
            {profile.objectType}
          </span>
          {profile.dominantElement && (
            <NguHanhElementBadge element={profile.dominantElement} size="sm" />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-emerald-400 text-[10px] font-mono">{passCount}✓</span>
          {warnCount > 0 && <span className="text-amber-400 text-[10px] font-mono">{warnCount}⚠</span>}
          {failCount > 0 && <span className="text-red-400 text-[10px] font-mono">{failCount}✕</span>}
          {unknownCount > 0 && <span className="text-gray-400 text-[10px] font-mono">{unknownCount}?</span>}
          <span className="text-stone-500 text-[10px]">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-stone-700">
          {/* 4 Attribute rows */}
          <div className="p-3 space-y-1.5 border-b border-stone-700/60 bg-stone-950/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">
              Phân tích thuộc tính
            </p>

            {/* Color */}
            <AttributeRow
              label="Màu sắc"
              value={profile.colorAnalysis.normalizedValue ?? profile.colorAnalysis.rawInput as string ?? '—'}
              element={profile.colorAnalysis.element}
              dataStatus={profile.colorAnalysis.dataStatus}
            />

            {/* Material */}
            <AttributeRow
              label="Chất liệu"
              value={profile.materialAnalysis.normalizedValue ?? profile.materialAnalysis.rawInput as string ?? '—'}
              element={profile.materialAnalysis.element}
              dataStatus={profile.materialAnalysis.dataStatus}
            />

            {/* Shape */}
            <AttributeRow
              label="Hình khối"
              value={profile.shapeAnalysis.normalizedValue ?? '—'}
              element={profile.shapeAnalysis.element}
              dataStatus={profile.shapeAnalysis.dataStatus}
            />

            {/* Direction */}
            <AttributeRow
              label="Phương vị"
              value={profile.locationDirectionAnalysis.normalizedValue ?? '—'}
              element={profile.locationDirectionAnalysis.element}
              dataStatus={profile.locationDirectionAnalysis.dataStatus}
            />
          </div>

          {/* Rule results */}
          <div className="p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">
              Kết quả quy tắc Ngũ Hành
            </p>

            {rules.map((rule) => (
              <RuleCard
                key={rule.ruleId}
                rule={rule}
                personalElement={personalElement}
                isExpanded={expandedRuleId === rule.ruleId}
                onToggle={() => toggleRule(rule.ruleId)}
              />
            ))}
          </div>

          {/* Count summary */}
          <div className="px-3 pb-3 flex gap-3 text-[10px] text-stone-500 border-t border-stone-700/40 pt-2">
            <span className="text-emerald-400 font-mono">PASS: {passCount}</span>
            <span className="text-amber-400 font-mono">WARN: {warnCount}</span>
            <span className="text-red-400 font-mono">FAIL: {failCount}</span>
            <span className="text-gray-400 font-mono">?: {unknownCount}</span>
            <span className="text-stone-600 font-mono">N/A: {naCount}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AttributeRowProps {
  label: string;
  value: string;
  element: string | null;
  dataStatus: string;
}

const AttributeRow: React.FC<AttributeRowProps> = ({ label, value, element, dataStatus }) => {
  const statusColor =
    dataStatus === 'known'
      ? 'text-stone-300'
      : dataStatus === 'ambiguous'
      ? 'text-amber-400'
      : dataStatus === 'insufficient'
      ? 'text-stone-500 italic'
      : 'text-stone-600';

  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-stone-500 w-20 shrink-0">{label}:</span>
      <span className={`flex-1 truncate ${statusColor}`}>
        {value || (dataStatus === 'insufficient' ? 'Chưa cung cấp' : '—')}
      </span>
      <NguHanhElementBadge element={element as any} size="sm" showLabel />
    </div>
  );
};

interface RuleCardProps {
  rule: ElementRuleResult;
  personalElement: NguHanhElement | null;
  isExpanded: boolean;
  onToggle: () => void;
}

const RuleCard: React.FC<RuleCardProps> = ({ rule, personalElement, isExpanded, onToggle }) => {
  const isHeuristic = rule.certainty === 'heuristic';
  const verdict = toNguHanhVerdict(rule.verdict);

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        rule.verdict === 'fail'
          ? 'border-red-800/60 bg-red-950/20'
          : rule.verdict === 'warn'
          ? 'border-amber-800/60 bg-amber-950/20'
          : rule.verdict === 'pass'
          ? 'border-emerald-800/40 bg-emerald-950/10'
          : 'border-stone-700/60 bg-stone-900/40'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 p-2.5 cursor-pointer hover:bg-stone-800/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-mono text-[10px] text-stone-500 shrink-0">{rule.ruleId}</span>
          <span className="text-stone-300 truncate text-[11px]">
            {RULE_ATTRIBUTE_LABEL[rule.ruleId] || rule.ruleName}
          </span>
          {isHeuristic && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/40 shrink-0">
              heuristic
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <NguHanhVerdictBadge verdict={verdict} size="sm" />
          <span className="text-stone-600 text-[9px]">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Heuristic disclaimer — always visible when rule is heuristic */}
      {isHeuristic && (
        <div className="px-2.5 pb-2 text-[10px] text-amber-300/80 flex items-start gap-1.5 border-t border-amber-800/30">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>
            Quy tắc heuristic — Dựa trên quy ước nội bộ AI Studio, chưa có nguồn cổ điển
            trực tiếp. Mang tính tham khảo.
          </span>
        </div>
      )}

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-stone-700/40 pt-2 bg-stone-950/40">
          <DetailRow label="Quy tắc" value={rule.ruleName} />
          {rule.explanation && <DetailRow label="Mô tả" value={rule.explanation} />}
          {rule.measurement && <DetailRow label="Bằng chứng đo lường" value={String(rule.measurement)} />}
          {rule.remedy && (
            <DetailRow
              label="Khắc phục"
              value={rule.remedy}
              valueClass="text-amber-300"
            />
          )}

          {/* Sources */}
          {rule.sources && rule.sources.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {rule.sources.map((src) => (
                <span
                  key={src}
                  className="px-1.5 py-0.5 rounded bg-stone-800 text-emerald-400 font-mono text-[9px] border border-stone-700"
                  title={src}
                >
                  {src.replace('SRC-', '')}
                </span>
              ))}
            </div>
          )}

          {/* Certainty */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-stone-500 text-[10px]">Độ tin cậy:</span>
            <span
              className={`text-[10px] font-semibold ${
                rule.certainty === 'classical'
                  ? 'text-emerald-400'
                  : rule.certainty === 'applied'
                  ? 'text-blue-400'
                  : 'text-amber-400'
              }`}
            >
              {rule.certainty === 'classical'
                ? 'Cổ điển (văn bản cổ)'
                : rule.certainty === 'applied'
                ? 'Ứng dụng (quy ước kiến trúc)'
                : '⚠️ Heuristic (nội bộ)'}
            </span>
          </div>

          {rule.disclaimer && (
            <div className="text-[10px] text-amber-300/80 italic border-l-2 border-amber-700 pl-2">
              {rule.disclaimer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  valueClass?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, valueClass = 'text-stone-300' }) => (
  <div className="flex items-start gap-2 text-[11px]">
    <span className="text-stone-500 shrink-0 w-28">{label}:</span>
    <span className={`leading-relaxed ${valueClass}`}>{value}</span>
  </div>
);

