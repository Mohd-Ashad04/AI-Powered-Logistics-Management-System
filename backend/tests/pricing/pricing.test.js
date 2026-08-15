const pricingEngine = require('../../src/services/pricingEngine');

describe('Pricing Engine', () => {
  const baseInput = {
    pickupPincode: '110001', // Metro
    dropPincode: '400001',   // Metro
    packageDetails: {
      items: [{ name: 'Item', weight: 2 }],
      deadWeight_kg: 2,
      dimensions_cm: { length: 20, width: 20, height: 20 } // volumetric = 1.6kg -> chargeable = 2kg
    },
    paymentDetails: {
      method: 'PREPAID',
    },
    orderType: 'STANDARD',
    priority: 'standard'
  };

  it('should be deterministic (identical input twice yields identical result)', () => {
    const result1 = pricingEngine.calculatePrice(baseInput);
    const result2 = pricingEngine.calculatePrice(baseInput);
    
    expect(result1).toEqual(result2);
  });

  it('should apply weight charge correctly', () => {
    const baseResult = pricingEngine.calculatePrice(baseInput);
    
    const heavierInput = {
      ...baseInput,
      packageDetails: {
        ...baseInput.packageDetails,
        items: [{ ...baseInput.packageDetails.items[0], weight: 5 }],
        deadWeight_kg: 5
      }
    };
    
    const heavierResult = pricingEngine.calculatePrice(heavierInput);
    expect(heavierResult.breakdown.weightCharge).toBeGreaterThan(baseResult.breakdown.weightCharge);
  });

  it('should apply distance/zone pricing correctly', () => {
    const metroResult = pricingEngine.calculatePrice(baseInput);
    
    const remoteInput = {
      ...baseInput,
      dropPincode: '793001' // remote
    };
    
    const remoteResult = pricingEngine.calculatePrice(remoteInput);
    expect(remoteResult.breakdown.distanceCharge).toBeGreaterThan(metroResult.breakdown.distanceCharge);
  });

  it('should apply COD charges only when COD is enabled', () => {
    const prepaidResult = pricingEngine.calculatePrice(baseInput);
    expect(prepaidResult.breakdown.codCharges).toBe(0);

    const codInput = {
      ...baseInput,
      paymentDetails: { method: 'COD' }
    };
    const codResult = pricingEngine.calculatePrice(codInput);
    expect(codResult.breakdown.codCharges).toBe(50);
  });

  it('should apply order type surcharge correctly', () => {
    const byAirInput = {
      ...baseInput,
      orderType: 'BY_AIR'
    };
    const byAirResult = pricingEngine.calculatePrice(byAirInput);
    expect(byAirResult.breakdown.orderTypeSurcharge).toBe(200);
  });

  it('should calculate GST, fuel, and handling correctly', () => {
    const result = pricingEngine.calculatePrice(baseInput);
    expect(result.breakdown.handlingCharges).toBeGreaterThanOrEqual(5); // base 5
    
    const subtotalBeforeGst = result.breakdown.baseCharge + 
                              result.breakdown.weightCharge + 
                              result.breakdown.distanceCharge + 
                              result.breakdown.orderTypeSurcharge + 
                              result.breakdown.fuelSurcharge + 
                              result.breakdown.handlingCharges + 
                              result.breakdown.codCharges;
                              
    const expectedGst = Math.round(subtotalBeforeGst * 0.18);
    expect(result.breakdown.gst).toBe(expectedGst);
  });

  it('should safely handle invalid/malformed input with fallback values', () => {
    const invalidInput = {
      pickupPincode: null,
      dropPincode: null,
      packageDetails: { deadWeight_kg: -5 }
    };
    
    const result = pricingEngine.calculatePrice(invalidInput);
    expect(result.totalCost).toBeDefined();
    expect(result.breakdown.baseCharge).toBeDefined();
  });
});
