import Home from "./pages/Home";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AuthLayout from "./layouts/AuthLayout";
import PublicLayout from "./layouts/PublicLayout";
import { ToastProvider } from "./context/ToastContext";
import FaceAttendance from "./pages/FaceAttendance";
import FaceRegistration from "./pages/FaceRegistration";

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="/attendance" element={<FaceAttendance />} />
          </Route>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="/register-face" element={<FaceRegistration />} />
          </Route>
          <Route path="/auth" element={<AuthLayout />}>
            <Route index element={<Auth />} />
            <Route path="reset-password" element={<ResetPassword />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}
