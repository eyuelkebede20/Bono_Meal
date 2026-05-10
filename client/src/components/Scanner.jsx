import React, { useState } from "react";
import { submitQrScan } from "../api/axiosConfig"; // Adjust path to where you saved the API call
import {}
const Scanner = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImageCapture = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Call the API function we built earlier
      const data = await submitQrScan(file);
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to scan. Please try again.");
    } finally {
      setLoading(false);
      // Reset the input so they can scan another card immediately
      event.target.value = null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold">Meal Card Scanner</h2>

      {/* This is the magic line. 
        'accept="image/*"' restricts it to pictures.
        'capture="environment"' tells mobile devices to open the rear camera! 
      */}
      <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full cursor-pointer shadow-lg transition-transform active:scale-95">
        {loading ? "Scanning..." : "📸 Tap to Scan"}
        <input type="file" accept="image/*" capture="environment" onChange={handleImageCapture} className="hidden" disabled={loading} />
      </label>

      {/* Result UI */}
      <div className="w-full">
        {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg border border-red-300 text-center font-semibold">❌ {error}</div>}

        {result && (
          <div className={`p-6 rounded-lg text-center shadow-md ${result.valid ? "bg-green-100 border-green-400" : "bg-red-100 border-red-400"} border`}>
            {result.valid ? (
              <>
                <h3 className="text-xl font-extrabold text-green-800 mb-2">✅ MEAL APPROVED</h3>
                <p className="text-lg font-medium text-green-900">
                  {result.student.firstName} {result.student.lastName}
                </p>
                <p className="text-sm text-green-700">{result.student.studentId}</p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-extrabold text-red-800 mb-2">❌ DECLINED</h3>
                <p className="text-md text-red-700">{result.message}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;
