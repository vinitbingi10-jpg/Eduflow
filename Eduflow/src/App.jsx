import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Landing from "@/pages/Landing.jsx";
import Dashboard from "@/pages/Dashboard.jsx";
import Editor from "@/pages/Editor.jsx";
import Subjects from "@/pages/Subjects.jsx";
import Teachers from "@/pages/Teachers.jsx";
import Rooms from "@/pages/Rooms.jsx";
import Settings from "@/pages/Settings.jsx";
import { ShortcutsModal } from "@/components/modals/ShortcutsModal.jsx";

/** Scrolls back to the top whenever the route changes. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* shortcut reference is reachable from Settings too */}
      <ShortcutsModal />
    </>
  );
}
