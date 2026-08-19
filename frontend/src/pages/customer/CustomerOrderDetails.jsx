import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderDetail } from '../../hooks/useOrders';
import { Card, StatusBadge } from '../../components/ui/DataDisplay';
import { Button, IconButton } from '../../components/ui/Button';
import { Spinner, ErrorState } from '../../components/ui/Feedback';
import { ArrowLeft, MapPin, Package, CreditCard, Clock } from 'lucide-react';

export default function CustomerOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { data: order, isLoading, isError } = useOrderDetail(orderId);

  if (isLoading) return <Spinner />;
  if (isError || !order) return <ErrorState title="Order Not Found" description="We could not locate this shipment." />;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <IconButton icon={ArrowLeft} onClick={() => navigate('/app/customer/shipments')} variant="ghost" aria-label="Back to shipments" />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-text-primary)' }}>Shipment Details</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="ui-card-description">Tracking ID: {order.sellerOrderId}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        
        {/* Origin & Destination */}
        <Card elevated>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <MapPin size={20} className="text-accent-primary" />
            <h3 className="ui-card-title">Routing Information</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <p className="ui-card-description" style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>Pickup Address</p>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{order.pickupAddress?.addressLine1}</p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {order.pickupAddress?.city}, {order.pickupAddress?.state} {order.pickupAddress?.pincode}
              </p>
            </div>
            <div style={{ borderLeft: '2px dashed var(--color-border-subtle)', marginLeft: 'var(--space-2)', height: '24px' }}></div>
            <div>
              <p className="ui-card-description" style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>Delivery Address</p>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{order.recipientDetails?.address?.addressLine1}</p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {order.recipientDetails?.address?.city}, {order.recipientDetails?.address?.state} {order.recipientDetails?.address?.pincode}
              </p>
            </div>
          </div>
        </Card>

        {/* Package Details */}
        <Card elevated>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <Package size={20} className="text-info-text" />
            <h3 className="ui-card-title">Package Details</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="ui-card-description">Weight:</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{order.packageDetails?.deadWeight_kg} kg</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="ui-card-description">Dimensions:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>
                {order.packageDetails?.dimensions_cm?.length} x {order.packageDetails?.dimensions_cm?.width} x {order.packageDetails?.dimensions_cm?.height} cm
              </span>
            </div>
            {order.packageDetails?.items?.[0]?.category && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="ui-card-description">Category:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{order.packageDetails?.items[0].category}</span>
              </div>
            )}
            {order.packageDetails?.fragile && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>FRAGILE</span>
              </div>
            )}
          </div>
        </Card>

        {/* Pricing */}
        <Card elevated>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <CreditCard size={20} className="text-success-text" />
            <h3 className="ui-card-title">Pricing Details</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="ui-card-description">Declared Value:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(order.paymentDetails?.totalValue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="ui-card-description">Payment Method:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{order.paymentDetails?.method}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="ui-card-description">Payment Status:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{order.paymentDetails?.paymentStatus}</span>
            </div>
            {order.shippingDetails?.rate?.fuelSurcharge !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="ui-card-description">Fuel Surcharge:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(order.shippingDetails?.rate?.fuelSurcharge)}</span>
              </div>
            )}
            {order.shippingDetails?.rate?.handlingCharges !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="ui-card-description">Handling Charges:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(order.shippingDetails?.rate?.handlingCharges)}</span>
              </div>
            )}
            {order.shippingDetails?.rate?.codCharges !== undefined && order.shippingDetails?.rate?.codCharges > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="ui-card-description">COD Charges:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(order.shippingDetails?.rate?.codCharges)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}>Shipping Total:</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}>{formatCurrency(order.shippingDetails?.rate?.chargedToSeller_inr)}</span>
            </div>
          </div>
        </Card>
        
      </div>
    </div>
  );
}
