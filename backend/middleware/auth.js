const jwt = require("jsonwebtoken");

module.exports = function(req, res, next) {
  const token = req.header("x-auth-token");

  if (!token) return res.status(401).json({ msg: "Không có token" });

  try {
    const decoded = jwt.verify(token, "SECRET_KEY");
    req.user = decoded.id;
    next();
  } catch (err) {
    res.status(400).json({ msg: "Token không hợp lệ" });
  }
};
