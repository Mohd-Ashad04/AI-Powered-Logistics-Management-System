const axios = require('axios');
const config = require('../../../utils/config');
const AppError = require('../../../utils/AppError');

class OpenRouteServiceRoutingProvider {
  constructor() {
    this.baseUrl = 'https://api.openrouteservice.org/v2/directions';
  }

  async getRoute(origin, destination, profile = 'driving-car') {
    if (!config.OPENROUTESERVICE_API_KEY) {
      throw new AppError('Routing provider is not configured properly.', 500);
    }

    if (!origin || !destination || !Number.isFinite(origin.latitude) || !Number.isFinite(origin.longitude) || !Number.isFinite(destination.latitude) || !Number.isFinite(destination.longitude)) {
      throw new AppError('Valid origin and destination coordinates are required for routing.', 400);
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${profile}`,
        {
          coordinates: [
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude]
          ]
        },
        {
          headers: {
            'Authorization': config.OPENROUTESERVICE_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10s timeout
        }
      );

      if (!response.data || !response.data.routes || response.data.routes.length === 0) {
        throw new AppError('No route found between the specified locations.', 404);
      }

      const summary = response.data.routes[0].summary;
      
      if (!summary) {
        throw new AppError('Route summary is missing from the provider response.', 500);
      }

      const distanceKm = summary.distance / 1000;
      const durationMinutes = summary.duration / 60;

      return {
        distanceKm: distanceKm,
        durationMinutes: durationMinutes,
        provider: 'openrouteservice',
        profile: profile
      };

    } catch (error) {
      if (error instanceof AppError) throw error;
      
      console.error('ORS Routing Error:', error.response?.data || error.message);
      
      if (error.response?.status === 429) {
        throw new AppError('Routing service rate limit exceeded. Please try again later.', 429);
      }
      
      throw new AppError('Unable to calculate route right now due to external service error.', 502);
    }
  }
}

module.exports = new OpenRouteServiceRoutingProvider();
