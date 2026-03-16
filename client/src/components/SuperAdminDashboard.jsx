import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StudentAttendanceHistory from "./StudentAttendanceHistory";

export default function SuperAdminDashboard() {
  const handleApprove = async (userId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // Refresh the user list after approval
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Approval failed");
      }
    } catch (error) {
      console.error("Approval error:", error);
    }
  };
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    eatingToday: 0,
    thisMonthTotal: 0,
    lastMonthTotal: 0,
  });
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const limit = 10;
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, searchQuery]);

  const fetchStats = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error("Fetch stats error:", error);
    }
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BACKEND_URL}/api/users?page=${page}&limit=${limit}&search=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Fetch users error:", error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-base-300 p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Super Admin Dashboard</h1>
        <button onClick={handleLogout} className="btn btn-error btn-sm">
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4">
            <h2 className="card-title text-sm text-gray-500">Total Students</h2>
            <p className="text-2xl font-bold">{stats.totalStudents}</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4">
            <h2 className="card-title text-sm text-gray-500">Eating Today</h2>
            <p className="text-2xl font-bold">{stats.eatingToday}</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4">
            <h2 className="card-title text-sm text-gray-500">This Month Deposits</h2>
            <p className="text-2xl font-bold text-success">{stats.thisMonthTotal} ETB</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4">
            <h2 className="card-title text-sm text-gray-500">Last Month Deposits</h2>
            <p className="text-2xl font-bold">{stats.lastMonthTotal} ETB</p>
          </div>
        </div>
      </div>

      <div className="card w-full bg-base-100 shadow-xl mx-auto">
        <div className="card-body">
          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <input
              type="text"
              placeholder="Search name, phone, or ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input input-bordered input-primary w-full max-w-md"
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="table w-full border">
              <thead className="bg-gray-100 text-black">
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="hover">
                    <td>
                      {["student", "military_student"].includes(user.role) ? (
                        <button onClick={() => setSelectedStudentId(user._id)} className="text-primary hover:underline font-bold">
                          {user.firstName} {user.lastName}
                        </button>
                      ) : (
                        <span>
                          {user.firstName} {user.lastName}
                        </span>
                      )}
                    </td>
                    <td>{user.phone}</td>
                    <td className="capitalize">{user.role.replace("_", " ")}</td>
                    <td>
                      {user.isApproved ? (
                        <span className="badge badge-success">Approved</span>
                      ) : (
                        <button onClick={() => handleApprove(user._id)} className="btn btn-xs btn-warning">
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-4">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-outline btn-sm">
              Previous
            </button>
            <span className="font-bold">
              Page {page} of {totalPages === 0 ? 1 : totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="btn btn-outline btn-sm">
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedStudentId && <StudentAttendanceHistory studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />}
    </div>
  );
}
