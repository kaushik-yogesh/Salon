import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { getPortalRouteByRoles } from "../utils/portalRouting";

const LoginPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState(1); // 1: Identifier, 2: OTP, 3: Password
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  const navigate = useNavigate();
  const setAuthStore = useAuthStore((state) => state.setAuth);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const token = localStorage.getItem("salon_token");
    if (!token) {
      setIsSessionChecking(false);
      return;
    }

    if (user) {
      navigate(getPortalRouteByRoles(user.userRoles?.map((ur) => ur.role) || []), { replace: true });
      return;
    }

    const restoreSession = async () => {
      try {
        const res = await api.get("/auth/me");
        const currentUser = res.data?.data?.user;
        if (currentUser) {
          setAuthStore(currentUser, null);
          navigate(getPortalRouteByRoles(currentUser.userRoles?.map((ur) => ur.role) || []), { replace: true });
        }
      } catch {
        localStorage.removeItem("salon_token");
      } finally {
        setIsSessionChecking(false);
      }
    };

    restoreSession();
  }, [navigate, setAuthStore, user]);

  const handleCheckIdentifier = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return setError("Email or Phone is required");

    setIsLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/check", { identifier: identifier.trim() });
      if (res.data.data.exists && res.data.data.hasPassword) {
        setStep(3); // Go to password
      } else if (res.data.data.exists) {
        // User exists but no password — send OTP
        await api.post("/auth/request-otp", { identifier: identifier.trim() });
        setStep(2);
      } else {
        // User doesn't exist — redirect to register
        setError("No account found. Please register first.");
      }
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.error?.message || "Failed to check account");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!password) return setError("Password is required");

    setIsLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { identifier: identifier.trim(), password });
      const { user, accessToken } = res.data.data;
      localStorage.setItem("salon_token", accessToken);
      setAuthStore(user, null);
      navigate(getPortalRouteByRoles(user.userRoles?.map((ur) => ur.role) || []));
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.error?.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return setError("Please enter a valid 6-digit OTP");

    setIsLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/verify-otp", { identifier: identifier.trim(), otp });

      if (res.data.data.isRegistered === false) {
        navigate("/register", {
          state: { registerToken: res.data.data.registerToken, identifier },
        });
      } else {
        const { user, accessToken } = res.data.data;
        localStorage.setItem("salon_token", accessToken);
        setAuthStore(user, null);
        navigate(getPortalRouteByRoles(user.userRoles?.map((ur) => ur.role) || []));
      }
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.error?.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSessionChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="rounded-lg bg-white px-6 py-8 shadow-sm text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-800">Restoring your session...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-4xl font-bold text-indigo-700 mb-2">SalonOS</h1>
        <h2 className="text-center text-2xl font-extrabold text-gray-900">
          {step === 1 && "Sign in to your account"}
          {step === 2 && "Enter Verification Code"}
          {step === 3 && "Enter your Password"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 1 && "Enter your email or mobile number to continue."}
          {step === 2 && (
            <>Verification code sent to <span className="font-medium text-indigo-600">{identifier}</span></>
          )}
          {step === 3 && (
            <>Logging in as <span className="font-medium text-indigo-600">{identifier}</span></>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Identifier */}
          {step === 1 && (
            <>
              <form className="space-y-6" onSubmit={handleCheckIdentifier}>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email or Mobile Number
                  </label>
                  <div className="mt-1">
                    <input
                      id="login-identifier"
                      type="text"
                      required
                      autoFocus
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. you@example.com or +1234567890"
                      className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                    />
                  </div>
                </div>

                <button
                  id="login-continue-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Checking...
                    </>
                  ) : "Continue"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                    Register here
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* Step 3: Password */}
          {step === 3 && (
            <form className="space-y-6" onSubmit={handlePasswordLogin}>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  />
                </div>
                <div className="mt-2 flex justify-between">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setPassword(""); setError(""); }}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(2);
                      api.post("/auth/request-otp", { identifier: identifier.trim() }).catch(() => {});
                    }}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Login with OTP instead
                  </button>
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Logging in...
                  </>
                ) : "Login"}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  6-Digit Verification Code
                </label>
                <div className="mt-1">
                  <input
                    id="login-otp"
                    type="text"
                    required
                    autoFocus
                    maxLength="6"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-center tracking-[0.5em] font-mono text-xl transition-all"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Sent to {identifier}.{" "}
                  <button
                    type="button"
                    onClick={() => { setStep(1); setOtp(""); setError(""); }}
                    className="text-indigo-600 hover:underline"
                  >
                    Change
                  </button>
                </p>
                {process.env.NODE_ENV !== 'production' && (
                  <p className="mt-1 text-xs text-amber-600 text-center bg-amber-50 p-2 rounded">
                    💡 Dev mode: Use OTP <span className="font-mono font-bold">123456</span>
                  </p>
                )}
              </div>

              <button
                id="login-verify-btn"
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </>
                ) : "Verify & Login"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
