import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import ObservationPage from "@/pages/Observation";
import ExplorePage from "@/pages/Explore";
import ObservatoryPage from "@/pages/Observatory";
import CommunityPage from "@/pages/Community";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<ObservationPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/observatory" element={<ObservatoryPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
