import "../../styles/components/footer.css"

export default function Footer() {
  return (
    <footer>
      <div className="footer">
        <div className="footer-container">
            <div className="footer-about">
                <h3>Iphone Store</h3>
                <p>Chuyên cung cấp các sản phẩm Iphone uy tín, chính hãng, chất lượng cao của Apple</p>
            </div>
            <div className="footer-links">
                <h4>Liên kết nhanh</h4>
                <ul>
                    <li><a href="/">Trang chủ</a></li>
                    <li><a href="/">Sản phẩm</a></li>
                    <li><a href="">Khuyến mãi</a></li>
                    <li><a href="/">Liên hệ</a></li>
                </ul>
            </div>
            <div className="footer-contact">
                <h4>Liên hệ</h4>
                <p>📍 123 ABC, Hà Nội</p>
                <p>📞 0123 456 789</p>
                <p>✉️ support@iphoneshop.vn</p>
            </div>
        </div>
        <div className="footer-bottom">
            <p>&copy; 2025 Iphone Store. All rights reserved.</p>
        </div>
    </div>
    </footer>
  );
}
