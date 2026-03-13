import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "../style.css";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);

        const decoded = jwtDecode(data.token);
        const role = data.role; // Make sure your backend login route sends { token, role }

        if (role === "super_admin") navigate("/super-admin");
        else if (role === "finance_admin") navigate("/finance-admin");
        else navigate("/student");
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300">
      <form onSubmit={handleLogin}>
        <div className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title justify-center text-primary text-2xl font-bold">Bon-Card Login</h2>

            <div className="flex flex-col gap-4 mt-4">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="input input-bordered input-primary w-full" />

              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="input input-bordered input-primary w-full" />

              <button type="submit" className="btn btn-primary mt-2">
                Login
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
