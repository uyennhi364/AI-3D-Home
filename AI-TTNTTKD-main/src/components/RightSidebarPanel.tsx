import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FengShuiRoomEvaluation,
  UserFengShuiProfile,
  RoomConfig,
  RoomObject,
  ProposedAdjustment,
  AIActionCommand,
  LayoutOptimizationProposal,
  StructuredActionHistoryEntry,
  FengShuiItemEvaluation,
} from '../types/fengshui';
import { AIChatConsultant } from './AIChatConsultant';
import { ObjectPropertiesPanel } from './ObjectPropertiesPanel';
import { evaluateFurnitureAssessment } from '../engine/core/nguHanh/elementAssessment.js';
import { NguHanhElement } from '../engine/core/nguHanh/elementTypes.js';

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
  onUpdateObjectPosition?: (id: string, x: number, z: number) => void;
  onRotateObject?: (id: string, angleDeltaRad: number) => void;
  onDeleteObject?: (id: string) => void;
  onDuplicateObject?: (id: string) => void;
  onAskAiForBetterPlacement?: (objectName: string) => void;
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
  onUpdateObjectPosition = () => {},
  onRotateObject = () => {},
  onDeleteObject = () => {},
  onDuplicateObject = () => {},
  onAskAiForBetterPlacement,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'properties'>('chat');
  const prevSelectedIdRef = useRef<string | null>(selectedObjectId);

  // Automatically switch to properties panel when an object is explicitly clicked in 3D scene
  useEffect(() => {
    if (selectedObjectId && selectedObjectId !== prevSelectedIdRef.current) {
      setActiveTab('properties');
    }
    prevSelectedIdRef.current = selectedObjectId;
  }, [selectedObjectId]);

  // Find currently selected object entity
  const selectedObject = useMemo(() => {
    if (!selectedObjectId) return null;
    return objects.find((o) => o.id === selectedObjectId) || null;
  }, [objects, selectedObjectId]);

  // Find item evaluation from rule engine (Bát Trạch, Loan Đầu, direction, pros, issues)
  const evaluationItem = useMemo<FengShuiItemEvaluation | null>(() => {
    if (!selectedObjectId || !evaluation?.items) return null;
    return evaluation.items.find((item) => item.objectId === selectedObjectId) || null;
  }, [evaluation, selectedObjectId]);

  // Compute Ngũ Hành element profile (P8 rule engine) for selected object
  const nguHanhSummary = useMemo(() => {
    if (!selectedObject) return null;
    try {
      return evaluateFurnitureAssessment(selectedObject, userProfile.element as NguHanhElement, {
        direction: roomConfig.direction,
      });
    } catch (_err) {
      return null;
    }
  }, [selectedObject, userProfile.element, roomConfig.direction]);

  const handleAskAiPlacement = (name: string) => {
    setActiveTab('chat');
    if (onAskAiForBetterPlacement) {
      onAskAiForBetterPlacement(name);
    }
  };

  return (
    <aside className="w-full h-full bg-white rounded-2xl shadow-2xl border border-stone-200/80 p-0 flex flex-col select-none text-stone-900 pointer-events-auto overflow-hidden">
      {/* Tab Navigation Header: Trợ lý AI vs Thuộc tính đồ vật */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 bg-stone-50/80 shrink-0">
        <div className="flex items-center gap-1 p-0.5 bg-stone-200/70 rounded-xl">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-white text-stone-900 shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>💬</span>
            <span>Trợ lý AI</span>
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'properties'
                ? 'bg-white text-stone-900 shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>📐</span>
            <span>Thuộc tính đồ vật</span>
            {selectedObject && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title={selectedObject.name} />
            )}
          </button>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 flex items-center justify-center text-xs transition-colors cursor-pointer"
            title="Đóng panel"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 min-h-0 relative">
        <div className={`h-full w-full ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
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
        </div>

        <div className={`h-full w-full ${activeTab === 'properties' ? 'block' : 'hidden'}`}>
          <ObjectPropertiesPanel
            selectedObject={selectedObject}
            evaluationItem={evaluationItem}
            onUpdatePosition={onUpdateObjectPosition}
            onRotateObject={onRotateObject}
            onDeleteObject={onDeleteObject}
            onDuplicateObject={onDuplicateObject}
            onAskAiForBetterPlacement={handleAskAiPlacement}
            onClose={() => setActiveTab('chat')}
            nguHanhSummary={nguHanhSummary}
            personalElement={(userProfile.element as NguHanhElement) || null}
          />
        </div>
      </div>
    </aside>
  );
};
