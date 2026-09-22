import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import { NotificationProvider } from "@/context/NotificationContext"
import appRoutes from "./routes"

const router = createBrowserRouter(appRoutes)

function AppRouter() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
      </NotificationProvider>
    </AuthProvider>
  )
}

export default AppRouter
