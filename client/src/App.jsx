import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Components
import Login from "./components/Login";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import FinanceDashboard from "./components/FinanceDashboard";
import StudentDashboard from "./components/StudentDashboard";
import SecurityGuardDashboard from "./components/SecurityGuardDashboard";
import Unauthorized from "./components/Unauthorized";
import TestScanner from "./components/Scanner"; // This can now use your Scanner.jsx logic
import ForgotPassword from "./components/ForgotPassword";
import Signup from "./components/Signup";
import CafeLordDashboard from "./components/CafeLordDashboard";
import EmergencyRegister from "./components/EmergencyRegister";

const NotFound = () => {
  const navigate = useNavigate();
  useEffect(() => {
    // Clean up both tokens on a hard 404/Error
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login", { replace: true });
  }, [navigate]);
  return null;
};

const ProtectedRoute = ({ allowedRoles }) => {
  // Use the new naming convention from our backend plan
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);

    // Check if token is expired. If so, the Interceptor (Step 2)
    // will usually catch this, but we add a safety check here.
    const currentTime = Date.now() / 1000;
    if (decoded.exp < currentTime) {
      localStorage.removeItem("accessToken");
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles.includes(decoded.role)) {
      return <Outlet />;
    } else {
      return <Navigate to="/unauthorized" replace />;
    }
  } catch (error) {
    localStorage.removeItem("accessToken");
    return <Navigate to="/login" replace />;
  }
};
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Admin/Finance: Approval and Management */}
        <Route element={<ProtectedRoute allowedRoles={["super_admin", "finance_admin"]} />}>
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/finance-admin" element={<FinanceDashboard />} />
          <Route path="/emergency-register" element={<EmergencyRegister />} />
        </Route>

        {/* Security: The Scanning Hub */}
        <Route element={<ProtectedRoute allowedRoles={["security_guard", "super_admin"]} />}>
          <Route path="/security-guard" element={<SecurityGuardDashboard />} />
          {/* We can map /test to our new Scanner during dev */}
          <Route path="/test" element={<TestScanner />} />
        </Route>

        {/* Users: Balance and History */}
        <Route element={<ProtectedRoute allowedRoles={["student", "military_student", "military_staff"]} />}>
          <Route path="/user" element={<StudentDashboard />} />
        </Route>

        {/* Cafe/Kitchen: Real-time Stats */}
        <Route element={<ProtectedRoute allowedRoles={["cafe_lord", "super_admin"]} />}>
          <Route path="/cafe-dashboard" element={<CafeLordDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
