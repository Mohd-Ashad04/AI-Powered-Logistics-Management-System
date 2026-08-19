const locationService = require('../services/location/locationService');
const AppError = require('../utils/AppError');

class LocationController {
  async resolve(req, res, next) {
    try {
      const { city, state, country } = req.body;
      
      if (!city) {
        throw new AppError('City is required for location resolution', 400);
      }

      const resolvedData = await locationService.resolveLocation({ city, state, country });

      res.status(200).json({
        success: true,
        data: resolvedData
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LocationController();
