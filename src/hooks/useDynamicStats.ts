import { useState, useEffect } from 'react';

// Get time-based multiplier and base range for realistic player counts
const getTimeBasedPlayerRange = (hour: number): { min: number; max: number } => {
  // Late Night (12 AM - 5 AM): Lower activity
  if (hour >= 0 && hour < 5) {
    return { min: 85, max: 180 };
  }
  // Early Morning (5 AM - 9 AM): Moderate activity
  if (hour >= 5 && hour < 9) {
    return { min: 120, max: 280 };
  }
  // Morning (9 AM - 12 PM): Good activity
  if (hour >= 9 && hour < 12) {
    return { min: 250, max: 450 };
  }
  // Afternoon (12 PM - 5 PM): Peak activity
  if (hour >= 12 && hour < 17) {
    return { min: 380, max: 650 };
  }
  // Evening (5 PM - 9 PM): Highest activity
  if (hour >= 17 && hour < 21) {
    return { min: 520, max: 890 };
  }
  // Night (9 PM - 12 AM): High activity
  return { min: 350, max: 580 };
};

// Generate a random number within range with natural fluctuation
const getRandomInRange = (min: number, max: number): number => {
  const base = Math.floor(Math.random() * (max - min + 1)) + min;
  // Add slight randomization to avoid round numbers
  const offset = Math.floor(Math.random() * 17) - 8; // -8 to +8
  return Math.max(min, Math.min(max, base + offset));
};

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
    const baseDistributed = Math.floor(seededRandom(dateSeed, 3) * 35000) + 15000; // 15000-50000

    // Get time-based player range
    const hourOfDay = today.getHours();
    const playerRange = getTimeBasedPlayerRange(hourOfDay);
    const initialPlaying = getRandomInRange(playerRange.min, playerRange.max);

    setStats({
      winnersToday: baseWinners,
      playingNow: initialPlaying,
      distributedToday: baseDistributed,
    });

    // Update playing now with realistic fluctuations every 3-7 seconds
    const updatePlayingNow = () => {
      const currentHour = new Date().getHours();
      const range = getTimeBasedPlayerRange(currentHour);
      
      setStats(prev => {
        // Small fluctuation: +/- 2 to 12 players
        const fluctuation = Math.floor(Math.random() * 11) - 5 + (Math.random() > 0.5 ? Math.floor(Math.random() * 7) : -Math.floor(Math.random() * 7));
        const newPlaying = Math.max(range.min, Math.min(range.max, prev.playingNow + fluctuation));
        
        return {
          ...prev,
          playingNow: newPlaying,
        };
      });
    };

    // Random interval between 3-7 seconds for more natural feel
    const scheduleNextUpdate = () => {
      const delay = 3000 + Math.random() * 4000; // 3-7 seconds
      return setTimeout(() => {
        updatePlayingNow();
        intervalId = scheduleNextUpdate();
      }, delay);
    };

    let intervalId = scheduleNextUpdate();

    return () => clearTimeout(intervalId);
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
