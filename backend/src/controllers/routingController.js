const routingService = require('../services/routing/routingService');
const AppError = require('../utils/AppError');

class RoutingController {
  async estimate(req, res, next) {
    try {
      const { origin, destination, profile } = req.body;
      
      if (!origin || !destination) {
        throw new AppError('Origin and destination are required', 400);
      }

      const routeData = await routingService.estimateRoute({ origin, destination, profile });

      res.status(200).json({
        success: true,
        data: routeData
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoutingController();
