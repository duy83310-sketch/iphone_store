import AppRouter from "./router/AppRouter";
import ScrollToTop from "./components/layout/ScrollToTop";
import AuthModal from "./components/auth/AuthModal";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/components/toast.css";


export default function App() {
  return (
    <>
      <ScrollToTop />
      <AuthModal />
      <AppRouter />
      <ToastContainer 
        position="bottom-right"
        autoClose={1600}
        hideProgressBar
        closeOnClick
        draggable
        pauseOnHover />
    </>
  );
}
