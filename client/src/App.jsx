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

const ProtectedRoute = ({ allowedRoles }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
    const decoded = jwtDecode(token);

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
        <Route path="/" element={<Login />} />
        <Route path="/test" element={<TestScanner />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
        </Route>
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<ProtectedRoute allowedRoles={["finance_admin", "super_admin"]} />}>
          <Route path="/finance-admin" element={<FinanceDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["security_guard", "super_admin"]} />}>
          <Route path="/security-guard" element={<SecurityGuardDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
          <Route path="/student" element={<StudentDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
