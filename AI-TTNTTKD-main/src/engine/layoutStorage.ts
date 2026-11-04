import { RoomConfig, RoomObject, UserFengShuiProfile } from '../types/fengshui';

export interface SavedLayoutEntry {
  id: string;
  name: string;
  savedAt: string;
  roomConfig: RoomConfig;
  objects: RoomObject[];
  userProfile?: UserFengShuiProfile;
  score?: number;
}

const STORAGE_KEY = 'ai_feng_shui_saved_layouts';

export function getSavedLayouts(): SavedLayoutEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse saved layouts:', e);
    return [];
  }
}

export function saveLayoutToLocal(
  name: string,
  roomConfig: RoomConfig,
  objects: RoomObject[],
  userProfile?: UserFengShuiProfile,
  score?: number
): SavedLayoutEntry {
  const list = getSavedLayouts();
  const entry: SavedLayoutEntry = {
    id: `layout_${Date.now()}`,
    name: name.trim() || `Bố cục ${list.length + 1}`,
    savedAt: new Date().toLocaleString('vi-VN'),
    roomConfig,
    objects,
    userProfile,
    score,
  };
  list.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return entry;
}

export function deleteSavedLayout(id: string): void {
  const list = getSavedLayouts().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function exportLayoutToJson(
  name: string,
  roomConfig: RoomConfig,
  objects: RoomObject[],
  userProfile?: UserFengShuiProfile
): void {
  const data = {
    appName: 'AI Feng Shui Studio',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    name: name || 'Phòng ngủ phong thủy',
    roomConfig,
    objects,
    userProfile,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bo-cuc-phong-ngu-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseLayoutFromJson(jsonStr: string): {
  valid: boolean;
  roomConfig?: RoomConfig;
  objects?: RoomObject[];
  userProfile?: UserFengShuiProfile;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.roomConfig || !Array.isArray(data.objects)) {
      return { valid: false, error: 'Tệp JSON không hợp lệ hoặc thiếu dữ liệu phòng ngủ.' };
    }
    return {
      valid: true,
      roomConfig: data.roomConfig,
      objects: data.objects,
      userProfile: data.userProfile,
    };
  } catch (_e) {
    return { valid: false, error: 'Định dạng tệp JSON bị lỗi.' };
  }
}

