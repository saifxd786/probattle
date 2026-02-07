import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cd88dc0dffab4b21aa84c640694b0643',
  appName: 'ProBattle',
  webDir: 'dist',
  
  // WebView Mode: Load from live website for instant updates
  server: {
    url: 'https://probattle.lovable.app',
    cleartext: true,
    // Handle navigation within app
    allowNavigation: [
      'probattle.lovable.app',
      '*.supabase.co',
      '*.supabase.in'
    ]
  },
  
  // Android-specific configurations
  android: {
    // Allow mixed content (HTTP within HTTPS)
    allowMixedContent: true,
    // Capture all navigation in WebView
    captureInput: true,
    // Use hardware back button properly
    backgroundColor: '#0a0a0a',
    // WebView settings for better performance
    webContentsDebuggingEnabled: false
  },
  
  // Plugins configuration
  plugins: {
    // Push Notifications (FCM)
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    // Splash screen while loading
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      showSpinner: true,
      spinnerColor: '#6366f1'
    }
  }
};

export default config;
