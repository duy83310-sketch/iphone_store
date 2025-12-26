// src/components/ProductGrid.jsx
import ProductCard from "./ProductCard";

export default function ProductGrid({ products = [], onAddToCart, onAddToWishlist, columns = 3 }) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: 16
  };

  return (
    <div style={gridStyle}>
      {products.map((p) => (
        <ProductCard
          key={
            p.wishlistId
              ?? `${p.id}-${p.selectedColor ?? "default"}`
          }
          product={p}
          onAddToCart={onAddToCart}
          onAddToWishlist={onAddToWishlist}
        />
      ))}
    </div>
  );
}
