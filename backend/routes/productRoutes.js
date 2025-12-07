const express = require("express");
const Product = require("../models/productModel");

const router = express.Router();

// GET all products
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};

    if (search) {
      query = {
        name: { $regex: search, $options: "i" } //match input
      };
    }

    const products = await Product.find(query).lean();
    res.json(products);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// GET one product by id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
