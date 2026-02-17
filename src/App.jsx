import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Landing from "./pages/Landing";
import TagPublic from "./pages/TagPublic";
import ProtectedRoute from "./components/ProtectedRoute";
import "./styles/global.css";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import CheckIn from "./pages/CheckIn";
import CheckOut from "./pages/CheckOut";
import Tickets from "./pages/Tickets";
import Pricing from "./pages/Pricing";
import Branches from "./pages/Branches";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* raíz -> landing (cliente) */}
        <Route path="/" element={<Landing />} />

        {/* admin */}
        <Route path="/login" element={<Login />} />

        {/* cliente público */}
        <Route path="/t/:token" element={<TagPublic />} />

        {/* admin (panel) */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="checkin" element={<CheckIn />} />
          <Route path="checkout" element={<CheckOut />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="branches" element={<Branches />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
