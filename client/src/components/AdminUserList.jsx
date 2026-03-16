import { useState, useEffect } from "react";

export default function AdminUserList() {
  const [users, setUsers] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const limit = 10;
  const BACKEND_URL = import.meta.VITE_BACKEND_URL;
  useEffect(() => {
    fetchUsers();
  }, [page, searchQuery]);

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
      } else {
        console.error(data.error);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <input type="text" placeholder="Search name, phone, or ID..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="input input-bordered w-full sm:max-w-md" />

        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {/* Table */}
      <div className="card bg-base-100 shadow">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      {user.firstName} {user.lastName}
                    </td>

                    <td className="break-all">{user.phone}</td>

                    <td>
                      <span className="badge badge-outline">{user.role}</span>
                    </td>

                    <td>{user.isApproved ? <span className="badge badge-success">Approved</span> : <span className="badge badge-warning">Pending</span>}</td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div>
          Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
        </div>

        <div className="join">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="join-item btn btn-outline btn-sm">
            Previous
          </button>

          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="join-item btn btn-outline btn-sm">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
