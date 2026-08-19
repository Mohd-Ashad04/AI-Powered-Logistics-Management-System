const openRouteServiceProvider = require('./providers/openRouteServiceProvider');

class LocationService {
  constructor() {
    this.cache = new Map();
    // Cache TTL is not strictly enforced in V1 with in-memory map without a cleanup interval,
    // but the cache won't grow indefinitely in this limited scenario.
  }

  generateCacheKey(context) {
    const city = context.city?.toLowerCase().trim() || '';
    const state = context.state?.toLowerCase().trim() || '';
    const country = context.country?.toLowerCase().trim() || 'in';
    return `location:${country}:${state}:${city}`;
  }

  async resolveLocation(locationContext) {
    const cacheKey = this.generateCacheKey(locationContext);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const resolvedData = await openRouteServiceProvider.resolveLocation(locationContext);
    
    // Check if fully resolved based on backend constraints
    const isFullyResolved = !!(
      resolvedData.pincode && 
      Number.isFinite(resolvedData.latitude) && 
      Number.isFinite(resolvedData.longitude)
    );

    resolvedData.resolved = isFullyResolved;

    this.cache.set(cacheKey, resolvedData);
    
    return resolvedData;
  }
}

module.exports = new LocationService();
