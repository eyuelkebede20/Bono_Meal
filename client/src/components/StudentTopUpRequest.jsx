import { useState } from "react";

export default function StudentTopUpRequest({ onUploadSuccess }) {
  const [transactionNumber, setTransactionNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/topups/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ transactionNumber, amount: Number(amount) }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Top-up request submitted successfully. Waiting for finance approval.");
        setTransactionNumber("");
        setAmount("");
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    }
  };

  return (
    <div className="card w-full bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-primary">Submit Bank Transfer</h2>
        <p className="text-sm text-gray-500">Enter your bank transfer details below for finance to verify.</p>

        {message && <div className="alert alert-success mt-2">{message}</div>}
        {error && <div className="alert alert-error mt-2">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <input
            type="text"
            placeholder="Transaction Number (e.g., FT23...)"
            value={transactionNumber}
            onChange={(e) => setTransactionNumber(e.target.value)}
            required
            className="input input-bordered input-primary w-full"
          />
          <input type="number" min="1" placeholder="Amount Transferred" value={amount} onChange={(e) => setAmount(e.target.value)} required className="input input-bordered input-primary w-full" />
          <button type="submit" className="btn btn-primary">
            Submit Request
          </button>
        </form>
      </div>
    </div>
  );
}
