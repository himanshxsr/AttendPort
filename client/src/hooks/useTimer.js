import { useState, useEffect, useRef, useCallback } from 'react';

const useTimer = (checkInTime, serverNowMs) => {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const anchorElapsedRef = useRef(0);
  const perfStartRef = useRef(0);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!checkInTime) return undefined;

    const checkInMs = new Date(checkInTime).getTime();
    const initialNow = Number.isFinite(serverNowMs) ? serverNowMs : checkInMs;
    anchorElapsedRef.current = Math.max(0, initialNow - checkInMs);
    perfStartRef.current =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : 0;

    intervalRef.current = setInterval(() => {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        const deltaMs = performance.now() - perfStartRef.current;
        setElapsed(anchorElapsedRef.current + deltaMs);
        return;
      }
      setElapsed(anchorElapsedRef.current);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkInTime, serverNowMs]);

  const safeElapsed = checkInTime ? Math.max(0, elapsed) : 0;
  const noop = useCallback(() => {}, []);
  const hours = Math.floor(safeElapsed / 3600000);
  const minutes = Math.floor((safeElapsed % 3600000) / 60000);
  const seconds = Math.floor((safeElapsed % 60000) / 1000);

  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    hours,
    minutes,
    seconds,
    elapsed,
    formatted,
    isRunning: Boolean(checkInTime),
    start: noop,
    stop: noop,
    reset: noop,
  };
};

export default useTimer;
