import { useEffect, useState } from "react";
import FeaturedProduct from "../components/FeaturedProduct";
import ProductGrid from "../components/ProductGrid";
import HotDeals from "../components/HotDeals";
import NewsSection from "../components/NewsSection";
import FAQSection from "../components/FAQSection";
import "../styles/components/home.css";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [featured, setFeatured] = useState(null);

  // Fetch products
  useEffect(() => {
    fetch("http://localhost:5000/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);

        // select featured product
        const fp = data.find((p) => p.featured === true) || data[0]; // fallback
        setFeatured(fp);
      });
  }, []);

  return (
    <div>

      {/* BANNER */}
      <div style={{ marginBottom: 30 }}>
        <img
          src="http://localhost:5173/images/banner_ip17.png"
          alt="banner"
          style={{
            width: "100%",
            borderRadius: 12,
            height: "clamp(160px, 36vw, 500px)",
            objectFit: "cover",
          }}
        />
      </div>

      {/* FEATURED PRODUCT */}
      <div>
        <h2 className="featured-title">Sản phẩm nổi bật</h2>
        <FeaturedProduct product={featured} />
      </div>

      {/* NEW PRODUCTS */}
      <div className="section">
        <h2 className="title">Sản phẩm mới</h2>

        {products.length === 0 ? (
          <p>Đang tải...</p>
        ) : (
          <ProductGrid
            products={products.filter((p) => p.new === true)}
            columns={3}
          />
        )}
      </div>

      {/* HOT DEALS */}
      <div className="section">
        <h2 className="title">🔥 Ưu đãi HOT</h2>
        <HotDeals products={products.filter((p) => p.hot === true)} />
      </div>
      
      {/* NEWS */}
      <div className="section">
        <h2 className="title">Tin tức và sự kiện</h2>
        <NewsSection />
      </div>
      

      {/* FAQS */}
      <div className="section">
        <h2 className="title">Câu hỏi thường gặp</h2>
        <FAQSection />
      </div>

    </div>
  );
}
