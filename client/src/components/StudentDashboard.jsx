import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StudentTopUpRequest from "./StudentTopUpRequest";

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // Function to clear all local data and redirect
  const handleAuthError = () => {
    localStorage.clear(); // Clears token and all other data
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    navigate("/"); // Redirect to login
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      handleAuthError();
    } else {
      fetchDashboardData();
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/me/dashboard`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const json = await res.json();

      if (res.status === 401 || res.status === 403) {
        handleAuthError();
        return;
      }

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
    handleAuthError();
  };

  if (error)
    return (
      <div className="p-4 text-center">
        <div className="alert alert-error mb-4">{error}</div>
        <button onClick={handleAuthError} className="btn btn-primary">
          Go to Login
        </button>
      </div>
    );

  if (!data)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );

  const { student, balance, topUpRequests, attendance, transactions, daysEaten } = data;

  return (
    <div className="min-h-screen bg-base-300 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Student Dashboard</h1>
        <button onClick={handleLogout} className="btn btn-error btn-sm">
          Logout
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile & Balance */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary">Profile Overview</h2>
            <p>
              <strong>Name:</strong> {student.firstName} {student.lastName}
            </p>
            <p>
              <strong>Phone:</strong> {student.phone}
            </p>

            {/* Balance */}
            <div className="mt-4 p-4 bg-primary text-primary-content rounded-lg shadow-md">
              <h3 className="font-bold text-lg opacity-90">Current Balance</h3>
              <p className="text-4xl font-mono mt-1">{balance.toLocaleString()} ETB</p>
            </div>

            {/* Meal Plan Usage */}
            <div className="mt-4">
              <h3 className="font-bold">Meal Plan Usage</h3>
              <progress className="progress progress-primary w-full" value={daysEaten} max="30"></progress>
              <p className="text-sm mt-1">{daysEaten} / 30 Days Consumed</p>
            </div>
          </div>
        </div>

        {/* Top-Up Request Form */}
        <StudentTopUpRequest onUploadSuccess={fetchDashboardData} />

        {/* Top-Up Requests Table */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary">Top-Up Requests</h2>
            <div className="overflow-y-auto max-h-60">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Txn No.</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topUpRequests.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center opacity-60">
                        No requests found
                      </td>
                    </tr>
                  ) : (
                    topUpRequests.map((req) => (
                      <tr key={req._id}>
                        <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                        <td>{req.transactionNumber}</td>
                        <td>{req.amount.toLocaleString()} ETB</td>
                        <td className={`capitalize font-bold ${req.status === "reverted" ? "text-error" : req.status === "approved" ? "text-success" : "text-warning"}`}>{req.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Transactions Ledger */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary">Transaction Ledger</h2>
            <div className="overflow-y-auto max-h-60">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center opacity-60">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr key={txn._id}>
                        <td>{new Date(txn.createdAt).toLocaleDateString()}</td>
                        <td className="capitalize">{txn.type.replace("_", " ")}</td>
                        <td className={txn.type === "deposit" ? "text-success font-bold" : "text-error font-bold"}>
                          {txn.type === "deposit" ? "+" : "-"}
                          {txn.amount.toLocaleString()} ETB
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="card bg-base-100 shadow-xl md:col-span-2">
          <div className="card-body">
            <h2 className="card-title text-primary">Meal Attendance History</h2>
            <div className="overflow-y-auto max-h-60">
              <table className="table table-compact w-full table-zebra">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Meal Type</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="text-center opacity-60">
                        No meals recorded yet
                      </td>
                    </tr>
                  ) : (
                    attendance.map((record) => (
                      <tr key={record._id}>
                        <td>{new Date(record.date).toLocaleString()}</td>
                        <td className="capitalize">{record.mealType}</td>
                      </tr>
                    ))
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
