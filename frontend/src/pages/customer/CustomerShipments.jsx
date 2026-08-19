import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useCustomerOrders } from '../../hooks/useOrders';
import { Card, StatusBadge, Table } from '../../components/ui/DataDisplay';
import { Button } from '../../components/ui/Button';
import { Spinner, ErrorState, EmptyState } from '../../components/ui/Feedback';
import { Input } from '../../components/ui/Form';
import { Package, Search } from 'lucide-react';

export default function CustomerShipments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: orders, isLoading, isError } = useCustomerOrders(user?._id);
  const [search, setSearch] = useState('');

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState title="Failed to load shipments" description="We could not fetch your shipment history." />;

  const safeOrders = Array.isArray(orders) ? orders : [];
  
  const filteredOrders = safeOrders.filter(order => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      order.sellerOrderId?.toLowerCase().includes(s) ||
      order.recipientDetails?.address?.city?.toLowerCase().includes(s)
    );
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-text-primary)' }}>My Shipments</h1>
          <p className="ui-card-description">View and manage all your past and active shipments.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/app/customer/create-shipment')}>Create Shipment</Button>
      </div>

      <Card elevated>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div style={{ position: 'relative', maxWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search tracking ID or city..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ui-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState 
            icon={Package} 
            title="No shipments found" 
            description={search ? "We couldn't find any shipments matching your search." : "You don't have any shipments yet."}
          />
        ) : (
          <div className="ui-table-container">
            <Table>
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order._id}>
                    <td style={{ fontWeight: 500 }}>{order.sellerOrderId}</td>
                    <td>{order.pickupAddress?.city || 'N/A'}</td>
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
