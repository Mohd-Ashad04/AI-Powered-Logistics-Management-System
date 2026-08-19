import { apiRequest } from './client';

export const analyticsApi = {
  getSummary: () => apiRequest("/orders/analytics/summary")
};
