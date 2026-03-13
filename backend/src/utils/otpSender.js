// utils/otpSender.js
export async function sendTelegramOTP(phone, code) {
  // Replace this URL and payload structure with your specific third-party provider's API documentation
  const API_KEY = process.env.OTP_GATEWAY_API_KEY;
  const ENDPOINT = "https://api.your-gateway-provider.com/v1/messages";

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        to: phone,
        channel: "telegram", // Provider-specific routing field
        message: `Your Bono Meal verification code is: ${code}`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to send OTP via Gateway");
    }

    return await response.json();
  } catch (error) {
    console.error("OTP Gateway Error:", error.message);
    throw error;
  }
}
