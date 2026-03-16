import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function FinanceDashboard() {
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const BACKEND_URL = import.meta.VITE_BACKEND_URL;

  useEffect(() => {
    fetchPendingRequests();
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
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/topups/pending`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
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

    setLoading(false);
  };

  const searchApprovedRequests = async (query) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/topups/approved/search?q=${query}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
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
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Top-up approved successfully.");

        setRequests((prev) => prev.filter((req) => req._id !== id));
      } else setError(data.error);
    } catch {
      setError("Approval failed.");
    }
  };

  const handleRevert = async (id) => {
    if (!window.confirm("Revert this transaction?")) return;

    setError("");
    setMessage("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/topups/${id}/revert`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Transaction reverted.");

        setSearchResults((prev) => prev.filter((r) => r._id !== id));

        setSearchQuery("");
      } else setError(data.error);
    } catch {
      setError("Revert failed.");
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

      {message && <div className="alert alert-success mb-4 shadow">{message}</div>}

      {error && <div className="alert alert-error mb-4 shadow">{error}</div>}

      {/* STATS */}

      <div className="stats shadow mb-6 w-full">
        <div className="stat">
          <div className="stat-title">Pending Requests</div>
          <div className="stat-value text-warning">{requests.length}</div>
        </div>

        <div className="stat">
          <div className="stat-title">Search Results</div>
          <div className="stat-value">{searchResults.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PENDING REQUESTS */}

        <div className="lg:col-span-2 card bg-base-100 shadow-xl">
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
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center opacity-60">
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

                      <td className="font-mono">{req.transactionNumber}</td>

                      <td>{req.amount.toLocaleString()} ETB</td>

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

        {/* REVERT PANEL */}

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-error">Revert Transaction</h2>

            <p className="text-sm opacity-70">Search approved transactions by name or phone.</p>

            <input type="text" placeholder="Search student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input input-bordered w-full mt-4" />

            {searchResults.length > 0 && (
              <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
                {searchResults.map((req) => (
                  <div key={req._id} className="flex justify-between items-center p-3 bg-base-200 rounded">
                    <div>
                      <p className="font-semibold text-sm">
                        {req.student?.firstName} {req.student?.lastName}
                      </p>

                      <p className="text-xs opacity-70">
                        {req.transactionNumber} • {req.amount} ETB
                      </p>
                    </div>

                    <button onClick={() => handleRevert(req._id)} className="btn btn-error btn-xs">
                      Revert
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length > 2 && searchResults.length === 0 && <p className="text-sm opacity-60 mt-3">No transactions found</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
