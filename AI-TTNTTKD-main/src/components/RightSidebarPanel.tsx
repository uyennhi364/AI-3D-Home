import React from 'react';
import {
  FengShuiRoomEvaluation,
  UserFengShuiProfile,
  RoomConfig,
  RoomObject,
  ProposedAdjustment,
  AIActionCommand,
  LayoutOptimizationProposal,
  StructuredActionHistoryEntry,
} from '../types/fengshui';
import { AIChatConsultant } from './AIChatConsultant';

export interface RightSidebarPanelProps {
  userProfile: UserFengShuiProfile;
  roomConfig: RoomConfig;
  objects: RoomObject[];
  evaluation: FengShuiRoomEvaluation;
  selectedObjectId: string | null;
  onPreviewProposal: (proposal: ProposedAdjustment | null, adjustments?: ProposedAdjustment[]) => void;
  onApplyProposal: (proposal: ProposedAdjustment) => void;
  onApplyMultipleAdjustments: (proposals: ProposedAdjustment[]) => void;
  onExecuteAIAction?: (action: AIActionCommand) => boolean | void;
  onExecuteAIActions?: (actions: any[]) => {
    successCount: number;
    failCount: number;
    executedEntries?: StructuredActionHistoryEntry[];
  };
  onOpenOptimizationModal?: (proposal: LayoutOptimizationProposal) => void;
  isPreviewingProposal: boolean;
  externalTriggerPrompt?: string | null;
  onClearExternalTriggerPrompt?: () => void;
  onFocusObjects?: (sourceId: string, targetId: string, label: string, distance: string) => void;
  onClose?: () => void;
}

export const RightSidebarPanel: React.FC<RightSidebarPanelProps> = ({
  userProfile,
  roomConfig,
  objects,
  evaluation,
  selectedObjectId,
  onPreviewProposal,
  onApplyProposal,
  onApplyMultipleAdjustments,
  onExecuteAIAction = () => {},
  onExecuteAIActions,
  onOpenOptimizationModal,
  isPreviewingProposal,
  externalTriggerPrompt,
  onClearExternalTriggerPrompt,
  onFocusObjects,
  onClose,
}) => {
  return (
    <aside className="w-full h-full bg-white rounded-2xl shadow-2xl border border-stone-200/80 p-0 flex flex-col select-none text-stone-900 pointer-events-auto overflow-hidden">
      <AIChatConsultant
        userProfile={userProfile}
        roomConfig={roomConfig}
        objects={objects}
        evaluation={evaluation}
        selectedObjectId={selectedObjectId}
        onPreviewProposal={onPreviewProposal}
        onApplyProposal={onApplyProposal}
        onApplyMultipleAdjustments={onApplyMultipleAdjustments}
        onExecuteAIAction={onExecuteAIAction}
        onExecuteAIActions={onExecuteAIActions}
        onOpenOptimizationModal={onOpenOptimizationModal}
        isPreviewingProposal={isPreviewingProposal}
        externalTriggerPrompt={externalTriggerPrompt}
        onClearExternalTriggerPrompt={onClearExternalTriggerPrompt}
        onFocusObjects={onFocusObjects}
        onClose={onClose}
      />
    </aside>
  );
};
