import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { BannerProvider } from "@/hooks/useBanner";
import ProtectedRoute from "@/components/ProtectedRoute";
import AIChatWidget from "@/components/AIChatWidget";
import GamificationTracker from "@/components/GamificationTracker";
import AdminLayout from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import Swap from "./pages/Swap";
import Sell from "./pages/Sell";
import EditListing from "./pages/EditListing";
import Profile from "./pages/Profile";
import ProductDetail from "./pages/ProductDetail";
import Chats from "./pages/Chats";
import Auth from "./pages/Auth";
import Premium from "./pages/Premium";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Partnerships from "./pages/Partnerships";
import Wallet from "./pages/Wallet";
import Terms from "./pages/Terms";
import ResetPassword from "./pages/ResetPassword";
import HelpCenter from "./pages/HelpCenter";
import Security from "./pages/Security";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminListings from "./pages/admin/AdminListings";
import AdminReports from "./pages/admin/AdminReports";
import AdminSwipe from "./pages/admin/AdminSwipe";
import AdminSwapCoins from "./pages/admin/AdminSwapCoins";
import AdminMarketplace from "./pages/admin/AdminMarketplace";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminExports from "./pages/admin/AdminExports";
import AdminRevenue from "./pages/admin/AdminRevenue";
import AdminGamification from "./pages/admin/AdminGamification";
import AdminAIAgents from "./pages/admin/AdminAIAgents";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <AuthProvider>
      <BannerProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/swap" element={<ProtectedRoute><Swap /></ProtectedRoute>} />
            <Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
            <Route path="/edit-listing/:id" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/chats" element={<ProtectedRoute><Chats /></ProtectedRoute>} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>} />
            <Route path="/partnerships" element={<Partnerships />} />
            <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/security" element={<Security />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="listings" element={<AdminListings />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="swipe" element={<AdminSwipe />} />
              <Route path="swapcoins" element={<AdminSwapCoins />} />
              <Route path="marketplace" element={<AdminMarketplace />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="config" element={<AdminConfig />} />
              <Route path="exports" element={<AdminExports />} />
              <Route path="revenue" element={<AdminRevenue />} />
              <Route path="gamification" element={<AdminGamification />} />
              <Route path="ai-agents" element={<AdminAIAgents />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIChatWidget />
          <GamificationTracker />
        </BrowserRouter>
      </TooltipProvider>
      </BannerProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
