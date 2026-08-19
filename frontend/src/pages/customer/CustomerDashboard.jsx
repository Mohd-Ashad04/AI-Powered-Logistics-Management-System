import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useCustomerOrders } from '../../hooks/useOrders';
import { StatCard } from '../../components/dashboard/StatCard';
import { Card, StatusBadge } from '../../components/ui/DataDisplay';
import { Button } from '../../components/ui/Button';
import { Package, Truck, CheckCircle2, Navigation } from 'lucide-react';
import { Spinner, ErrorState, EmptyState } from '../../components/ui/Feedback';
import { Table } from '../../components/ui/DataDisplay';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: orders, isLoading, isError } = useCustomerOrders(user?._id);

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState title="Failed to load dashboard" description="There was an error fetching your orders." />;

  const safeOrders = Array.isArray(orders) ? orders : [];
  
  const totalOrders = safeOrders.length;
  const activeOrders = safeOrders.filter(o => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.status)).length;
  const deliveredOrders = safeOrders.filter(o => o.status === 'DELIVERED').length;

  const recentOrders = safeOrders.slice(0, 5);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-text-primary)' }}>Welcome, {user?.name || 'Customer'}</h1>
          <p className="ui-card-description">Here is the current status of your shipments.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button variant="outline" onClick={() => navigate('/app/customer/tracking')}>Track Shipment</Button>
          <Button variant="primary" onClick={() => navigate('/app/customer/create-shipment')}>Create Shipment</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard
          title="Total Shipments"
          value={totalOrders}
          icon={Package}
          iconColor="var(--color-accent-primary)"
        />
        <StatCard
          title="Active Shipments"
          value={activeOrders}
          icon={Truck}
          iconColor="var(--color-warning-text)"
        />
        <StatCard
          title="Delivered"
          value={deliveredOrders}
          icon={CheckCircle2}
          iconColor="var(--color-success-text)"
        />
      </div>

      <Card elevated>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)' }}>Recent Shipments</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/customer/shipments')}>View All</Button>
        </div>
        
        {recentOrders.length === 0 ? (
          <EmptyState 
            icon={Package} 
            title="No recent shipments" 
            description="You haven't created any shipments recently."
            action={<Button variant="primary" onClick={() => navigate('/app/customer/create-shipment')}>Create One Now</Button>}
          />
        ) : (
          <div className="ui-table-container">
            <Table>
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Destination</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order._id}>
                    <td style={{ fontWeight: 500 }}>{order.sellerOrderId}</td>
                    <td>{order.recipientDetails?.address?.city || 'N/A'}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>{formatCurrency(order.shippingDetails?.rate?.chargedToSeller_inr || order.paymentDetails?.totalValue)}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/app/customer/shipments/${order._id}`)}>
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
