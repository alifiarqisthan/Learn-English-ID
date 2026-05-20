import { Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import GroupListPage from "./pages/GroupListPage";
import GroupPage from "./pages/GroupPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import GroupTestPage from "./pages/GroupTestPage";
import ModulePage from "./pages/ModulePage";
import PracticePage from "./pages/PracticePage";
import ProgressPage from "./pages/ProgressPage";
import MockTestPage from "./pages/MockTestPage";
import MasterTestPage from "./pages/MasterTestPage";
import MasterGroupTestPage from "./pages/MasterGroupTestPage";
import ReferenceList from "./pages/ReferenceList";
import ReferencePage from "./pages/ReferencePage";
import VocabChallengePage from "./pages/VocabChallengePage";

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
