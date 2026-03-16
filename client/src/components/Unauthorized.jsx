import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  const handleReturn = () => {
    // Clear local storage
    localStorage.clear();

    // Clear session storage
    sessionStorage.clear();

    // Clear cookies
    document.cookie.split(";").forEach((cookie) => {
      document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
    });

    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
        <div className="card-body items-center text-center">
          <div className="text-6xl font-bold text-error">403</div>

          <h2 className="card-title text-2xl">Unauthorized Access</h2>

          <p className="text-base-content/70">You do not have permission to view this page.</p>

          <div className="divider"></div>

          <button onClick={handleReturn} className="btn btn-primary w-full">
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
