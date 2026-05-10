import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Signup() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    role: "student",
    studentId: "",
    faydaId: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [telegramLink, setTelegramLink] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const pollIntervalRef = useRef(null);
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // Polling logic to check if account is linked
  useEffect(() => {
    if (isLinking && formData.phone) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const cleanPhone = formData.phone.replace(/\D/g, "");
          const res = await axios.get(`${BACKEND_URL}/api/auth/check-status/${cleanPhone}`);

          if (res.data.linked) {
            clearInterval(pollIntervalRef.current);
            setMessage("✅ Account linked! Redirecting to login...");
            setTimeout(() => navigate("/login"), 2000);
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 3000); // Check every 3 seconds
    }

    // Cleanup interval if user leaves the page
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isLinking, formData.phone, navigate, BACKEND_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/signup`, formData);

      if (response.data.telegramLink) {
        setTelegramLink(response.data.telegramLink);
        setMessage(response.data.message);
        setIsLinking(true); // Triggers the polling effect
      }
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border-t-4 border-primary">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-primary mb-2">Create Account</h2>

          {message && <div className="alert alert-success shadow text-white font-bold">{message}</div>}
          {error && <div className="alert alert-error shadow text-white font-bold">{error}</div>}

          {!telegramLink ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="First Name"
                  required
                  className="input input-bordered w-full"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  required
                  className="input input-bordered w-full"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
              <input
                type="text"
                placeholder="Phone Number"
                required
                className="input input-bordered w-full"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                required
                className="input input-bordered w-full"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <select className="select select-bordered w-full" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="student">Regular Student</option>
                <option value="military_student">Military Student</option>
              </select>

              <input
                type="text"
                placeholder="Student ID"
                required
                className="input input-bordered w-full"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              />
              <input
                type="text"
                placeholder="Fayda ID"
                required
                className="input input-bordered w-full"
                value={formData.faydaId}
                onChange={(e) => setFormData({ ...formData, faydaId: e.target.value })}
              />

              <button type="submit" className="btn btn-primary w-full mt-2">
                Sign Up
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center mt-4 p-4 bg-base-200 rounded-xl">
              <span className="loading loading-spinner text-primary loading-lg mb-4"></span>
              <p className="text-center font-bold text-lg mb-4">Waiting for Telegram Link...</p>
              <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="btn btn-info w-full text-white font-bold">
                🔗 Click here to link Telegram
              </a>
              <p className="text-sm opacity-60 text-center mt-4">Do not close this page. You will be redirected automatically once the bot confirms your account.</p>
            </div>
          )}

          {!telegramLink && (
            <div className="text-center mt-4">
              <button onClick={() => navigate("/login")} className="link link-hover text-sm opacity-70">
                Already have an account? Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
