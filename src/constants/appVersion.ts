// Centralized App Version - Auto-generated on each build
// Format: MAJOR.MINOR.BUILD (BUILD = YYMMDDHH)
const generateBuildNumber = (): string => {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2); // 26
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 01-12
  const day = String(now.getDate()).padStart(2, '0'); // 01-31
  const hour = String(now.getHours()).padStart(2, '0'); // 00-23
  return `${year}${month}${day}${hour}`;
};

// Major.Minor version (manually update for significant changes)
const MAJOR_VERSION = '1';
const MINOR_VERSION = '3';

// Full version with auto-generated build number
export const APP_VERSION = `${MAJOR_VERSION}.${MINOR_VERSION}.${generateBuildNumber()}`;
