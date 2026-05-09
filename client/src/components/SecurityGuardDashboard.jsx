import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function SecurityGuardDashboard() {
  const [phone, setPhone] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [student, setStudent] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Emergency Modal State
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyData, setEmergencyData] = useState({ firstName: "", lastName: "", phone: "", studentId: "" });
  const [emergencyStatus, setEmergencyStatus] = useState("");

  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const successSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
  const errorSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2873/2873-preview.mp3");

  const playFeedback = (isSuccess) => {
    if (isSuccess) successSound.play();
    else errorSound.play();
  };

  const handleScanLogic = async (inputPhone) => {
    setMessage("");
    setError("");
    setStudent(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({ phone: inputPhone, mealType }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ Access Granted");
        setStudent(data.student);
        setPhone("");
        playFeedback(true);
      } else {
        setError(`❌ ${data.error}`);
        playFeedback(false);
      }
    } catch {
      setError("❌ Failed to connect to the server.");
      playFeedback(false);
    }
  };

  const handleEmergencySubmit = async (e) => {
    e.preventDefault();
    setEmergencyStatus("Submitting...");

    const cleanPhone = emergencyData.phone.replace(/\D/g, "");

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...emergencyData,
          phone: cleanPhone,
          password: "TEMP_" + Math.floor(1000 + Math.random() * 9000), // Auto-gen temp password
          role: "student",
          faydaId: "PENDING_EMERGENCY",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEmergencyStatus("✅ Sent to Super Admin for approval.");
        setTimeout(() => {
          setShowEmergency(false);
          setEmergencyData({ firstName: "", lastName: "", phone: "", studentId: "" });
          setEmergencyStatus("");
        }, 2000);
      } else {
        setEmergencyStatus(`❌ ${data.error}`);
      }
    } catch {
      setEmergencyStatus("❌ Network error.");
    }
  };

  useEffect(() => {
    let scanner;
    if (isScanning) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } });
      scanner.render(
        (decodedText) => {
          setPhone(decodedText);
          handleScanLogic(decodedText);
          setIsScanning(false);
          scanner.clear();
        },
        () => {},
      );
    }
    return () => {
      if (scanner) scanner.clear().catch(console.error);
    };
  }, [isScanning, mealType]);

  return (
    <div className="min-h-screen bg-base-300 p-4 font-sans">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-black text-primary tracking-tight">SECURITY TERMINAL</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowEmergency(true)} className="btn btn-warning btn-sm">
            Emergency Reg
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              navigate("/login");
            }}
            className="btn btn-error btn-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="card w-full max-w-lg bg-base-100 shadow-2xl mx-auto border-t-4 border-primary">
        <div className="card-body p-6">
          <div className="flex flex-col gap-4">
            <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="select select-bordered select-primary w-full text-lg font-bold">
              <option value="breakfast">🌅 Breakfast</option>
              <option value="lunch">☀️ Lunch</option>
              <option value="dinner">🌙 Dinner</option>
            </select>

            <button onClick={() => setIsScanning(!isScanning)} className={`btn ${isScanning ? "btn-outline" : "btn-secondary"} btn-lg w-full mb-2`}>
              {isScanning ? "Close Scanner" : "📷 Open QR Scanner"}
            </button>

            {isScanning && <div id="reader" className="overflow-hidden rounded-xl border-2 border-dashed border-secondary"></div>}

            <div className="divider">OR MANUAL ENTRY</div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleScanLogic(phone);
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                placeholder="Student Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input input-bordered input-primary w-full text-xl text-center"
              />
              <button type="submit" className="btn btn-primary btn-lg">
                Verify Access
              </button>
            </form>
          </div>

          <div className="mt-8 transition-all">
            {message && <div className="alert alert-success shadow-md text-white font-bold text-center">{message}</div>}
            {error && <div className="alert alert-error shadow-md text-white font-bold text-center">{error}</div>}
            {student && (
              <div className="mt-4 p-6 bg-base-200 rounded-2xl border-2 border-success flex flex-col items-center">
                <div className="avatar placeholder mb-3">
                  <div className="bg-neutral text-neutral-content rounded-full w-16">
                    <span className="text-xl">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl font-black uppercase">
                  {student.firstName} {student.lastName}
                </h3>
                <p className="text-lg opacity-70">{student.phone}</p>
                <div className="badge badge-success mt-2 p-3 font-bold">VERIFIED</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Modal */}
      {showEmergency && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-warning mb-4">Emergency Registration</h3>
            <p className="text-sm opacity-70 mb-4">Registering a student here defaults to an unapproved state. The Super Admin must approve them before they can scan.</p>

            <form onSubmit={handleEmergencySubmit} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="First Name"
                  required
                  value={emergencyData.firstName}
                  onChange={(e) => setEmergencyData({ ...emergencyData, firstName: e.target.value })}
                  className="input input-bordered w-full"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  required
                  value={emergencyData.lastName}
                  onChange={(e) => setEmergencyData({ ...emergencyData, lastName: e.target.value })}
                  className="input input-bordered w-full"
                />
              </div>
              <input
                type="text"
                placeholder="Phone Number"
                required
                value={emergencyData.phone}
                onChange={(e) => setEmergencyData({ ...emergencyData, phone: e.target.value })}
                className="input input-bordered w-full"
              />
              <input
                type="text"
                placeholder="Student ID"
                required
                value={emergencyData.studentId}
                onChange={(e) => setEmergencyData({ ...emergencyData, studentId: e.target.value })}
                className="input input-bordered w-full"
              />

              {emergencyStatus && <div className={`text-sm font-bold ${emergencyStatus.includes("❌") ? "text-error" : "text-success"}`}>{emergencyStatus}</div>}

              <div className="modal-action mt-2">
                <button type="button" onClick={() => setShowEmergency(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning">
                  Submit to Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
