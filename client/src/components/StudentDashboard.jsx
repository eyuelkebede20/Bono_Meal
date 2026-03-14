import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StudentTopUpRequest from "./StudentTopUpRequest";

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/users/me/dashboard", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError("Failed to fetch dashboard data");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!data) return <div className="p-4">Loading...</div>;

  const { student, topUpRequests, attendance, transactions, daysEaten } = data;

  return (
    <div className="min-h-screen bg-base-300 p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Student Dashboard</h1>
        <button onClick={handleLogout} className="btn btn-error btn-sm">
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile & Quota */}
        <div className="card w-full bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary">Profile Overview</h2>
            <p>
              <strong>Name:</strong> {student.firstName} {student.lastName}
            </p>
            <p>
              <strong>Phone:</strong> {student.phone}
            </p>
            <p>
              <strong>Status:</strong> {student.isApproved ? "Approved" : "Pending Approval"}
            </p>
            <div className="mt-4">
              <h3 className="font-bold">Meal Plan Usage</h3>
              <progress className="progress progress-primary w-full" value={daysEaten} max="30"></progress>
              <p className="text-sm mt-1">{daysEaten} / 30 Days Consumed</p>
            </div>
          </div>
        </div>

        {/* Top Up Request Form */}
        <StudentTopUpRequest onUploadSuccess={fetchDashboardData} />

        {/* Top-Up Requests Status */}
        <div className="card w-full bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary">Top-Up Requests</h2>
            <div className="overflow-y-auto max-h-60">
              <table className="table table-compact w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Txn No.</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topUpRequests.map((req) => (
                    <tr key={req._id}>
                      <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td>{req.transactionNumber}</td>
                      <td>{req.amount}</td>
                      <td className="capitalize">{req.status}</td>
                    </tr>
                  ))}
                  {topUpRequests.length === 0 && (
                    <tr>
                      <td colSpan="4">No requests found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Financial Transactions */}
        <div className="card w-full bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary">Transactions</h2>
            <div className="overflow-y-auto max-h-60">
              <table className="table table-compact w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn._id}>
                      <td>{new Date(txn.createdAt).toLocaleDateString()}</td>
                      <td className="capitalize">{txn.type.replace("_", " ")}</td>
                      <td>{txn.amount}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan="3">No transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="card w-full bg-base-100 shadow-xl md:col-span-2">
          <div className="card-body">
            <h2 className="card-title text-primary">Meal Attendance History</h2>
            <div className="overflow-y-auto max-h-60">
              <table className="table table-compact w-full">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Meal Type</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record._id}>
                      <td>{new Date(record.date).toLocaleString()}</td>
                      <td className="capitalize">{record.mealType}</td>
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan="2">No meals recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
