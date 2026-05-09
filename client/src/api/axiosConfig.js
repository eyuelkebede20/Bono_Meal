import axios from "axios";
export const submitQrScan = async (file) => {
  const formData = new FormData();
  formData.append("qrImage", file);

  try {
    // Make sure this route matches exactly where your scan-qr endpoint is mounted
    const response = await axiosInstance.post("/api/scan-qr", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    // Pass the error message back to the Scanner component
    throw error.response?.data || { message: "Network error occurred" };
  }
};
// Base instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
});

// 1. Request Interceptor: Attach the short-lived access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Response Interceptor: Catch 401s and silently refresh
api.interceptors.response.use(
  (response) => response, // If request succeeds, pass it through
  async (error) => {
    const originalRequest = error.config;

    // If it's a 401 (Unauthorized) and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token available");

        // Ask backend for a new access token
        const refreshResponse = await axios.post(`${api.defaults.baseURL}/auth/refresh-token`, { refreshToken });

        // Save the new tokens
        localStorage.setItem("accessToken", refreshResponse.data.accessToken);
        localStorage.setItem("refreshToken", refreshResponse.data.refreshToken);

        // Update the header on the failed request and try it again!
        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If the refresh token is dead/invalid, force a hard logout
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
