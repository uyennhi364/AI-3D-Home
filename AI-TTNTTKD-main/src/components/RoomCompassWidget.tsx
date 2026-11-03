import React, { useState, useEffect, useRef } from 'react';
import { CompassDirection, UserFengShuiProfile } from '../types/fengshui';
import { DIRECTION_NAMES_VI, DIRECTION_ANGLES } from '../engine/batTrach';

interface RoomCompassWidgetProps {
  roomDirection?: CompassDirection | string;
  rotationAngle?: number;
  userProfile?: UserFengShuiProfile;
  onChangeRoomDirection?: (direction: CompassDirection) => void;
  onResetCamera?: () => void;
}

const ALL_DIRECTIONS: CompassDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// 12 ticks around 360 degrees (every 30 deg)
const DIAL_TICKS = Array.from({ length: 12 }, (_, i) => i * 30);

export const RoomCompassWidget: React.FC<RoomCompassWidgetProps> = ({
  roomDirection = 'N',
  rotationAngle,
  userProfile,
  onChangeRoomDirection,
  onResetCamera,
}) => {
  const [cameraRotation, setCameraRotation] = useState<number>(rotationAngle ?? 0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with rotationAngle prop if provided
  useEffect(() => {
    if (rotationAngle !== undefined) {
      setCameraRotation(rotationAngle);
    }
  }, [rotationAngle]);

  // Listen for real-time 3D camera rotation from ThreeRoomCanvas
  useEffect(() => {
    const handleRotation = (e: Event) => {
      const customEvent = e as CustomEvent<{ angle: number }>;
      if (customEvent.detail && typeof customEvent.detail.angle === 'number') {
        setCameraRotation(customEvent.detail.angle);
      }
    };

    window.addEventListener('three-camera-rotation', handleRotation);
    return () => {
      window.removeEventListener('three-camera-rotation', handleRotation);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const currentDir = (roomDirection as CompassDirection) || 'N';
  const dirName = DIRECTION_NAMES_VI[currentDir] || currentDir;
  const dirAngle = DIRECTION_ANGLES[currentDir] ?? 0;

  // Handle clicking the compass to reset view to North
  const handleCompassClick = () => {
    if (onResetCamera) {
      onResetCamera();
    } else {
      window.dispatchEvent(new CustomEvent('three-camera-reset'));
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-1.5 select-none pointer-events-auto" ref={dropdownRef}>
      {/* Dark Architectural Compass Dial */}
      <div
        onClick={handleCompassClick}
        className="relative w-16 h-16 rounded-full bg-[#181B1E]/95 backdrop-blur-md shadow-2xl border border-stone-700/80 flex items-center justify-center cursor-pointer transition-all hover:scale-105 hover:border-emerald-500/60 active:scale-95 group"
        title="Nhấn để căn chỉnh góc nhìn về hướng Bắc (0°)"
      >
        {/* Subtle graduation ticks around dial */}
        {DIAL_TICKS.map((deg) => (
          <div
            key={deg}
            className="absolute w-full h-full flex justify-center pointer-events-none"
            style={{ transform: `rotate(${deg}deg)` }}
          >
            <div
              className={`w-[1px] ${
                deg % 90 === 0
                  ? 'h-1.5 bg-stone-500/80'
                  : deg % 45 === 0
                  ? 'h-1 bg-stone-600/70'
                  : 'h-0.5 bg-stone-700/50'
              }`}
            />
          </div>
        ))}

        {/* Subtle inner concentric ring */}
        <div className="absolute inset-2 rounded-full border border-stone-600/40 pointer-events-none" />

        {/* Room Direction Beacon Indicator on Compass Rim */}
        <div
          className="absolute w-full h-full pointer-events-none transition-transform duration-300"
          style={{ transform: `rotate(${dirAngle}deg)` }}
          title={`Hướng phòng: ${dirName} (${dirAngle}°)`}
        >
          {/* Glowing Amber/Emerald beacon pin on edge */}
          <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] ring-1 ring-emerald-300" />
        </div>

        {/* Cardinal Markers (Tiếng Việt: B - Bắc, Đ - Đông, N - Nam, T - Tây) */}
        <span
          className="absolute top-1 text-[10px] font-black text-rose-500 leading-none drop-shadow-xs transition-colors group-hover:text-rose-400"
          title="Bắc (0°)"
        >
          B
        </span>
        <span
          className="absolute bottom-1 text-[9px] font-bold text-stone-300 leading-none drop-shadow-xs"
          title="Nam (180°)"
        >
          N
        </span>
        <span
          className="absolute right-1.5 text-[9px] font-bold text-stone-300 leading-none drop-shadow-xs"
          title="Đông (90°)"
        >
          Đ
        </span>
        <span
          className="absolute left-1.5 text-[9px] font-bold text-stone-300 leading-none drop-shadow-xs"
          title="Tây (270°)"
        >
          T
        </span>

        {/* Intercardinal Dots for NE, SE, SW, NW */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-[50px] h-[50px] rounded-full">
            <span className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-stone-600/70" title="Đông Bắc (45°)" />
            <span className="absolute bottom-1.5 right-1.5 w-1 h-1 rounded-full bg-stone-600/70" title="Đông Nam (135°)" />
            <span className="absolute bottom-1.5 left-1.5 w-1 h-1 rounded-full bg-stone-600/70" title="Tây Nam (225°)" />
            <span className="absolute top-1.5 left-1.5 w-1 h-1 rounded-full bg-stone-600/70" title="Tây Bắc (315°)" />
          </div>
        </div>

        {/* Compass Needle (Rotates smoothly with 3D camera orientation) */}
        <div
          className="relative w-1.5 h-10 flex flex-col items-center justify-center transition-transform duration-75 ease-out pointer-events-none"
          style={{ transform: `rotate(${cameraRotation}deg)` }}
        >
          {/* North needle (Red) */}
          <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[18px] border-b-rose-500 drop-shadow-[0_2px_4px_rgba(244,63,94,0.4)]" />
          {/* South needle (Emerald) */}
          <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[18px] border-t-emerald-600 drop-shadow-[0_2px_4px_rgba(5,150,105,0.4)]" />
          {/* Pivot pin */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border border-stone-700 shadow-sm z-10" />
        </div>
      </div>

      {/* Interactive Room Direction Label & Selector */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181B1E]/90 hover:bg-stone-800 border border-stone-700/80 hover:border-stone-500 text-[11px] font-semibold text-stone-300 hover:text-white transition-all shadow-md group cursor-pointer"
        title="Nhấp để đổi hướng phòng"
      >
        <span>Hướng phòng:</span>
        <span className="text-white font-bold">{dirName} ({dirAngle}°)</span>
        <svg
          className={`w-3 h-3 text-stone-400 group-hover:text-stone-200 transition-transform ${
            isDropdownOpen ? 'rotate-180 text-emerald-400' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Floating 8-Direction Selection Popover */}
      {isDropdownOpen && (
        <div className="absolute bottom-0 left-full ml-3 z-50 w-64 bg-[#1A1D20]/95 backdrop-blur-md border border-stone-700/90 rounded-xl shadow-2xl p-2.5 animate-in fade-in slide-in-from-left-2 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-700/60">
            <span className="font-bold text-white text-[11px] tracking-wide">Chọn hướng phòng (Bát Trạch)</span>
            <button
              onClick={() => setIsDropdownOpen(false)}
              className="text-stone-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5 custom-scrollbar">
            {ALL_DIRECTIONS.map((dir) => {
              const isSelected = dir === currentDir;
              const detail = userProfile?.directionDetails?.[dir];
              const isGood = detail?.isGood;
              const angle = DIRECTION_ANGLES[dir];

              return (
                <button
                  key={dir}
                  onClick={() => {
                    onChangeRoomDirection?.(dir);
                    setIsDropdownOpen(false);
                  }}
                  className={`p-1.5 rounded-lg border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/80 border-emerald-500 shadow-sm'
                      : 'bg-stone-900/60 hover:bg-stone-800 border-stone-700/60 hover:border-stone-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold ${isSelected ? 'text-emerald-300' : 'text-stone-200'}`}>
                      {DIRECTION_NAMES_VI[dir]} ({angle}°)
                    </span>
                    {isSelected && (
                      <span className="text-[10px] text-emerald-400 font-bold">✓</span>
                    )}
                  </div>
                  {detail && (
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                          isGood
                            ? 'bg-emerald-900/70 text-emerald-300'
                            : 'bg-rose-900/70 text-rose-300'
                        }`}
                      >
                        {detail.name} ({isGood ? 'Cát' : 'Hung'})
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-stone-700/60 flex items-center justify-between text-[10px] text-stone-400">
            <span>💡 Nhấn la bàn để đặt lại góc nhìn Bắc</span>
          </div>
        </div>
      )}
    </div>
  );
};
