import { useEffect, useState } from "react";
import FeaturedProduct from "../components/product/FeaturedProduct";
import ProductSection from "../components/product/ProductSection";
import NewsSection from "../components/news/NewsSection";
import FAQSection from "../components/faq/FAQSection";
import { API } from "../utils/config";
import "../styles/pages/home.css";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [featured, setFeatured] = useState(null);

  // Fetch products
  useEffect(() => {
    fetch(`${API}/products`)
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
          src="/images/banner_ip17.png"
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

          <ProductSection
            products={products}
            filter="new"
            link="/products?filter=new"
          />
        )}
      </div>

      {/* HOT DEALS */}
      <div className="section">
        <h2 className="title">🔥 Ưu đãi HOT</h2>
        <ProductSection
          products={products}
          filter="hot"
          link="/products?filter=hot"
        />
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
