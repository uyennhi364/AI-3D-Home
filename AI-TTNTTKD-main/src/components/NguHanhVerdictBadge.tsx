// =============================================================================
// src/components/NguHanhVerdictBadge.tsx
// Phase P8.4 — Ngũ Hành Verdict Badge (Reusable)
//
// DESIGN PRINCIPLES:
// - Displays rule verdict as a colored badge in Vietnamese.
// - UNKNOWN is always displayed with gray — NEVER green.
// - Strictly no logic — pure display component.
// =============================================================================

import React from 'react';

export type NguHanhVerdict = 'pass' | 'warn' | 'fail' | 'unknown' | 'n/a';

interface NguHanhVerdictBadgeProps {
  verdict: NguHanhVerdict;
  size?: 'sm' | 'md';
}

const VERDICT_CONFIG: Record<NguHanhVerdict, { label: string; className: string; icon: string }> = {
  pass: {
    label: 'HỢP CÁCH',
    className: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    icon: '✅',
  },
  warn: {
    label: 'CẢNH BÁO',
    className: 'bg-amber-100 text-amber-800 border border-amber-300',
    icon: '⚠️',
  },
  fail: {
    label: 'XUNG KHẮC',
    className: 'bg-red-100 text-red-800 border border-red-300',
    icon: '❌',
  },
  unknown: {
    label: 'CHƯA XÁC ĐỊNH',
    className: 'bg-gray-100 text-gray-600 border border-gray-300',
    icon: '❓',
  },
  'n/a': {
    label: 'N/A',
    className: 'bg-gray-50 text-gray-400 border border-gray-200',
    icon: '—',
  },
};

export const NguHanhVerdictBadge: React.FC<NguHanhVerdictBadgeProps> = ({
  verdict,
  size = 'sm',
}) => {
  const config = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG['unknown'];
  const textSize = size === 'md' ? 'text-xs' : 'text-[10px]';
  const padding = size === 'md' ? 'px-2 py-1' : 'px-1.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-bold tracking-wide ${textSize} ${padding} ${config.className}`}
      title={config.label}
    >
      <span className="text-[10px]">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

