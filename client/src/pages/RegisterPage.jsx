import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { getPortalRouteByRoles } from "../utils/portalRouting";

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuthStore = useAuthStore((state) => state.setAuth);

  // Check if coming from OTP flow (has registerToken)
  const hasOtpToken = Boolean(location.state?.registerToken);

  // Form state
  const [role, setRole] = useState("CUSTOMER");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [salonName, setSalonName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP flow state (only used when coming from login)
  const [registerToken, setRegisterToken] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phoneEmail, setPhoneEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [showEmailOtp, setShowEmailOtp] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Role, 2: Details, 3: Password

  useEffect(() => {
    if (location.state?.registerToken) {
      setRegisterToken(location.state.registerToken);
      setIdentifier(location.state.identifier || "");
      // If coming from OTP flow, pre-fill email if identifier is email
      if (location.state.identifier?.includes("@")) {
        setEmail(location.state.identifier);
      }
    }
  }, [location]);

  // Direct registration (no OTP flow)
  const handleDirectRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password.length < 8) {
      setIsLoading(false);
      return setError("Password must be at least 8 characters");
    }
    if (password !== confirmPassword) {
      setIsLoading(false);
      return setError("Passwords do not match");
    }

    try {
      const res = await api.post("/auth/register-direct", {
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        role: role === "OWNER" ? "OWNER" : "CUSTOMER",
        firstName,
        lastName,
        salonName: role === "OWNER" ? salonName : undefined,
      });

      const { user, accessToken } = res.data.data;
      localStorage.setItem("salon_token", accessToken);
      setAuthStore(user, null);

      // If owner and setup not complete, redirect to setup wizard
      if (user.setupComplete === false) {
        navigate("/owner/setup");
      } else {
        navigate(getPortalRouteByRoles(user.userRoles?.map((ur) => ur.role) || []));
      }
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.error?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  // OTP-based registration (coming from login flow)
  const handleOtpRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const isEmailId = identifier.includes("@");

    try {
      if (!isEmailId && !showEmailOtp) {
        await api.post("/auth/request-email-otp", { email: phoneEmail });
        setShowEmailOtp(true);
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setIsLoading(false);
        return setError("Passwords do not match");
      }

      const res = await api.post("/auth/register", {
        registerToken,
        role: role === "OWNER" ? "OWNER" : "CUSTOMER",
        firstName,
        lastName,
        salonName: role === "OWNER" ? salonName : undefined,
        email: !isEmailId ? phoneEmail : undefined,
        emailOtp: !isEmailId ? emailOtp : undefined,
        password,
      });

      const { user, accessToken } = res.data.data;
      localStorage.setItem("salon_token", accessToken);
      setAuthStore(user, null);

      if (user.setupComplete === false) {
        navigate("/owner/setup");
      } else {
        navigate(getPortalRouteByRoles(user.userRoles?.map((ur) => ur.role) || []));
      }
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.error?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const roleDescriptions = {
    CUSTOMER: "Book services, manage appointments, earn loyalty points",
    OWNER: "Register your salon, manage staff, track revenue",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-4xl font-bold text-indigo-700 mb-2">SalonOS</h1>
        <h2 className="text-center text-2xl font-extrabold text-gray-900">
          Create your account
        </h2>
        {hasOtpToken && identifier && (
          <p className="mt-2 text-center text-sm text-gray-600">
            Verified as <span className="font-medium text-indigo-600">{identifier}</span>
          </p>
        )}

        {/* Step indicator */}
        <div className="flex items-center justify-center mt-4 gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s <= step ? "bg-indigo-600 w-8" : "bg-gray-300 w-4"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form
            className="space-y-6"
            onSubmit={hasOtpToken ? handleOtpRegister : handleDirectRegister}
          >
            {/* Step 1: Role */}
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    I want to:
                  </label>
                  <div className="space-y-3">
                    {[
                      { value: "CUSTOMER", label: "Book salon services", icon: "✨" },
                      { value: "OWNER", label: "Register my salon business", icon: "🏢" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRole(opt.value)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          role === opt.value
                            ? "border-indigo-600 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-lg mr-2">{opt.icon}</span>
                        <span className="font-medium text-gray-900">{opt.label}</span>
                        <p className="text-xs text-gray-500 mt-1 ml-7">
                          {roleDescriptions[opt.value]}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                >
                  Continue
                </button>
              </>
            )}

            {/* Step 2: Name + Business Name */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      id="register-firstname"
                      type="text"
                      required
                      autoFocus
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      id="register-lastname"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                    />
                  </div>
                </div>

                {role === "OWNER" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Salon Business Name
                    </label>
                    <input
                      id="register-salonname"
                      type="text"
                      required
                      value={salonName}
                      onChange={(e) => setSalonName(e.target.value)}
                      placeholder="e.g. Elegance Studio"
                      className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                    />
                  </div>
                )}

                {/* Email field for direct signup (not needed if OTP flow with email) */}
                {!hasOtpToken && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                      id="register-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                    />
                  </div>
                )}

                {/* Phone-based OTP flow: need email + OTP */}
                {hasOtpToken && !identifier.includes("@") && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email Address (Required)
                      </label>
                      <input
                        type="email"
                        required
                        disabled={showEmailOtp}
                        value={phoneEmail}
                        onChange={(e) => setPhoneEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 transition-all"
                      />
                    </div>
                    {showEmailOtp && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Email Verification Code
                        </label>
                        <input
                          type="text"
                          required
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="6-digit code"
                          maxLength={6}
                          className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-center text-lg tracking-widest transition-all"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!firstName || !lastName) return setError("Name is required");
                      if (role === "OWNER" && !salonName) return setError("Salon name is required");
                      if (!hasOtpToken && !email) return setError("Email is required");
                      setError("");
                      setStep(3);
                    }}
                    className="flex-1 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Password */}
            {step === 3 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Create Password</label>
                  <input
                    id="register-password"
                    type="password"
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <input
                    id="register-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  />
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-gray-700">Registration Summary</p>
                  <p className="text-gray-500 mt-1">
                    {role === "OWNER" ? "🏢 " : "✨ "}
                    {firstName} {lastName}
                    {role === "OWNER" && salonName ? ` — ${salonName}` : ""}
                    {" as "}
                    <span className="font-medium">{role === "OWNER" ? "Salon Owner" : "Customer"}</span>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    id="register-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : "Create Account"}
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
