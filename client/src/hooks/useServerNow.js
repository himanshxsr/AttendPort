import { useEffect, useState } from 'react';
import { getEstimatedServerNowMs, subscribeServerTime } from '../utils/serverTime';

const useServerNow = (tickMs = 1000) => {
  const [nowMs, setNowMs] = useState(() => getEstimatedServerNowMs());

  useEffect(() => {
    const unsubscribe = subscribeServerTime(() => {
      setNowMs(getEstimatedServerNowMs());
    });

    const intervalId = setInterval(() => {
      setNowMs(getEstimatedServerNowMs());
    }, tickMs);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [tickMs]);

  return nowMs;
};

export default useServerNow;
