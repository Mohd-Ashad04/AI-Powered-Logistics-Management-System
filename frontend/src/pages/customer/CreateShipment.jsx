import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useCreateOrder, usePricingEstimate } from '../../hooks/useOrders';
import { Card } from '../../components/ui/DataDisplay';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Spinner, ErrorState } from '../../components/ui/Feedback';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

import LocationAutocomplete from '../../features/locations/components/LocationAutocomplete';

export default function CreateShipment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const createOrder = useCreateOrder();
  const getEstimate = usePricingEstimate();

  const [form, setForm] = useState({
    pickupAddressLine1: '',
    pickupLocation: null,
    recipientName: '',
    recipientPhone: '',
    deliveryAddressLine1: '',
    deliveryLocation: null,
    packageWeight: '',
    declaredValue: '',
    paymentMethod: '',
    fragile: false
  });

  const [estimate, setEstimate] = useState(null);
  const [estimateError, setEstimateError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [routeEstimate, setRouteEstimate] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(null);

  useEffect(() => {
    if (form.pickupLocation && !form.pickupLocation.resolved && resolvingLocation !== 'pickup') {
      resolveLocationAPI(form.pickupLocation, 'pickup');
    }
  }, [form.pickupLocation]);

  useEffect(() => {
    if (form.deliveryLocation && !form.deliveryLocation.resolved && resolvingLocation !== 'delivery') {
      resolveLocationAPI(form.deliveryLocation, 'delivery');
    }
  }, [form.deliveryLocation]);

  const resolveLocationAPI = async (location, type) => {
    try {
      setResolvingLocation(type);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await fetch(`${API_BASE}/locations/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: location.city, state: location.state, country: location.country })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) throw new Error(data.error?.message || data.message || "Failed to resolve location");
      
      if (type === 'pickup') {
        setForm(prev => ({ ...prev, pickupLocation: data.data }));
      } else {
        setForm(prev => ({ ...prev, deliveryLocation: data.data }));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(`Unable to resolve ${type} location. Please select another suggestion.`);
      if (type === 'pickup') {
        setForm(prev => ({ ...prev, pickupLocation: { ...prev.pickupLocation, resolveFailed: true } }));
      } else {
        setForm(prev => ({ ...prev, deliveryLocation: { ...prev.deliveryLocation, resolveFailed: true } }));
      }
    } finally {
      setResolvingLocation(null);
    }
  };

  useEffect(() => {
    if (form.pickupLocation?.resolved && form.deliveryLocation?.resolved) {
      calculateRouteAPI(form.pickupLocation, form.deliveryLocation);
    } else {
      setRouteEstimate(null);
    }
  }, [form.pickupLocation?.resolved, form.deliveryLocation?.resolved]);

  const calculateRouteAPI = async (pickup, delivery) => {
    try {
      setIsRouting(true);
      setRouteError(null);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await fetch(`${API_BASE}/routing/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: pickup, destination: delivery, profile: 'driving-car' })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) throw new Error(data.error?.message || data.message || "Unable to calculate route right now.");
      
      setRouteEstimate(data.data);
    } catch (err) {
      console.error(err);
      setRouteError(err.message);
      setRouteEstimate(null);
    } finally {
      setIsRouting(false);
    }
  };

  const fetchEstimate = async () => {
    if (!form.pickupLocation || !form.deliveryLocation || !form.packageWeight || !form.paymentMethod) return;
    
    // Stop if external resolution is required
    if (!form.pickupLocation.resolved || !form.deliveryLocation.resolved || routeError) {
      setEstimateError(routeError ? "Unable to estimate pricing without a valid route." : "Please wait while we resolve precise location coordinates...");
      return;
    }
    
    setEstimateError(null);
    const pickupCity = form.pickupLocation;
    const deliveryCity = form.deliveryLocation;
    
    try {
      const data = await getEstimate.mutateAsync({
        pickupAddress: { city: pickupCity.city, state: pickupCity.state, pincode: pickupCity.pincode },
        deliveryAddress: { city: deliveryCity.city, state: deliveryCity.state, pincode: deliveryCity.pincode },
        packageDetails: { deadWeight_kg: Number(form.packageWeight) },
        paymentDetails: { method: form.paymentMethod },
        orderType: form.fragile ? "HANDLE_WITH_CARE" : "NORMAL"
      });
      setEstimate(data?.pricing);
    } catch (err) {
      console.error("Failed to fetch estimate", err);
      setEstimateError(err.message || "Failed to calculate pricing estimate.");
      setEstimate(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEstimate();
    }, 500);
    return () => clearTimeout(timer);
  }, [form.pickupLocation?.resolved, form.deliveryLocation?.resolved, form.packageWeight, form.fragile, form.paymentMethod, routeEstimate, routeError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.recipientPhone.trim())) {
      setErrorMessage("Invalid recipient phone. Must be a 10-digit Indian mobile number starting with 6-9.");
      return;
    }

    if (!form.pickupLocation?.resolved || !form.deliveryLocation?.resolved) {
      setErrorMessage("Both Origin and Destination locations must be resolved before creating a shipment.");
      return;
    }

    const pickupCity = form.pickupLocation;
    const deliveryCity = form.deliveryLocation;
    
    const declaredValue = Number(form.declaredValue);
    const packageWeight = Number(form.packageWeight);

    const orderPayload = {
      customerId: user?._id,
      pickupAddress: {
        addressLine1: form.pickupAddressLine1.trim(),
        city: pickupCity.city,
        state: pickupCity.state,
        pincode: pickupCity.pincode,
        country: "India",
        phone: user?.phone || form.recipientPhone.trim(),
      },
      recipientDetails: {
        name: form.recipientName.trim(),
        phone: form.recipientPhone.trim(),
        email: user?.email || "",
        address: {
          addressLine1: form.deliveryAddressLine1.trim(),
          city: deliveryCity.city,
          state: deliveryCity.state,
          pincode: deliveryCity.pincode,
          country: "India",
        },
      },
      packageDetails: {
        items: [
          {
            name: "Shipment Package",
            weight: packageWeight,
            quantity: 1,
            price: declaredValue,
            weight_grams: Math.round(packageWeight * 1000)
          },
        ],
        deadWeight_kg: packageWeight,
        dimensions_cm: { length: 30, width: 20, height: 15 }
      },
      paymentDetails: {
        method: form.paymentMethod,
        totalValue: declaredValue,
        codAmount: form.paymentMethod === "COD" ? declaredValue : 0,
      },
      orderType: form.fragile ? "HANDLE_WITH_CARE" : "NORMAL",
      priority: "MEDIUM",
    };

    try {
      const response = await createOrder.mutateAsync(orderPayload);
      const createdOrder = response?.data?.order || response?.data;
      if (createdOrder) {
        setSuccessMessage(`Shipment created successfully! Tracking ID: ${createdOrder.trackingId || createdOrder.sellerOrderId || createdOrder._id}`);
        setTimeout(() => {
          navigate(`/app/customer/shipments/${createdOrder._id}`);
        }, 2000);
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to create shipment");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  if (successMessage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', textAlign: 'center' }}>
        <CheckCircle2 size={64} className="text-success-text" style={{ marginBottom: 'var(--space-4)' }} />
        <h2 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-text-primary)' }}>Success!</h2>
        <p className="ui-card-description" style={{ marginTop: 'var(--space-2)' }}>{successMessage}</p>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-4)' }}>Redirecting to shipment details...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>Create Shipment</h1>
        <p className="ui-card-description">Enter pickup, delivery, and package details to book a new shipment.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--space-6)', alignItems: 'start' }}>
        <Card elevated>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            
            {/* Origin Details */}
            <div>
              <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-2)' }}>Origin Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <Input 
                  label="Pickup Address" 
                  value={form.pickupAddressLine1} 
                  onChange={e => setForm({...form, pickupAddressLine1: e.target.value})} 
                  required 
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <LocationAutocomplete
                    label="Pickup Location"
                    value={form.pickupLocation}
                    onChange={loc => setForm({...form, pickupLocation: loc})}
                    placeholder="Search city, area or PIN"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Destination Details */}
            <div>
              <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-2)' }}>Destination Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <Input 
                  label="Recipient Name" 
                  value={form.recipientName} 
                  onChange={e => setForm({...form, recipientName: e.target.value})} 
                  required 
                />
                <Input 
                  label="Recipient Phone" 
                  type="tel"
                  value={form.recipientPhone} 
                  onChange={e => setForm({...form, recipientPhone: e.target.value})} 
                  required 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <Input 
                  label="Delivery Address" 
                  value={form.deliveryAddressLine1} 
                  onChange={e => setForm({...form, deliveryAddressLine1: e.target.value})} 
                  required 
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <LocationAutocomplete
                    label="Delivery Location"
                    value={form.deliveryLocation}
                    onChange={loc => setForm({...form, deliveryLocation: loc})}
                    placeholder="Search city, area or PIN"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Package Details */}
            <div>
              <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-2)' }}>Package Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <Input 
                  label="Weight (kg)" 
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.packageWeight} 
                  onChange={e => setForm({...form, packageWeight: e.target.value})} 
                  required 
                />
                <Input 
                  label="Declared Value (₹)" 
                  type="number"
                  min="1"
                  value={form.declaredValue} 
                  onChange={e => setForm({...form, declaredValue: e.target.value})} 
                  required 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
                <label className="ui-label">Payment Method <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <select 
                  className="ui-input" 
                  value={form.paymentMethod} 
                  onChange={e => setForm({...form, paymentMethod: e.target.value})}
                  required
                >
                  <option value="">Select Method</option>
                  <option value="PREPAID">Prepaid</option>
                  <option value="COD">Cash on Delivery (COD)</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={form.fragile}
                  onChange={e => setForm({...form, fragile: e.target.checked})}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent-primary)' }}
                />
                <span style={{ color: 'var(--color-text-primary)' }}>Fragile Item (Handle with care)</span>
              </label>
            </div>

            {errorMessage && (
              <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', fontSize: 'var(--font-size-sm)' }}>
                {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <Button type="submit" variant="primary" size="lg" isLoading={createOrder.isPending}>
                Confirm & Create Shipment
              </Button>
            </div>
          </form>
        </Card>

        {/* Pricing Estimator Sidebar */}
        <div style={{ position: 'sticky', top: '100px' }}>
          <Card elevated>
            <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Pricing Estimate</span>
              {getEstimate.isPending && <Spinner size={16} />}
            </h3>
            
            {!estimate && !estimateError ? (
              <p className="ui-card-description" style={{ fontSize: 'var(--font-size-sm)' }}>
                Fill in the origin, destination, weight and payment method to see a live pricing estimate.
              </p>
            ) : estimateError ? (
              <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', fontSize: 'var(--font-size-sm)' }}>
                {estimateError}
              </div>
            ) : (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="ui-card-description">Base Cost</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(estimate.breakdown?.baseCharge)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="ui-card-description">Weight Charge</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(estimate.breakdown?.weightCharge)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="ui-card-description">Distance Charge</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(estimate.breakdown?.distanceCharge)}</span>
                </div>
                {estimate.breakdown?.orderTypeSurcharge > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="ui-card-description">Fragile Surcharge</span>
                    <span style={{ color: 'var(--color-danger)' }}>+{formatCurrency(estimate.breakdown?.orderTypeSurcharge)}</span>
                  </div>
                )}
                {estimate.breakdown?.codCharges > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="ui-card-description">COD Fees</span>
                    <span style={{ color: 'var(--color-danger)' }}>+{formatCurrency(estimate.breakdown?.codCharges)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-3)', marginTop: 'var(--space-1)' }}>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 'bold', fontSize: 'var(--font-size-lg)' }}>Estimated Total</span>
                  <span style={{ color: 'var(--color-accent-primary)', fontWeight: 'bold', fontSize: 'var(--font-size-lg)' }}>{formatCurrency(estimate.totalCost)}</span>
                </div>

                {isRouting && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
                    <Spinner size={14} />
                    <span>Calculating road distance...</span>
                  </div>
                )}
                
                {routeEstimate && (
                  <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-3)', backgroundColor: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>Routing Estimate</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                      <span className="ui-card-description" style={{ fontSize: 'var(--font-size-sm)' }}>Estimated road distance</span>
                      <span style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>~{Math.round(routeEstimate.distanceKm)} km</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="ui-card-description" style={{ fontSize: 'var(--font-size-sm)' }}>Estimated driving time</span>
                      <span style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>~{Math.round(routeEstimate.durationMinutes / 60)}h {Math.round(routeEstimate.durationMinutes % 60)}m</span>
                    </div>
                  </div>
                )}

                {estimate.recommendations && estimate.recommendations.length > 0 && (
                  <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', backgroundColor: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>Tips</p>
                    {estimate.recommendations.map((rec, i) => (
                      <div key={i} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                        <span style={{ color: 'var(--color-accent-primary)' }}>•</span>
                        {rec.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
