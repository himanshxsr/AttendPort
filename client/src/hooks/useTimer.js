import { useState, useEffect, useRef, useCallback } from 'react';

const useTimer = (checkInTime) => {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const start = useCallback((serverCheckInTime) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const checkIn = new Date(serverCheckInTime).getTime();

    const tick = () => {
      const now = Date.now();
      setElapsed(now - checkIn);
    };

    tick(); // initial tick
    intervalRef.current = setInterval(tick, 1000);
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setElapsed(0);
  }, [stop]);

  useEffect(() => {
    if (checkInTime) {
      start(checkInTime);
    } else {
      reset();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkInTime, start, reset]);

  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);

  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    hours,
    minutes,
    seconds,
    elapsed,
    formatted,
    isRunning,
    start,
    stop,
    reset,
  };
};

export default useTimer;
