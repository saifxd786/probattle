import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
}

/**
 * Hook to monitor network status and connection quality
 */
export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: navigator.onLine,
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: false,
  }));

  const updateNetworkInfo = useCallback(() => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    setStatus({
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType || null,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
      saveData: connection?.saveData || false,
    });
  }, []);

  useEffect(() => {
    updateNetworkInfo();

    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, [updateNetworkInfo]);

  return status;
};

export default useNetworkStatus;
