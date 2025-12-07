import { useWishlist } from "../context/WishlistContext";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function WishlistButton({ product }) {
  const { wishlist, setWishlist, addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { requireAuth } = useContext(AuthContext);

  function handleClick() {
    if (!requireAuth()) return;

    if (inWishlist) {
        // remove
        fetch(`http://localhost:5000/auth/wishlist/${product.id}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "x-auth-token": token
        }
        })
        .then(res => res.json())
        .then(data => setWishlist(data));
    } else {
        // add
        fetch("http://localhost:5000/auth/wishlist", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-auth-token": token
        },
        body: JSON.stringify({ product })
        })
        .then(res => res.json())
        .then(data => setWishlist(data));
        }
    }


  return (
    <button onClick={handleClick}>
      {isInWishlist(product.id) ? "💖" : "🤍"}
    </button>
  );
}
