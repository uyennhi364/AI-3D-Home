import React, { useState, useEffect } from 'react';
import { RoomConfig, RoomObject, UserFengShuiProfile, CompassDirection } from '../types/fengshui';
import {
  getSavedLayouts,
  saveLayoutToLocal,
  deleteSavedLayout,
  exportLayoutToJson,
  parseLayoutFromJson,
  SavedLayoutEntry,
} from '../engine/layoutStorage';

interface RoomConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomConfig: RoomConfig;
  onUpdateRoomConfig: (newConfig: RoomConfig) => void;
  objects: RoomObject[];
  onLoadLayout: (config: RoomConfig, objects: RoomObject[], profile?: UserFengShuiProfile) => void;
  userProfile?: UserFengShuiProfile;
  currentScore?: number;
  onExport3DImage: () => void;
  onExport2DPlan: () => void;
}

export const RoomConfigModal: React.FC<RoomConfigModalProps> = ({
  isOpen,
  onClose,
  roomConfig,
  onUpdateRoomConfig,
  objects,
  onLoadLayout,
  userProfile,
  currentScore,
  onExport3DImage,
  onExport2DPlan,
}) => {
  const [activeTab, setActiveTab] = useState<'dimensions' | 'layouts' | 'export'>('dimensions');

  // Local state for room dimensions
  const [width, setWidth] = useState(roomConfig.width || 4.2);
  const [length, setLength] = useState(roomConfig.length || 5.0);
  const [height, setHeight] = useState(roomConfig.height || 2.8);
  const [doorWall, setDoorWall] = useState<string>(roomConfig.doorWall || 'east');
  const [windowWall, setWindowWall] = useState<string>(roomConfig.windowWall || 'west');

  // Layout save name
  const [layoutName, setLayoutName] = useState('');
  const [savedList, setSavedList] = useState<SavedLayoutEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      setWidth(roomConfig.width);
      setLength(roomConfig.length);
      setHeight(roomConfig.height);
      setDoorWall(roomConfig.doorWall || 'east');
      setWindowWall(roomConfig.windowWall || 'west');
      setSavedList(getSavedLayouts());
    }
  }, [isOpen, roomConfig]);

  if (!isOpen) return null;

  const handleApplyDimensions = () => {
    onUpdateRoomConfig({
      ...roomConfig,
      width: Math.max(3.0, Math.min(8.0, Number(width.toFixed(2)))),
      length: Math.max(3.0, Math.min(10.0, Number(length.toFixed(2)))),
      height: Math.max(2.4, Math.min(4.5, Number(height.toFixed(2)))),
      doorWall: doorWall as any,
      windowWall: windowWall as any,
    });
    onClose();
  };

  const handleSaveCurrent = () => {
    const entry = saveLayoutToLocal(
      layoutName || `Phòng ngủ ${width}x${length}m`,
      roomConfig,
      objects,
      userProfile,
      currentScore
    );
    setLayoutName('');
    setSavedList(getSavedLayouts());
  };

  const handleDelete = (id: string) => {
    deleteSavedLayout(id);
    setSavedList(getSavedLayouts());
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseLayoutFromJson(content);
      if (parsed.valid && parsed.roomConfig && parsed.objects) {
        onLoadLayout(parsed.roomConfig, parsed.objects, parsed.userProfile);
        onClose();
      } else {
        alert(parsed.error || 'Tệp JSON không hợp lệ');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-2xl bg-[#181B1E] text-white rounded-2xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between bg-[#121416]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Cấu Hình Phòng & Quản Lý Bố Cục
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-[#151719] px-5 pt-2 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('dimensions')}
            className={`pb-2.5 transition-colors relative cursor-pointer ${
              activeTab === 'dimensions'
                ? 'text-emerald-400 font-bold border-b-2 border-emerald-500'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            📐 Kích thước & Cửa
          </button>
          <button
            onClick={() => setActiveTab('layouts')}
            className={`pb-2.5 transition-colors relative cursor-pointer ${
              activeTab === 'layouts'
                ? 'text-emerald-400 font-bold border-b-2 border-emerald-500'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            💾 Lưu / Tải bố cục ({savedList.length})
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 transition-colors relative cursor-pointer ${
              activeTab === 'export'
                ? 'text-emerald-400 font-bold border-b-2 border-emerald-500'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            📸 Xuất ảnh & Bản vẽ
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[65vh] overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: DIMENSIONS */}
          {activeTab === 'dimensions' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#202428] rounded-xl border border-stone-700/60">
                  <label className="text-[11px] font-semibold text-stone-400 block mb-1">
                    Chiều rộng (X)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="3.0"
                      max="8.0"
                      value={width}
                      onChange={(e) => setWidth(parseFloat(e.target.value) || 3.0)}
                      className="w-full bg-[#16181B] border border-stone-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold text-sm"
                    />
                    <span className="text-stone-400">m</span>
                  </div>
                </div>

                <div className="p-3 bg-[#202428] rounded-xl border border-stone-700/60">
                  <label className="text-[11px] font-semibold text-stone-400 block mb-1">
                    Chiều dài (Z)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="3.0"
                      max="10.0"
                      value={length}
                      onChange={(e) => setLength(parseFloat(e.target.value) || 3.5)}
                      className="w-full bg-[#16181B] border border-stone-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold text-sm"
                    />
                    <span className="text-stone-400">m</span>
                  </div>
                </div>

                <div className="p-3 bg-[#202428] rounded-xl border border-stone-700/60">
                  <label className="text-[11px] font-semibold text-stone-400 block mb-1">
                    Chiều cao trần (Y)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="2.4"
                      max="4.5"
                      value={height}
                      onChange={(e) => setHeight(parseFloat(e.target.value) || 2.8)}
                      className="w-full bg-[#16181B] border border-stone-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold text-sm"
                    />
                    <span className="text-stone-400">m</span>
                  </div>
                </div>
              </div>

              {/* Doors & Windows Management */}
              <div className="p-3.5 bg-[#202428] rounded-xl border border-stone-700/60 space-y-3">
                <span className="font-bold text-white block text-xs">
                  Vị trí Cửa phòng & Cửa sổ ban công
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-stone-400 block mb-1">
                      Tường đặt Cửa chính:
                    </label>
                    <select
                      value={doorWall}
                      onChange={(e) => setDoorWall(e.target.value)}
                      className="w-full bg-[#16181B] border border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-200 text-xs font-semibold cursor-pointer"
                    >
                      <option value="east">Tường Đông (East)</option>
                      <option value="west">Tường Tây (West)</option>
                      <option value="south">Tường Nam (South)</option>
                      <option value="north">Tường Bắc (North)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-400 block mb-1">
                      Tường đặt Cửa sổ / Ban công:
                    </label>
                    <select
                      value={windowWall}
                      onChange={(e) => setWindowWall(e.target.value)}
                      className="w-full bg-[#16181B] border border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-200 text-xs font-semibold cursor-pointer"
                    >
                      <option value="west">Tường Tây (West)</option>
                      <option value="east">Tường Đông (East)</option>
                      <option value="north">Tường Bắc (North)</option>
                      <option value="south">Tường Nam (South)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleApplyDimensions}
                  className="px-5 py-2 rounded-xl bg-[#005C4A] hover:bg-[#00705a] text-white font-bold transition-all shadow-md cursor-pointer"
                >
                  Áp dụng kích thước mới
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: LAYOUTS (Save / Load / Export / Import JSON) */}
          {activeTab === 'layouts' && (
            <div className="space-y-4">
              {/* Save current */}
              <div className="p-3 bg-[#202428] rounded-xl border border-stone-700/60 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nhập tên phương án bố cục..."
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  className="flex-1 bg-[#16181B] border border-stone-700 rounded-lg px-3 py-1.5 text-white text-xs"
                />
                <button
                  onClick={handleSaveCurrent}
                  className="px-4 py-1.5 rounded-lg bg-[#005C4A] hover:bg-[#00705a] text-white font-bold shrink-0 transition-all cursor-pointer"
                >
                  Lưu bố cục hiện tại
                </button>
              </div>

              {/* JSON export/import */}
              <div className="flex items-center justify-between p-3 bg-[#202428] rounded-xl border border-stone-700/60">
                <div className="text-[11px] text-stone-400">
                  Sao lưu hoặc chuyển đổi dữ liệu phòng ngủ qua tệp JSON
                </div>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold cursor-pointer">
                    Nhập tệp JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJsonFile}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() =>
                      exportLayoutToJson(
                        `Phòng ngủ ${roomConfig.width}x${roomConfig.length}`,
                        roomConfig,
                        objects,
                        userProfile
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold cursor-pointer"
                  >
                    Xuất tệp JSON
                  </button>
                </div>
              </div>

              {/* Saved list */}
              <div className="space-y-2">
                <span className="font-bold text-stone-300 block text-xs">
                  Các phương án đã lưu trong máy:
                </span>
                {savedList.length === 0 ? (
                  <p className="text-stone-500 py-4 text-center">
                    Chưa có phương án nào được lưu. Bạn có thể lưu bố cục hiện tại ở trên.
                  </p>
                ) : (
                  savedList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-[#202428] hover:bg-[#282d33] rounded-xl border border-stone-700/60 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-white text-xs">{item.name}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          {item.roomConfig.width}m × {item.roomConfig.length}m • {item.objects.length} đồ vật • Lưu lúc: {item.savedAt}
                          {item.score !== undefined && (
                            <span className="ml-2 font-mono font-bold text-emerald-400">
                              ({item.score} điểm)
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            onLoadLayout(item.roomConfig, item.objects, item.userProfile);
                            onClose();
                          }}
                          className="px-3 py-1 rounded-lg bg-[#005C4A] hover:bg-[#00705a] text-white font-semibold cursor-pointer"
                        >
                          Nạp bố cục
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-300 font-semibold cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EXPORT 3D & 2D */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#202428] rounded-xl border border-stone-700/60 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-sm">Xuất Ảnh Phối Cảnh 3D</h3>
                    <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                      Chụp ảnh chất lượng cao phối cảnh 3D hiện tại của phòng ngủ bao gồm bóng đổ, ánh sáng thực và góc camera hiện tại.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onExport3DImage();
                      onClose();
                    }}
                    className="w-full py-2 rounded-xl bg-[#005C4A] hover:bg-[#00705a] text-white font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>📸 Tải ảnh 3D (PNG)</span>
                  </button>
                </div>

                <div className="p-4 bg-[#202428] rounded-xl border border-stone-700/60 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-sm">Xuất Sơ Đồ Mặt Bằng 2D</h3>
                    <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                      Xuất bản vẽ sơ đồ mặt bằng nhìn từ trên xuống chuẩn kiến trúc kiến tạo phong thủy và kích thước phòng.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onExport2DPlan();
                      onClose();
                    }}
                    className="w-full py-2 rounded-xl bg-[#005C4A] hover:bg-[#00705a] text-white font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>📐 Tải sơ đồ 2D (PNG)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

