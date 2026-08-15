/**
 * pricingEngine.js
 * Pure, deterministic pricing calculation engine for logistics orders.
 * Does not depend on database or external services.
 */

function calculateDistance(pickupPincode, dropPincode) {
  // Simplified deterministic distance calculation
  const p1 = parseInt(pickupPincode) || 0;
  const p2 = parseInt(dropPincode) || 0;
  if (!p1 || !p2) return 500; // Default distance if invalid
  return Math.abs(p1 - p2) / 1000;
}

function getZone(pickupPincode, dropPincode) {
  const getZoneType = (pincode) => {
    const prefix = pincode.substring(0, 3);
    const zones = {
      metro: ['110', '400', '560', '600', '700', '500'],
      tier1: ['380', '411', '462', '452', '641'],
      tier2: ['395', '302', '226', '321', '143']
    };
    for (const [zone, prefixes] of Object.entries(zones)) {
      if (prefixes.includes(prefix)) return zone;
    }
    return 'remote';
  };
  return `${getZoneType(pickupPincode || '')}-${getZoneType(dropPincode || '')}`;
}

exports.calculatePrice = ({
  pickupPincode,
  dropPincode,
  packageDetails,
  paymentDetails,
  orderType,
  priority
}) => {
  let baseCharge = 0;
  let weightCharge = 0;
  let volumeCharge = 0;
  let valueCharge = 0;
  let chargeableWeight = 0;

  const items = packageDetails?.items || [];

  if (items.length === 0) {
    // Fallback if no items array
    baseCharge = 50;
    const weight = packageDetails?.deadWeight_kg || 1;
    weightCharge = weight * 15;
    chargeableWeight = weight;

    const dims = packageDetails?.dimensions || { length: 10, width: 10, height: 10 };
    const volume = (dims.length * dims.width * dims.height) / 1000;
    volumeCharge = volume * 5;
    valueCharge = 0; // fallback has no value
  } else {
    items.forEach(item => {
      baseCharge += 50;
      const weight = item.weight || 1;
      weightCharge += weight * 15;
      chargeableWeight += weight;

      const dims = item.dimensions || { length: 10, width: 10, height: 10 };
      const volume = (dims.length * dims.width * dims.height) / 1000;
      volumeCharge += volume * 5;

      valueCharge += (item.value || 0) * 0.001;
    });
  }

  const distance = calculateDistance(pickupPincode, dropPincode);
  const distanceCharge = Math.max(distance * 2, 50);

  let priorityMultiplier = 1;
  if (priority === 'HIGH' || priority === 'high') priorityMultiplier = 1.5;
  if (priority === 'CRITICAL' || priority === 'critical') priorityMultiplier = 2;

  let orderTypeCharge = 0;
  const normalizedOrderType = (orderType || '').toUpperCase();
  if (normalizedOrderType === 'HANDLE_WITH_CARE' || normalizedOrderType === 'handle_with_care') orderTypeCharge = 100;
  if (normalizedOrderType === 'BY_AIR' || normalizedOrderType === 'by_air') orderTypeCharge = 200;

  // Handling charges from volume and value combined
  const handlingCharges = volumeCharge + valueCharge;

  // COD charge logic
  let codCharges = 0;
  if (paymentDetails?.method === 'COD') {
    codCharges = 50;
  }

  // Fuel Surcharge (10% of base + weight + distance)
  const fuelSurcharge = (baseCharge + weightCharge + distanceCharge) * 0.10;

  let subtotal = (baseCharge + weightCharge + handlingCharges + distanceCharge + fuelSurcharge) * priorityMultiplier + orderTypeCharge + codCharges;

  const gst = subtotal * 0.18;
  const totalCost = subtotal + gst;
  const zone = getZone(pickupPincode, dropPincode);

  return {
    breakdown: {
      baseCharge: Math.round(baseCharge),
      weightCharge: Math.round(weightCharge),
      distanceCharge: Math.round(distanceCharge),
      orderTypeSurcharge: Math.round(orderTypeCharge),
      fuelSurcharge: Math.round(fuelSurcharge),
      handlingCharges: Math.round(handlingCharges),
      codCharges: Math.round(codCharges),
      gst: Math.round(gst)
    },
    subtotal: Math.round(subtotal),
    totalCost: Math.round(totalCost),
    zone,
    chargeableWeight: Math.round(chargeableWeight * 100) / 100
  };
};
