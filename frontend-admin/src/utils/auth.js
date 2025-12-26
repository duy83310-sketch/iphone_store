export const isLoggedIn = () => {
  return !!localStorage.getItem("token");
};

export const isAdmin = () => {
  return localStorage.getItem("userRole") === "admin";
};

export const isStaff = () => {
  return localStorage.getItem("userRole") === "staff";
};

export const loginUser = (token, role) => {
  localStorage.setItem("token", token);
  // Normalize and set role; if no role provided, clear any stale role
  if (role) localStorage.setItem("userRole", String(role).toLowerCase());
  else localStorage.removeItem("userRole");
};

export const logoutAll = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userRole");
};

// Backwards-compatible helper for older code that expected `logoutAdmin`
export const logoutAdmin = () => logoutAll();
