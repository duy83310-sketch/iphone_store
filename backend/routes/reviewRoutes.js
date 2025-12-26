const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Review = require("../models/reviewModel");
const { requireAuth } = require("../middleware/auth");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");

// POST - thêm review (CHỈ KHÁCH HÀNG ĐÃ MUA VÀ ĐƯỢC GIAO mới được đánh giá)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.userId; // từ token

    // Ensure productId is a valid ObjectId
    const mongoose = require('mongoose');
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ msg: "productId không hợp lệ" });
    }

    // Check 1 user chỉ review 1 lần / sản phẩm
    const exist = await Review.findOne({ userId, productId });
    if (exist) return res.status(400).json({ msg: "Bạn đã đánh giá sản phẩm này rồi" });

    // Verify the user actually purchased this product in a DELIVERED order
    const prod = await Product.findById(productId).lean();
    if (!prod) return res.status(404).json({ msg: "Sản phẩm không tồn tại" });

    const prodNumericId = String(prod.id);

    const purchased = await Order.findOne({ userId, status: 'DELIVERED', 'items.productId': prodNumericId });
    if (!purchased) return res.status(403).json({ msg: "Chỉ khách hàng đã mua và đơn hàng ở trạng thái 'DELIVERED' mới được đánh giá" });

    const review = await Review.create({ userId, productId, rating, comment });
    const populated = await Review.findById(review._id)
      .populate("userId", "name");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// GET - check if current user can review a product
router.get('/can-review/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const mongoose = require('mongoose');

    // Validate productId (Mongo ObjectId)
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ canReview: false, msg: 'productId không hợp lệ' });
    }

    // Check product exists
    const prod = await Product.findById(productId).lean();
    if (!prod) {
      return res.status(404).json({ canReview: false, msg: 'Sản phẩm không tồn tại' });
    }

    // STEP 1: check if already reviewed
    const alreadyReviewed = await Review.findOne({
      userId: req.userId,
      productId: productId
    }).lean();

    if (alreadyReviewed) {
      return res.json({
        canReview: false,
        reason: 'ALREADY_REVIEWED'
      });
    }

    // STEP 2: check if purchased + DELIVERED
    const prodNumericId = String(prod.id);

    const purchased = await Order.findOne({
      userId: req.userId,
      status: 'DELIVERED',
      'items.productId': prodNumericId
    }).lean();

    // Only allow review if purchased & delivered
    res.json({
    canReview: !!purchased,
    reason: purchased ? null : 'NOT_PURCHASED'
  });

  } catch (err) {
    console.error('can-review error:', err);
    res.status(500).json({ canReview: false, msg: err.message });
  }
});

// GET - get reviews for a product, filter by rating optional
router.get("/", async (req, res) => {
  try {
    const { productId, rating } = req.query;

    let filter = { productId };

    if (rating) filter.rating = rating;

    const reviews = await Review.find(filter).populate("userId", "name");
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// GET - lấy review của user đang đăng nhập
router.get("/user", requireAuth, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.userId }).populate("productId", "name").sort({ createdAt: -1 });

    const mapped = reviews.map(r => ({
      _id: r._id,
      productId: r.productId?._id,
      productName: r.productId?.name || null,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt
    }));

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// GET - thống kê số sao
router.get("/stats/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;

    const stats = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 }
        }
      }
    ]);


    res.json(stats);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// PATCH - chỉnh sửa review
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.userId;

    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ msg: "Đánh giá không tồn tại" });

    // Check ownership or admin
    if (String(review.userId) !== String(userId) && req.userRole !== 'admin') {
      return res.status(403).json({ msg: "Không có quyền chỉnh sửa đánh giá này" });
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// DELETE - xóa review
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ msg: "Đánh giá không tồn tại" });

    // Check ownership or admin
    if (String(review.userId) !== String(userId) && req.userRole !== 'admin') {
      return res.status(403).json({ msg: "Không có quyền xóa đánh giá này" });
    }

    await Review.findByIdAndDelete(id);
    res.json({ msg: "Đánh giá đã bị xóa" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
