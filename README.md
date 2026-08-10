# AI-Powered Logistics Management System (AI LogiTrack)

A comprehensive, intelligent logistics management system built with Node.js, Express, MongoDB, and React. This system provides dynamic pricing, automated workflows, multi-tier delivery management, and AI-powered route optimization for pan-India logistics operations.

## 🚀 Features

### Backend Features
- **AI-Powered Dynamic Pricing**: Intelligent pricing based on distance, weight, volume, and delivery zones
- **Multi-Tier Delivery Network**: Support for metro, tier-1, tier-2, and remote area deliveries
- **Automated Workflow Management**: Complete order lifecycle automation
- **Real-time Order Tracking**: Live status updates and delivery notifications
- **Comprehensive API**: RESTful APIs for all operations
- **Role-based Authentication**: JWT-based auth for customers, admins, and delivery agents
- **Database Seeding**: Pre-populated with pan-India delivery network data

### Frontend Features (Multi-Role)
- **Customer Portal**: Order placement, tracking, profile management
- **Admin Dashboard**: System analytics, order management, network oversight
- **Delivery Agent App**: Route optimization, status updates, order management

## 🏗️ Architecture

```
AI Logistics System
├── Backend (Node.js + Express)
│   ├── Authentication & Authorization
│   ├── Order Management
│   ├── Pricing Engine
│   ├── Delivery Network
│   ├── Workflow Automation
│   └── Notification System
├── Frontend (React)
│   ├── Customer Dashboard
│   ├── Admin Panel
│   └── Delivery Agent App
└── Database (MongoDB)
    ├── Customers
    ├── Orders
    ├── Delivery Network
    └── Analytics
```
# Dashboard

![Dashboard](./screenshots/dashboard.png)

### Authentication Endpoints
- `POST /api/auth/register` - Customer registration
- `POST /api/auth/login` - Customer login
- `GET /api/auth/profile` - Get customer profile

### Order Management
- `POST /api/workflow/orders/create-with-workflow` - Create order with automation
- `GET /api/orders` - Get customer orders
- `GET /api/orders/:id/track` - Track specific order
- `PUT /api/orders/:id/status` - Update order status
  ## Analytics Dashboard

![Analytics](./screenshots/analytics.png)

## Shipment Tracking

![Tracking](./screenshots/tracking.png)

### Pricing & Calculations
- `POST /api/pricing/calculate` - Get dynamic pricing
- `POST /api/pricing/compare` - Compare pricing options
- `GET /api/pricing/zonal` - Get zonal pricing

### Delivery Management
- `GET /api/delivery/agents` - Get available agents
- `POST /api/delivery/assign-agent` - Assign agent to order
- `GET /api/delivery/hubs` - Get delivery hubs

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn
- Git

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ai-logistics-system.git
cd ai-logistics-system
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Environment Configuration
Create `.env` file in the backend directory:
```env
# Database
MONGO_URI=mongodb://localhost:27017/logistics_db

# Server
PORT=3000
SECRET_KEY=your-secret-key-here

# AI Service
GEMINI_API_KEY=your-gemini-api-key

# URLs
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:2000
CLIENT_URL=http://localhost:2001
```

### 4. Database Seeding
```bash
cd backend
node seedDatabase.js
```

### 5. Start Backend Server
```bash
cd backend
npm start
# or
node server.js
```

### 6. Frontend Setup (Optional)
```bash
cd frontend
npm install
npm start
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Health Check
```bash
GET /health
```

## 🧪 Testing

### Manual API Testing
Use the provided testing guide:
```bash
# See backend/MANUAL_API_TESTING_GUIDE.md for detailed testing instructions
```

### Sample Test Commands
```bash
# Health Check
curl -X GET http://localhost:3000/health

# Register Customer
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "phone": "9876543210", "password": "password123", "username": "testuser"}''
```

## 🌍 Coverage

### Geographic Reach
- **28 Indian States** with complete delivery network
- **140+ Cities** with dedicated hubs
- **300+ Delivery Agents** across India
- **Metro, Tier-1, Tier-2, and Remote** area coverage

### Order Types Supported
- Normal Delivery
- Handle with Care
- By Air (Express)
- By Road (Standard)
- Cash on Delivery (COD)
- Prepaid Orders

## 📊 Sample Data

The system comes pre-seeded with:
- 6 sample customers
- 140 delivery hubs across all states
- 300+ delivery agents
- 3 interstate vehicles
- Sample orders with different statuses

## 🔧 Configuration

### MongoDB Connection
Update `MONGO_URI` in `.env` for your MongoDB instance:
- Local: `mongodb://localhost:27017/logistics_db`
- Atlas: `mongodb+srv://username:password@cluster.mongodb.net/logistics_db`

### AI Services
Configure Gemini API key for AI-powered features:
- Route optimization
- Dynamic pricing
- Delivery time prediction

## 📁 Project Structure

```
ai-logistics-system/
├── backend/
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth & validation
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities
│   ├── uploads/           # File uploads
│   ├── test/             # Test files
│   ├── server.js         # Main server file
│   ├── seedDatabase.js   # Database seeder
│   └── package.json      # Dependencies
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   ├── store/        # State management
│   │   └── utils/        # Utilities
│   └── package.json      # Dependencies
├── .gitignore           # Git ignore rules
└── README.md           # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, email ashadassasin@gmail.com or create an issue in this repository.

## 🏆 Acknowledgments

- Built for modern logistics and e-commerce needs
- Supports pan-India delivery operations
- AI-powered for intelligent decision making
- Scalable architecture for enterprise use

---

**Happy Coding! 🚀**
