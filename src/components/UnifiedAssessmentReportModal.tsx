// =============================================================================
// src/components/UnifiedAssessmentReportModal.tsx
// AI Feng Shui Studio — Modal Báo Cáo Tư Vấn Phong Thủy Phòng Ngủ
//
// ĐÃ LOẠI BỎ HOÀN TOÀN BÁO CÁO CHI TIẾT KỸ THUẬT (27 QUY TẮC / OBB / RULE CODES).
// Chỉ hiển thị duy nhất "Bản Tư Vấn Phong Thủy Phòng Ngủ" trực quan, trang nhã,
// dễ hiểu dành cho gia chủ phổ thông.
// =============================================================================

import React, { useMemo } from 'react';
import { UnifiedAssessmentReport } from '../engine/core/unifiedAssessment.js';
import { DetailedRoomElementAssessment } from '../engine/core/nguHanh/elementAssessment.js';
import { NguHanhElement } from '../engine/core/nguHanh/elementTypes.js';
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
  personalElement: _personalElement,
  onOpenProfile,
  roomConfig,
  objects,
}) => {
  // Chuẩn bị dữ liệu Bản Tư Vấn Phong Thủy Phòng Ngủ 6 phần tự nhiên
  const userFacingData = useMemo(() => {
    if (!report) return null;
    return buildUserFacingReportViewModel({
      report,
      nguHanhAssessment,
      roomConfig,
      objects,
    });
  }, [report, nguHanhAssessment, roomConfig, objects]);

  if (!isOpen || !report || !userFacingData) {
    return null;
  }

  return (
    <UserFacingFengShuiReport
      data={userFacingData}
      onClose={onClose}
      onRefresh={onRefresh}
      onOpenProfile={onOpenProfile}
    />
  );
};
