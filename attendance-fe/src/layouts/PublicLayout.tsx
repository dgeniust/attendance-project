import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function PublicLayout() {
  return (
    <div className="min-h-screen font-inter bg-canvas-fog text-slate-text flex flex-col justify-between selection:bg-chartwell-blue selection:text-cloud-white">
      <Header />
      <div className="flex-grow">
        {/* Outlet sẽ là nơi render nội dung của các page con như Home */}
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
