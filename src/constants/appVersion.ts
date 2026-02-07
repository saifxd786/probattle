// Centralized App Version - Updated on each deploy
// Format: MAJOR.MINOR.BUILD (BUILD = YYMMDDHHMM)

// Major.Minor version (manually update for significant changes)
// v2.1 = Bundled mode for native app experience (no browser URL bar)
const MAJOR_VERSION = '2';
const MINOR_VERSION = '1';

// Build number - this gets updated on each deploy
// Format: YYMMDDHHMM for uniqueness
const BUILD_NUMBER = '2602080015';

// Full version with build number
export const APP_VERSION = `${MAJOR_VERSION}.${MINOR_VERSION}.${BUILD_NUMBER}`;
