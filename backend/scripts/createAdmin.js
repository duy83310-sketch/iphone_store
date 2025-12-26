const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");

async function createAdmin() {
  try {
    console.log("MONGO_URI =", process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);

    const email = "admin@shop.com".toLowerCase().trim();
    const password = "yuzuha";

    let admin = await User.findOne({ email });
    if (admin) {
      console.log("❌ Admin already exists");

      // Ensure existing admin has correct role
      if (!admin.role || String(admin.role).toLowerCase() !== 'admin') {
        admin = await User.findByIdAndUpdate(admin._id, { $set: { role: 'admin' } }, { new: true }).lean();
        console.log("🔧 Updated existing admin role to 'admin'.");
      }

      console.log("Email:", email);
      console.log("Role:", admin.role);
      await mongoose.disconnect();
      process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 10);

    admin = await User.create({
      name: "Admin",
      email,
      password: hashed,
      role: "admin"
    });

    // Double-check and force role if needed using updateOne then re-fetch full document
    if (!admin.role || String(admin.role).toLowerCase() !== 'admin') {
      await User.updateOne({ _id: admin._id }, { $set: { role: 'admin' } });
    }

    // Re-fetch full document using Mongoose and log it to verify persisted fields
    const fullDoc = await User.findById(admin._id).lean();

    console.log("✅ Tạo admin thành công");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Saved document (mongoose):", fullDoc);

    // Also use raw MongoDB driver to inspect the exact stored document
    const coll = mongoose.connection.db.collection('users');
    const rawDoc = await coll.findOne({ _id: admin._id });
    console.log("Saved document (raw):", rawDoc);

    // If role is still missing, attempt to fix all existing users without role (migrate)
    if (!fullDoc.role || !rawDoc.role) {
      console.warn("Role is still missing after update. Running migration to set default roles for users without role...");

      const migrationRes = await coll.updateMany({ role: { $exists: false } }, { $set: { role: 'client' } });
      console.log("Migration result (raw):", migrationRes);

      // Ensure this admin has correct role using raw update
      await coll.updateOne({ _id: admin._id }, { $set: { role: 'admin' } });

      const finalRaw = await coll.findOne({ _id: admin._id });
      console.log("Final document (raw after migration):", finalRaw);

      const finalDoc = await User.findById(admin._id).lean();
      console.log("Final document (mongoose after migration):", finalDoc);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('createAdmin error', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

createAdmin();
