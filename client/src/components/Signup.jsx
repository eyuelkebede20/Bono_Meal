import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "student",
    studentId: "",
    faydaId: "",
    phone: "",
  });

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
      const res = await fetch("http://localhost:3000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);

        if (formData.role === "student") {
          setTimeout(() => navigate("/"), 2000);
        } else {
          setFormData({
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            role: "finance_admin",
            studentId: "",
            faydaId: "",
            phone: "",
          });
        }
      } else {
        setError(data.error || "Registration failed");
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required className="input input-bordered input-primary w-full" />

              <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required className="input input-bordered input-primary w-full" />
            </div>

            <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required className="input input-bordered input-primary w-full" />

            <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required className="input input-bordered input-primary w-full" />

            <select name="role" value={formData.role} onChange={handleChange} className="select select-bordered select-primary w-full">
              <option value="student">Student</option>
              <option value="finance_admin">Finance Officer</option>
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

                <input type="text" name="faydaId" placeholder="Fayda ID (16 Digits)" value={formData.faydaId} onChange={handleChange} required className="input input-bordered input-primary w-full" />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  style={{ padding: "8px" }}
                  className="input input-bordered input-primary w-full"
                />
              </>
            )}

            <button className="btn btn-primary mt-2">Sign Up</button>
          </form>

          <p className="text-center mt-4">
            Already have an account?{" "}
            <Link to="/" className="link link-primary">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
