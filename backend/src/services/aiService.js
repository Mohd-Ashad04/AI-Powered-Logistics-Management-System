const axios = require('axios');
const config = require('../utils/config');

class GeminiAIService {
  constructor() {
    this.apiKey = config.GEMINI_API_KEY;
    this.baseURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`;
    this.fallbackMode = !config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'your_gemini_api_key';
    
    // Default settings for simplified config
    this.routeConfig = {
      enabled: true,
      maxWaypoints: 10,
      algorithm: 'shortest_distance',
      considerTraffic: true
    };
    
    this.timeConfig = {
      baseSpeed: 40, // km/h
      cityDelay: 0.5 // hours
    };
    
    // Log initialization status
    if (this.fallbackMode) {
      console.log('⚠️  Gemini API not configured - fallback mode enabled');
    } else if (this.apiKey && this.apiKey.startsWith('AIza')) {
      console.log('✅ Gemini AI service initialized successfully');
      console.log('🗺️  Route optimization: ENABLED');
      console.log('⏱️  Time estimation: ENHANCED');
    } else {
      console.log('⚠️  Gemini API key format invalid - fallback mode enabled');
      this.fallbackMode = true;
    }
  }

  async generatePricing(orderData) {
    try {
      // Check if API key is available and valid
      if (this.fallbackMode || !this.apiKey || !this.apiKey.startsWith('AIza')) {
        console.log('🤖 Using fallback pricing calculation (Gemini API not configured)');
        return this._getFallbackPricing(orderData);
      }

      const prompt = this._createPricingPrompt(orderData);
      
      const response = await axios.post(`${this.baseURL}?key=${this.apiKey}`, {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1000,
        }
      });

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      console.log('✅ Gemini AI pricing generated successfully');
      return this._parsePricingResponse(aiResponse);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('API key not valid')) {
        console.log('❌ Invalid Gemini API key - using fallback pricing');
      } else if (error.response?.status === 403) {
        console.log('❌ Gemini API access denied - using fallback pricing');
      } else {
        console.log('⚠️  Gemini API error - using fallback pricing:', error.response?.data?.error?.message || error.message);
      }
      return this._getFallbackPricing(orderData);
    }
  }

  async estimateDeliveryTime(orderData) {
    try {
      // Check if API key is available and valid
      if (this.fallbackMode || !this.apiKey || !this.apiKey.startsWith('AIza')) {
        console.log('🤖 Using fallback time estimation (Gemini API not configured)');
        return this._getFallbackTimeEstimation(orderData);
      }

      const prompt = this._createTimeEstimationPrompt(orderData);
      
      const response = await axios.post(`${this.baseURL}?key=${this.apiKey}`, {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 800,
        }
      });

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      console.log('✅ Gemini AI time estimation generated successfully');
      return this._parseTimeEstimationResponse(aiResponse);
    } catch (error) {
      if (error.response?.data?.error?.message?.includes('API key not valid')) {
        console.log('❌ Invalid Gemini API key - using fallback time estimation');
      } else {
        console.log('⚠️  Gemini API error - using fallback time estimation:', error.response?.data?.error?.message || error.message);
      }
      return this._getFallbackTimeEstimation(orderData);
    }
  }

  // 🗺️ NEW: AI-Powered Route Optimization
  async optimizeRoute(pickupLocation, deliveryLocation, waypoints = []) {
    try {
      if (this.fallbackMode || !this.routeConfig.enabled) {
        console.log('🗺️  Using fallback route optimization');
        return this._getFallbackRouteOptimization(pickupLocation, deliveryLocation, waypoints);
      }

      const prompt = this._createRouteOptimizationPrompt(pickupLocation, deliveryLocation, waypoints);
      
      const response = await axios.post(`${this.baseURL}?key=${this.apiKey}`, {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 3,
          topP: 0.8,
          maxOutputTokens: 1200,
        }
      });

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      console.log('✅ Gemini AI route optimization completed');
      return this._parseRouteOptimizationResponse(aiResponse);
    } catch (error) {
      console.log('⚠️  Gemini route optimization error - using fallback:', error.response?.data?.error?.message || error.message);
      return this._getFallbackRouteOptimization(pickupLocation, deliveryLocation, waypoints);
    }
  }

  // 🚛 NEW: Multi-Hub Route Planning
  async planMultiHubRoute(orderData, hubNetwork) {
    try {
      if (this.fallbackMode) {
        console.log('🚛 Using fallback multi-hub route planning');
        return this._getFallbackMultiHubRoute(orderData, hubNetwork);
      }

      const prompt = this._createMultiHubRoutePlanningPrompt(orderData, hubNetwork);
      
      const response = await axios.post(`${this.baseURL}?key=${this.apiKey}`, {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 2,
          topP: 0.9,
          maxOutputTokens: 1500,
        }
      });

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      console.log('✅ Gemini AI multi-hub route planning completed');
      return this._parseMultiHubRouteResponse(aiResponse);
    } catch (error) {
      console.log('⚠️  Gemini multi-hub planning error - using fallback:', error.response?.data?.error?.message || error.message);
      return this._getFallbackMultiHubRoute(orderData, hubNetwork);
    }
  }

  async generateRouteOptimization(orderData) {
    try {
      // Check if API key is available and valid
      if (!this.apiKey || this.apiKey === 'your_gemini_api_key') {
        console.log('🤖 Gemini API key not configured - using fallback route optimization');
        return this._getFallbackRouteOptimization(
          orderData?.pickupAddress || {}, 
          orderData?.recipientDetails?.address || {}
        );
      }

      const prompt = this._createRouteOptimizationPrompt(orderData);
      
      const response = await axios.post(`${this.baseURL}?key=${this.apiKey}`, {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 3,
          topP: 0.8,
          maxOutputTokens: 1200,
        }
      });

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      return this._parseRouteOptimizationResponse(aiResponse);
    } catch (error) {
      if (error.response?.data?.error?.message?.includes('API key not valid')) {
        console.log('🤖 Invalid Gemini API key - using fallback route optimization');
      } else {
        console.error('Gemini API Error:', error.response?.data || error.message);
      }
      return this._getFallbackRouteOptimization(
        orderData?.pickupAddress || {}, 
        orderData?.recipientDetails?.address || {}
      );
    }
  }

  _createPricingPrompt(orderData) {
    // Safely extract order data with fallbacks
    const pickupCity = orderData?.pickupAddress?.city || 'Unknown City';
    const pickupState = orderData?.pickupAddress?.state || 'Unknown State';
    const pickupPincode = orderData?.pickupAddress?.pincode || '000000';
    const deliveryCity = orderData?.recipientDetails?.address?.city || 'Unknown City';
    const deliveryState = orderData?.recipientDetails?.address?.state || 'Unknown State';
    const deliveryPincode = orderData?.recipientDetails?.address?.pincode || '000000';
    const weight = orderData?.packageDetails?.deadWeight_kg || 1;
    const dimensions = orderData?.packageDetails?.dimensions_cm || { length: 10, width: 10, height: 10 };
    const volumetricWeight = orderData?.packageDetails?.volumetricWeight_kg || 'Not calculated';
    const orderType = orderData?.orderType || 'NORMAL';
    const paymentMethod = orderData?.paymentDetails?.method || 'UNKNOWN';
    const totalValue = orderData?.paymentDetails?.totalValue || 0;
    const items = orderData?.packageDetails?.items || [];

    return `
    You are an AI pricing expert for a logistics company. Calculate shipping cost based on the following parameters:

    ORDER DETAILS:
    - Pickup Location: ${pickupCity}, ${pickupState} (${pickupPincode})
    - Delivery Location: ${deliveryCity}, ${deliveryState} (${deliveryPincode})
    - Package Weight: ${weight} kg
    - Package Dimensions: ${dimensions.length}x${dimensions.width}x${dimensions.height} cm
    - Volumetric Weight: ${volumetricWeight} kg
    - Order Type: ${orderType}
    - Payment Method: ${paymentMethod}
    - Total Value: ₹${totalValue}
    - Items: ${items.map(item => `${item.name} (${item.quantity})`).join(', ')}

    PRICING FACTORS TO CONSIDER:
    1. Distance between pickup and delivery locations
    2. Weight (dead weight vs volumetric weight - use higher value)
    3. Order type surcharges:
       - NORMAL: Base rate
       - HANDLE_WITH_CARE: +30% surcharge
       - BY_AIR: +80% surcharge  
       - BY_ROAD: Base rate
    4. COD charges: 2% of COD amount (min ₹20)
    5. Fuel surcharge: 15% of base cost
    6. Handling charges: ₹10-50 based on package size
    7. Insurance: 0.5% of declared value (optional)

    BASE RATES (per kg):
    - Same city: ₹25-40
    - Same state: ₹35-60
    - Interstate: ₹45-85
    - Metro to metro: ₹40-70
    - Remote areas: +₹20-30

    Please provide pricing in this exact JSON format:
    {
      "baseCost": number,
      "weightCharges": number,
      "distanceCharges": number,
      "orderTypeSurcharge": number,
      "fuelSurcharge": number,
      "handlingCharges": number,
      "codCharges": number,
      "insuranceCharges": number,
      "totalCost": number,
      "courierPartnerCost": number,
      "profitMargin": number,
      "recommendations": ["string array of cost optimization suggestions"]
    }
    `;
  }

  _createTimeEstimationPrompt(orderData) {
    // Safely extract order data with fallbacks
    const pickupCity = orderData?.pickupAddress?.city || 'Unknown City';
    const pickupState = orderData?.pickupAddress?.state || 'Unknown State';
    const pickupPincode = orderData?.pickupAddress?.pincode || '000000';
    const deliveryCity = orderData?.recipientDetails?.address?.city || 'Unknown City';
    const deliveryState = orderData?.recipientDetails?.address?.state || 'Unknown State';
    const deliveryPincode = orderData?.recipientDetails?.address?.pincode || '000000';
    const orderType = orderData?.orderType || 'NORMAL';
    const weight = orderData?.packageDetails?.deadWeight_kg || 1;

    return `
    You are an AI logistics expert. Estimate delivery time based on the following:

    ROUTE DETAILS:
    - From: ${pickupCity}, ${pickupState} (${pickupPincode})
    - To: ${deliveryCity}, ${deliveryState} (${deliveryPincode})
    - Order Type: ${orderType}
    - Package Weight: ${weight} kg
    - Current Time: ${new Date().toISOString()}

    DELIVERY TIME FACTORS:
    1. Distance and transportation mode
    2. Order type:
       - NORMAL: Standard delivery
       - HANDLE_WITH_CARE: +1 day (extra care in handling)
       - BY_AIR: -1 to -2 days (faster but airport processing time)
       - BY_ROAD: Standard ground delivery
    3. Same city: 1-2 days
    4. Same state: 2-4 days
    5. Interstate: 3-7 days
    6. Metro cities: -1 day advantage
    7. Remote areas: +1-2 days
    8. Weekends and holidays: +1 day buffer

    Provide estimation in this JSON format:
    {
      "estimatedDays": number,
      "minDays": number,
      "maxDays": number,
      "estimatedDeliveryDate": "ISO date string",
      "confidence": number (0-100),
      "factors": ["array of factors affecting delivery time"],
      "risks": ["potential delays to consider"]
    }
    `;
  }

  _createRouteOptimizationPrompt(orderData) {
    // Safely extract order data with fallbacks
    const pickupCity = orderData?.pickupAddress?.city || 'Unknown City';
    const pickupState = orderData?.pickupAddress?.state || 'Unknown State';
    const pickupPincode = orderData?.pickupAddress?.pincode || '000000';
    const deliveryCity = orderData?.recipientDetails?.address?.city || 'Unknown City';
    const deliveryState = orderData?.recipientDetails?.address?.state || 'Unknown State';
    const deliveryPincode = orderData?.recipientDetails?.address?.pincode || '000000';
    const orderType = orderData?.orderType || 'NORMAL';
    const weight = orderData?.packageDetails?.deadWeight_kg || 1;

    return `
    You are an AI route optimization expert. Create an optimal delivery route with hub assignments:

    ROUTE DETAILS:
    - Origin: ${pickupCity}, ${pickupState} (${pickupPincode})
    - Destination: ${deliveryCity}, ${deliveryState} (${deliveryPincode})
    - Order Type: ${orderType}
    - Weight: ${weight} kg

    ROUTING RULES:
    1. Each state has delivery hubs in major cities
    2. Interstate delivery requires state-to-state vehicles
    3. Within city, assign to area-wise delivery agents (North/South/East/West)
    4. Optimize for minimum transit time and cost
    5. Consider hub capacity and agent availability

    MAJOR HUBS BY STATE:
    - Delhi: Delhi_Central, Delhi_North, Delhi_South
    - Maharashtra: Mumbai_Central, Pune_Hub, Nashik_Hub
    - Gujarat: Ahmedabad_Hub, Surat_Hub, Vadodara_Hub
    - Karnataka: Bangalore_Hub, Mysore_Hub
    - Tamil Nadu: Chennai_Hub, Coimbatore_Hub
    - West Bengal: Kolkata_Hub
    - Rajasthan: Jaipur_Hub, Jodhpur_Hub

    Provide route in this JSON format:
    {
      "transitRoute": [
        {
          "step": number,
          "hub": "hub_name",
          "state": "state_name",
          "city": "city_name",
          "area": "NORTH/SOUTH/EAST/WEST or null for state hubs",
          "estimatedArrival": "ISO date string",
          "transportMode": "STATE_VEHICLE/LOCAL_DELIVERY",
          "estimatedDuration": "hours"
        }
      ],
      "recommendedVehicle": {
        "type": "MINI_TRUCK/TRUCK/BIKE/VAN",
        "reason": "explanation"
      },
      "deliveryArea": "NORTH/SOUTH/EAST/WEST",
      "totalDistance": "estimated km",
      "totalTransitTime": "hours"
    }
    `;
  }

  // 🗺️ NEW: Route Optimization Prompt
  _createRouteOptimizationPrompt(pickupLocation, deliveryLocation, waypoints = []) {
    // Safely extract location data with fallbacks
    const pickup = {
      city: pickupLocation?.city || 'Unknown City',
      state: pickupLocation?.state || 'Unknown State',
      pincode: pickupLocation?.pincode || '000000'
    };
    const delivery = {
      city: deliveryLocation?.city || 'Unknown City',
      state: deliveryLocation?.state || 'Unknown State',
      pincode: deliveryLocation?.pincode || '000000'
    };
    const waypointsList = Array.isArray(waypoints) && waypoints.length > 0 
      ? waypoints.map(w => `${w?.city || 'Unknown'}, ${w?.state || 'Unknown'}`).join(' → ') 
      : 'None';

    return `
    You are an AI route optimization expert. Optimize the delivery route for maximum efficiency:

    ROUTE PARAMETERS:
    - Pickup: ${pickup.city}, ${pickup.state} (${pickup.pincode})
    - Delivery: ${delivery.city}, ${delivery.state} (${delivery.pincode})
    - Waypoints: ${waypointsList}
    - Optimization Goal: ${this.routeConfig.algorithm}
    - Consider Traffic: ${this.routeConfig.considerTraffic}

    PROVIDE RESPONSE IN JSON FORMAT:
    {
      "optimizedRoute": {
        "totalDistance": number,
        "estimatedTime": number,
        "fuelEfficiency": number,
        "route": [
          {
            "step": number,
            "location": "location_name",
            "coordinates": {"lat": number, "lng": number},
            "estimatedArrival": "ISO_date",
            "durationFromPrevious": number,
            "distanceFromPrevious": number
          }
        ]
      },
      "recommendations": ["route_optimization_tips"]
    }
    `;
  }

  // 🚛 NEW: Multi-Hub Route Planning Prompt  
  _createMultiHubRoutePlanningPrompt(orderData, hubNetwork) {
    // Safely extract order data with fallbacks
    const pickupCity = orderData?.pickupAddress?.city || 'Unknown City';
    const deliveryCity = orderData?.recipientDetails?.address?.city || 'Unknown City';
    const weight = orderData?.packageDetails?.deadWeight_kg || 1;
    const hubList = Array.isArray(hubNetwork) ? hubNetwork.slice(0, 5).map(h => h.hubName || h.name || 'Hub').join(', ') : 'No hubs available';

    return `
    Plan optimal multi-hub route for delivery order:

    ORDER: ${pickupCity} → ${deliveryCity}
    WEIGHT: ${weight} kg
    HUBS: ${hubList}

    PROVIDE JSON:
    {
      "routePlan": {
        "totalSteps": number,
        "estimatedDuration": "hours",
        "route": [
          {"step": 1, "hubName": "string", "activity": "PICKUP|TRANSFER|DELIVERY"}
        ]
      }
    }
    `;
  }

  _parsePricingResponse(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Error parsing pricing response:', error);
      return this._getFallbackPricing();
    }
  }

  _parseTimeEstimationResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Error parsing time estimation response:', error);
      return this._getFallbackTimeEstimation();
    }
  }

  _parseRouteOptimizationResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Error parsing route optimization response:', error);
      return this._getFallbackRouteOptimization({}, {}, []);
    }
  }

  _parseMultiHubRouteResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Error parsing multi-hub route response:', error);
      return this._getFallbackMultiHubRoute();
    }
  }

  _getFallbackPricing(orderData = {}) {
    // Simple fallback pricing logic
    const weight = orderData.packageDetails?.deadWeight_kg || 1;
    const baseCost = weight * 45; // ₹45 per kg base rate
    
    return {
      baseCost: baseCost,
      weightCharges: weight * 10,
      distanceCharges: 50,
      orderTypeSurcharge: 0,
      fuelSurcharge: baseCost * 0.15,
      handlingCharges: 25,
      codCharges: orderData.paymentDetails?.method === 'COD' ? 30 : 0,
      insuranceCharges: 0,
      totalCost: baseCost + 85,
      courierPartnerCost: baseCost + 65,
      profitMargin: 20,
      recommendations: ["Consider prepaid to save COD charges"]
    };
  }

  _getFallbackTimeEstimation(orderData = {}) {
    return {
      estimatedDays: 4,
      minDays: 2,
      maxDays: 6,
      estimatedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      confidence: 75,
      factors: ["Interstate delivery", "Standard processing"],
      risks: ["Weather conditions", "Festival delays"]
    };
  }

  // 🗺️ NEW: Fallback Route Optimization
  _getFallbackRouteOptimization(pickupLocation, deliveryLocation, waypoints = []) {
    // Safely extract location properties with fallbacks
    const pickup = {
      city: pickupLocation?.city || 'Unknown City',
      state: pickupLocation?.state || 'Unknown State'
    };
    const delivery = {
      city: deliveryLocation?.city || 'Unknown City', 
      state: deliveryLocation?.state || 'Unknown State'
    };

    const distance = this._calculateDistance(pickupLocation, deliveryLocation);
    const estimatedTime = Math.ceil(distance / this.timeConfig.baseSpeed);

    return {
      optimizedRoute: {
        totalDistance: distance,
        estimatedTime: estimatedTime,
        fuelEfficiency: 85, // Default efficiency
        route: [
          {
            step: 1,
            location: `${pickup.city}, ${pickup.state}`,
            coordinates: { lat: 0, lng: 0 },
            estimatedArrival: new Date().toISOString(),
            durationFromPrevious: 0,
            distanceFromPrevious: 0
          },
          {
            step: 2,
            location: `${delivery.city}, ${delivery.state}`,
            coordinates: { lat: 0, lng: 0 },
            estimatedArrival: new Date(Date.now() + estimatedTime * 60 * 60 * 1000).toISOString(),
            durationFromPrevious: estimatedTime,
            distanceFromPrevious: distance
          }
        ]
      },
      recommendations: [
        "Use shortest distance route",
        "Avoid peak traffic hours",
        "Consider fuel stops for long distances"
      ],
      // Add properties expected by logisticsService
      transitRoute: [
        {
          hub: "Origin_Hub",
          state: pickup.state,
          city: pickup.city,
          area: "PICKUP",
          estimatedArrival: new Date().toISOString()
        },
        {
          hub: "Destination_Hub", 
          state: delivery.state,
          city: delivery.city,
          area: "DELIVERY",
          estimatedArrival: new Date(Date.now() + estimatedTime * 60 * 60 * 1000).toISOString()
        }
      ],
      recommendedVehicle: {
        type: "MINI_TRUCK",
        reason: "Standard fallback vehicle"
      },
      assignedVehicle: null,
      deliveryAgent: null,
      deliveryArea: "NORTH"
    };
  }

  // 🚛 NEW: Fallback Multi-Hub Route Planning
  _getFallbackMultiHubRoute(orderData, hubNetwork) {
    const pickupState = orderData.pickupAddress?.state;
    const deliveryState = orderData.recipientDetails?.address?.state;
    const isInterState = pickupState !== deliveryState;

    return {
      routePlan: {
        totalSteps: isInterState ? 3 : 2,
        estimatedDuration: isInterState ? "48" : "24",
        route: [
          {
            step: 1,
            hubName: `${pickupState} State Hub`,
            activity: "PICKUP"
          },
          ...(isInterState ? [{
            step: 2,
            hubName: `${deliveryState} State Hub`,
            activity: "TRANSFER"
          }] : []),
          {
            step: isInterState ? 3 : 2,
            hubName: `${orderData.recipientDetails.address.city} City Hub`,
            activity: "DELIVERY"
          }
        ]
      }
    };
  }

  // Helper method to calculate distance (simplified)
  _calculateDistance(location1, location2) {
    // Simplified distance calculation
    const sameState = location1.state === location2.state;
    const sameCity = location1.city === location2.city;
    
    if (sameCity) return 25; // Same city average
    if (sameState) return 200; // Same state average
    return 800; // Interstate average
  }
}

module.exports = new GeminiAIService();
