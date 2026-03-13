import { useState } from "react";
import LogoutButton from "./LogoutButton";

export default function FinanceDashboard() {
  const [scanResult, setScanResult] = useState(null);
  const [topUpData, setTopUpData] = useState({ cardNumber: "", amount: "" });

  const [cardManageData, setCardManageData] = useState({
    cardNumber: "",
    statusMessage: "",
    isError: false,
  });

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
        setTopUpData({ cardNumber: "", amount: "" });
      } else {
        alert(data.error);
      }
    } catch {
      alert("System error processing top-up");
    }
  };

  const handleCardToggle = async (action) => {
    const token = localStorage.getItem("token");

    setCardManageData({
      ...cardManageData,
      statusMessage: "",
      isError: false,
    });

    if (!cardManageData.cardNumber) {
      setCardManageData({
        ...cardManageData,
        statusMessage: "Please enter a card number",
        isError: true,
      });
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/transactions/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cardNumber: cardManageData.cardNumber,
        }),
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
    } catch {
      setCardManageData({
        ...cardManageData,
        statusMessage: "Network error connecting to server.",
        isError: true,
      });
    }
  };

  return (
    <div className="min-h-screen bg-base-300 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Finance Dashboard</h1>
        <LogoutButton />
      </div>

      {/* Top Up Section */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title text-success">Manual Top-Up</h2>

          <form onSubmit={handleTopUp} className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Scan or Enter Card Number"
              value={topUpData.cardNumber}
              onChange={(e) =>
                setTopUpData({
                  ...topUpData,
                  cardNumber: e.target.value,
                })
              }
              required
              className="input input-bordered flex-1"
            />

            <input
              type="number"
              placeholder="Amount (ETB)"
              value={topUpData.amount}
              onChange={(e) =>
                setTopUpData({
                  ...topUpData,
                  amount: e.target.value,
                })
              }
              required
              min="1"
              className="input input-bordered w-40"
            />

            <button className="btn btn-success">Process Top-Up</button>
          </form>
        </div>
      </div>

      {/* Card Management */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-warning">Card Management</h2>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Enter Card Number"
              value={cardManageData.cardNumber}
              onChange={(e) =>
                setCardManageData({
                  ...cardManageData,
                  cardNumber: e.target.value,
                })
              }
              className="input input-bordered flex-1"
            />

            <button onClick={() => handleCardToggle("suspend")} className="btn btn-error">
              Suspend Card
            </button>

            <button onClick={() => handleCardToggle("activate")} className="btn btn-success">
              Activate Card
            </button>
          </div>

          {cardManageData.statusMessage && <div className={`alert mt-4 ${cardManageData.isError ? "alert-error" : "alert-success"}`}>{cardManageData.statusMessage}</div>}
        </div>
      </div>
    </div>
  );
}
