import { useWishlist } from "../context/WishlistContext";
import ProductGrid from "../components/ProductGrid";

export default function Wishlist() {
  const { wishlist } = useWishlist();

  return (
    <div style={{ padding: 20 }}>
      <h1>Danh sách yêu thích</h1>

      {wishlist.length === 0 ? (
        <p>Không có sản phẩm nào trong danh sách yêu thích.</p>
      ) : (
        <ProductGrid products={wishlist} />
      )}
    </div>
  );
}
