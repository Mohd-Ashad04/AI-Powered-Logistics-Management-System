import { apiRequest } from './client';

export const pricingApi = {
  getEstimate: (estimateData) => apiRequest("/pricing/estimate", { method: "POST", body: estimateData })
};
