import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { decodeDenseQR } from "dense-qr-decoder";

export default function Signup() {
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    role: "student",
    studentId: "",
    firstName: "",
    lastName: "",
    faydaId: "",
  });

  const [scannedIdentity, setScannedIdentity] = useState(null);
  const [qrFile, setQrFile] = useState(null);

  const [isScanning, setIsScanning] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [telegramLink, setTelegramLink] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const pollIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (isLinking && formData.phone) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const cleanPhone = formData.phone.replace(/\D/g, "");

          const res = await axios.get(`${BACKEND_URL}/api/auth/check-status/${cleanPhone}`);

          if (res.data.linked) {
            clearInterval(pollIntervalRef.current);

            setMessage("✅ Account linked! Redirecting to login...");

            setTimeout(() => navigate("/login"), 2000);
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isLinking, formData.phone, navigate, BACKEND_URL]);

  const decodeBrowserFaydaQR = (rawQrText) => {
    const parts = rawQrText.split(":");

    try {
      const idIndex = parts.indexOf("A") + 1;
      const faydaIdNumber = idIndex > 0 ? parts[idIndex] : "";

      const fullName = parts[2];

      if (!fullName && !faydaIdNumber) {
        throw new Error("Could not find name or ID in the expected positions.");
      }

      return {
        fullName,
        faydaId: faydaIdNumber,
      };
    } catch (err) {
      throw new Error("Failed to parse demographic data from the QR payload.");
    }
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setIsDecoding(true);
    setError("");
    setMessage("");

    try {
      const imageUrl = URL.createObjectURL(file);

      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load image file."));
        img.src = imageUrl;
      });

      const canvas = document.createElement("canvas");

      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(imageUrl);

      const rawQrText = await decodeDenseQR(imageData);

      if (!rawQrText) {
        throw new Error("No QR code detected in the image.");
      }

      const qrData = decodeBrowserFaydaQR(rawQrText);

      setScannedIdentity(qrData);
      setQrFile(file);

      setFormData((prev) => ({
        ...prev,
        firstName: qrData.fullName ? qrData.fullName.split(" ")[0] : prev.firstName,

        lastName: qrData.fullName ? qrData.fullName.split(" ").slice(1).join(" ") : prev.lastName,

        faydaId: qrData.faydaId || prev.faydaId,
      }));

      setMessage("✅ Fayda ID scanned successfully!");
    } catch (err) {
      console.error("QR Parse Error:", err);

      setError(err.message || "Invalid QR Code format. Please upload a valid Fayda ID.");
    } finally {
      setIsDecoding(false);
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    setError("");
    setMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", true);

        await videoRef.current.play();

        requestAnimationFrame(scanVideoFrame);
      }
    } catch (err) {
      setError("Camera access denied or unavailable.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
    }

    setIsCameraOpen(false);
  };

  const scanVideoFrame = async () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      scanLoopRef.current = requestAnimationFrame(scanVideoFrame);

      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(videoRef.current, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
      const rawQrText = await decodeDenseQR(imageData);

      if (rawQrText) {
        const qrData = decodeBrowserFaydaQR(rawQrText);

        setScannedIdentity(qrData);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera-fayda-scan.jpg", {
              type: "image/jpeg",
            });

            setQrFile(file);
          }
        }, "image/jpeg");

        setFormData((prev) => ({
          ...prev,
          firstName: qrData.fullName ? qrData.fullName.split(" ")[0] : prev.firstName,

          lastName: qrData.fullName ? qrData.fullName.split(" ").slice(1).join(" ") : prev.lastName,

          faydaId: qrData.faydaId || prev.faydaId,
        }));

        setMessage("✅ Fayda ID scanned successfully!");

        stopCamera();

        return;
      }
    } catch (err) {}

    scanLoopRef.current = requestAnimationFrame(scanVideoFrame);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!scannedIdentity) {
      setError("You must scan a Fayda ID to register.");
      return;
    }

    const nameParts = scannedIdentity.fullName.split(" ");

    // Use a standard JavaScript object, NOT FormData
    const submitData = {
      phone: formData.phone,
      password: formData.password,
      role: formData.role,
      studentId: formData.studentId,
      faydaId: scannedIdentity.faydaId,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
    };

    try {
      // Axios automatically sends this as application/json
      const response = await axios.post(`${BACKEND_URL}/api/auth/signup`, submitData);

      if (response.data.telegramLink) {
        setTelegramLink(response.data.telegramLink);
        setMessage(response.data.message);
        setIsLinking(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border-t-4 border-primary">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-primary mb-2">Create Account</h2>

          {message && <div className="alert alert-success shadow text-white font-bold">{message}</div>}

          {error && <div className="alert alert-error shadow text-white font-bold">{error}</div>}

          {!telegramLink ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="p-4 border-2 border-dashed border-base-300 rounded-lg text-center bg-base-200">
                {!scannedIdentity ? (
                  <>
                    <p className="mb-2 text-sm font-bold">Step 1: Scan Fayda ID</p>

                    <div className="form-control w-full mb-4">
                      <label className="label">
                        <span className="label-text font-bold text-primary">Scan or Upload Fayda ID</span>
                      </label>

                      <div className="flex gap-2">
                        <input type="file" accept="image/*" onChange={handleQRUpload} className="file-input file-input-bordered file-input-primary w-full" disabled={isDecoding || isCameraOpen} />

                        <button type="button" onClick={isCameraOpen ? stopCamera : startCamera} className={`btn ${isCameraOpen ? "btn-error" : "btn-secondary"}`} disabled={isDecoding}>
                          {isCameraOpen ? "Stop" : "Camera"}
                        </button>
                      </div>

                      {isCameraOpen && (
                        <div className="mt-4 relative rounded overflow-hidden bg-black flex justify-center items-center h-64 border-2 border-primary">
                          <video ref={videoRef} className="h-full w-full object-cover" muted></video>

                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-48 h-48 border-4 border-green-500 opacity-50 rounded-lg"></div>
                          </div>

                          <p className="absolute bottom-2 text-white text-xs bg-black bg-opacity-70 px-2 py-1 rounded">Position QR code inside the box</p>
                        </div>
                      )}

                      {isDecoding && <span className="text-sm text-info mt-2">Processing image...</span>}
                    </div>

                    {isScanning && <span className="loading loading-spinner text-primary mt-2 block mx-auto"></span>}
                  </>
                ) : (
                  <div className="text-left">
                    <p className="text-success font-bold mb-1">✅ Identity Verified</p>

                    <p className="text-sm">
                      <strong>Name:</strong> {scannedIdentity.fullName}
                    </p>

                    <p className="text-sm">
                      <strong>Fayda ID:</strong> {scannedIdentity.faydaId}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setScannedIdentity(null);
                        setQrFile(null);
                      }}
                      className="btn btn-xs btn-error mt-2"
                    >
                      Rescan ID
                    </button>
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder="Phone Number"
                required
                className="input input-bordered w-full"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: e.target.value,
                  })
                }
              />

              <input
                type="password"
                placeholder="PIN"
                required
                maxLength={6}
                className="input input-bordered w-full"
                value={formData.password}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    password: e.target.value,
                  })
                }
              />

              <select
                className="select select-bordered w-full"
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value,
                  })
                }
              >
                <option value="student">Regular Student</option>

                <option value="military_student">Military Student</option>
              </select>

              <input
                type="text"
                placeholder="Student ID"
                required
                className="input input-bordered w-full"
                value={formData.studentId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    studentId: e.target.value,
                  })
                }
              />

              <button type="submit" disabled={!scannedIdentity || isScanning} className="btn btn-primary w-full mt-2">
                Sign Up
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center mt-4 p-4 bg-base-200 rounded-xl">
              <span className="loading loading-spinner text-primary loading-lg mb-4"></span>

              <p className="text-center font-bold text-lg mb-4">Waiting for Telegram Link...</p>

              <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="btn btn-info w-full text-white font-bold">
                🔗 Click here to link Telegram
              </a>

              <p className="text-sm opacity-60 text-center mt-4">Do not close this page. You will be redirected automatically once the bot confirms your account.</p>
            </div>
          )}

          {!telegramLink && (
            <div className="text-center mt-4">
              <button onClick={() => navigate("/login")} className="link link-hover text-sm opacity-70">
                Already have an account? Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
