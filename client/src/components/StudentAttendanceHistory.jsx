import { useState, useEffect } from "react";

export default function StudentAttendanceHistory({ studentId, onClose }) {
  const [history, setHistory] = useState([]);
  const [heatmapData, setHeatmapData] = useState({});
  const [stats, setStats] = useState({
    totalMeals: 0,
    daysEaten: 0,
    avgPerDay: 0,
  });
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
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setHistory(data);
        processData(data);
      } else {
        setError(data.error || "Failed to fetch history.");
      }
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

    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const dateStr = d.toISOString().split("T")[0];
      const count = heatmapData[dateStr] || 0;

      days.push({ date: dateStr, count });
    }

    return days;
  };

  const getColorClass = (count) => {
    if (count === 0) return "bg-base-200";
    if (count === 1) return "bg-success/40";
    if (count === 2) return "bg-success/70";
    return "bg-success";
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.toLocaleDateString()} • ${d.toLocaleTimeString()}`;
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-5xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-primary">Attendance History & Stats</h2>

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
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Total Meals</div>
                <div className="stat-value text-primary">{stats.totalMeals}</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Active Days</div>
                <div className="stat-value text-secondary">{stats.daysEaten}</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Avg Meals / Day</div>
                <div className="stat-value">{stats.avgPerDay}</div>
              </div>
            </div>

            {/* Heatmap */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Last 90 Days Activity</h3>

              <div className="grid grid-cols-7 gap-2 max-w-xs">
                {generateGrid().map((day, idx) => (
                  <div key={idx} className={`w-5 h-5 rounded-md tooltip ${getColorClass(day.count)}`} data-tip={`${day.date} : ${day.count} meals`}></div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-3 text-xs opacity-70">
                <span>Less</span>
                <div className="w-4 h-4 bg-base-200 rounded-md"></div>
                <div className="w-4 h-4 bg-success/40 rounded-md"></div>
                <div className="w-4 h-4 bg-success/70 rounded-md"></div>
                <div className="w-4 h-4 bg-success rounded-md"></div>
                <span>More</span>
              </div>
            </div>

            {/* History Table */}
            <div className="overflow-y-auto max-h-72 border rounded-lg">
              <table className="table table-zebra table-sm w-full">
                <thead className="sticky top-0 bg-base-200">
                  <tr>
                    <th>Date & Time</th>
                    <th>Meal</th>
                    <th>Scanned By</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((record) => (
                    <tr key={record._id}>
                      <td>{formatDate(record.date)}</td>

                      <td>
                        <span className="badge badge-outline badge-sm capitalize">{record.mealType}</span>
                      </td>

                      <td>{record.scannedBy ? `${record.scannedBy.firstName} ${record.scannedBy.lastName}` : "System"}</td>
                    </tr>
                  ))}

                  {history.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center py-4 opacity-60">
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
    </div>
  );
}
