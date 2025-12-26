import { useWishlist } from "../../context/WishlistContext";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { API } from "../../utils/config";

export default function WishlistButton({ product }) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { requireAuth } = useContext(AuthContext);

  const added = isInWishlist(product.id, { color: product.selectedColor ?? null, storage: product.selectedVariant?.storage ?? null });

  async function handleClick() {
    if (!requireAuth()) return;

    if (added) {
      await removeFromWishlist(product.id, { color: product.selectedColor ?? null, storage: product.selectedVariant?.storage ?? null });
    } else {
      await addToWishlist(product);
    }
  }

  return (
    <button onClick={handleClick}>
      {added ? "💖" : "🤍"}
    </button>
  );
}
