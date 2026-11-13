// =============================================================================
// src/components/NguHanhElementBadge.tsx
// Phase P8.4 — Ngũ Hành Element Badge (Reusable)
//
// DESIGN PRINCIPLES:
// - Displays a NguHanhElement as a colored chip with Vietnamese label.
// - Null element displays "Chưa xác định" in muted gray.
// - Purely display component — zero logic.
// =============================================================================

import React from 'react';
import { NguHanhElement } from '../engine/core/nguHanh/elementTypes.js';

interface NguHanhElementBadgeProps {
  element: NguHanhElement | null;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const ELEMENT_CONFIG: Record<
  string,
  { label: string; emoji: string; className: string }
> = {
  Kim: {
    label: 'Kim',
    emoji: '⚪',
    className: 'bg-gray-100 text-gray-700 border border-gray-300',
  },
  Mộc: {
    label: 'Mộc',
    emoji: '🟢',
    className: 'bg-green-100 text-green-800 border border-green-300',
  },
  Thủy: {
    label: 'Thủy',
    emoji: '🔵',
    className: 'bg-blue-100 text-blue-800 border border-blue-300',
  },
  Hỏa: {
    label: 'Hỏa',
    emoji: '🔴',
    className: 'bg-red-100 text-red-800 border border-red-300',
  },
  Thổ: {
    label: 'Thổ',
    emoji: '🟡',
    className: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  },
};

const NULL_CONFIG = {
  label: 'Chưa xác định',
  emoji: '❓',
  className: 'bg-gray-50 text-gray-400 border border-gray-200',
};

export const NguHanhElementBadge: React.FC<NguHanhElementBadgeProps> = ({
  element,
  size = 'sm',
  showLabel = true,
}) => {
  const config = element ? (ELEMENT_CONFIG[element] ?? NULL_CONFIG) : NULL_CONFIG;
  const textSize = size === 'md' ? 'text-xs' : 'text-[10px]';
  const padding = size === 'md' ? 'px-2.5 py-1' : 'px-1.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-semibold ${textSize} ${padding} ${config.className}`}
      title={config.label}
    >
      <span>{config.emoji}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

