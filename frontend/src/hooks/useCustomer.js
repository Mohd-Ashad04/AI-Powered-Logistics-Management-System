import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api/client';
import { queryKeys } from '../services/api/queryKeys';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData) => {
      const response = await apiRequest('/auth/me', {
        method: 'PUT',
        body: profileData
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      // We also rely on AuthContext to hold profile state, 
      // but TanStack handles the server state validation.
      // Ideally AuthContext should reload, but for now we'll invalidate the key.
    }
  });
}
