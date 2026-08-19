import React, { useState } from 'react';
import { useOrderTracking } from '../../hooks/useOrders';
import { Card, StatusBadge } from '../../components/ui/DataDisplay';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Spinner, ErrorState, EmptyState } from '../../components/ui/Feedback';
import { Search, Package, MapPin, Clock } from 'lucide-react';

export default function TrackingPage() {
  const [searchInput, setSearchInput] = useState('');
  const [trackingId, setTrackingId] = useState(null);

  const { data: order, isLoading, isError, error } = useOrderTracking(trackingId);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setTrackingId(searchInput.trim().toUpperCase());
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'var(--font-size-3xl)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>Track Your Shipment</h1>
        <p className="ui-card-description">Enter your tracking ID to get real-time updates.</p>
      </div>

      <Card elevated style={{ marginBottom: 'var(--space-6)' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input 
              label="Tracking ID" 
              placeholder="e.g. TRK-12345678" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <Spinner size={20} className="text-white" /> : 'Track'}
          </Button>
        </form>
      </Card>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <Spinner size={40} />
          <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-muted)' }}>Locating shipment...</p>
        </div>
      )}

      {isError && (
        <ErrorState 
          title="Shipment Not Found" 
          description={error?.message || "We couldn't find a shipment with that tracking ID. Please check and try again."} 
        />
      )}

      {!isLoading && !isError && trackingId && !order && (
        <EmptyState 
          icon={Search} 
          title="No Results" 
          description="We couldn't find any information for this tracking ID." 
        />
      )}

      {order && (
        <div className="animate-fade-in">
          <Card elevated style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>{order.sellerOrderId}</h2>
                <p className="ui-card-description">Last updated: {new Date(order.updatedAt).toLocaleString()}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>From</p>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <MapPin size={18} className="text-accent-primary" />
                  <div>
                    <p style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{order.pickupAddress?.city || 'Origin'}</p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{order.pickupAddress?.state || ''}</p>
                  </div>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>To</p>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <MapPin size={18} className="text-info-text" />
                  <div>
                    <p style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{order.recipientDetails?.address?.city || 'Destination'}</p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{order.recipientDetails?.address?.state || ''}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card elevated>
            <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>Tracking History</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* If backend returns history array, we map it here. For now, simulate history from status if array is empty */}
              {order.trackingHistory && order.trackingHistory.length > 0 ? (
                order.trackingHistory.map((event, index) => (
                  <div key={index} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: index === 0 ? 'var(--color-accent-primary)' : 'var(--color-border-strong)' }}></div>
                      {index !== order.trackingHistory.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: 'var(--color-border-subtle)', margin: '4px 0' }}></div>}
                    </div>
                    <div>
                      <p style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{event.status}</p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{event.location}</p>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{new Date(event.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-accent-primary)' }}></div>
                  </div>
                  <div>
                    <p style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{order.status}</p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{new Date(order.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
