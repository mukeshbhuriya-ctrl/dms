import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import apiClient from "@/api/api.client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, User, Lock, Info, ArrowRight, ArrowLeft, ShieldCheck, Mail } from "lucide-react"
import "./login.css"

function App() {
  const navigate = useNavigate()
  const { refetch } = useAuth()
  
  // Login States
  const [employeeId, setEmployeeId] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Workflow States: 'login' | 'forgot' | 'otp' | 'reset' | 'force-reset'
  const [view, setView] = useState("login")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Forgot Password States
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Load saved employee code
  useEffect(() => {
    const savedCode = localStorage.getItem("remember_emp_id")
    if (savedCode) {
      setEmployeeId(savedCode)
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const payload = await apiClient.post(
        "/api/users/auth/login",
        { employeeId, password },
        { skipAuthRedirect: true }
      )

      if (rememberMe) {
        localStorage.setItem("remember_emp_id", employeeId)
      } else {
        localStorage.removeItem("remember_emp_id")
      }

      localStorage.setItem(
        "user_auth",
        JSON.stringify({ payload, loggedAt: Date.now() }),
      )

      // Check if user must change password
      if (payload?.user?.mustChangePassword) {
        setView("force-reset")
        setIsLoading(false)
        return
      }

      await refetch()
      const role = payload?.roles?.[0]?.name

      if (role === "ADMIN") navigate("/admin/dashboard")
      else if (role === "DCC") navigate("/user/dashboard")
      else if (role === "MARKETING") navigate("/marketing/dashboard")
      else navigate("/user/dashboard")
      
    } catch (err) {
      setError(err?.message || "Invalid Employee Code or Password.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      await apiClient.post("/api/users/auth/forgot-password", { email })
      setView("otp")
      setSuccess("Verification code sent to your email.")
    } catch (err) {
      setError(err?.message || "Failed to send OTP. Please check email address.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      await apiClient.post("/api/users/auth/verify-otp", { email, otp })
      setView("reset")
      setSuccess("Identity verified. Enter your new password.")
    } catch (err) {
      setError(err?.message || "Invalid or expired OTP.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.")
    }
    setError("")
    setIsLoading(true)
    try {
      await apiClient.post("/api/users/auth/reset-password", { 
        email, 
        otp, 
        newPassword 
      })
      setSuccess("Password reset successfully. You can now login.")
      setView("login")
      setPassword("") 
    } catch (err) {
      setError(err?.message || "Failed to reset password.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForceChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.")
    }
    setError("")
    setIsLoading(true)
    try {
      await apiClient.post("/api/users/auth/force-change-password", { 
        newPassword 
      })
      setSuccess("Password updated successfully. Accessing portal...")
      
      // After force change, re-fetch and navigate
      await refetch()
      setTimeout(() => {
        navigate("/user/dashboard") // default, context will handle redirect based on role
      }, 1500)
    } catch (err) {
      setError(err?.message || "Failed to update password.")
    } finally {
      setIsLoading(false)
    }
  }

  const renderForm = () => {
    switch (view) {
      case "forgot":
        return (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-[16px] font-bold text-slate-800">Reset Password</h2>
              <p className="text-[12px] text-slate-500">Enter your registered email to receive an OTP.</p>
            </div>
            <div className="input-wrapper">
              <Mail className="input-icon h-4 w-4" />
              <Input
                type="email"
                placeholder="Registered Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="modern-input"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="primary-submit-btn">
              {isLoading ? "Sending..." : "Send Verification Code"}
            </Button>
            <button 
              type="button" 
              onClick={() => { setView("login"); setError(""); setSuccess(""); }} 
              className="w-full text-[12px] text-slate-600 flex items-center justify-center gap-2 mt-2"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Login
            </button>
          </form>
        )

      case "otp":
        return (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-6">
              <ShieldCheck className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h2 className="text-[16px] font-bold text-slate-800">Verification</h2>
              <p className="text-[12px] text-slate-500">Enter code sent to <strong>{email}</strong></p>
            </div>
            <div className="input-wrapper">
              <Mail className="input-icon h-4 w-4" />
              <Input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                className="modern-input text-center tracking-[4px] font-bold"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="primary-submit-btn">
              {isLoading ? "Verifying..." : "Verify OTP"}
            </Button>
            <button 
              type="button" 
              onClick={() => { setView("forgot"); setError(""); setSuccess(""); }} 
              className="w-full text-[12px] text-slate-600 flex items-center justify-center gap-2 mt-2"
            >
              <ArrowLeft className="h-3 w-3" /> Resend Code
            </button>
          </form>
        )

      case "reset":
      case "force-reset":
        const isForce = view === "force-reset"
        return (
          <form onSubmit={isForce ? handleForceChangePassword : handleResetPassword} className="space-y-4">
            <div className="text-center mb-6">
              <Lock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h2 className="text-[16px] font-bold text-slate-800">
                {isForce ? "Update Required" : "Set New Password"}
              </h2>
              {isForce && <p className="text-[12px] text-slate-500">For security, you must set a new password.</p>}
            </div>
            <div className="input-wrapper">
              <Lock className="input-icon h-4 w-4" />
              <Input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="modern-input"
              />
            </div>
            <div className="input-wrapper">
              <Lock className="input-icon h-4 w-4" />
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="modern-input"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="primary-submit-btn">
              {isLoading ? "Updating..." : (isForce ? "Save & Continue" : "Reset Password")}
            </Button>
          </form>
        )

      default:
        return (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="input-wrapper">
              <User className="input-icon h-4 w-4" />
              <Input
                id="employeeId"
                type="text"
                placeholder="Employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                disabled={isLoading}
                className="modern-input"
              />
            </div>

            <div className="input-wrapper">
              <Lock className="input-icon h-4 w-4" />
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="modern-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="rememberMe" 
                  checked={rememberMe} 
                  onCheckedChange={setRememberMe}
                  className="remember-me-checkbox h-3.5 w-3.5"
                />
                <label
                  htmlFor="rememberMe"
                  className="text-[12px] text-slate-600 cursor-pointer select-none"
                >
                  Keep me signed in
                </label>
              </div>
              <button 
                type="button"
                onClick={() => { setView("forgot"); setError(""); setSuccess(""); }} 
                className="cursor-pointer text-[12px] font-bold text-blue-700 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="primary-submit-btn"
            >
              {isLoading ? "Authenticating..." : "Sign In"}
              {!isLoading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        )
    }
  }

  return (
    <div className="login-portal-container">
      <div className="login-background" />
      <div className="login-overlay" />

      <div className="login-card-container">
        <div className="glass-card">
          <div className="login-header-section flex flex-col items-center">
            <img 
              src="/shreno_logo.png?v=5" 
              alt="Shreno Engineering" 
              className="h-14 w-auto object-contain mb-3" 
            />
            <h1 className="text-[18px] font-bold text-slate-600 tracking-wide uppercase">Shreno DMS</h1>
          </div>

          <div className="login-form-content">
            {renderForm()}

            {error && (
              <div className="flex items-center gap-2 p-2 mt-4 bg-red-50 border border-red-100 rounded text-[11px] text-red-600 font-bold">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-2 mt-4 bg-green-50 border border-green-100 rounded text-[11px] text-green-700 font-bold">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <p>{success}</p>
              </div>
            )}
          </div>
        </div>

        <footer className="system-footer">
          <p>© {new Date().getFullYear()} SHRENO ENGINEERING LIMITED</p>
        </footer>
      </div>
    </div>
  );
}

export default App
