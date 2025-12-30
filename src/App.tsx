import { useState } from 'react';
import SplashScreen from './components/SplashScreen';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import BGMIPage from "./pages/BGMIPage";
import MatchesPage from "./pages/MatchesPage";
import MyGamesPage from "./pages/MyGamesPage";
import WalletPage from "./pages/WalletPage";
import SupportPage from "./pages/SupportPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import InstallPage from "./pages/InstallPage";
import RulesPage from "./pages/RulesPage";
import FairPlayPage from "./pages/FairPlayPage";
import TermsPage from "./pages/TermsPage";
import FAQsPage from "./pages/FAQsPage";
import LudoPage from "./pages/LudoPage";
import LudoRulesPage from "./pages/LudoRulesPage";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMatches from "./pages/admin/AdminMatches";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage";
import AdminLudoSettings from "./pages/admin/AdminLudoSettings";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/bgmi" element={<BGMIPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/my-games" element={<MyGamesPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/install" element={<InstallPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/fair-play" element={<FairPlayPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/faqs" element={<FAQsPage />} />
              <Route path="/ludo" element={<LudoPage />} />
              <Route path="/ludo/rules" element={<LudoRulesPage />} />
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="matches" element={<AdminMatches />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="transactions" element={<AdminTransactions />} />
                <Route path="notifications" element={<AdminNotificationsPage />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="ludo" element={<AdminLudoSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
