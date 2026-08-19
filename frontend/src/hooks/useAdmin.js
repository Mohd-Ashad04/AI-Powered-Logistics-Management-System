import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api/client';
import { queryKeys } from '../services/api/queryKeys';

// --- ADMIN QUERIES ---

export function useAdminAnalytics() {
  return useQuery({
    queryKey: queryKeys.adminAnalytics,
    queryFn: async () => {
      const response = await apiRequest('/orders/analytics/summary');
      return response?.data;
    }
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: queryKeys.adminOrders,
    queryFn: async () => {
      const response = await apiRequest('/orders');
      return response?.data || [];
    }
  });
}

export function useAdminCustomers() {
  return useQuery({
    queryKey: queryKeys.adminCustomers,
    queryFn: async () => {
      const response = await apiRequest('/customers');
      return response?.data || [];
    }
  });
}

export function useAdminFleet() {
  return useQuery({
    queryKey: queryKeys.adminFleet,
    queryFn: async () => {
      const response = await apiRequest('/delivery/vehicles');
      return response?.data || [];
    }
  });
}

export function useAdminHubs() {
  return useQuery({
    queryKey: queryKeys.adminHubs,
    queryFn: async () => {
      const response = await apiRequest('/delivery/hubs');
      return response?.data || [];
    }
  });
}

// --- ADMIN MUTATIONS ---

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status, trackingUpdate }) => {
      const response = await apiRequest(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: { status, trackingUpdate }
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders });
      queryClient.invalidateQueries({ queryKey: queryKeys.orderDetail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminAnalytics });
    }
  });
}
