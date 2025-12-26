const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // <-- add
const User = require("../models/userModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check user exists
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: "Email đã tồn tại" });

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed
    });

    res.json({ msg: "Đăng ký thành công", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // check email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Sai tài khoản hoặc mật khẩu" });

    // check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Sai tài khoản hoặc mật khẩu" });

    // { changed code } block disabled accounts
    if (String(user.status || 'active') === 'disabled') {
      return res.status(403).json({ msg: "Tài khoản của bạn đã bị vô hiệu hóa" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role || "client" }, // include role for authorization checks
      "SECRET_KEY",    // sau này dùng .env
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        gender: user.gender || null,
        dob: user.dob || null,
        role: user.role || 'client',
        status: user.status || 'active'
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Demo client route: create or return a demo client account and issue a JWT
router.post("/demo-client", async (req, res) => {
  try {
    const email = "demo.client@example.com";
    let user = await User.findOne({ email });
    if (!user) {
      const hashed = await bcrypt.hash("password", 10);
      user = await User.create({
        name: "Demo Client",
        email,
        password: hashed,
        phone: null,
        addresses: []
      });
    }

    // { changed code } block disabled demo account
    if (String(user.status || 'active') === 'disabled') {
      return res.status(403).json({ msg: "Tài khoản của bạn đã bị vô hiệu hóa" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role || "client" }, // include role for authorization checks
      "SECRET_KEY",
      { expiresIn: "1d" }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role || 'client', status: user.status || 'active' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// forgot password: generate reset token, store hashed token + expiry, log raw token
router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const emailRe = /^[^@]+@[^@]+\.[^@]+$/;
    if (!emailRe.test(email)) return res.status(400).json({ msg: "Email không hợp lệ" });

    const user = await User.findOne({ email }).select("_id email status").lean();
    if (!user) return res.status(404).json({ msg: "Email không tồn tại" });

    if (String(user.status || "active") === "disabled") {
      return res.status(403).json({ msg: "Tài khoản của bạn đã bị vô hiệu hóa" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresInMs = 15 * 60 * 1000;

    // Use native collection update to bypass schema strict/unknown fields
    await User.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: new Date(Date.now() + expiresInMs)
        }
      }
    );

    console.log(`[RESET_PASSWORD_TOKEN] email=${email} token=${rawToken} expiresIn=${expiresInMs}ms`);

    return res.json({
      msg: "Reset token đã được tạo. Vui lòng dùng token để đặt mật khẩu mới.",
      expiresInMs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// reset password: verify token by hashing, then set new password + clear reset fields
router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!token) return res.status(400).json({ msg: "Thiếu token" });
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ msg: "Token không đúng định dạng (cần chuỗi hex 64 ký tự)" });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ msg: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Native findOne to avoid Mongoose strictQuery stripping
    const user = await User.collection.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        msg: "Token không hợp lệ hoặc đã hết hạn (hãy bấm 'Quên mật khẩu' để tạo token mới)"
      });
    }

    if (String(user.status || "active") === "disabled") {
      return res.status(403).json({ msg: "Tài khoản của bạn đã bị vô hiệu hóa" });
    }

    const hashedPw = await bcrypt.hash(newPassword, 10);

    await User.collection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPw },
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" }
      }
    );

    res.json({ msg: "Đặt lại mật khẩu thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// delegate user-related routes to controller functions
const userController = require("../controllers/userController");

// GET wishlist
router.get("/wishlist", requireAuth, userController.getWishlist);

// POST wishlist (add)
router.post("/wishlist", requireAuth, userController.addWishlist);

// DELETE wishlist
router.delete("/wishlist/:id", requireAuth, userController.deleteWishlist);

// keep the same sate when reload UI with a logged in user
router.get("/me", requireAuth, userController.getMe);

// PATCH /me
router.patch("/me", requireAuth, userController.updateMe);

// POST: change password
router.post("/change-password", requireAuth, userController.changePassword);

// GET: lấy giỏ hàng đầy đủ
router.get("/cart", requireAuth, userController.getCart);

// POST: thêm sản phẩm vào giỏ
router.post("/cart", requireAuth, userController.addCart);

// PATCH: cập nhật số lượng
router.patch("/cart/:id", requireAuth, userController.updateCart);

// DELETE: xoá sản phẩm khỏi giỏ
router.delete("/cart/:id", requireAuth, userController.deleteCart);
// DELETE: xoá toàn bộ giỏ (clear)
router.delete("/cart", requireAuth, userController.clearCart);

// Addresses
router.get("/addresses", requireAuth, userController.getAddresses);
router.post("/addresses", requireAuth, userController.addAddress);
router.patch("/addresses/:id", requireAuth, userController.updateAddress);
router.delete("/addresses/:id", requireAuth, userController.deleteAddress);

module.exports = router;
