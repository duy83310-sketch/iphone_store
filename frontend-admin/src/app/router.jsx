import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import Dashboard from "../pages/Dashboard/Dashboard";
import Products from "../pages/Products/Products";
import NewProduct from "../pages/Products/NewProduct";
import Orders from "../pages/Orders/Orders";
import OrderDetail from "../pages/Orders/OrderDetail";
import Customers from "../pages/Customers/Customers";
import CustomerEdit from "../pages/Customers/CustomerEdit";
import Users from "../pages/Users/Users";
import Login from "../pages/Login";
import { isLoggedIn } from "../utils/auth";
import Promotions from "../pages/Promotions/Promotions";
import SupportRequests from "../pages/SupportRequests/SupportRequests";
import Reports from "../pages/Reports/Reports";

const ProtectedRoute = ({ children }) => {
  return isLoggedIn() ? children : <Navigate to="/login" />;
};

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "products", element: <Products /> },
      { path: "products/new", element: <NewProduct /> },
      { path: "products/:id/edit", element: <NewProduct /> },
      { path: "orders", element: <Orders /> },
      { path: "orders/:id", element: <OrderDetail /> },
      { path: "customers", element: <Customers /> },
      { path: "customers/:id", element: <Navigate to="/customers" replace /> },
      { path: "customers/:id/edit", element: <CustomerEdit /> },
      { path: "users", element: <Users /> },
      { path: "promotions", element: <Promotions /> },
      { path: "support-requests", element: <SupportRequests /> },
      { path: "reports", element: <Reports /> },
    ],
  },
]);
