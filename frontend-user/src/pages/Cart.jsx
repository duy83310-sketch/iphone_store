import { useCart } from "../context/CartContext";

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, totalPrice } = useCart();

  if (cart.length === 0) {
    return <h2 style={{ padding: 20 }}>Giỏ hàng trống.</h2>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Giỏ hàng</h1>

      {cart.map((item) => (
        <div
          key={item.id}
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 20,
            borderBottom: "1px solid #eee",
            paddingBottom: 12,
          }}
        >
          <img
            src={`http://localhost:5173${item.image}`}
            alt={item.name}
            style={{ width: 90, height: 90, objectFit: "contain" }}
          />

          <div style={{ flex: 1, marginLeft: 20 }}>
            <h3>{item.name}</h3>
            <p>{item.price.toLocaleString()}₫</p>

            {/* In & De btn */}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>
                -
              </button>
              <span>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                +
              </button>
            </div>
          </div>

          <button
            onClick={() => removeFromCart(item.id)}
            style={{
              padding: "6px 10px",
              background: "#ff5555",
              color: "#fff",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            Xóa
          </button>
        </div>
      ))}

      <h2 style={{ marginTop: 20 }}>
        Tổng tiền: {totalPrice.toLocaleString()}₫
      </h2>

      <button
        style={{
          marginTop: 20,
          padding: "10px 18px",
          background: "#111",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Thanh toán
      </button>
    </div>
  );
}
