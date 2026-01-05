import { useState, useEffect } from 'react';

// Generate realistic random stats that change daily
export const useDynamicStats = () => {
  const [stats, setStats] = useState({
    winnersToday: 0,
    playingNow: 0,
    distributedToday: 0,
  });

  useEffect(() => {
    // Use date as seed for daily consistency
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // Seeded random function for daily consistency
    const seededRandom = (seed: number, index: number) => {
      const x = Math.sin(seed + index) * 10000;
      return x - Math.floor(x);
    };

    // Generate base stats from seed
    const baseWinners = Math.floor(seededRandom(dateSeed, 1) * 800) + 400; // 400-1200
    const basePlaying = Math.floor(seededRandom(dateSeed, 2) * 80) + 30; // 30-110
    const baseDistributed = Math.floor(seededRandom(dateSeed, 3) * 35000) + 15000; // 15000-50000

    // Add time-based variation
    const hourOfDay = today.getHours();
    const timeMultiplier = hourOfDay >= 18 || hourOfDay <= 2 ? 1.5 : hourOfDay >= 10 ? 1.2 : 0.8;

    setStats({
      winnersToday: baseWinners,
      playingNow: Math.floor(basePlaying * timeMultiplier),
      distributedToday: baseDistributed,
    });

    // Update playing now periodically with small fluctuations
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        playingNow: Math.max(15, Math.min(150, prev.playingNow + Math.floor(Math.random() * 7) - 3)),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return stats;
};

// Format number with commas
export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-IN');
};

// Format currency
export const formatCurrency = (num: number): string => {
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(1)}L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};
