import indianCities from './data/indianCities.json';

const pricingCities = [
  { id: "mumbai", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
  { id: "delhi", city: "Delhi", state: "Delhi", pincode: "110001" },
  { id: "bangalore", city: "Bangalore", state: "Karnataka", pincode: "560001" },
  { id: "chennai", city: "Chennai", state: "Tamil Nadu", pincode: "600001" },
  { id: "kolkata", city: "Kolkata", state: "West Bengal", pincode: "700001" },
  { id: "hyderabad", city: "Hyderabad", state: "Telangana", pincode: "500001" },
  { id: "pune", city: "Pune", state: "Maharashtra", pincode: "411001" },
  { id: "ahmedabad", city: "Ahmedabad", state: "Gujarat", pincode: "380001" },
];

let cachedLocations = null;

export const getLocations = () => {
  if (cachedLocations) return cachedLocations;

  const locations = [];
  
  Object.entries(indianCities).forEach(([state, cities]) => {
    cities.forEach(city => {
      const pCity = pricingCities.find(p => p.city.toLowerCase() === city.toLowerCase());
      
      const isFullyResolved = !!(
        pCity && 
        pCity.pincode && 
        Number.isFinite(pCity.latitude) && 
        Number.isFinite(pCity.longitude)
      );

      locations.push({
        name: city,
        city: city,
        state: state,
        country: "India",
        pincode: pCity ? pCity.pincode : null,
        latitude: pCity && pCity.latitude ? pCity.latitude : null,
        longitude: pCity && pCity.longitude ? pCity.longitude : null,
        source: "local",
        resolved: isFullyResolved
      });
    });
  });

  cachedLocations = locations;
  return cachedLocations;
};

export const searchLocationsSync = (query) => {
  if (!query || query.length < 2) return [];
  
  const locations = getLocations();
  const q = query.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // Exact match
  const exact = locations.filter(l => 
    l.city.toLowerCase() === q || 
    (l.pincode && l.pincode === q)
  );
  
  // Starts with
  const startsWith = locations.filter(l => 
    !exact.includes(l) && (
      l.city.toLowerCase().startsWith(q) ||
      (l.pincode && l.pincode.startsWith(q))
    )
  );
  
  // Contains
  const contains = locations.filter(l => 
    !exact.includes(l) && !startsWith.includes(l) && (
      l.city.toLowerCase().includes(q) ||
      (l.pincode && l.pincode.includes(q))
    )
  );
  
  return [...exact, ...startsWith, ...contains].slice(0, 10);
};
