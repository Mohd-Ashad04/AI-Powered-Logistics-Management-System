import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthContext';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const workflowApi = {
  getAgentOrders: async (agentId, token) => {
    const res = await fetch(`${API_URL}/workflow/agents/${agentId}/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch');
    return data.data;
  },
  completePickup: async ({ orderId, agentId, token }) => {
    const res = await fetch(`${API_URL}/workflow/orders/${orderId}/complete-pickup`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update');
    return data;
  },
  completeDelivery: async ({ orderId, agentId, token }) => {
    const res = await fetch(`${API_URL}/workflow/orders/${orderId}/complete-delivery`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, deliveryNotes: 'Delivered successfully' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update');
    return data;
  }
};

export const useWorkflow = () => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const agentId = user?.linkedAgentId;

  const agentOrdersQuery = useQuery({
    queryKey: ['agentOrders', agentId],
    queryFn: () => workflowApi.getAgentOrders(agentId, token),
    enabled: !!agentId && !!token
  });

  const completePickupMutation = useMutation({
    mutationFn: (orderId) => workflowApi.completePickup({ orderId, agentId, token }),
    onSuccess: () => {
      queryClient.invalidateQueries(['agentOrders', agentId]);
    }
  });

  const completeDeliveryMutation = useMutation({
    mutationFn: (orderId) => workflowApi.completeDelivery({ orderId, agentId, token }),
    onSuccess: () => {
      queryClient.invalidateQueries(['agentOrders', agentId]);
    }
  });

  return {
    agentOrdersQuery,
    completePickupMutation,
    completeDeliveryMutation,
    agentId
  };
};
