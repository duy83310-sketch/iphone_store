import { RouterProvider } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import { router } from "./router";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer position="top-right" />
    </>
  );
}
