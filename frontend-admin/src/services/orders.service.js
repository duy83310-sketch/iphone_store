import axiosClient from "./axiosClient";

// Fetch orders for admin listing. Supports pagination and optional userId filter.
// Usage: fetchOrders({ page: 1, limit: 10, userId })
export async function fetchOrders({ page = 1, limit = 7, userId = null, status = null } = {}) {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const params = { page, limit };
  if (userId) params.userId = userId;
  if (status) params.status = status;

  const res = await axiosClient.get('/orders/admin', { params, headers });

  // Normalize response if backend returned an array
  if (Array.isArray(res.data)) {
    const total = res.data.length;
    const start = (page - 1) * limit;
    const data = res.data.slice(start, start + limit);
    return { data, total };
  }

  // Expecting { data, total }
  return res.data;
}

// Update order status (admin)
export async function updateOrderStatus(orderId, status) {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  const res = await axiosClient.patch(`/orders/${orderId}/status`, { status }, { headers });
  return res.data;
}

// Fetch single order detail
export async function fetchOrder(orderId) {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axiosClient.get(`/orders/${orderId}`, { headers });
  return res.data;
}

// Delete single order (admin)
export async function deleteOrder(orderId) {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axiosClient.delete(`/orders/${orderId}`, { headers });
  return res.data;
}

// Batch delete orders (admin)
export async function deleteOrders(ids = []) {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  const res = await axiosClient.post(`/orders/batch-delete`, { ids }, { headers });
  return res.data;
}

