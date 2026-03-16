import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function ForgotPassword() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Submit OTP & New Password
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://apibonomeal.senaycreatives.com";

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage("OTP sent to your Telegram account.");
        setStep(2);
      } else {
        setError(data.error || "Failed to request OTP");
      }
    } catch {
      setError("Failed to connect to the server.");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        navigate("/login"); // Redirect to login on success
      } else {
        setError(data.error || "Failed to reset password");
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
          <h2 className="card-title justify-center text-primary text-2xl font-bold">Reset Password</h2>

          {error && <div className="alert alert-error text-sm">{error}</div>}
          {message && <div className="alert alert-success text-sm">{message}</div>}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-4 mt-4">
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" required className="input input-bordered w-full" />
              <button type="submit" disabled={loading} className={`btn btn-primary mt-2 ${loading ? "loading" : ""}`}>
                Send OTP via Telegram
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4 mt-4">
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit OTP" required className="input input-bordered w-full" />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" required className="input input-bordered w-full" />
              <button type="submit" disabled={loading} className={`btn btn-primary mt-2 ${loading ? "loading" : ""}`}>
                Confirm New Password
              </button>
            </form>
          )}

          <div className="flex justify-center mt-4 text-sm">
            <div className="flex flex-col gap-2 mb-4">
              <a href="https://t.me/bon_card_otp_bot" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-info w-full text-xs">
                Step 1: Link Telegram (@bon_card_otp_bot)
              </a>
            </div>

            {error && <div className="alert alert-error text-sm">{error}</div>}
            <Link to="/login" className="link link-primary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
