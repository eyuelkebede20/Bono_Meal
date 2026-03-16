import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://apibonomeal.senaycreatives.com";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    role: "student",
    studentId: "",
    faydaId: "",
    phone: "",
  });

  const [code, setCode] = useState("");
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    // Sanitize phone number: remove all non-digits
    const cleanPhone = formData.phone.replace(/\D/g, "");
    const dataToSend = { ...formData, phone: cleanPhone };

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setStep(2);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Network error connecting to the server.");
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    // Ensure the verification also uses the clean phone number
    const cleanPhone = formData.phone.replace(/\D/g, "");

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, code }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Verification successful. You can now log in.");
        navigate("/login");
      } else {
        setError(data.error);
      }
    } catch {
      setError("Network error connecting to the server.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300 px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-primary text-2xl font-bold">Create an Account</h2>

          {message && (
            <div className="alert alert-success text-sm">
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <>
              {/* Mandatory Telegram Linking Instructions */}
              <div className="flex flex-col gap-2 mb-4 p-3 bg-info/10 rounded-lg border border-info/20">
                <p className="text-xs font-bold text-info">Step 1: Link Telegram for OTPs</p>
                <a href="https://t.me/bon_card_otp_bot" target="_blank" rel="noopener noreferrer" className="btn btn-info btn-xs w-full">
                  Message @bon_card_otp_bot
                </a>
                <p className="text-[10px] text-base-content/60">Share your contact with the bot before clicking Sign Up.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required className="input input-bordered w-full" />
                  <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required className="input input-bordered w-full" />
                </div>

                <input type="tel" name="phone" placeholder="Phone Number (e.g. 09... or +251...)" value={formData.phone} onChange={handleChange} required className="input input-bordered w-full" />

                <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required className="input input-bordered w-full" />

                <select name="role" value={formData.role} onChange={handleChange} className="select select-bordered w-full">
                  <option value="student">Student</option>
                  <option value="military_student">Military Student</option>
                  <option value="military_staff">Military Staff</option>
                  <option value="finance_admin">Finance Officer</option>
                  <option value="security_guard">Security Guard</option>
                </select>

                {["student", "military_student"].includes(formData.role) && (
                  <>
                    <input type="text" name="studentId" placeholder="Student ID (e.g., HCT-1234)" value={formData.studentId} onChange={handleChange} required className="input input-bordered w-full" />
                    <input type="text" name="faydaId" placeholder="Fayda ID (16 Digits)" value={formData.faydaId} onChange={handleChange} required className="input input-bordered w-full" />
                  </>
                )}

                <button type="submit" className="btn btn-primary mt-2">
                  Sign Up & Get OTP
                </button>
              </form>

              <p className="text-center mt-4 text-sm">
                Already have an account?{" "}
                <Link to="/login" className="link link-primary">
                  Log In
                </Link>
              </p>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="alert alert-info text-xs">
                <span>Verification code sent to your Telegram.</span>
              </div>
              <form onSubmit={handleVerify} className="flex flex-col gap-4">
                <input type="text" value={formData.phone} disabled className="input input-bordered w-full opacity-60" />
                <input type="text" placeholder="6-Digit OTP Code" value={code} onChange={(e) => setCode(e.target.value)} required className="input input-bordered w-full" />
                <button type="submit" className="btn btn-primary">
                  Verify & Complete
                </button>
                <button type="button" onClick={() => setStep(1)} className="btn btn-ghost btn-sm">
                  Change Phone Number
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
