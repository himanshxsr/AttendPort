import { getISTDateString } from './formatTime';

const STORAGE_KEY = 'serverTime.anchorMs';

const loadAnchorMs = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw != null ? Number(raw) : Number.NaN;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
};

let anchorServerMs = loadAnchorMs();
let anchorPerfMs = typeof performance !== 'undefined' ? performance.now() : 0;
const listeners = new Set();

const hasPerformance = () => typeof performance !== 'undefined' && typeof performance.now === 'function';

export const syncServerTime = (isoOrMs) => {
  const parsed =
    typeof isoOrMs === 'number'
      ? isoOrMs
      : typeof isoOrMs === 'string'
        ? Date.parse(isoOrMs)
        : Number.NaN;

  if (Number.isNaN(parsed)) return;

  anchorServerMs = parsed;
  anchorPerfMs = hasPerformance() ? performance.now() : 0;
  try {
    localStorage.setItem(STORAGE_KEY, String(anchorServerMs));
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener(anchorServerMs));
};

export const getEstimatedServerNowMs = () => {
  if (!hasPerformance()) return anchorServerMs;
  return anchorServerMs + (performance.now() - anchorPerfMs);
};

export const getEstimatedServerNowDate = () => new Date(getEstimatedServerNowMs());

export const getServerTodayIST = () => getISTDateString(getEstimatedServerNowDate());

export const subscribeServerTime = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
