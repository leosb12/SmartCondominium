import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />      {/* Ruta principal */}
        <Route path="/login" element={<Login />} /> {/* Ruta de login */}
        <Route path="/register" element={<Register />} /> {/* Ruta de Register */}
      </Routes>
    </BrowserRouter>
  );
}
