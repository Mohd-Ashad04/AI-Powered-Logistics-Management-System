import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkflow } from '../../hooks/useWorkflow';
import { Card } from '../../components/ui';
import { Spinner } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/layout/PageHeader';

export default function AgentOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { agentOrdersQuery, completePickupMutation, completeDeliveryMutation } = useWorkflow();
  const { data: orderData, isLoading } = agentOrdersQuery;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  const order = orderData?.orders?.find(o => o._id === orderId);

  if (!order) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Assignment not found or you do not have permission to view it.
      </div>
    );
  }

  const handlePickup = async () => {
    try {
      await completePickupMutation.mutateAsync(orderId);
      navigate('/app/agent/assignments');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete pickup');
    }
  };

  const handleDelivery = async () => {
    try {
      await completeDeliveryMutation.mutateAsync(orderId);
      navigate('/app/agent/assignments');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete delivery');
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate('/app/agent/assignments')}
        className="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center"
      >
        &larr; Back to Assignments
      </button>

      <PageHeader 
        title={`Assignment: ${order.sellerOrderId}`} 
        subtitle={`Current Status: ${order.status.replace(/_/g, ' ')}`}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Pickup Information</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Name:</strong> {order.customerId?.name || 'Customer'}</p>
            <p><strong>Phone:</strong> {order.pickupAddress?.phone || order.customerId?.phone}</p>
            <p><strong>Address:</strong> {order.pickupAddress?.addressLine1}</p>
            <p><strong>City:</strong> {order.pickupAddress?.city}, {order.pickupAddress?.state}</p>
            <p><strong>Pincode:</strong> {order.pickupAddress?.pincode}</p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Delivery Information</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Recipient:</strong> {order.recipientDetails?.name}</p>
            <p><strong>Phone:</strong> {order.recipientDetails?.phone}</p>
            <p><strong>Address:</strong> {order.recipientDetails?.address?.addressLine1}</p>
            <p><strong>City:</strong> {order.recipientDetails?.address?.city}, {order.recipientDetails?.address?.state}</p>
            <p><strong>Pincode:</strong> {order.recipientDetails?.address?.pincode}</p>
          </div>
        </Card>
      </div>
      
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Package Details</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Weight:</strong> {order.packageDetails?.deadWeight_kg} kg</p>
          <p><strong>Type:</strong> {order.orderType}</p>
          <p><strong>Payment Method:</strong> {order.paymentDetails?.method}</p>
        </div>
      </Card>

      <div className="flex justify-end pt-4">
        {order.status === 'ASSIGNED_PICKUP' && (
          <button 
            onClick={handlePickup}
            disabled={completePickupMutation.isPending}
            className="px-6 py-2 bg-brand-600 text-white rounded-md font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {completePickupMutation.isPending ? 'Processing...' : 'Complete Pickup'}
          </button>
        )}
        
        {order.status === 'OUT_FOR_DELIVERY' && (
          <button 
            onClick={handleDelivery}
            disabled={completeDeliveryMutation.isPending}
            className="px-6 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {completeDeliveryMutation.isPending ? 'Processing...' : 'Complete Delivery'}
          </button>
        )}
      </div>
    </div>
  );
}
