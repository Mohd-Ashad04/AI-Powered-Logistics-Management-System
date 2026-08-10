// Pincode to City/State mapping utility
const pincodeMapping = {
  // Delhi
  '110001': { city: 'New Delhi', state: 'Delhi', zone: 'metro' },
  '110002': { city: 'New Delhi', state: 'Delhi', zone: 'metro' },
  '110003': { city: 'New Delhi', state: 'Delhi', zone: 'metro' },
  
  // Mumbai
  '400001': { city: 'Mumbai', state: 'Maharashtra', zone: 'metro' },
  '400002': { city: 'Mumbai', state: 'Maharashtra', zone: 'metro' },
  '400003': { city: 'Mumbai', state: 'Maharashtra', zone: 'metro' },
  
  // Bangalore
  '560001': { city: 'Bangalore', state: 'Karnataka', zone: 'metro' },
  '560002': { city: 'Bangalore', state: 'Karnataka', zone: 'metro' },
  '560003': { city: 'Bangalore', state: 'Karnataka', zone: 'metro' },
  
  // Chennai
  '600001': { city: 'Chennai', state: 'Tamil Nadu', zone: 'metro' },
  '600002': { city: 'Chennai', state: 'Tamil Nadu', zone: 'metro' },
  '600003': { city: 'Chennai', state: 'Tamil Nadu', zone: 'metro' },
  
  // Kolkata
  '700001': { city: 'Kolkata', state: 'West Bengal', zone: 'metro' },
  '700002': { city: 'Kolkata', state: 'West Bengal', zone: 'metro' },
  '700003': { city: 'Kolkata', state: 'West Bengal', zone: 'metro' },
  
  // Hyderabad
  '500001': { city: 'Hyderabad', state: 'Telangana', zone: 'metro' },
  '500002': { city: 'Hyderabad', state: 'Telangana', zone: 'metro' },
  '500003': { city: 'Hyderabad', state: 'Telangana', zone: 'metro' },
  
  // Ahmedabad
  '380001': { city: 'Ahmedabad', state: 'Gujarat', zone: 'tier1' },
  '380002': { city: 'Ahmedabad', state: 'Gujarat', zone: 'tier1' },
  
  // Pune
  '411001': { city: 'Pune', state: 'Maharashtra', zone: 'tier1' },
  '411014': { city: 'Pune', state: 'Maharashtra', zone: 'tier1' },
  
  // Surat
  '395001': { city: 'Surat', state: 'Gujarat', zone: 'tier2' },
  '395006': { city: 'Surat', state: 'Gujarat', zone: 'tier2' },
  
  // Jaipur
  '302001': { city: 'Jaipur', state: 'Rajasthan', zone: 'tier2' },
  '302002': { city: 'Jaipur', state: 'Rajasthan', zone: 'tier2' }
};

// Distance calculation utility (simplified)
const calculateDistance = (fromPincode, toPincode) => {
  const fromLocation = pincodeMapping[fromPincode];
  const toLocation = pincodeMapping[toPincode];
  
  if (!fromLocation || !toLocation) {
    return { distance: 500, type: 'interstate' }; // Default for unknown pincodes
  }
  
  // Same city
  if (fromLocation.city === toLocation.city) {
    return { distance: 15, type: 'local' };
  }
  
  // Same state
  if (fromLocation.state === toLocation.state) {
    return { distance: 200, type: 'intrastate' };
  }
  
  // Interstate - approximate distances between major cities
  const interStateDistances = {
    'Delhi-Maharashtra': 1400,
    'Delhi-Karnataka': 2100,
    'Delhi-Tamil Nadu': 2200,
    'Delhi-West Bengal': 1500,
    'Delhi-Gujarat': 950,
    'Maharashtra-Karnataka': 850,
    'Maharashtra-Tamil Nadu': 1100,
    'Maharashtra-Gujarat': 550,
    'Karnataka-Tamil Nadu': 350,
    'Gujarat-Rajasthan': 650
  };
  
  const stateKey = `${fromLocation.state}-${toLocation.state}`;
  const reverseStateKey = `${toLocation.state}-${fromLocation.state}`;
  
  const distance = interStateDistances[stateKey] || 
                  interStateDistances[reverseStateKey] || 
                  800; // Default interstate distance
  
  return { distance, type: 'interstate' };
};

