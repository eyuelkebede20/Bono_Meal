import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import LogoutButton from "./LogoutButton";

export default function CafeLordDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BACKEND_URL}/api/cafe/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const generatePDF = () => {
    if (!stats) return;
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.text("BonoMeal Cafe Lord - Daily Analytics", 14, 22);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 15,
      head: [["Meal", "Yesterday", "Today"]],
      body: [
        ["Breakfast", stats.yesterdayMeals?.breakfast || 0, stats.todayMeals?.breakfast || 0],
        ["Lunch", stats.yesterdayMeals?.lunch || 0, stats.todayMeals?.lunch || 0],
        ["Dinner", stats.yesterdayMeals?.dinner || 0, stats.todayMeals?.dinner || 0],
      ],
    });

    doc.save(`Cafe_Report_${dateStr}.pdf`);
  };

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 p-4">
        <div className="absolute top-6 right-6">
          <LogoutButton />
        </div>
        <div className="alert alert-error max-w-md">
          <span>{error}</span>
        </div>
        <button onClick={() => window.location.reload()} className="btn btn-primary mt-4">
          Retry
        </button>
      </div>
    );

  if (!stats)
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="absolute top-6 right-6">
          <LogoutButton />
        </div>
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );

  const chartData = (stats.registrationStats || []).map((item) => ({
    name: item.role?.replace("_", " ").toUpperCase() || "UNKNOWN",
    value: item.count || 0,
  }));

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-secondary">CAFE LORD PANEL</h1>
        <div className="flex gap-4">
          <button onClick={generatePDF} className="btn btn-primary btn-sm">
            PDF Report
          </button>
          <LogoutButton />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 bg-base-100 p-6 shadow rounded-box">
          <h2 className="font-bold mb-4">Daily Attendance</h2>
          <table className="table table-compact w-full">
            <thead>
              <tr>
                <th>Meal</th>
                <th>Yesterday</th>
                <th>Today</th>
              </tr>
            </thead>
            <tbody>
              {["breakfast", "lunch", "dinner"].map((meal) => (
                <tr key={meal}>
                  <td className="capitalize">{meal}</td>
                  <td>{stats.yesterdayMeals?.[meal] || 0}</td>
                  <td className="text-info font-bold">{stats.todayMeals?.[meal] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-base-100 p-6 shadow rounded-box h-80 flex flex-col">
          <h2 className="font-bold mb-2">Role Distribution</h2>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.registrationStats?.map((item) => (
          <div key={item.role} className="card bg-base-100 shadow-sm border-l-4 border-primary p-4">
            <p className="text-[10px] uppercase opacity-50 font-bold">{item.role?.replace("_", " ")}</p>
            <p className="text-2xl font-black">{item.count || 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
