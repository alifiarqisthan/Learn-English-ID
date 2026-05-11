import { Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import ModuleList from "./pages/ModuleList";
import ModulePage from "./pages/ModulePage";
import GroupPage from "./pages/GroupPage";
import GroupTestPage from "./pages/GroupTestPage";
import PracticePage from "./pages/PracticePage";
import ProgressPage from "./pages/ProgressPage";
import MockTestPage from "./pages/MockTestPage";
import ReferenceList from "./pages/ReferenceList";
import ReferencePage from "./pages/ReferencePage";

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container py-8">
          <Routes>
            <Route path="/" element={<ModuleList />} />
            <Route path="/modules/:slug" element={<ModulePage />} />
            <Route path="/groups/:slug" element={<GroupPage />} />
            <Route path="/groups/:slug/test" element={<GroupTestPage />} />
            <Route path="/references" element={<ReferenceList />} />
            <Route path="/references/:slug" element={<ReferencePage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/mock-test" element={<MockTestPage />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}
