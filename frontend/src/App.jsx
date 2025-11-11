import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Machines from "./pages/Machines";
import Parts from "./pages/Parts";
import Faults from "./pages/Faults";
import Alerts from "./pages/Alerts";
import Maintenance from "./pages/Maintenance";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<PrivateRoute><Machines /></PrivateRoute>} />
        <Route path="/maintenance" element={<PrivateRoute><Maintenance /></PrivateRoute>} />
        <Route path="/parts" element={<PrivateRoute><Parts /></PrivateRoute>} />
        <Route path="/faults" element={<PrivateRoute><Faults /></PrivateRoute>} />
        <Route path="/alerts" element={<PrivateRoute><Alerts /></PrivateRoute>} />

        {/* bilinmeyen rota → makineler */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
