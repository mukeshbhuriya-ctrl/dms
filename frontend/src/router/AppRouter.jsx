import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import appRoutes from "./routes"

const router = createBrowserRouter(appRoutes)

function AppRouter() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default AppRouter
