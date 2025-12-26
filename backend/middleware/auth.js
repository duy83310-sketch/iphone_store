const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

async function requireAuth(req, res, next) {
  // Hỗ trợ cả Authorization Bearer và x-auth-token
  let token = req.headers["x-auth-token"];

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ msg: "Không có token" });
  }


  try {
    const decoded = jwt.verify(token, "SECRET_KEY"); // TODO: đưa vào .env sau
    const userId = decoded.id;

    // fetch user to get role
    const user = await User.findById(userId).lean();
    if (!user) return res.status(401).json({ msg: "Người dùng không tồn tại" });

    // { changed code } block disabled accounts
    if (String(user.status || 'active') === 'disabled') {
      return res.status(403).json({ msg: "Tài khoản của bạn đã bị vô hiệu hóa" });
    }

    req.userId = userId;
    req.user = userId; // backward compat for older handlers
    req.userRole = user.role || "client";
    next();
  } catch (err) {
    console.error('auth verify', err);
    return res.status(400).json({ msg: "Token không hợp lệ" });
  }
}

// Middleware: require admin role
function requireAdmin(req, res, next) {
  // First verify authentication (we can't call requireAuth directly as a middleware here), so check req.userRole which should be set by requireAuth when used in the route chain
  // This helper is meant to be used after requireAuth in routes, or call requireAuth then requireAdmin in the route definition.
  if (!req.userRole) {
    return res.status(401).json({ msg: 'Không có token' });
  }
  if (String(req.userRole).toLowerCase() !== 'admin') {
    return res.status(403).json({ msg: 'Quyền truy cập bị từ chối' });
  }
  next();
}

// Middleware: allow admin OR staff
function requireAdminOrStaff(req, res, next) {
  if (!req.userRole) {
    return res.status(401).json({ msg: 'Không có token' });
  }
  const r = String(req.userRole).toLowerCase();
  if (r !== 'admin' && r !== 'staff') {
    return res.status(403).json({ msg: 'Quyền truy cập bị từ chối' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireAdminOrStaff };
