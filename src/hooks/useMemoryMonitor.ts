import { useState, useEffect, useCallback } from 'react';
import { getMemoryUsage, isMemoryPressure, formatMemorySize } from '../utils/memoryManagement';

interface MemoryInfo {
  used?: number;
  total?: number;
  limit?: number;
  usagePercentage?: number;
  isUnderPressure: boolean;
  formattedUsed?: string;
  formattedLimit?: string;
}

export function useMemoryMonitor(intervalMs: number = 5000) {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo>({
    isUnderPressure: false
  });

  const updateMemoryInfo = useCallback(() => {
    const usage = getMemoryUsage();
    const underPressure = isMemoryPressure();
    
    const info: MemoryInfo = {
      used: usage.used,
      total: usage.total,
      limit: usage.limit,
      isUnderPressure: underPressure,
      formattedUsed: usage.used ? formatMemorySize(usage.used) : undefined,
      formattedLimit: usage.limit ? formatMemorySize(usage.limit) : undefined
    };

    if (usage.used && usage.limit) {
      info.usagePercentage = Math.round((usage.used / usage.limit) * 100);
    }

    setMemoryInfo(info);
  }, []);

  useEffect(() => {
    // Update immediately
    updateMemoryInfo();

    // Set up interval for continuous monitoring
    const interval = setInterval(updateMemoryInfo, intervalMs);

    return () => clearInterval(interval);
  }, [updateMemoryInfo, intervalMs]);

  return memoryInfo;
}
