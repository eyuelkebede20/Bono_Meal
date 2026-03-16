import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function FinanceDashboard() {
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [approvedHalts, setApprovedHalts] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  // FIX: Load both pending requests AND approved halts on mount
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      await Promise.all([fetchPendingRequests(), fetchApprovedHalts()]);
      setLoading(false);
    };
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const timer = setTimeout(() => {
        searchApprovedRequests(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/topups/pending`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

      const data = await res.json();
      if (res.ok) setRequests(data);
      else setError(data.error);
    } catch {
      setError("Failed to fetch pending requests.");
    }
  };

  const fetchApprovedHalts = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/halt?status=approved_by_admin`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok) setApprovedHalts(data);
    } catch {
      console.error("Failed to fetch approved halts");
    }
  };

  const searchApprovedRequests = async (query) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/topups/approved/search?q=${query}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok) setSearchResults(data);
    } catch {
      console.error("Search failed");
    }
  };

  const handleApprove = async (id) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/topups/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Top-up approved successfully.");
        setRequests((prev) => prev.filter((req) => req._id !== id));
      } else setError(data.error);
    } catch {
      setError("Approval failed.");
    }
  };

  const handleRevert = async (id) => {
    if (!window.confirm("Are you sure you want to revert this transaction?")) return;
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/topups/${id}/revert`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Transaction reverted.");
        setSearchResults((prev) => prev.filter((r) => r._id !== id));
        setSearchQuery("");
      } else setError(data.error);
    } catch {
      setError("Revert failed.");
    }
  };

  const confirmRefund = async (id) => {
    if (!window.confirm("Confirm that cash has been returned to the student?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/halt/${id}/refund`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        setMessage("✅ Refund confirmed.");
        fetchApprovedHalts(); // Refresh list
      }
    } catch {
      setError("Refund confirmation failed.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-300">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-300 p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Finance Dashboard</h1>
        <button onClick={handleLogout} className="btn btn-error btn-sm">
          Logout
        </button>
      </div>

      {message && <div className="alert alert-success mb-4 shadow text-white font-bold">{message}</div>}
      {error && <div className="alert alert-error mb-4 shadow text-white font-bold">{error}</div>}

      {/* STATS */}
      <div className="stats shadow mb-6 w-full">
        <div className="stat">
          <div className="stat-title">Pending Requests</div>
          <div className="stat-value text-warning">{requests.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Pending Refunds</div>
          <div className="stat-value text-info">{approvedHalts.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN COLUMN (LEFT) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* PENDING REQUESTS */}
          <div className="card bg-base-100 shadow-xl border-t-4 border-warning">
            <div className="card-body">
              <h2 className="card-title text-primary">Pending Top-Up Requests</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Phone</th>
                      <th>Txn #</th>
                      <th>Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center opacity-60 py-4">
                          No pending requests
                        </td>
                      </tr>
                    )}
                    {requests.map((req) => (
                      <tr key={req._id}>
                        <td>
                          {req.student?.firstName} {req.student?.lastName}
                        </td>
                        <td>{req.student?.phone}</td>
                        <td className="font-mono text-sm">{req.transactionNumber}</td>
                        <td className="font-bold">{req.amount.toLocaleString()} ETB</td>
                        <td>
                          <button onClick={() => handleApprove(req._id)} className="btn btn-success btn-sm">
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* PENDING REFUNDS (Moved here for better space) */}
          <div className="card bg-base-100 shadow-xl border-t-4 border-info">
            <div className="card-body">
              <h2 className="card-title text-info">Pending Refunds (Approved by Admin)</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Phone</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedHalts.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center opacity-60 py-4">
                          No pending refunds
                        </td>
                      </tr>
                    )}
                    {approvedHalts.map((req) => (
                      <tr key={req._id}>
                        <td>
                          {req.user?.firstName} {req.user?.lastName}
                        </td>
                        <td>{req.user?.phone}</td>
                        <td>
                          <button onClick={() => confirmRefund(req._id)} className="btn btn-info btn-sm">
                            Confirm Cash Returned
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* SIDE COLUMN (RIGHT) */}
        <div className="flex flex-col gap-6">
          {/* REVERT PANEL */}
          <div className="card bg-base-100 shadow-xl border-t-4 border-error h-fit">
            <div className="card-body">
              <h2 className="card-title text-error">Revert Transaction</h2>
              <p className="text-sm opacity-70">Search approved transactions by name or phone.</p>

              <input type="text" placeholder="Search student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input input-bordered input-error w-full mt-2" />

              {searchResults.length > 0 && (
                <div className="mt-4 max-h-96 overflow-y-auto space-y-2 pr-2">
                  {searchResults.map((req) => (
                    <div key={req._id} className="flex flex-col p-3 bg-base-200 rounded-lg border border-base-300">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-sm">
                            {req.student?.firstName} {req.student?.lastName}
                          </p>
                          <p className="text-xs opacity-70 font-mono">{req.transactionNumber}</p>
                        </div>
                        <span className="badge badge-neutral">{req.amount} ETB</span>
                      </div>
                      <button onClick={() => handleRevert(req._id)} className="btn btn-error btn-sm w-full">
                        Revert
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length > 2 && searchResults.length === 0 && <p className="text-sm text-center opacity-60 mt-4">No transactions found</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
