import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";

// Lazy-load heavy or rarely-visited pages so they don't bloat the initial bundle.
// Each chunk is fetched on demand when the route is first visited.
const GroupListPage = lazy(() => import("./pages/GroupListPage"));
const GroupPage = lazy(() => import("./pages/GroupPage"));
const GroupDetailPage = lazy(() => import("./pages/GroupDetailPage"));
const GroupTestPage = lazy(() => import("./pages/GroupTestPage"));
const ModulePage = lazy(() => import("./pages/ModulePage"));
const PracticePage = lazy(() => import("./pages/PracticePage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const MockTestPage = lazy(() => import("./pages/MockTestPage"));
const MasterTestPage = lazy(() => import("./pages/MasterTestPage"));
const MasterGroupTestPage = lazy(() => import("./pages/MasterGroupTestPage"));
const ReferenceList = lazy(() => import("./pages/ReferenceList"));
const ReferencePage = lazy(() => import("./pages/ReferencePage"));
const VocabChallengePage = lazy(() => import("./pages/VocabChallengePage"));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="container py-8 flex-1">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/groups" element={<GroupListPage />} />
            <Route path="/groups/:slug" element={<GroupPage />} />
            <Route path="/groups/:slug/overview" element={<GroupDetailPage />} />
            <Route path="/groups/:slug/test" element={<GroupTestPage />} />
            <Route path="/groups/:masterSlug/master-test" element={<MasterGroupTestPage />} />
            <Route path="/modules/:slug" element={<ModulePage />} />
            <Route path="/references" element={<ReferenceList />} />
            <Route path="/references/:slug" element={<ReferencePage />} />
            <Route path="/vocab-challenge" element={<VocabChallengePage />} />
            <Route path="/vocab-challenge/:day" element={<VocabChallengePage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/mock-test" element={<MockTestPage />} />
            <Route path="/master-test" element={<MasterTestPage />} />
          </Routes>
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
