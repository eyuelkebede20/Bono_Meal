import { useState, useEffect } from "react";
import LogoutButton from "./LogoutButton";

export default function FinanceDashboard() {
  const [scanResult, setScanResult] = useState(null);
  const [topUpData, setTopUpData] = useState({ cardNumber: "", amount: "" });
  const [cardManageData, setCardManageData] = useState({ cardNumber: "", statusMessage: "", isError: false });

  // Handle Top-Up
  const handleTopUp = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:3000/api/transactions/topup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(topUpData),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Successfully loaded ${topUpData.amount} ETB to card ${topUpData.cardNumber}`);
        setTopUpData({ cardNumber: "", amount: "" }); // Clear form
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("System error processing top-up");
    }
  };

  // Handle Card Suspension/Activation
  const handleCardToggle = async (action) => {
    const token = localStorage.getItem("token");
    setCardManageData({ ...cardManageData, statusMessage: "", isError: false });

    if (!cardManageData.cardNumber) {
      setCardManageData({ ...cardManageData, statusMessage: "Please enter a card number", isError: true });
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/transactions/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cardNumber: cardManageData.cardNumber }),
      });

      const data = await res.json();

      if (res.ok) {
        setCardManageData({
          cardNumber: "",
          statusMessage: data.message,
          isError: false,
        });
      } else {
        setCardManageData({
          ...cardManageData,
          statusMessage: data.error,
          isError: true,
        });
      }
    } catch (error) {
      setCardManageData({
        ...cardManageData,
        statusMessage: "Network error connecting to server.",
        isError: true,
      });
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Finance Dashboard</h1>
        <LogoutButton />
      </div>

      {/* Top-Up Section */}
      <div style={{ border: "1px solid #4CAF50", padding: "20px", marginBottom: "20px", borderRadius: "8px", backgroundColor: "#f9fff9" }}>
        <h3 style={{ color: "#4CAF50", marginTop: 0 }}>Manual Top-Up</h3>
        <form onSubmit={handleTopUp} style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Scan or Enter Card Number"
            value={topUpData.cardNumber}
            onChange={(e) => setTopUpData({ ...topUpData, cardNumber: e.target.value })}
            required
            style={{ flex: 2, padding: "10px" }}
          />
          <input
            type="number"
            placeholder="Amount (ETB)"
            value={topUpData.amount}
            onChange={(e) => setTopUpData({ ...topUpData, amount: e.target.value })}
            required
            min="1"
            style={{ flex: 1, padding: "10px" }}
          />
          <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#4CAF50", color: "white", border: "none", cursor: "pointer", borderRadius: "4px" }}>
            Process Top-Up
          </button>
        </form>
      </div>

      {/* Card Management Section (Suspend/Activate) */}
      <div style={{ border: "1px solid #f0ad4e", padding: "20px", marginBottom: "20px", borderRadius: "8px", backgroundColor: "#fffcf5" }}>
        <h3 style={{ color: "#f0ad4e", marginTop: 0 }}>Card Management (Suspend / Activate)</h3>

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Enter Card Number to Manage"
            value={cardManageData.cardNumber}
            onChange={(e) => setCardManageData({ ...cardManageData, cardNumber: e.target.value })}
            style={{ flex: 1, padding: "10px" }}
          />
          <button onClick={() => handleCardToggle("suspend")} style={{ padding: "10px 20px", backgroundColor: "#d9534f", color: "white", border: "none", cursor: "pointer", borderRadius: "4px" }}>
            Suspend Card
          </button>
          <button onClick={() => handleCardToggle("activate")} style={{ padding: "10px 20px", backgroundColor: "#5cb85c", color: "white", border: "none", cursor: "pointer", borderRadius: "4px" }}>
            Activate Card
          </button>
        </div>

        {cardManageData.statusMessage && (
          <div
            style={{
              padding: "10px",
              marginTop: "10px",
              borderRadius: "4px",
              backgroundColor: cardManageData.isError ? "#f8d7da" : "#d4edda",
              color: cardManageData.isError ? "#721c24" : "#155724",
            }}
          >
            {cardManageData.statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}
