import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    role: "student",
    studentId: "",
    faydaId: "",
    phone: "",
  });

  const [step, setStep] = useState(1); // 1 = Form, 2 = Telegram Link
  const [telegramLink, setTelegramLink] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

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
        // Registration saved! Grab the deep link and move to Step 2
        setTelegramLink(data.telegramLink);
        setStep(2);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Network error connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300 px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-primary text-2xl font-bold">{step === 1 ? "Create an Account" : "Final Step"}</h2>

          {error && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                <div className="flex gap-2">
                  <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required className="input input-bordered w-full" />
                  <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required className="input input-bordered w-full" />
                </div>

                <input type="tel" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} required className="input input-bordered w-full" />
                <input type="password" name="password" placeholder="Set 4-Digit PIN (or Password)" value={formData.password} onChange={handleChange} required className="input input-bordered w-full" />

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

                    {/* Placeholder for Image Upload UI later */}
                    <div className="text-xs text-gray-500 italic">Image upload integration coming next...</div>
                  </>
                )}

                <button type="submit" disabled={loading} className="btn btn-primary mt-2">
                  {loading ? "Processing..." : "Register"}
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
            <div className="flex flex-col gap-6 text-center">
              <div className="p-4 bg-green-100 text-green-800 rounded-lg">
                <p className="font-bold">Registration Saved!</p>
                <p className="text-sm mt-1">To complete your setup and receive notifications, you must link your Telegram account.</p>
              </div>

              <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="btn btn-info w-full shadow-lg">
                🔗 Link Telegram Now
              </a>

              <button onClick={() => navigate("/login")} className="btn btn-ghost mt-2">
                I'll do this later (Go to Login)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
