import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EmergencyRegister() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    studentId: "", // Added as it's common for university systems
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });

  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", msg: "" });

    try {
      // Note: This points to a specific emergency route that skips OTP on the backend
      const response = await fetch(`${BACKEND_URL}/api/auth/emergency-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: "success", msg: "✅ Registration Successful!" });
        // Optional: Redirect back after a delay
        setTimeout(() => navigate("/dashboard"), 2000);
      } else {
        setStatus({ type: "error", msg: `❌ ${data.error || "Registration failed"}` });
      }
    } catch (err) {
      setStatus({ type: "error", msg: "❌ Server connection failed." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-300 p-4">
      <div className="max-w-lg mx-auto mt-10">
        <button onClick={() => navigate("/dashboard")} className="btn btn-ghost mb-4">
          ← Back to Dashboard
        </button>

        <div className="card bg-base-100 shadow-2xl border-t-4 border-warning">
          <div className="card-body">
            <div className="mb-4">
              <h2 className="card-title text-2xl font-black">EMERGENCY REGISTRATION</h2>
              <p className="text-sm opacity-60">Manual override: No OTP verification required.</p>
            </div>

            {status.msg && <div className={`alert ${status.type === "success" ? "alert-success" : "alert-error"} text-white font-bold mb-4`}>{status.msg}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label text-xs font-bold">FIRST NAME</label>
                  <input name="firstName" type="text" required className="input input-bordered focus:input-warning" onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label text-xs font-bold">LAST NAME</label>
                  <input name="lastName" type="text" required className="input input-bordered focus:input-warning" onChange={handleChange} />
                </div>
              </div>

              <div className="form-control">
                <label className="label text-xs font-bold">PHONE NUMBER</label>
                <input name="phone" type="tel" required placeholder="e.g. 0912345678" className="input input-bordered focus:input-warning text-lg" onChange={handleChange} />
              </div>
              <div className="form-control">
                <label className="label text-xs font-bold">PASSWORD</label>
                <input name="password" type="password" required placeholder="****" className="input input-bordered focus:input-warning text-lg" onChange={handleChange} />
              </div>

              <div className="form-control">
                <label className="label text-xs font-bold">STUDENT ID (OPTIONAL)</label>
                <input name="studentId" type="text" className="input input-bordered focus:input-warning" onChange={handleChange} />
              </div>

              <button type="submit" disabled={loading} className={`btn btn-warning btn-lg w-full mt-4 ${loading ? "loading" : ""}`}>
                {loading ? "Registering..." : "Complete Registration"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
