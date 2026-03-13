import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function TestScanner() {
  const [result, setResult] = useState("No Scan Yet");
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = {
      fps: 10,
      videoConstraints: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          setResult(decodedText);
        },
        (errorMessage) => {
          /* Scanning... */
        },
      )
      .then(() => setIsScanning(true))
      .catch((err) => console.error("Start failed:", err));

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current.clear())
          .catch((err) => console.error("Cleanup failed:", err));
      }
    };
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>High-Res Scanner</h2>
      <div id="reader" style={{ width: "100%", maxWidth: "500px", margin: "0 auto", border: "1px solid #ccc" }}></div>
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          background: result === "No Scan Yet" ? "#eee" : "#e6ffe6",
          wordBreak: "break-all",
        }}
      >
        <strong>Result:</strong> {result}
      </div>
    </div>
  );
}
