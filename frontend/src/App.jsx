import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import apiClient from "@/api/api.client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Eye, EyeOff, User, Lock, Info } from "lucide-react"
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

  // Create an array for the repeating watermark text
  const watermarkItems = Array.from({ length: 48 }, (_, i) => "SHRENO ENGINEERING PVT LTD")

  return (
    <div className="relative min-h-screen w-full h-screen flex flex-col items-center justify-center p-6 bg-white overflow-hidden selection:bg-[#337ab7]/20">
      
      {/* Premium Watermark Background */}
      <div className="watermark-text-grid">
        {watermarkItems.map((text, i) => (
          <div key={i} className="watermark-item">{text}</div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-[480px] flex flex-col items-center">
        
        {/* Exact Replica Login Box */}
        <Card className="replica-card w-full shadow-[0_15px_30px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="replica-header">
            <span>Sign In</span>
            <a href="#" className="text-[11px] font-normal hover:underline opacity-90">
              Forgot password?
            </a>
          </div>
          
          <CardContent className="p-10 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                {/* Employee Code Input */}
                <div className="flex">
                  <div className="replica-icon-box">
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    id="employeeId"
                    type="text"
                    placeholder="Employee Code"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                    disabled={isLoading}
                    className="replica-input flex-1 focus-visible:ring-0 focus-visible:border-[#337ab7] focus:border-[#337ab7] outline-none transition-all"
                  />
                </div>

                {/* Password Input */}
                <div className="flex">
                  <div className="replica-icon-box">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="replica-input w-full focus-visible:ring-0 focus-visible:border-[#337ab7] focus:border-[#337ab7] outline-none pr-10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#337ab7]"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Remember Me Toggle */}
              <div className="flex items-center space-x-2 px-1">
                <Checkbox 
                  id="rememberMe" 
                  checked={rememberMe} 
                  onCheckedChange={setRememberMe}
                  className="h-4 w-4 border-slate-300 data-[state=checked]:bg-[#337ab7] data-[state=checked]:border-[#337ab7] rounded-sm"
                />
                <label
                  htmlFor="rememberMe"
                  className="text-[13px] text-slate-500 cursor-pointer select-none font-medium"
                >
                  Remember Me
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-[13px] text-red-600 font-bold px-1 animate-in fade-in slide-in-from-top-1">
                  <Info className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}

              {/* Exact Replica Login Button */}
              <div className="flex justify-center pt-4 pb-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="replica-button shadow-none active:scale-[0.98] transition-all"
                >
                   {isLoading ? "Signing in..." : "Login"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Professional Minimal Footer */}
        <div className="mt-8 flex flex-col items-center gap-3 opacity-50">
          <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">
            Shreno Engineering Pvt Ltd
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
