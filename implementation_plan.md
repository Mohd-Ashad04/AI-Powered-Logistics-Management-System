# M1 — Final Approved Implementation Plan

---

# M1-A: Security & Authentication

## Objective

Every non-public endpoint requires JWT authentication. Resource access is authorized per-endpoint by business responsibility. Customer and delivery-agent ownership is strictly enforced to prevent horizontal privilege escalation.

## Current Problem

- **80% of routes have no auth middleware.** Only `authRoutes` (protected block), `orderRoutes` (POST only), `paymentRoutes`, and `aiRoutes` apply `authenticate`.
- **No authorization.** No ownership checks — any user can read/modify any other user's orders/profile.
- **Password reset token returned in API response.** [authController.js L257](file:///c:/Users/Lenovo/Downloads/ashu/AI-Powered-Logistics-Management-System-main/AI-Powered-Logistics-Management-System-main/backend/src/controllers/authController.js#L257)
- **Role escalation via profile update.** [authController.js L201-L203](file:///c:/Users/Lenovo/Downloads/ashu/AI-Powered-Logistics-Management-System-main/AI-Powered-Logistics-Management-System-main/backend/src/controllers/authController.js#L201-L203): deletes `password` but not `role`.
- **Hardcoded JWT secret fallback.** [config.js L12](file:///c:/Users/Lenovo/Downloads/ashu/AI-Powered-Logistics-Management-System-main/AI-Powered-Logistics-Management-System-main/backend/src/utils/config.js#L12)
- **No body size limit.** [server.js L46](file:///c:/Users/Lenovo/Downloads/ashu/AI-Powered-Logistics-Management-System-main/AI-Powered-Logistics-Management-System-main/backend/server.js#L46)
- **Passport/sessions initialized but entirely unused.** No strategy configured in `src/`. `isAuthenticated` defined in `auth.js` but never called from any route. `req.session` used only for defensive cleanup in logout.

## Per-Endpoint Authorization Classification

### `customerRoutes.js` — Admin management panel

All routes are administrative operations (list all customers, create customer, update any customer, manage addresses for any customer, view any customer's orders/analytics, search customers). No customer self-service endpoints here — those are in `authRoutes` (`GET /auth/me`, `PUT /auth/me`).

| Endpoint | Access Level | Reason |
|----------|-------------|--------|
| `GET /` getAllCustomers | ADMIN | Lists all customer PII |
| `POST /` createCustomer | ADMIN | Admin-creates a customer account |
| `GET /:customerId` getCustomer | ADMIN | Reads any customer's profile |
| `PUT /:customerId` updateCustomer | ADMIN | Modifies any customer's data |
| `POST /:customerId/addresses` | ADMIN | Manages addresses for any customer |
| `PUT /:customerId/addresses/:addressId` | ADMIN | Manages addresses for any customer |
| `DELETE /:customerId/addresses/:addressId` | ADMIN | Manages addresses for any customer |
| `GET /:customerId/orders` | ADMIN | Views any customer's order history |
| `GET /:customerId/analytics` | ADMIN | Views any customer's analytics |
| `GET /search/query` | ADMIN | Searches across all customers |

**Conclusion: `authenticate` + `isAdminOrSubAdmin` on all `customerRoutes`.**

### `deliveryRoutes.js` — Infrastructure management

All routes manage delivery infrastructure (hubs, agents, vehicles, route optimization, network initialization). These are operational/admin functions.

| Endpoint | Access Level | Reason |
|----------|-------------|--------|
| `POST /hubs` createDeliveryHub | ADMIN | Creates infrastructure |
| `GET /hubs` getDeliveryHubs | ADMIN | Lists delivery infrastructure |
| `PUT /hubs/:hubId` updateDeliveryHub | ADMIN | Modifies infrastructure |
| `POST /agents` createDeliveryAgent | ADMIN | Creates agent accounts |
| `GET /agents` getDeliveryAgents | ADMIN | Lists all agents |
| `PUT /agents/:agentId` updateDeliveryAgent | ADMIN | Modifies agent data |
| `POST /agents/:agentId/assign-orders` | ADMIN | Assigns orders to agents |
| `POST /vehicles` createDeliveryVehicle | ADMIN | Creates vehicle records |
| `GET /vehicles` getDeliveryVehicles | ADMIN | Lists all vehicles |
| `POST /vehicles/:vehicleId/assign-orders` | ADMIN | Assigns orders to vehicles |
| `POST /optimize-routes` | ADMIN | Runs route optimization |
| `GET /analytics` | ADMIN | Delivery analytics |
| `POST /initialize-network` | ADMIN | Seeds delivery network |

**Conclusion: `authenticate` + `isAdminOrSubAdmin` on all `deliveryRoutes`.**

### `workflowRoutes.js` — Mixed access

Contains order creation (customer), agent operations (delivery agent), and hub operations (admin).

| Endpoint | Access Level | Reason |
|----------|-------------|--------|
| `POST /orders/create-with-workflow` | AUTHENTICATED | Customer creates order |
| `GET /orders/:orderId/workflow-status` | AUTHENTICATED | Customer views own order workflow |
| `GET /agents/:agentId/orders` | AUTHENTICATED | Agent views assigned orders (ownership check enforced) |
| `GET /agents/:agentId/notifications` | AUTHENTICATED | Agent notifications (ownership check enforced) |
| `PUT /notifications/:notificationId/read` | AUTHENTICATED | Agent marks notification read (ownership check enforced) |
| `PUT /orders/:orderId/complete-pickup` | AUTHENTICATED | Agent completes pickup (assignment check enforced) |
| `GET /hubs/:hubId/dashboard` | ADMIN | Hub management dashboard |
| `PUT /orders/:orderId/receive-at-hub` | ADMIN | Hub operation |
| `PUT /orders/:orderId/dispatch-from-hub` | ADMIN | Hub operation |
| `PUT /orders/:orderId/assign-for-delivery` | ADMIN | Hub operation |
| `PUT /orders/:orderId/complete-delivery` | AUTHENTICATED | Agent completes delivery (assignment check enforced) |

**Conclusion: `authenticate` on all. `isAdminOrSubAdmin` on hub dashboard, receive-at-hub, dispatch-from-hub, assign-for-delivery. Other endpoints check owner/agent identity.**

### `orderRoutes.js` — Mixed access

| Endpoint | Access Level | Reason |
|----------|-------------|--------|
| `GET /` getAllOrders | AUTHENTICATED | Customer sees own; admin sees all |
| `POST /` createOrder | AUTHENTICATED | Customer creates order |
| `GET /tracking/:trackingId` | PUBLIC | Product behavior: public tracking |
| `GET /:orderId` getOrder | AUTHENTICATED | Customer sees own; admin sees any |
| `PUT /:orderId/status` | ADMIN | Status management |
| `DELETE /:orderId` | ADMIN | Destructive operation |
| `POST /:orderId/assign` | ADMIN | Resource assignment |
| `GET /:orderId/track` | AUTHENTICATED | Detailed tracking (ownership check enforced) |
| `GET /customer/:customerId` | AUTHENTICATED | Customer's orders (force own ID) |
| `PUT /bulk/status` | ADMIN | Bulk operations |
| `GET /analytics/summary` | ADMIN | Analytics |

### `pricingRoutes.js`

| Endpoint | Access Level | Reason |
|----------|-------------|--------|
| `POST /calculate` | AUTHENTICATED | Needs auth to prevent abuse |
| `POST /estimate` | AUTHENTICATED | Needs auth to prevent abuse |
| `POST /compare` | AUTHENTICATED | Needs auth to prevent abuse |
| `POST /bulk-estimate` | ADMIN | Bulk operation |
| `GET /trends` | ADMIN | Analytics |
| `GET /zonal` | AUTHENTICATED | Reference data |

## Enforcement & Ownership Rules

### 1. Delivery-Agent Ownership & Assignment Checks
- **Operate across agents**: `ADMIN` and `SUB_ADMIN` can call any endpoint for any agent.
- **Resource limit**: Non-admin delivery agents can access/update only their own assigned resources.
- **`GET /agents/:agentId/orders`**: Verify that the email of the authenticated customer (`req.customer.email`) matches the email of the `DeliveryAgent` corresponding to the requested `:agentId`, unless the caller is `admin`/`sub-admin`.
- **`GET /agents/:agentId/notifications`**: Verify that the email of the authenticated customer (`req.customer.email`) matches the email of the `DeliveryAgent` corresponding to the requested `:agentId`, unless the caller is `admin`/`sub-admin`.
- **`PUT /notifications/:notificationId/read`**: Fetch the notification. If the notification belongs to an `AGENT`, verify the corresponding `DeliveryAgent` email matches `req.customer.email`. If it belongs to a `CUSTOMER`, verify the `recipientId` matches `req.customer._id`.
- **`complete-pickup`**: Verify that the authenticated delivery agent (fetched by matching `email`) matches the order's `workflowTracking.pickupAgent`.
- **`complete-delivery`**: Verify that the authenticated delivery agent (fetched by matching `email`) matches the order's `workflowTracking.deliveryAgent`.

### 2. Customer Ownership Checks
- **`getOrder`**: If caller is `customer`, verify `order.customerId` matches `req.customer._id`.
- **`getCustomerOrders`**: If caller is `customer`, overwrite the target query `customerId` to the caller's `req.customer._id`.
- **`updateCustomer` (self profile update)**: Limit body fields (whitelist) to prevent changing role, email, username, or points.

## Files Affected

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `backend/server.js` | Remove session/passport; add body limit |
| MODIFY | `backend/src/middleware/auth.js` | Remove `isAuthenticated`/`authUser`; add `isAdminOrSubAdmin` |
| MODIFY | `backend/src/routes/orderRoutes.js` | Apply per-endpoint auth middleware |
| MODIFY | `backend/src/routes/customerRoutes.js` | `authenticate` + `isAdminOrSubAdmin` on all routes |
| MODIFY | `backend/src/routes/deliveryRoutes.js` | `authenticate` + `isAdminOrSubAdmin` on all routes |
| MODIFY | `backend/src/routes/pricingRoutes.js` | Apply auth middleware |
| MODIFY | `backend/src/routes/workflowRoutes.js` | Apply per-endpoint auth middleware |
| MODIFY | `backend/src/controllers/authController.js` | Remove resetToken from response; whitelist update fields |
| MODIFY | `backend/src/controllers/orderController.js` | Ownership checks in getOrder, getAllOrders, getCustomerOrders |
| MODIFY | `backend/src/controllers/workflowController.js` | Enforce agent verification in orders, notifications, pickup, and delivery checks |
| MODIFY | `backend/src/utils/config.js` | Throw on default SECRET_KEY in production |

## Exact Changes (M1-A)

### 1. Remove Passport/sessions from `server.js`
- Remove `require('express-session')`, `require('passport')`
- Remove `app.use(session(...))`, `app.use(passport.initialize())`, `app.use(passport.session())`
- Change `express.json()` → `express.json({ limit: '1mb' })`
- Change `express.urlencoded(...)` → `express.urlencoded({ extended: true, limit: '1mb' })`

### 2. Clean auth middleware (`auth.js`)
- Remove `isAuthenticated`, `authUser` (dead code)
- Remove all `req.isAuthenticated()` branches from `isAdmin`
- Add `isAdminOrSubAdmin`: checks `req.customer.role` is `'admin'` or `'sub-admin'`

### 3. Route Protection
Apply JWT middleware as classified above.

### 4. Ownership in `orderController`
- `getOrder`: if role is `customer`, verify `order.customerId.toString() === req.customer._id.toString()`, else 403
- `getAllOrders`: if role is `customer`, add `customerId: req.customer._id` to query filter
- `getCustomerOrders`: if role is `customer`, force `customerId = req.customer._id` regardless of URL param

### 5. Security fixes in `authController`
- `forgotPassword`: remove `data: { resetToken }` from response
- `updateCustomer`: whitelist to `{ name, phone, addresses }` only (delete `role`, `email`, `username`)

### 6. Config validation
- If `NODE_ENV === 'production'` and SECRET_KEY is default → throw

### 7. Agent/Notification authorization in `workflowController`
- Lookup delivery agent using `email: req.customer.email` to match agentId and verify assignment on `completePickup` and `completeDelivery`.

---

# M1-B: Business Correctness

## Objective

Pricing is deterministic. AI is not in the order creation path. Unsafe async mutations are eliminated. Transaction boundaries are identified and documented.

## Current Problem

- **AI generates authoritative price and blocks order creation.** [logisticsService.js L28-L34](file:///c:/Users/Lenovo/Downloads/ashu/AI-Powered-Logistics-Management-System-main/AI-Powered-Logistics-Management-System-main/backend/src/services/logisticsService.js#L28-L34): three sequential `await` calls to Gemini (pricing, time estimation, route optimization) in `createOrder`. If Gemini takes 3–10s or fails slowly, order creation blocks.
- **Three conflicting pricing formulas.** Inline in pricingController (L54-L131), AI fallback in aiService (L527-L546), and Gemini prompt (L236-L286).
- **setTimeout fires-and-forgets a status transition.** [workflowService.js L186-L189](file:///c:/Users/Lenovo/Downloads/ashu/AI-Powered-Logistics-Management-System-main/AI-Powered-Logistics-Management-System-main/backend/src/services/workflowService.js#L186-L189)
- **Non-atomic multi-document writes.** Order + customer history update, order deletion + resource capacity.

## Files Affected

| Action | File | Changes |
|--------|------|---------|
| CREATE | `backend/src/services/pricingEngine.js` | Deterministic pricing engine |
| MODIFY | `backend/src/services/logisticsService.js` | Use pricingEngine; remove all AI calls from createOrder; use logistics utilities for time estimation |
| MODIFY | `backend/src/controllers/pricingController.js` | Delegate to pricingEngine |
| MODIFY | `backend/src/services/workflowService.js` | Remove setTimeout |

## Exact Changes (M1-B)

### 1. Create `pricingEngine.js`

Pure function — no I/O, no network calls, no delivery-time calculation, no route optimization responsibilities. Only pricing.

```
calculatePrice({ pickupPincode, dropPincode, packageDetails, paymentDetails, orderType, priority })

Returns:
{
  breakdown: {
    baseCharge,
    weightCharge,
    distanceCharge,
    orderTypeSurcharge,
    fuelSurcharge,
    handlingCharges,
    codCharges,
    gst
  },
  subtotal,
  totalCost,
  zone: { from, to, type },
  chargeableWeight
}
```

Uses existing business rules:
- Zonal classification from `logistics.js` `getZoneType`
- Distance from `logistics.js` `calculateDistance`
- Zonal rate matrix from pricingController (L366-L377)
- Order type surcharges: HANDLE_WITH_CARE +30%, BY_AIR +80% (from AI prompt rules)
- COD: 2% of amount, min ₹20 (from AI prompt rules)
- Fuel: 15% of subtotal (from AI prompt rules)
- GST: 18% (from pricingController L89)
- Chargeable weight = max(dead, volumetric) (from `logistics.js`)

### 2. Separation of Pricing and Delivery Estimation in `logisticsService.createOrder`
- Remove all AI/Gemini calls from `createOrder` (pricing, time estimation, route optimization).
- Authoritative price is obtained synchronously from `pricingEngine.calculatePrice()`.
- Delivery time estimate is calculated synchronously using deterministic logistics utilities:
  - From `logistics.js`, calculate distance and zone.
  - Determine transit days based on zone: Metro-to-Metro = 1-2 days, Tier1/2 = 2-4 days, Remote = 4-7 days.
  - Apply `addBusinessDays(currentDate, transitDays)` from `logistics.js` to compute the `estimatedDeliveryDate`.
- Create order successfully with these deterministic calculations.
- Defer all route optimization AI calls to M2.

### 3. Update `pricingController.calculatePricing`
Replace inline formula with `pricingEngine.calculatePrice` call. Remove AI-first branch.

### 4. Remove setTimeout in `workflowService.dispatchFromOriginHub`
Replace with direct, synchronous update to `IN_TRANSIT`.

### 5. Document Transaction Boundaries
MongoDB transaction implementation is deferred to M2. M1 adds `// TODO: M2 — MongoDB Transaction` comments to isolate and identify boundaries (order creation + history, deletion + capacity, etc.).

---

# M1-C: API Reliability & Observability

## Objective

Consistent error handling, request validation, structured logging, request correlation, initial OpenAPI spec.

## Files Affected

| Action | File | Changes |
|--------|------|---------|
| CREATE | `backend/src/utils/AppError.js` | Application error class |
| CREATE | `backend/src/utils/logger.js` | Pino-based structured logger |
| CREATE | `backend/src/middleware/requestId.js` | UUID request ID middleware |
| CREATE | `backend/docs/openapi.yaml` | OpenAPI 3.0 spec for critical APIs |
| MODIFY | `backend/server.js` | Add requestId middleware; replace global error handler |
| MODIFY | `backend/src/routes/orderRoutes.js` | Wire `validateOrderData` |
| MODIFY | `backend/src/routes/pricingRoutes.js` | Wire `validatePricingRequest` |
| MODIFY | `backend/src/routes/authRoutes.js` | Add registration/login validation |
| MODIFY | `backend/src/middleware/validation.js` | Add `validateRegistration`, `validateLogin` |
| MODIFY | All controllers + services | Replace `console.log`/`console.error` with logger |

## Exact Changes (M1-C)

### 1. `AppError.js`
Custom error class with `statusCode`, `code`, `isOperational`.

### 2. `logger.js`
Pino wrapper exporting JSON log levels.

### 3. `requestId.js`
Sets `req.id = uuid()`, adds `X-Request-Id` response header.

### 4. Global error handler
Exposes standard error payload `{ success: false, error: { code, message }, requestId }`.

### 5. Wire validation
Apply Joi validators as route middleware.

### 6. OpenAPI spec
Covers auth, orders, tracking, pricing.

### 7. Logger replacement
Replace all `console.log` and `console.error` in backend with `logger.info`/`logger.error`.

---

# M1-D: Automated Verification

## Objective

Test critical security, authorization, pricing, and lifecycle invariants.

## Test Database Strategy

**Dedicated test MongoDB database via `TEST_DATABASE_URI` environment variable.**

- Tests connect to `TEST_DATABASE_URI`, never to the application's `MONGODB_URI`.
- `setup.js` refuses to run if `TEST_DATABASE_URI` is not set or if it equals `MONGODB_URI`.
- Before each test suite: drop test collections. After all suites: disconnect.
- No in-memory MongoDB dependency.

## Files Affected

| Action | File | Changes |
|--------|------|---------|
| CREATE | `backend/tests/unit/pricingEngine.test.js` | Pricing determinism + correctness |
| CREATE | `backend/tests/integration/auth.test.js` | Auth flows + security |
| CREATE | `backend/tests/integration/orders.test.js` | Order CRUD + ownership |
| CREATE | `backend/tests/integration/lifecycle.test.js` | Shipment lifecycle |
| CREATE | `backend/tests/helpers/setup.js` | Test DB connection, cleanup, auth helpers |
| MODIFY | `backend/package.json` | Add jest + supertest to devDependencies; add test script |

## Exact Changes (M1-D)

- Install `jest` + `supertest` as devDependencies.
- Implement safety validation in `setup.js` to abort if `TEST_DATABASE_URI` is unset.
- Add pricing, auth, order ownership, and end-to-end status lifecycle integration tests.

---

# M1-E: Frontend Architecture

## Objective

Separate responsibilities so future changes don't require editing a 2,892-line file.

## Files Affected

| Action | File | Changes |
|--------|------|---------|
| CREATE | `frontend/src/services/api.js` | API request utility + constants |
| CREATE | `frontend/src/contexts/AuthContext.jsx` | Auth state + provider |
| CREATE | `frontend/src/components/layout/AppShell.jsx` | Sidebar + Navbar + content area |
| CREATE | `frontend/src/pages/DashboardPage.jsx` | Dashboard component |
| CREATE | `frontend/src/pages/ShipmentsPage.jsx` | ShipmentsTable component |
| CREATE | `frontend/src/pages/TrackingPage.jsx` | TrackingSection component |
| CREATE | `frontend/src/pages/FleetPage.jsx` | FleetSection component |
| CREATE | `frontend/src/pages/AnalyticsPage.jsx` | AnalyticsSection component |
| CREATE | `frontend/src/pages/PricingPage.jsx` | PricingEstimatorSection component |
| CREATE | `frontend/src/pages/SettingsPage.jsx` | SettingsSection component |
| CREATE | `frontend/src/pages/AuthPage.jsx` | AuthScreen + AuthLoadingScreen |
| CREATE | `frontend/src/components/common/ToastContainer.jsx` | Toast system |
| MODIFY | `frontend/src/App.jsx` | Reduce to root App using AuthContext + AppShell |

## Exact Changes (M1-E)

Pure extraction of components, context, and state from App.jsx into logical modules. No styles or route mechanics changed.

---

# Dependency Graph

```
M1-A (Security)
  │
  └──→ M1-B (Business Correctness)
          │
          └──→ M1-C (API Reliability)
                  │
                  └──→ M1-D (Testing)

M1-E (Frontend) — independent, sequenced last
```

---

# File Impact Summary

## CREATE (22 files)

```
backend/src/services/pricingEngine.js
backend/src/utils/AppError.js
backend/src/utils/logger.js
backend/src/middleware/requestId.js
backend/docs/openapi.yaml
backend/tests/unit/pricingEngine.test.js
backend/tests/integration/auth.test.js
backend/tests/integration/orders.test.js
backend/tests/integration/lifecycle.test.js
backend/tests/helpers/setup.js
frontend/src/services/api.js
frontend/src/contexts/AuthContext.jsx
frontend/src/components/layout/AppShell.jsx
frontend/src/components/common/ToastContainer.jsx
frontend/src/pages/DashboardPage.jsx
frontend/src/pages/ShipmentsPage.jsx
frontend/src/pages/TrackingPage.jsx
frontend/src/pages/FleetPage.jsx
frontend/src/pages/AnalyticsPage.jsx
frontend/src/pages/PricingPage.jsx
frontend/src/pages/SettingsPage.jsx
frontend/src/pages/AuthPage.jsx
```

## MODIFY (15 files)

```
backend/server.js
backend/src/middleware/auth.js
backend/src/middleware/validation.js
backend/src/routes/orderRoutes.js
backend/src/routes/customerRoutes.js
backend/src/routes/deliveryRoutes.js
backend/src/routes/pricingRoutes.js
backend/src/routes/workflowRoutes.js
backend/src/routes/authRoutes.js
backend/src/controllers/authController.js
backend/src/controllers/orderController.js
backend/src/controllers/workflowController.js
backend/src/controllers/pricingController.js
backend/src/services/logisticsService.js
backend/src/services/workflowService.js
backend/package.json
frontend/src/App.jsx
```

---

# Commit Strategy

### Branch: `feature/m1-security`

1. `chore: remove passport/session initialization`
2. `fix: protect all routes with per-endpoint authentication`
3. `fix: add ownership authorization to order endpoints`
4. `fix: security hardening (reset token, field whitelist, secret validation, body limits)`
5. `fix: enforce delivery agent and notification ownership checks`

---

# M1 Definition of Done

- [ ] Every non-public endpoint requires JWT authentication
- [ ] Authorization classified and enforced per-endpoint by business responsibility
- [ ] Ownership prevents horizontal privilege escalation on orders and customer profiles
- [ ] Delivery agents can only access/update their own assigned orders and notifications
- [ ] Notification operations verify notification ownership
- [ ] `complete-pickup` and `complete-delivery` verify authenticated agent assignment
- [ ] No sensitive tokens in API responses
- [ ] Role escalation impossible via profile update
- [ ] Server rejects default secret in production
- [ ] Pricing is deterministic — same input → same output, pure function in pricingEngine
- [ ] Order creation does not call Gemini API (AI fully removed from sync path)
- [ ] No `setTimeout` for critical state transitions
- [ ] Transaction boundaries identified and documented (implementation deferred to M2)
- [ ] Validation middleware on critical POST/PUT endpoints
- [ ] Consistent error responses with requestId
- [ ] Structured JSON logging — zero console.log in production code
- [ ] OpenAPI spec covers auth, orders, tracking, pricing
- [ ] `npm test` passes — tests use dedicated `TEST_DATABASE_URI`, never application DB
- [ ] Frontend decomposed — auth context, API service, pages separated
- [ ] `npm run build` (frontend) succeeds, app works identically
