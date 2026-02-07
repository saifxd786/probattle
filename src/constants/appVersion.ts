// Centralized App Version - Updated on each deploy
// Format: MAJOR.MINOR.BUILD (BUILD = YYMMDDHHMM)

// Major.Minor version (manually update for significant changes)
const MAJOR_VERSION = '1';
const MINOR_VERSION = '3';

// Build number - this gets updated on each deploy
// Format: YYMMDDHHMM for uniqueness
const BUILD_NUMBER = '2602071700';

// Full version with build number
export const APP_VERSION = `${MAJOR_VERSION}.${MINOR_VERSION}.${BUILD_NUMBER}`;
