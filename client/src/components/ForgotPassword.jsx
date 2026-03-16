// components/ForgotPassword.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function ForgotPassword() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message);
        setStep(2);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Password reset successful. Please log in.");
        navigate("/");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-primary text-2xl font-bold">Reset Password</h2>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {message && <p className="text-green-500 text-sm text-center">{message}</p>}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-4 mt-4">
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number" required className="input input-bordered input-primary w-full" />
              <button type="submit" className="btn btn-primary mt-2">
                Send OTP
              </button>
              <Link to="/" className="btn btn-ghost mt-2">
                Back to Login
              </Link>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4 mt-4">
              <input type="text" value={phone} disabled className="input input-bordered input-primary w-full opacity-50 cursor-not-allowed" />
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-Digit OTP" required className="input input-bordered input-primary w-full" />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" required className="input input-bordered input-primary w-full" />
              <button type="submit" className="btn btn-primary mt-2">
                Reset Password
              </button>
              <button type="button" onClick={() => setStep(1)} className="btn btn-ghost mt-2">
                Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
