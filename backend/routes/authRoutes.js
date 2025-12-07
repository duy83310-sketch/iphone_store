const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const auth = require("../middleware/auth");

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

    const token = jwt.sign(
      { id: user._id },
      "SECRET_KEY",    // sau này dùng .env
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get wishlist
router.get("/wishlist", auth, async (req, res) => {
  const user = await User.findById(req.user).select("wishlist");
  res.json(user.wishlist);
});


// add to wishlist
router.post("/wishlist", auth, async (req, res) => {
  const { product } = req.body;

  const user = await User.findById(req.user);

  // Check exists
  if (!user.wishlist.some(p => p.id === product.id)) {
    user.wishlist.push(product);
    await user.save();
  }

  res.json(user.wishlist);
});

// delete from wishlist
router.delete("/wishlist/:id", auth, async (req, res) => {
  const user = await User.findById(req.user);
  user.wishlist = user.wishlist.filter(p => p.id !== req.params.id);
  await user.save();
  res.json(user.wishlist);
});

// keep the same sate when reload UI with a logged in user
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user).select("name email _id");
  res.json(user);
});

// get cart
router.get("/cart", auth, async (req, res) => {
  const user = await User.findById(req.user);
  const cart = user.cart || [];

  // lấy product từ DB
  const Product = require("../models/productModel");

  const data = await Promise.all(
    cart.map(async item => {
      const product = await Product.findOne({ id: item.productId });

      return {
        id: item.productId,
        quantity: item.quantity,
        name: product.name,
        image: product.image,
        price: product.salePrice ?? product.price
      };
    })
  );

  res.json(data);
});


// add to cart
router.post("/cart", auth, async (req, res) => {
  const { product } = req.body;
  const user = await User.findById(req.user);

  let cart = user.cart || [];
  let exist = false;

  cart = cart.map(item => {
    if (item.id === product.id) {
      exist = true;
      return {
        ...item,
        quantity: (item.quantity || 1) + 1
      };
    }
    return item;
  });

  if (!exist) {
    cart.push({
      productId: product.id,
      quantity: 1
    });
  }

  user.cart = cart;
  await user.save();

  res.json(user.cart);
});

// update quantity (products)
router.patch("/cart/:id", auth, async (req, res) => {
  let { quantity } = req.body;

  // không cho quantity < 1
  quantity = Number(quantity) || 1;
  if (quantity < 1) quantity = 1;

  // cập nhật trực tiếp vào DB bằng positional operator $
  const user = await User.findOneAndUpdate(
    { _id: req.user, "cart.productId": req.params.id },
    { $set: { "cart.$.quantity": quantity } },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({ msg: "User hoặc sản phẩm không tồn tại trong giỏ" });
  }

  return res.json(user.cart);
});




// delete cart
router.delete("/cart/:id", auth, async (req, res) => {
  const user = await User.findById(req.user);

  if (!user.cart) user.cart = [];

  user.cart = user.cart.filter(p => p.id != req.params.id);

  await user.save();
  res.json(user.cart);
});

module.exports = router;
