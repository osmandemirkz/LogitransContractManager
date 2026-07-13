import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SavedContracts from "./pages/SavedContracts";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";
import OAuthCallback from "./pages/OAuthCallback";
import Header from "./components/layout/Header";
import { useAuth } from "./hooks/useAuth";
import { useState, useEffect } from "react";
import { initCounterIfNeeded } from "./lib/contractNumber";
import { migrateLocalDrafts } from "./lib/draftsApi";
import { COMPANIES } from "./constants/companies";

const queryClient = new QueryClient();

function AuthGate() {
  const { currentUser } = useAuth();
  const [, forceUpdate] = useState(0);

  // Initialize Supabase counters + migrate local drafts on first load
  useEffect(() => {
    COMPANIES.forEach(c => {
      initCounterIfNeeded(c.id).catch(e =>
        console.warn('[App] Counter init failed for', c.id, e?.message)
      );
    });
    migrateLocalDrafts().catch(e => console.warn('[App] Draft migration error:', e?.message));
  }, []);

  const handleLogin = () => {
    forceUpdate(n => n + 1);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/contracts" element={<SavedContracts />} />
        <Route
          path="/admin"
          element={currentUser.role === 'admin' ? <AdminPanel /> : <Navigate to="/" replace />}
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function AppContent() {
  return <AuthGate />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
