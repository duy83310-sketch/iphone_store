import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Products from "../pages/Products";
import ProductDetail from "../pages/ProductDetail";
import Wishlist from "../pages/Wishlist";
import Cart from "../pages/Cart";
import Checkout from "../pages/Checkout";
import Login from "../pages/Login";
import Register from "../pages/Register";

import Header from "../components/Header";
import Footer from "../components/Footer";

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
      </Routes>

      <Footer />
    </>
  );
}