// Zone classification
const getZoneType = (pincode) => {
  const location = pincodeMapping[pincode];
  if (location) {
    return location.zone;
  }
  
  // Classify based on pincode patterns
  const prefix = pincode.substring(0, 3);
  const metroPrefix = ['110', '400', '560', '600', '700', '500'];
  const tier1Prefix = ['380', '411', '462', '452', '641'];
  const tier2Prefix = ['395', '302', '226', '321', '143'];
  
  if (metroPrefix.includes(prefix)) return 'metro';
  if (tier1Prefix.includes(prefix)) return 'tier1';
  if (tier2Prefix.includes(prefix)) return 'tier2';
  return 'remote';
};

// Delivery area assignment based on pincode
const getDeliveryArea = (pincode) => {
  const lastDigit = parseInt(pincode.slice(-1));
  
  if (lastDigit <= 2) return 'NORTH';
  if (lastDigit <= 4) return 'SOUTH';
  if (lastDigit <= 6) return 'EAST';
  return 'WEST';
};

// Generate AWB (Airway Bill) number
const generateAWB = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `AWB${timestamp.slice(-6)}${random}`;
};

// Generate tracking ID
const generateTrackingId = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'TRK';
  for (let i = 0; i < 10; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Calculate volumetric weight
const calculateVolumetricWeight = (length, width, height) => {
  // Standard formula: (L × W × H) / 5000
  return (length * width * height) / 5000;
};

// Determine chargeable weight
const getChargeableWeight = (deadWeight, volumetricWeight) => {
  return Math.max(deadWeight, volumetricWeight);
};

// Format Indian currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

// Date utilities
const addBusinessDays = (date, days) => {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }
  
  return result;
};

const isBusinessDay = (date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // Not Sunday (0) or Saturday (6)
};

// Validate Indian pincode
const isValidPincode = (pincode) => {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(pincode);
};

// Get state from pincode
const getStateFromPincode = (pincode) => {
  const stateMapping = {
    '1': ['Delhi', 'Haryana'],
    '2': ['Haryana', 'Punjab', 'Himachal Pradesh', 'Jammu and Kashmir'],
    '3': ['Rajasthan', 'Gujarat'],
    '4': ['Maharashtra', 'Goa'],
    '5': ['Andhra Pradesh', 'Telangana', 'Karnataka'],
    '6': ['Tamil Nadu', 'Kerala', 'Puducherry'],
    '7': ['West Bengal', 'Odisha'],
    '8': ['Bihar', 'Jharkhand', 'Odisha']
  };
  
  const firstDigit = pincode.charAt(0);
  const states = stateMapping[firstDigit];
  
  if (states) {
    // Return first state as default, in real implementation would need more detailed mapping
    return states[0];
  }
  
  return 'Unknown';
};

// Priority scoring for delivery optimization
const calculateDeliveryPriority = (order) => {
  let score = 0;
  
  // High value orders get priority
  if (order.paymentDetails.totalValue > 10000) score += 30;
  else if (order.paymentDetails.totalValue > 5000) score += 20;
  else if (order.paymentDetails.totalValue > 1000) score += 10;
  
  // Order type priority
  if (order.orderType === 'BY_AIR') score += 50;
  else if (order.orderType === 'HANDLE_WITH_CARE') score += 30;
  
  // COD orders get lower priority due to risk
  if (order.paymentDetails.method === 'COD') score -= 10;
  
  // Fragile items get priority
  if (order.packageDetails.fragile) score += 20;
  
  // Perishable items get highest priority
  if (order.packageDetails.perishable) score += 40;
  
  // Age of order (older orders get priority)
  const ageHours = (new Date() - new Date(order.createdAt)) / (1000 * 60 * 60);
  if (ageHours > 48) score += 25;
  else if (ageHours > 24) score += 15;
  else if (ageHours > 12) score += 10;
  
  return Math.min(score, 100); // Cap at 100
};

module.exports = {
  pincodeMapping,
  calculateDistance,
  getZoneType,
  getDeliveryArea,
  generateAWB,
  generateTrackingId,
  calculateVolumetricWeight,
  getChargeableWeight,
  formatCurrency,
  addBusinessDays,
  isBusinessDay,
  isValidPincode,
  getStateFromPincode,
  calculateDeliveryPriority
};
