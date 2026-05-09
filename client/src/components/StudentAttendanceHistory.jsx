import { useState, useEffect } from "react";

export default function StudentAttendanceHistory({ studentId, onClose }) {
  const [history, setHistory] = useState([]);
  const [heatmapData, setHeatmapData] = useState({});
  const [stats, setStats] = useState({ totalMeals: 0, daysEaten: 0, avgPerDay: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    if (studentId) fetchHistory();
  }, [studentId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/attendance/student/${studentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      const data = await res.json();
      if (res.ok) {
        setHistory(data);
        processData(data);
      } else setError(data.error || "Failed to fetch history.");
    } catch {
      setError("Failed to fetch attendance history.");
    }
    setLoading(false);
  };

  const processData = (records) => {
    const map = {};
    let total = records.length;
    records.forEach((record) => {
      const dateStr = new Date(record.date).toISOString().split("T")[0];
      map[dateStr] = (map[dateStr] || 0) + 1;
    });
    const days = Object.keys(map).length;
    setHeatmapData(map);
    setStats({
      totalMeals: total,
      daysEaten: days,
      avgPerDay: days ? (total / days).toFixed(1) : 0,
    });
  };

  const generateGrid = () => {
    const days = [];
    const today = new Date();
    // Generate exactly 12 weeks (84 days) to keep the grid perfectly rectangular
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ date: dateStr, count: heatmapData[dateStr] || 0 });
    }
    return days;
  };

  const getColorClass = (count) => {
    if (count === 0) return "bg-base-200 border border-base-300";
    if (count === 1) return "bg-success/40";
    if (count === 2) return "bg-success/70";
    return "bg-success shadow-sm";
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.toLocaleDateString()} • ${d.toLocaleTimeString()}`;
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl bg-base-100 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-primary">Attendance History</h2>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="stat bg-base-200/50 rounded-xl border border-base-300">
                <div className="stat-title font-bold">Total Meals</div>
                <div className="stat-value text-primary">{stats.totalMeals}</div>
              </div>
              <div className="stat bg-base-200/50 rounded-xl border border-base-300">
                <div className="stat-title font-bold">Active Days</div>
                <div className="stat-value text-secondary">{stats.daysEaten}</div>
              </div>
              <div className="stat bg-base-200/50 rounded-xl border border-base-300">
                <div className="stat-title font-bold">Avg Meals / Day</div>
                <div className="stat-value">{stats.avgPerDay}</div>
              </div>
            </div>

            <div className="mb-8 p-4 bg-base-100 border border-base-300 rounded-xl shadow-sm">
              <h3 className="font-bold text-sm uppercase opacity-50 mb-4 tracking-wider">Activity (Last 12 Weeks)</h3>

              <div className="overflow-x-auto pb-2">
                {/* Clean GitHub-style Grid */}
                <div className="grid grid-rows-7 grid-flow-col gap-1.5 w-max">
                  {generateGrid().map((day, idx) => (
                    <div key={idx} className={`w-4 h-4 rounded-sm tooltip tooltip-top transition-all hover:scale-125 ${getColorClass(day.count)}`} data-tip={`${day.date}: ${day.count} meals`}></div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end items-center gap-2 mt-4 text-xs font-medium opacity-60">
                <span>Less</span>
                <div className="w-3 h-3 bg-base-200 border border-base-300 rounded-sm"></div>
                <div className="w-3 h-3 bg-success/40 rounded-sm"></div>
                <div className="w-3 h-3 bg-success/70 rounded-sm"></div>
                <div className="w-3 h-3 bg-success rounded-sm shadow-sm"></div>
                <span>More</span>
              </div>
            </div>

            <div className="overflow-y-auto max-h-64 border border-base-300 rounded-xl">
              <table className="table table-sm table-zebra w-full">
                <thead className="bg-base-200 sticky top-0">
                  <tr>
                    <th>Date & Time</th>
                    <th>Meal</th>
                    <th>Scanned By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record._id}>
                      <td className="font-mono text-xs">{formatDate(record.date)}</td>
                      <td>
                        <span className="badge badge-primary badge-sm badge-outline capitalize">{record.mealType}</span>
                      </td>
                      <td className="opacity-70">{record.scannedBy ? `${record.scannedBy.firstName} ${record.scannedBy.lastName}` : "System"}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center py-6 opacity-50">
                        No attendance records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </div>
  );
}
