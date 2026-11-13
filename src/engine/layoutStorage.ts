import { RoomConfig, RoomObject, UserFengShuiProfile } from '../types/fengshui';
import {
  safeLocalStorageSet,
  safeLocalStorageGet,
  registerMigrator,
  StorageResult,
} from '../services/storageResilience';

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
const CURRENT_STORAGE_VERSION = 1;

// Register v0 -> v1 schema migrator (legacy plain array -> versioned envelope)
registerMigrator(STORAGE_KEY, {
  fromVersion: 0,
  toVersion: 1,
  migrate: (raw: unknown) => {
    if (Array.isArray(raw)) return raw;
    return [];
  },
});

export function getSavedLayouts(): SavedLayoutEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const res = safeLocalStorageGet<SavedLayoutEntry[]>(STORAGE_KEY, 0);
    if (!res.ok || !res.data) {
      // Fallback: raw read in case of legacy unversioned data
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return Array.isArray(res.data.data) ? res.data.data : [];
  } catch (e) {
    console.error('Failed to parse saved layouts:', e);
    return [];
  }
}

export function saveLayoutToLocalSafe(
  name: string,
  roomConfig: RoomConfig,
  objects: RoomObject[],
  userProfile?: UserFengShuiProfile,
  score?: number
): StorageResult<SavedLayoutEntry> {
  const list = getSavedLayouts();
  const entry: SavedLayoutEntry = {
    id: `layout_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || `Bố cục ${list.length + 1}`,
    savedAt: new Date().toLocaleString('vi-VN'),
    roomConfig,
    objects,
    userProfile,
    score,
  };
  list.unshift(entry);
  const writeRes = safeLocalStorageSet(STORAGE_KEY, list, CURRENT_STORAGE_VERSION);
  if (!writeRes.ok) {
    console.warn(`[STORAGE_RESILIENCE] saveLayoutToLocal failed: ${writeRes.message}`);
    return writeRes;
  }
  return { ok: true, data: entry };
}

export function saveLayoutToLocal(
  name: string,
  roomConfig: RoomConfig,
  objects: RoomObject[],
  userProfile?: UserFengShuiProfile,
  score?: number
): SavedLayoutEntry {
  const res = saveLayoutToLocalSafe(name, roomConfig, objects, userProfile, score);
  if (res.ok) {
    return res.data;
  }
  // Return memory representation on quota error so application scene state doesn't crash
  const list = getSavedLayouts();
  return {
    id: `layout_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || `Bố cục ${list.length + 1}`,
    savedAt: new Date().toLocaleString('vi-VN'),
    roomConfig,
    objects,
    userProfile,
    score,
  };
}

export function deleteSavedLayout(id: string): void {
  const list = getSavedLayouts().filter((item) => item.id !== id);
  safeLocalStorageSet(STORAGE_KEY, list, CURRENT_STORAGE_VERSION);
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

