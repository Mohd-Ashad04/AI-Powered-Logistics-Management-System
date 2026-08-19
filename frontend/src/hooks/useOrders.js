import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api/client';
import { queryKeys } from '../services/api/queryKeys';

// --- CUSTOMER QUERIES ---

export function useCustomerOrders(customerId) {
  return useQuery({
    queryKey: queryKeys.customerOrders(customerId),
    queryFn: async () => {
      if (!customerId) return [];
      const response = await apiRequest(`/orders/customer/${customerId}`);
      return response?.data?.orders || [];
    },
    enabled: !!customerId,
  });
}

export function useOrderTracking(trackingId) {
  return useQuery({
    queryKey: queryKeys.orderTracking(trackingId),
    queryFn: async () => {
      if (!trackingId) return null;
      const response = await apiRequest(`/orders/tracking/${trackingId}`);
      return response?.data;
    },
    enabled: !!trackingId,
    retry: false
  });
}

// --- MUTATIONS ---

export function useOrderDetail(orderId) {
  return useQuery({
    queryKey: queryKeys.orderDetail(orderId),
    queryFn: async () => {
      if (!orderId) return null;
      const response = await apiRequest(`/orders/${orderId}`);
      return response?.data;
    },
    enabled: !!orderId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderData) => {
      const response = await apiRequest('/orders', {
        method: 'POST',
        body: orderData
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    }
  });
}

export function usePricingEstimate() {
  return useMutation({
    mutationFn: async (estimateData) => {
      const response = await apiRequest('/pricing/estimate', {
        method: 'POST',
        body: estimateData
      });
      return response?.data;
    }
  });
}
