const axios = require('axios');
const config = require('../../../utils/config');
const AppError = require('../../../utils/AppError');

/**
 * OpenRouteService Geocoding Provider
 */
class OpenRouteServiceProvider {
  
  constructor() {
    this.baseUrl = 'https://api.openrouteservice.org/geocode/search';
  }

  async resolveLocation({ city, state, country }) {
    if (!config.OPENROUTESERVICE_API_KEY) {
      throw new AppError('Location provider is not configured properly.', 500);
    }

    // Build search text preferring India context for V1
    const queryParts = [city, state, country].filter(Boolean);
    if (queryParts.length === 0) {
      throw new AppError('Insufficient location data for resolution', 400);
    }
    const query = queryParts.join(', ');

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: config.OPENROUTESERVICE_API_KEY,
          text: query,
          'boundary.country': 'IN',
          size: 5
        },
        timeout: 10000 // 10s timeout
      });

      if (!response.data || !response.data.features || response.data.features.length === 0) {
        throw new AppError('Unable to confidently resolve this location.', 404);
      }

      // Look for a feature that matches our city/state context reasonably well
      const features = response.data.features;
      let matchedFeature = null;

      const targetCity = city?.toLowerCase() || '';
      
      for (const feature of features) {
        const props = feature.properties;
        const locality = props.locality?.toLowerCase() || '';
        const region = props.region?.toLowerCase() || '';
        const name = props.name?.toLowerCase() || '';

        // If it's a strict match on locality or name
        if ((locality && targetCity === locality) || (name && targetCity === name)) {
          matchedFeature = feature;
          break;
        }
      }

      // Fallback to first if ambiguous but we must be careful
      if (!matchedFeature) {
        // We reject ambiguous/unrelated results if we can't find a close match
        throw new AppError('Location search returned ambiguous results. Please try another area.', 400);
      }

      const coordinates = matchedFeature.geometry?.coordinates; // [lng, lat]
      if (!coordinates || coordinates.length !== 2) {
        throw new AppError('Location resolved but coordinates are missing.', 500);
      }

      const props = matchedFeature.properties;
      
      // Do not assume postalcode always exists. Don't fabricate it.
      const postalcode = props.postalcode || null;

      return {
        city: props.locality || props.name || city,
        state: props.region || state,
        country: props.country || country,
        pincode: postalcode,
        latitude: coordinates[1],
        longitude: coordinates[0],
        source: 'openrouteservice',
        resolved: !!postalcode // As per current backend constraints, pincode is required. So resolved is only true if pincode exists. Wait!
      };

    } catch (error) {
      if (error instanceof AppError) throw error;
      
      // Handle axios errors safely without leaking secrets
      console.error('ORS Geocoding Error:', error.response?.data || error.message);
      
      if (error.response?.status === 429) {
        throw new AppError('Location service rate limit exceeded. Please try again later.', 429);
      }
      
      throw new AppError('Unable to resolve location at this time due to an external service error.', 502);
    }
  }
}

module.exports = new OpenRouteServiceProvider();
