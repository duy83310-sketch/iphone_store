import { Link } from "react-router-dom";
import ProductGrid from "./ProductGrid";

export default function ProductSection({ title, products, filter, link }) {

  const filtered = products
    ?.filter(p => p[filter] === true)
    .sort((a,b) => b.id - a.id)
    .slice(0,4);

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>{title}</h2>

      <ProductGrid products={filtered} columns={4} />

      <div style={{ marginTop: 20, textAlign: "center" }}>
        <Link
          to={link}
          style={{
            padding: "10px 18px",
            background: "#111",
            color: "#fff",
            borderRadius: 8,
            border: "1px solid #333",
            textDecoration: "none"
          }}
        >
          Xem tất cả
        </Link>
      </div>
    </div>
  );
}