import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";

const STEPS = [
  { id: 1, title: "Salon Details", icon: "🏢" },
  { id: 2, title: "Business Hours", icon: "🕐" },
  { id: 3, title: "Branch", icon: "📍" },
  { id: 4, title: "Categories", icon: "📂" },
  { id: 5, title: "Services", icon: "✂️" },
  { id: 6, title: "Workers", icon: "👥" },
  { id: 7, title: "Finish", icon: "🎉" },
];

const SetupWizardPage = () => {
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form data for each step
  const [salonDetails, setSalonDetails] = useState({ name: "", currency: "USD", timezone: "UTC" });
  const [businessHours, setBusinessHours] = useState({
    openTime: "09:00", closeTime: "18:00", workDays: [1, 2, 3, 4, 5, 6]
  });
  const [branchInfo, setBranchInfo] = useState({ name: "Main Branch", address: "" });
  const [categories, setCategories] = useState([{ name: "", description: "" }]);
  const [services, setServices] = useState([{ name: "", categoryIndex: 0, price: "", duration: "" }]);
  const [workers, setWorkers] = useState([{ firstName: "", lastName: "", email: "", title: "" }]);

  // Load tenant details
  useEffect(() => {
    if (user?.tenantId) {
      api.get(`/tenants/${user.tenantId}`).then(res => {
        const tenant = res.data.data;
        setSalonDetails({
          name: tenant.name || "",
          currency: tenant.defaultCurrency || "USD",
          timezone: tenant.defaultTimezone || "UTC"
        });
        if (tenant.branches?.length > 0) {
          setBranchInfo({
            name: tenant.branches[0].name || "Main Branch",
            address: tenant.branches[0].address || ""
          });
        }
      }).catch(() => {});
    }
  }, [user]);

  const handleNext = () => {
    setError("");
    setSuccess("");
    if (currentStep < 7) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setError("");
    setSuccess("");
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSaveSalonDetails = async () => {
    if (!salonDetails.name.trim()) return setError("Salon name is required");
    setIsLoading(true);
    setError("");
    try {
      await api.put(`/tenants/${user.tenantId}`, {
        name: salonDetails.name,
        defaultCurrency: salonDetails.currency,
        defaultTimezone: salonDetails.timezone
      });
      setSuccess("Salon details saved!");
      setTimeout(handleNext, 500);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to save salon details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBranch = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Update existing branch
      const res = await api.get(`/tenants/${user.tenantId}`);
      const branches = res.data.data.branches || [];
      if (branches.length > 0) {
        await api.put(`/branches/${branches[0].id}`, {
          name: branchInfo.name,
          address: branchInfo.address
        });
      }
      setSuccess("Branch updated!");
      setTimeout(handleNext, 500);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to save branch");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCategories = async () => {
    const validCategories = categories.filter(c => c.name.trim());
    if (validCategories.length === 0) return setError("Add at least one category");
    setIsLoading(true);
    setError("");
    try {
      for (const cat of validCategories) {
        await api.post("/catalog/categories", {
          name: cat.name.trim(),
          description: cat.description.trim()
        });
      }
      setSuccess(`${validCategories.length} categories created!`);
      setTimeout(handleNext, 500);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to save categories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveServices = async () => {
    const validServices = services.filter(s => s.name.trim() && s.price && s.duration);
    if (validServices.length === 0) return setError("Add at least one service");
    setIsLoading(true);
    setError("");
    try {
      // Get created categories
      const catRes = await api.get("/catalog/categories");
      const existingCats = catRes.data.data || [];
      if (existingCats.length === 0) {
        setError("Please create categories first (Step 4)");
        setIsLoading(false);
        return;
      }

      for (const svc of validServices) {
        const categoryId = existingCats[svc.categoryIndex % existingCats.length]?.id;
        if (!categoryId) continue;
        await api.post("/catalog/services", {
          categoryId,
          name: svc.name.trim(),
          basePrice: parseFloat(svc.price),
          baseDuration: parseInt(svc.duration)
        });
      }
      setSuccess(`${validServices.length} services created!`);
      setTimeout(handleNext, 500);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to save services");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWorkers = async () => {
    const validWorkers = workers.filter(w => w.firstName.trim() && w.lastName.trim() && w.email.trim());
    // Workers are optional — skip if none
    if (validWorkers.length === 0) {
      handleNext();
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      for (const w of validWorkers) {
        await api.post("/hr/workers", {
          firstName: w.firstName.trim(),
          lastName: w.lastName.trim(),
          email: w.email.trim(),
          title: w.title.trim() || "Stylist"
        });
      }
      setSuccess(`${validWorkers.length} workers added!`);
      setTimeout(handleNext, 500);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to add workers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    setError("");
    try {
      await api.patch(`/tenants/${user.tenantId}/setup-complete`);
      // Update user in store
      const meRes = await api.get("/auth/me");
      setAuth(meRes.data.data.user, null);
      setSuccess("Setup complete! Redirecting to your dashboard...");
      setTimeout(() => navigate("/owner", { replace: true }), 1500);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to complete setup");
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = () => setCategories([...categories, { name: "", description: "" }]);
  const removeCategory = (idx) => setCategories(categories.filter((_, i) => i !== idx));
  const updateCategory = (idx, field, value) => {
    const updated = [...categories];
    updated[idx][field] = value;
    setCategories(updated);
  };

  const addService = () => setServices([...services, { name: "", categoryIndex: 0, price: "", duration: "" }]);
  const removeService = (idx) => setServices(services.filter((_, i) => i !== idx));
  const updateService = (idx, field, value) => {
    const updated = [...services];
    updated[idx][field] = value;
    setServices(updated);
  };

  const addWorker = () => setWorkers([...workers, { firstName: "", lastName: "", email: "", title: "" }]);
  const removeWorker = (idx) => setWorkers(workers.filter((_, i) => i !== idx));
  const updateWorker = (idx, field, value) => {
    const updated = [...workers];
    updated[idx][field] = value;
    setWorkers(updated);
  };

  const inputClass = "mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-700">SalonOS Setup Wizard</h1>
          <span className="text-sm text-gray-500">Step {currentStep} of 7</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="flex gap-1">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`flex-1 h-2 rounded-full transition-all ${
                  s.id <= currentStep ? "bg-indigo-600" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((s) => (
              <span key={s.id} className={`text-xs ${s.id === currentStep ? "text-indigo-600 font-medium" : "text-gray-400"}`}>
                {s.icon}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {STEPS[currentStep - 1].icon} {STEPS[currentStep - 1].title}
          </h2>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            {/* Step 1: Salon Details */}
            {currentStep === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Salon Name</label>
                  <input type="text" value={salonDetails.name} onChange={(e) => setSalonDetails({ ...salonDetails, name: e.target.value })} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                    <select value={salonDetails.currency} onChange={(e) => setSalonDetails({ ...salonDetails, currency: e.target.value })} className={inputClass}>
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timezone</label>
                    <select value={salonDetails.timezone} onChange={(e) => setSalonDetails({ ...salonDetails, timezone: e.target.value })} className={inputClass}>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern (US)</option>
                      <option value="America/Chicago">Central (US)</option>
                      <option value="America/Los_Angeles">Pacific (US)</option>
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="Europe/London">London (GMT)</option>
                    </select>
                  </div>
                </div>
                <button onClick={handleSaveSalonDetails} disabled={isLoading} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
                  {isLoading ? "Saving..." : "Save & Continue"}
                </button>
              </>
            )}

            {/* Step 2: Business Hours */}
            {currentStep === 2 && (
              <>
                <p className="text-sm text-gray-500">Set your salon's default operating hours. You can customize per-worker later.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Opening Time</label>
                    <input type="time" value={businessHours.openTime} onChange={(e) => setBusinessHours({ ...businessHours, openTime: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Closing Time</label>
                    <input type="time" value={businessHours.closeTime} onChange={(e) => setBusinessHours({ ...businessHours, closeTime: e.target.value })} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                  <div className="flex gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const days = businessHours.workDays.includes(idx)
                            ? businessHours.workDays.filter(d => d !== idx)
                            : [...businessHours.workDays, idx];
                          setBusinessHours({ ...businessHours, workDays: days });
                        }}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                          businessHours.workDays.includes(idx) ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleNext} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all">
                  Continue
                </button>
              </>
            )}

            {/* Step 3: Branch */}
            {currentStep === 3 && (
              <>
                <p className="text-sm text-gray-500">A default branch was already created. Update the details below.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Branch Name</label>
                  <input type="text" value={branchInfo.name} onChange={(e) => setBranchInfo({ ...branchInfo, name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input type="text" value={branchInfo.address} onChange={(e) => setBranchInfo({ ...branchInfo, address: e.target.value })} placeholder="123 Main Street, City, State" className={inputClass} />
                </div>
                <button onClick={handleSaveBranch} disabled={isLoading} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
                  {isLoading ? "Saving..." : "Save & Continue"}
                </button>
              </>
            )}

            {/* Step 4: Categories */}
            {currentStep === 4 && (
              <>
                <p className="text-sm text-gray-500">Create service categories (e.g. Haircuts, Coloring, Treatments).</p>
                {categories.map((cat, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <input type="text" placeholder="Category name" value={cat.name} onChange={(e) => updateCategory(idx, "name", e.target.value)} className={inputClass} />
                    </div>
                    <div className="flex-1">
                      <input type="text" placeholder="Description (optional)" value={cat.description} onChange={(e) => updateCategory(idx, "description", e.target.value)} className={inputClass} />
                    </div>
                    {categories.length > 1 && (
                      <button onClick={() => removeCategory(idx)} className="mt-1 px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-all text-sm">✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addCategory} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">+ Add another category</button>
                <button onClick={handleSaveCategories} disabled={isLoading} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
                  {isLoading ? "Saving..." : "Save & Continue"}
                </button>
              </>
            )}

            {/* Step 5: Services */}
            {currentStep === 5 && (
              <>
                <p className="text-sm text-gray-500">Add services that your salon offers.</p>
                {services.map((svc, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex gap-2">
                      <input type="text" placeholder="Service name" value={svc.name} onChange={(e) => updateService(idx, "name", e.target.value)} className={`${inputClass} flex-1`} />
                      {services.length > 1 && (
                        <button onClick={() => removeService(idx)} className="px-3 py-2 text-red-500 hover:bg-red-100 rounded-lg transition-all text-sm">✕</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder="Price" value={svc.price} onChange={(e) => updateService(idx, "price", e.target.value)} className={inputClass} />
                      <input type="number" placeholder="Duration (min)" value={svc.duration} onChange={(e) => updateService(idx, "duration", e.target.value)} className={inputClass} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addService} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">+ Add another service</button>
                <button onClick={handleSaveServices} disabled={isLoading} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
                  {isLoading ? "Saving..." : "Save & Continue"}
                </button>
              </>
            )}

            {/* Step 6: Workers */}
            {currentStep === 6 && (
              <>
                <p className="text-sm text-gray-500">Add your staff members. You can skip this and add them later.</p>
                {workers.map((w, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="First name" value={w.firstName} onChange={(e) => updateWorker(idx, "firstName", e.target.value)} className={inputClass} />
                      <input type="text" placeholder="Last name" value={w.lastName} onChange={(e) => updateWorker(idx, "lastName", e.target.value)} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="email" placeholder="Email" value={w.email} onChange={(e) => updateWorker(idx, "email", e.target.value)} className={inputClass} />
                      <input type="text" placeholder="Title (e.g. Stylist)" value={w.title} onChange={(e) => updateWorker(idx, "title", e.target.value)} className={inputClass} />
                    </div>
                    {workers.length > 1 && (
                      <button onClick={() => removeWorker(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addWorker} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">+ Add another worker</button>
                <div className="flex gap-3">
                  <button onClick={handleNext} className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all">
                    Skip for now
                  </button>
                  <button onClick={handleSaveWorkers} disabled={isLoading} className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
                    {isLoading ? "Saving..." : "Save & Continue"}
                  </button>
                </div>
              </>
            )}

            {/* Step 7: Finish */}
            {currentStep === 7 && (
              <div className="text-center py-6">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h3>
                <p className="text-gray-600 mb-6">
                  Your salon is configured and ready. You can always update these settings from your dashboard.
                </p>
                <button onClick={handleFinish} disabled={isLoading} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
                  {isLoading ? "Finalizing..." : "Go to Dashboard →"}
                </button>
              </div>
            )}

            {/* Back button for steps 2-6 */}
            {currentStep > 1 && currentStep < 7 && (
              <button onClick={handleBack} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-all">
                ← Back to previous step
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizardPage;
