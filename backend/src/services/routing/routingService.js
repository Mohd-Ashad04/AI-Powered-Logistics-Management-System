const openRouteServiceProvider = require('./providers/openRouteServiceProvider');
const AppError = require('../../utils/AppError');

const MAX_DISTANCE_KM = 5000;

class RoutingService {
  constructor() {
    this.cache = new Map();
  }

  generateCacheKey(origin, destination, profile) {
    const oLng = Number(origin.longitude).toFixed(4);
    const oLat = Number(origin.latitude).toFixed(4);
    const dLng = Number(destination.longitude).toFixed(4);
    const dLat = Number(destination.latitude).toFixed(4);
    
    return `route:${profile}:${oLng},${oLat}:${dLng},${dLat}`;
  }

  async estimateRoute({ origin, destination, profile = 'driving-car' }) {
    if (!origin || !destination) {
      throw new AppError('Origin and destination are required.', 400);
    }

    const cacheKey = this.generateCacheKey(origin, destination, profile);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const routeData = await openRouteServiceProvider.getRoute(origin, destination, profile);
    
    if (routeData.distanceKm <= 0 || routeData.durationMinutes <= 0) {
      throw new AppError('Routing provider returned an invalid distance or duration.', 500);
    }

    if (routeData.distanceKm > MAX_DISTANCE_KM) {
      throw new AppError(`The calculated route exceeds the maximum allowed distance of ${MAX_DISTANCE_KM} km.`, 400);
    }

    this.cache.set(cacheKey, routeData);
    
    return routeData;
  }
}

module.exports = new RoutingService();
