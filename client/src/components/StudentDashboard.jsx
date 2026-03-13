import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import LogoutButton from "./LogoutButton";

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]); // Initialize as empty array

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const decoded = jwtDecode(token);
      const userId = decoded._id; // Get the ID from the token

      try {
        // Fetch User Info
        const userRes = await fetch(`http://localhost:3000/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userRes.ok) {
          setUser(await userRes.json());
        }

        // Fetch Transactions (Ensure this route exists on your backend!)
        const transRes = await fetch(`http://localhost:3000/api/transactions/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (transRes.ok) {
          const data = await transRes.json();
          // Ensure the data is an array before setting it
          if (Array.isArray(data)) {
            setTransactions(data);
          } else {
            // If your backend wraps it like { transactions: [...] }
            setTransactions(data.transactions || []);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };

    fetchData();
  }, []);

  if (!user)
    return (
      <div className="flex justify-center mt-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );

  return (
    <div className="min-h-screen bg-base-300 p-6">
      {/* Navbar */}
      <div className="navbar bg-base-100 rounded-box shadow mb-6">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-primary">Student Dashboard</h1>
        </div>
        <div>
          <LogoutButton />
        </div>
      </div>

      <h2 className="text-lg mb-4">
        Welcome, <span className="text-primary font-semibold">{user.firstName}</span>
      </h2>

      {/* Bono Card */}
      <div className="card bg-base-100 shadow-xl w-full max-w-md mb-8">
        <div className="card-body">
          <h3 className="card-title text-primary">Bono Card</h3>

          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Balance</div>
              <div className="stat-value text-primary">{user.activeCard?.balance} ETB</div>
            </div>
          </div>

          <p className="mt-3">
            Status: <span className={`badge ${user.activeCard?.isActive ? "badge-success" : "badge-error"}`}>{user.activeCard?.isActive ? "Active" : "Suspended"}</span>
          </p>

          <p className="text-sm opacity-70">Card Number: {user.activeCard?.cardNumber}</p>
        </div>
      </div>

      {/* Ledger */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-primary">Ledger</h3>

          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id}>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${t.type === "credit" ? "badge-success" : "badge-error"}`}>{t.type}</span>
                    </td>
                    <td>{t.amount} ETB</td>
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
