import { useState, useEffect, Suspense, lazy } from 'react';
import SplashScreen from './components/SplashScreen';
import ForceUpdatePopup from './components/ForceUpdatePopup';
import OfflineIndicator from './components/OfflineIndicator';
import NotificationPermissionGate from './components/NotificationPermissionGate';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useMemoryCleanup } from '@/hooks/useMemoryCleanup';
import { useUpdateAvailable } from '@/hooks/useUpdateAvailable';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';

// Lazy load all pages for better initial load performance
const Index = lazy(() => import("./pages/Index"));
const BGMIPage = lazy(() => import("./pages/BGMIPage"));
const MatchesPage = lazy(() => import("./pages/MatchesPage"));
const MyGamesPage = lazy(() => import("./pages/MyGamesPage"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const RulesPage = lazy(() => import("./pages/RulesPage"));
const FairPlayPage = lazy(() => import("./pages/FairPlayPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const FAQsPage = lazy(() => import("./pages/FAQsPage"));
const LudoPage = lazy(() => import("./pages/LudoPage"));
const LudoRulesPage = lazy(() => import("./pages/LudoRulesPage"));
const ThimblePage = lazy(() => import("./pages/ThimblePage"));
const MinesPage = lazy(() => import("./pages/MinesPage"));
const GameHistoryPage = lazy(() => import("./pages/GameHistoryPage"));
const FriendsPage = lazy(() => import("./pages/FriendsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MaintenancePage = lazy(() => import("./pages/MaintenancePage"));

// Admin pages
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminMatches = lazy(() => import("./pages/admin/AdminMatches"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminPasswordReset = lazy(() => import("./pages/admin/AdminPasswordReset"));
const AdminNotificationsPage = lazy(() => import("./pages/admin/AdminNotificationsPage"));
const AdminLudoSettings = lazy(() => import("./pages/admin/AdminLudoSettings"));
const AdminThimbleSettings = lazy(() => import("./pages/admin/AdminThimbleSettings"));
const AdminMinesSettings = lazy(() => import("./pages/admin/AdminMinesSettings"));
const AdminRedeemCodes = lazy(() => import("./pages/admin/AdminRedeemCodes"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminSpinWheelSettings = lazy(() => import("./pages/admin/AdminSpinWheelSettings"));
const AdminDailyLoginSettings = lazy(() => import("./pages/admin/AdminDailyLoginSettings"));
const AdminDeviceBans = lazy(() => import("./pages/admin/AdminDeviceBans"));
const AdminDevices = lazy(() => import("./pages/admin/AdminDevices"));
const AdminMultiAccountDetection = lazy(() => import("./pages/admin/AdminMultiAccountDetection"));
const AdminTDMScheduler = lazy(() => import("./pages/admin/AdminTDMScheduler"));
const AdminClassicScheduler = lazy(() => import("./pages/admin/AdminClassicScheduler"));

// Agent pages
const AgentLoginPage = lazy(() => import("./pages/agent/AgentLoginPage"));
const AgentLayout = lazy(() => import("./components/agent/AgentLayout"));
const AgentUsers = lazy(() => import("./pages/agent/AgentUsers"));
const AgentMatches = lazy(() => import("./pages/agent/AgentMatches"));
const AgentTransactions = lazy(() => import("./pages/agent/AgentTransactions"));

// Optimized QueryClient with better caching and performance settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 2 minutes
      staleTime: 2 * 60 * 1000,
      // Cache data for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus for better performance
      refetchOnWindowFocus: false,
      // Refetch on reconnect for fresh data
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Memory cleanup wrapper component
const MemoryCleanupWrapper = ({ children }: { children: React.ReactNode }) => {
  useMemoryCleanup();
  return <>{children}</>;
};

// Force update wrapper component
const ForceUpdateWrapper = ({ children }: { children: React.ReactNode }) => {
  const { updateAvailable, applyUpdate, isUpdating } = useUpdateAvailable();
  
  return (
    <>
      <ForceUpdatePopup 
        isOpen={updateAvailable} 
        onUpdate={applyUpdate}
        isUpdating={isUpdating}
      />
      {children}
    </>
  );
};

// Maintenance mode wrapper - no blocking loader for smoother navigation
const MaintenanceWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isMaintenanceMode } = useMaintenanceMode();
  const pathname = window.location.pathname;
  
  // Allow admin and agent routes even during maintenance
  const isAdminOrAgentRoute = pathname.startsWith('/admin') || pathname.startsWith('/agent');
  
  // Don't block navigation with a loader - just check maintenance status
  if (isMaintenanceMode && !isAdminOrAgentRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <MaintenancePage />
      </Suspense>
    );
  }
  
  return <>{children}</>;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [hasShownSplash, setHasShownSplash] = useState(false);

  useEffect(() => {
    // Check if splash was already shown this session
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown) {
      setShowSplash(false);
      setHasShownSplash(true);
    }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
    setHasShownSplash(true);
    sessionStorage.setItem('splashShown', 'true');
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <MemoryCleanupWrapper>
              <ForceUpdateWrapper>
                {showSplash && !hasShownSplash && (
                  <SplashScreen onComplete={handleSplashComplete} />
                )}
                <Toaster />
                <Sonner />
                <OfflineIndicator />
              <BrowserRouter>
                <MaintenanceWrapper>
                  <NotificationPermissionGate>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/bgmi" element={<BGMIPage />} />
                        <Route path="/matches" element={<MatchesPage />} />
                        <Route path="/my-games" element={<MyGamesPage />} />
                      <Route path="/wallet" element={<WalletPage />} />
                      <Route path="/support" element={<SupportPage />} />
                      <Route path="/auth" element={<AuthPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/activity" element={<ActivityPage />} />
                      <Route path="/install" element={<InstallPage />} />
                      <Route path="/rules" element={<RulesPage />} />
                      <Route path="/fair-play" element={<FairPlayPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/faqs" element={<FAQsPage />} />
                      <Route path="/ludo" element={<LudoPage />} />
                      <Route path="/ludo/rules" element={<LudoRulesPage />} />
                      <Route path="/thimble" element={<ThimblePage />} />
                      <Route path="/mines" element={<MinesPage />} />
                      <Route path="/game-history" element={<GameHistoryPage />} />
                      <Route path="/friends" element={<FriendsPage />} />
                      {/* Admin Routes */}
                      <Route path="/admin/login" element={<AdminLoginPage />} />
                      <Route path="/admin/reset-password" element={<AdminPasswordReset />} />
                      <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="matches" element={<AdminMatches />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="payments" element={<AdminPayments />} />
                        <Route path="transactions" element={<AdminTransactions />} />
                        <Route path="notifications" element={<AdminNotificationsPage />} />
                        <Route path="settings" element={<AdminSettings />} />
                        <Route path="ludo" element={<AdminLudoSettings />} />
                        <Route path="thimble" element={<AdminThimbleSettings />} />
                        <Route path="mines" element={<AdminMinesSettings />} />
                        <Route path="spin-wheel" element={<AdminSpinWheelSettings />} />
                        <Route path="daily-login" element={<AdminDailyLoginSettings />} />
                        <Route path="redeem-codes" element={<AdminRedeemCodes />} />
                        <Route path="support" element={<AdminSupport />} />
                        <Route path="device-bans" element={<AdminDeviceBans />} />
                        <Route path="devices" element={<AdminDevices />} />
                        <Route path="multi-account" element={<AdminMultiAccountDetection />} />
                        <Route path="tdm-scheduler" element={<AdminTDMScheduler />} />
                        <Route path="classic-scheduler" element={<AdminClassicScheduler />} />
                      </Route>
                      {/* Agent Routes */}
                      <Route path="/agent/login" element={<AgentLoginPage />} />
                      <Route path="/agent" element={<AgentLayout />}>
                        <Route index element={<AgentUsers />} />
                        <Route path="matches" element={<AgentMatches />} />
                        <Route path="transactions" element={<AgentTransactions />} />
                      </Route>
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </NotificationPermissionGate>
                </MaintenanceWrapper>
              </BrowserRouter>
              </ForceUpdateWrapper>
            </MemoryCleanupWrapper>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
