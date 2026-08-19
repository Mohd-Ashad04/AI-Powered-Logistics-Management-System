export const queryKeys = {
  // Auth & Profile
  profile: ['profile'],
  
  // Customer
  customerOrders: (customerId) => ['customer', 'orders', customerId],
  customerOrderAnalytics: (customerId) => ['customer', 'analytics', customerId],
  orderTracking: (trackingId) => ['tracking', trackingId],
  
  // Admin
  adminOrders: ['admin', 'orders'],
  adminAnalytics: ['admin', 'analytics'],
  adminCustomers: ['admin', 'customers'],
  adminFleet: ['admin', 'vehicles'],
  adminHubs: ['admin', 'hubs'],
  
  // Single Entity
  orderDetail: (orderId) => ['order', orderId],
  customerDetail: (customerId) => ['customer', customerId],
  
  // Agent (Blocked / Unavailable, but prepared structurally)
  agentAssignments: (agentId) => ['agent', 'assignments', agentId],
};
