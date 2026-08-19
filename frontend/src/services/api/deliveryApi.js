import { apiRequest } from './client';

export const deliveryApi = {
  getHubs: () => apiRequest("/delivery/hubs"),
  getVehicles: () => apiRequest("/delivery/vehicles"),
  getAgents: () => apiRequest("/delivery/agents")
};
