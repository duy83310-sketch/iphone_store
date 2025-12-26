import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Products from "../pages/Products";
import ProductDetail from "../pages/ProductDetail";
import Wishlist from "../pages/Wishlist";
import Cart from "../pages/Cart";
import Checkout from "../pages/Checkout";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ProfileLayout from "../pages/ProfileLayout";
import ProfilePage from "../pages/ProfilePage";
import Orders from "../pages/Orders";
import ChangePassword from "../pages/ChangePassword";
import AvatarPage from "../pages/AvatarPage";
import ReviewHistory from "../pages/ReviewHistory";
import AddressesPage from "../pages/AddressesPage";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export default function AppRouter() {
  return (
    <>
      <Header/>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<ProfileLayout />}>
            <Route index element={<ProfilePage />} />
            <Route path="addresses" element={<AddressesPage />} />
            <Route path="orders" element={<Orders />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="avatar" element={<AvatarPage />} />
            <Route path="reviews" element={<ReviewHistory />} />
          </Route>
      </Routes>

      <Footer />
    </>
  );
}
