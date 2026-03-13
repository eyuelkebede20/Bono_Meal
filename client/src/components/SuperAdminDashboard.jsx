import { useState, useEffect } from "react";
import LogoutButton from "./LogoutButton";

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState({
    cards: { active: 0, suspended: 0 },
    today: { deductions: { totalAmount: 0 }, topUps: { totalAmount: 0 } },
  });

  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);

  // Number formatter
  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString();
  };

  const fetchData = async () => {
    const token = localStorage.getItem("token");

    const metricsRes = await fetch("http://localhost:3000/api/metrics", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (metricsRes.ok) setMetrics(await metricsRes.json());

    const usersRes = await fetch("http://localhost:3000/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (usersRes.ok) setUsers(await usersRes.json());

    const pendingRes = await fetch("http://localhost:3000/api/users/pending", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (pendingRes.ok) setPendingUsers(await pendingRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (userId) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`http://localhost:3000/api/users/${userId}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to approve user.");
      }
    } catch {
      alert("Network error while approving user.");
    }
  };

  return (
    <div className="min-h-screen bg-base-300 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Super Admin Dashboard</h1>
        <LogoutButton />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">Active Cards</div>
          <div className="stat-value text-success">{formatNumber(metrics.cards.active)}</div>
        </div>

        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">Suspended Cards</div>
          <div className="stat-value text-error">{formatNumber(metrics.cards.suspended)}</div>
        </div>

        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">Today's Deductions</div>
          <div className="stat-value text-warning text-xl md:text-2xl">{formatNumber(metrics.today.deductions.totalAmount)} ETB</div>
        </div>

        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">Today's Top Ups</div>
          <div className="stat-value text-primary text-xl md:text-2xl">{formatNumber(metrics.today.topUps.totalAmount)} ETB</div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-warning">Pending Approvals ({pendingUsers.length})</h2>

          {pendingUsers.length === 0 ? (
            <p>No users pending approval.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Requested Role</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pendingUsers.map((user) => (
                    <tr key={user._id}>
                      <td>
                        {user.firstName} {user.lastName}
                      </td>

                      <td className="break-all">{user.email}</td>

                      <td>
                        <span className="badge badge-outline">{user.role}</span>
                      </td>

                      <td>
                        <button onClick={() => handleApprove(user._id)} className="btn btn-success btn-sm">
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* System Directory */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-primary">System Directory</h2>

          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      {u.firstName} {u.lastName}
                    </td>

                    <td className="break-all">{u.email}</td>

                    <td>
                      <span className="badge badge-outline">{u.role}</span>
                    </td>

                    <td>{u.isApproved ? <span className="badge badge-success">Approved</span> : <span className="badge badge-warning">Pending</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
