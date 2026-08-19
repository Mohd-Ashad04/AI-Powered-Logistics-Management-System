import { apiRequest } from './client';

export const authApi = {
  login: (credentials) => apiRequest("/auth/login", { method: "POST", body: credentials }),
  register: (userData) => apiRequest("/auth/register", { method: "POST", body: userData }),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
  getProfile: () => apiRequest("/auth/me")
};
