import React from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { Card } from '../../components/ui';
import { PageHeader } from '../../components/layout/PageHeader';

export default function AgentProfile() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Agent Profile" 
        subtitle="Manage your profile information."
      />
      
      <Card className="p-6 max-w-2xl">
        <div className="flex items-center space-x-4 mb-6 pb-6 border-b">
          <div className="h-16 w-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-2xl font-bold">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Phone Number</h3>
            <p className="mt-1 text-base text-gray-900">{user?.phone || 'Not provided'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Role</h3>
            <p className="mt-1 text-base text-gray-900 capitalize text-brand-600 font-medium">
              Delivery Agent
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Linked Agent ID</h3>
            <p className="mt-1 text-base text-gray-900 font-mono text-sm">
              {user?.linkedAgentId || 'Not connected'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
