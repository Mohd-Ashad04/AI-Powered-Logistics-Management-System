import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../../services/api/ordersApi';
import { useAuth } from '../auth/AuthContext';

export function useShipments(page = 1, limit = 100) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['shipments', page, limit],
    queryFn: async () => {
      const response = await ordersApi.getOrders(page, limit);
      return Array.isArray(response?.data) ? response.data : [];
    },
    enabled: isAuthenticated,
  });
}
