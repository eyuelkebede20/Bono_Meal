import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SecurityGuardDashboard() {
  const [phone, setPhone] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [student, setStudent] = useState(null);
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.BACKEND_URL;
  const handleScan = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setStudent(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ phone, mealType }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ Access Granted");
        setStudent(data.student);
        setPhone("");
      } else {
        setError(`❌ ${data.error}`);
      }
    } catch (err) {
      setError("❌ Failed to connect to the server.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-base-300 p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Security Guard Terminal</h1>
        <button onClick={handleLogout} className="btn btn-error btn-sm">
          Logout
        </button>
      </div>

      <div className="card w-full max-w-lg bg-base-100 shadow-xl mx-auto mt-10">
        <div className="card-body">
          <h2 className="card-title text-center block mb-4">Manual Entry Scanner</h2>

          {message && <div className="alert alert-success shadow-lg mb-4 text-white font-bold text-lg">{message}</div>}
          {error && <div className="alert alert-error shadow-lg mb-4 text-white font-bold text-lg">{error}</div>}
          {student && (
            <div className="bg-gray-100 p-4 rounded-lg mb-4 text-center">
              <p className="text-lg font-bold">
                {student.firstName} {student.lastName}
              </p>
              <p className="text-sm text-gray-500">{student.phone}</p>
            </div>
          )}

          <form onSubmit={handleScan} className="flex flex-col gap-4">
            <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="select select-bordered select-primary w-full text-lg">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
            <input
              type="text"
              placeholder="Enter Student Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
              className="input input-bordered input-primary w-full text-lg"
            />

            <button type="submit" className="btn btn-primary btn-lg mt-2">
              Verify Access
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
