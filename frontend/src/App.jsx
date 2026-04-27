import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import apiClient from "@/api/api.client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, User, Lock, Info, ArrowRight } from "lucide-react"
import "./login.css"

function App() {
  const navigate = useNavigate()
  const { refetch } = useAuth()
  const [employeeId, setEmployeeId] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Load saved employee code if Remember Me was checked
  useEffect(() => {
    const savedCode = localStorage.getItem("remember_emp_id")
    if (savedCode) {
      setEmployeeId(savedCode)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e) => {
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
        JSON.stringify({ payload, loggedInAt: Date.now() }),
      )

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

  return (
    <div className="login-portal-container">
      {/* Dynamic Industrial Background */}
      <div className="login-background" />
      <div className="login-overlay" />

      <div className="login-card-container">
        <div className="glass-card">
          <div className="login-header-section">
            <div className="logo-container">
              <img 
                src="/shreno_logo.jpg" 
                alt="Shreno Engineering" 
                className="shreno-logo" 
              />
            </div>
            <h1 className="portal-title">DMS Portal</h1>
          </div>

          <div className="login-form-content">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee ID Field */}
              <div className="input-wrapper">
                <User className="input-icon h-4 w-4" />
                <Input
                  id="employeeId"
                  type="text"
                  placeholder="Employee Code"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                  disabled={isLoading}
                  className="modern-input"
                />
              </div>

              {/* Password Field */}
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

              {/* Form Options */}
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
                <a href="#" className="text-[12px] font-bold text-blue-700">
                  Forgot?
                </a>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-100 rounded text-[12px] text-red-600 font-bold">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Primary Action */}
              <Button
                type="submit"
                disabled={isLoading}
                className="primary-submit-btn"
              >
                {isLoading ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          </div>
        </div>

        {/* Global Footer */}
        <footer className="system-footer">
          <p>© {new Date().getFullYear()} SHRENO ENGINEERING LIMITED</p>
        </footer>
      </div>
    </div>
  );
}

export default App
