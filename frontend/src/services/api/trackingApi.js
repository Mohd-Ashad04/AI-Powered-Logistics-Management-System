import { apiRequest } from './client';

export const trackingApi = {
  getTracking: (trackingId) => apiRequest(`/orders/tracking/${encodeURIComponent(trackingId)}`)
};
