import React from 'react';
import { useWorkflow } from '../../hooks/useWorkflow';
import { Card } from '../../components/ui';
import { Spinner } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/layout/PageHeader';

export default function AgentDashboard() {
  const { agentOrdersQuery } = useWorkflow();
  const { data: orderData, isLoading, error } = agentOrdersQuery;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Error loading dashboard: {error.message}
      </div>
    );
  }

  const orders = orderData?.orders || [];
  
  const pendingPickup = orders.filter(o => o.status === 'ASSIGNED_PICKUP').length;
  const outForDelivery = orders.filter(o => o.status === 'OUT_FOR_DELIVERY').length;
  const completed = orders.filter(o => ['PICKED_UP', 'DELIVERED'].includes(o.status)).length;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Agent Dashboard" 
        subtitle="Overview of your daily assignments."
      />
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white">
          <h3 className="text-sm font-medium text-blue-600">Pending Pickups</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{pendingPickup}</p>
        </Card>
        
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-white">
          <h3 className="text-sm font-medium text-yellow-600">Out for Delivery</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{outForDelivery}</p>
        </Card>
        
        <Card className="p-6 bg-gradient-to-br from-green-50 to-white">
          <h3 className="text-sm font-medium text-green-600">Completed Today</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{completed}</p>
        </Card>
      </div>
    </div>
  );
}
