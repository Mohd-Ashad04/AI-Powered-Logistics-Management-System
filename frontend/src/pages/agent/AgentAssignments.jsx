import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflow } from '../../hooks/useWorkflow';
import { Card } from '../../components/ui';
import { Spinner } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/layout/PageHeader';

export default function AgentAssignments() {
  const navigate = useNavigate();
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
        Error loading assignments: {error.message}
      </div>
    );
  }

  const orders = orderData?.orders || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Assignments" 
        subtitle="Active pickup and delivery tasks."
      />
      
      {orders.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          No active assignments right now.
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card 
              key={order._id} 
              className="p-6 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-brand-600"
              onClick={() => navigate(`/app/agent/assignments/${order._id}`)}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-semibold text-gray-900">{order.sellerOrderId}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'ASSIGNED_PICKUP' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'OUT_FOR_DELIVERY' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <span>
                      {order.status === 'ASSIGNED_PICKUP' 
                        ? `${order.pickupAddress?.city}, ${order.pickupAddress?.state}`
                        : `${order.recipientDetails?.address?.city}, ${order.recipientDetails?.address?.state}`
                      }
                    </span>
                  </div>
                </div>
                <div className="mt-4 md:mt-0">
                  <button className="text-brand-600 hover:text-brand-700 font-medium text-sm">
                    View Details &rarr;
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
