import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = import.meta.VITE_BACKEND_URL;
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded = jwtDecode(token);
        const role = decoded.role;

        if (role === "super_admin") navigate("/super-admin");
        else if (role === "finance_admin") navigate("/finance-admin");
        else if (role === "security_guard") navigate("/security-guard");
        else navigate("/user");
      } catch {
        localStorage.removeItem("token");
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);

        const decoded = jwtDecode(data.token);
        const role = data.role || decoded.role;

        if (role === "super_admin") navigate("/super-admin");
        else if (role === "finance_admin") navigate("/finance-admin");
        else if (role === "security_guard") navigate("/security-guard");
        else navigate("/user");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Failed to connect to the server.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300 px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-primary text-2xl font-bold">Bon-Card Login</h2>

          {error && <div className="alert alert-error text-sm">{error}</div>}

          <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-4">
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number" required className="input input-bordered w-full" />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="input input-bordered w-full pr-16"
              />

              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2 btn btn-xs btn-ghost">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button type="submit" disabled={loading} className={`btn btn-primary mt-2 ${loading ? "loading" : ""}`}>
              Login
            </button>
          </form>

          <div className="flex justify-between mt-4 text-sm">
            <Link to="/forgot-password" className="link link-primary">
              Forgot Password?
            </Link>

            <Link to="/signup" className="link link-primary">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
