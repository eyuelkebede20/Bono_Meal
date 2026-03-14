import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.BACKEND_URL;

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

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setStep(2);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch {
      setError("Network error connecting to the server.");
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("{BACKEND_URL}/api/auth/verify-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formData.phone, code }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Verification successful. You can now log in.");
        navigate("/");
      } else {
        setError(data.error);
      }
    } catch {
      setError("Network error connecting to the server.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-primary text-2xl">Create an Account</h2>

          {message && (
            <div className="alert alert-success">
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required className="input input-bordered input-primary w-full" />
                  <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required className="input input-bordered input-primary w-full" />
                </div>

                <input type="tel" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} required className="input input-bordered input-primary w-full" />

                <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required className="input input-bordered input-primary w-full" />

                <select name="role" value={formData.role} onChange={handleChange} className="select select-bordered select-primary w-full">
                  <option value="student">Student</option>
                  <option value="finance_admin">Finance Officer</option>
                  <option value="security_guard">Security Guard</option>
                </select>

                {formData.role === "student" && (
                  <>
                    <input
                      type="text"
                      name="studentId"
                      placeholder="Student ID (e.g., HCT-1234)"
                      value={formData.studentId}
                      onChange={handleChange}
                      required
                      className="input input-bordered input-primary w-full"
                    />

                    <input
                      type="text"
                      name="faydaId"
                      placeholder="Fayda ID (16 Digits)"
                      value={formData.faydaId}
                      onChange={handleChange}
                      required
                      className="input input-bordered input-primary w-full"
                    />
                  </>
                )}

                <button className="btn btn-primary mt-2">Sign Up & Get OTP</button>
              </form>

              <p className="text-center mt-4">
                Already have an account?{" "}
                <Link to="/" className="link link-primary">
                  Log In
                </Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <input type="text" value={formData.phone} disabled className="input input-bordered input-primary w-full opacity-50 cursor-not-allowed" />
              <input type="text" placeholder="6-Digit OTP Code" value={code} onChange={(e) => setCode(e.target.value)} required className="input input-bordered input-primary w-full" />
              <button type="submit" className="btn btn-primary mt-2">
                Verify Account
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
