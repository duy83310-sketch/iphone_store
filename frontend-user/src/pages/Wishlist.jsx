import { useWishlist } from "../context/WishlistContext";
import ProductGrid from "../components/product/ProductGrid";

export default function Wishlist() {
  const { wishlist } = useWishlist();

  return (
    <div style={{padding: "20px", maxWidth: "90%", margin: "auto"}}>
      <h1 className="title">Danh sách yêu thích</h1>

      {wishlist.length === 0 ? (
        <p>Không có sản phẩm nào trong danh sách yêu thích.</p>
      ) : (
        <ProductGrid products={wishlist} columns={4}/>
      )}
    </div>
  );
}
