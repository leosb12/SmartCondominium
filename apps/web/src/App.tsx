import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />      {/* Ruta principal */}
        <Route path="/login" element={<Login />} /> {/* Ruta de login */}
        <Route path="/register" element={<Register />} /> {/* Ruta de Register */}
        <Route path="/forgot-password" element={<ForgotPassword />} /> {/* Ruta de recuperación */}
        <Route path="/reset-password" element={<ResetPassword />} /> {/* Ruta de reset */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
