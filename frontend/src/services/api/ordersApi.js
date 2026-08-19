import { apiRequest } from './client';

export const ordersApi = {
  getOrders: (page = 1, limit = 100) => apiRequest(`/orders?page=${page}&limit=${limit}`),
  createOrder: (orderData) => apiRequest("/orders", { method: "POST", body: orderData }),
  deleteOrder: (orderId) => apiRequest(`/orders/${orderId}`, { method: "DELETE" }),
  assignOrder: (orderId, assignmentData) => apiRequest(`/orders/${orderId}/assign`, { method: "PUT", body: assignmentData }),
  updateStatus: (orderId, statusData) => apiRequest(`/orders/${orderId}/status`, { method: "PUT", body: statusData })
};
