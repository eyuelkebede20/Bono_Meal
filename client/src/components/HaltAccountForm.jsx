import { useState } from "react";

export default function HaltAccountForm() {
  const [reason, setReason] = useState("");
  const [image, setImage] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const handleImage = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result); // Convert to Base64
    if (file) reader.readAsDataURL(file);
  };

  const submitHaltRequest = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${BACKEND_URL}/api/halt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, imageUrl: image }),
      });

      if (res.ok) {
        setStatusMsg("Halt request submitted to Super Admin.");
        setReason("");
        setImage("");
      } else {
        setStatusMsg("Failed to submit request.");
      }
    } catch (error) {
      setStatusMsg("Server error.");
    }
  };

  return (
    <div className="p-6 bg-base-100 shadow rounded-box mt-6 max-w-md">
      <h2 className="font-bold mb-4 text-error">Request Account Halt</h2>
      <form onSubmit={submitHaltRequest} className="flex flex-col gap-4">
        <textarea placeholder="Reason for halting..." value={reason} onChange={(e) => setReason(e.target.value)} className="textarea textarea-bordered w-full" required />
        <input type="file" accept="image/*" onChange={handleImage} className="file-input file-input-bordered w-full" required />
        <button type="submit" className="btn btn-error w-full">
          Submit Request
        </button>
      </form>
      {statusMsg && <p className="mt-2 text-sm text-info">{statusMsg}</p>}
    </div>
  );
}
