import { useState } from "react";

export default function CanteenScanner() {
  const [cardNumber, setCardNumber] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const BACKEND_URL = import.meta.VITE_BACKEND_URL;
  const handleScan = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${BACKEND_URL}/api/canteen/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cardNumber }),
      });

      const data = await res.json();
      setScanResult(data);
      setCardNumber(""); // Clear input for next scan
    } catch (error) {
      setScanResult({ valid: false, message: "System error during scan" });
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
      <h2>Canteen Scanner</h2>

      <form onSubmit={handleScan} style={{ marginBottom: "20px" }}>
        <input
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder="Scan or Enter Card Number"
          required
          autoFocus
          style={{ width: "100%", padding: "10px", fontSize: "18px" }}
        />
        <button type="submit" style={{ width: "100%", padding: "10px", marginTop: "10px", fontSize: "18px" }}>
          Process Scan
        </button>
      </form>

      {scanResult && (
        <div
          style={{
            padding: "20px",
            border: "2px solid",
            borderColor: scanResult.valid ? "green" : "red",
            backgroundColor: scanResult.valid ? "#e6ffe6" : "#ffe6e6",
            textAlign: "center",
          }}
        >
          <h3 style={{ color: scanResult.valid ? "green" : "red", margin: "0 0 10px 0" }}>{scanResult.valid ? "APPROVED" : "DENIED"}</h3>
          <p style={{ margin: "0 0 10px 0", fontSize: "18px" }}>{scanResult.message}</p>

          {scanResult.valid && scanResult.student && (
            <div>
              <p style={{ margin: "5px 0" }}>
                <strong>Student:</strong> {scanResult.student.firstName} {scanResult.student.lastName}
              </p>
              <p style={{ margin: "5px 0" }}>
                <strong>ID:</strong> {scanResult.student.studentId}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
