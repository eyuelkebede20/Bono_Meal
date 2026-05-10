import axios from "axios";
import { decodeDenseQR } from "dense-qr-decoder";

export const decodeBrowserFaydaQr = (rawQrText) => {
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

export const handleQrUpload = async ({ e, setIsDecoding, setError, setMessage, setScannedIdentity, setQrFile, setFormData }) => {
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

    const qrData = decodeBrowserFaydaQr(rawQrText);

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

export const startCamera = async ({ setIsCameraOpen, setError, setMessage, streamRef, videoRef, scanVideoFrame }) => {
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

export const stopCamera = ({ streamRef, scanLoopRef, setIsCameraOpen }) => {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop());
  }

  if (scanLoopRef.current) {
    cancelAnimationFrame(scanLoopRef.current);
  }

  setIsCameraOpen(false);
};

export const scanVideoFrame = async ({ videoRef, scanLoopRef, stopCamera, setScannedIdentity, setQrFile, setFormData, setMessage }) => {
  if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
    scanLoopRef.current = requestAnimationFrame(() =>
      scanVideoFrame({
        videoRef,
        scanLoopRef,
        stopCamera,
        setScannedIdentity,
        setQrFile,
        setFormData,
        setMessage,
      }),
    );

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
      const qrData = decodeBrowserFaydaQr(rawQrText);

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

  scanLoopRef.current = requestAnimationFrame(() =>
    scanVideoFrame({
      videoRef,
      scanLoopRef,
      stopCamera,
      setScannedIdentity,
      setQrFile,
      setFormData,
      setMessage,
    }),
  );
};
