import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Login from "./components/Login";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import FinanceDashboard from "./components/FinanceDashboard";
import StudentDashboard from "./components/StudentDashboard";
import SecurityGuardDashboard from "./components/SecurityGuardDashboard";
import Unauthorized from "./components/Unauthorized";
import TestScanner from "./components/TestScanner";
import ForgotPassword from "./components/ForgotPassword";
import Signup from "./components/Signup";
import CafeLordDashboard from "./components/CafeLordDashboard";
import EmergencyRegister from "./components/EmergencyRegister";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear everything: token, user preferences, etc.
    localStorage.clear();
    // Optional: sessionStorage.clear();

    // Redirect to login (which is at "/" in your config)
    navigate("/", { replace: true });
  }, [navigate]);

  return null; // Renders nothing while redirecting
};

const ProtectedRoute = ({ allowedRoles }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    console.log("Allowed Roles:", allowedRoles);
    console.log("User Role from Token:", decoded.role);

    if (allowedRoles.includes(decoded.role)) {
      return <Outlet />;
    } else {
      return <Navigate to="/unauthorized" replace />;
    }
  } catch (error) {
    localStorage.removeItem("token");
    return <Navigate to="/" replace />;
  }
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/test" element={<TestScanner />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["finance_admin", "super_admin"]} />}>
          <Route path="/finance-admin" element={<FinanceDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["finance_admin", "super_admin", "security_guard"]} />}>
          <Route path="/emergency-register" element={<EmergencyRegister />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["security_guard", "super_admin"]} />}>
          <Route path="/security-guard" element={<SecurityGuardDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["student", "military_student", "military_staff"]} />}>
          <Route path="/user" element={<StudentDashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["cafe_lord", "super_admin"]} />}>
          <Route path="/cafe-dashboard" element={<CafeLordDashboard />} />
        </Route>

        {/* CATCH-ALL ROUTE 
            This must stay at the very bottom 
        */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
