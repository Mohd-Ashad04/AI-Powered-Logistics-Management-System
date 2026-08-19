import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from 'react-router-dom';
import { Package, Truck, CheckCircle2, IndianRupee } from 'lucide-react';
import { StatCard } from './components/dashboard/StatCard';
import "./App.css";

// ── Toast Notification System ──────────────────────────────────
let _toastId = 0;
let _toasts = [];
let _listeners = new Set();

const _notify = () => _listeners.forEach((fn) => fn([..._toasts]));

const toast = {
  _add(type, message, duration = 4500) {
    // Dedup: don't add identical message if one already visible
    if (_toasts.some((t) => t.message === message && t.type === type)) return;
    const id = ++_toastId;
    _toasts = [..._toasts, { id, type, message, createdAt: Date.now() }];
    if (_toasts.length > 6) _toasts = _toasts.slice(-6);
    _notify();
    setTimeout(() => toast.dismiss(id), duration);
    return id;
  },
  success: (msg, dur) => toast._add("success", msg, dur),
  error: (msg, dur) => toast._add("error", msg, dur || 6000),
  warning: (msg, dur) => toast._add("warning", msg, dur),
  info: (msg, dur) => toast._add("info", msg, dur),
  dismiss(id) {
    _toasts = _toasts.filter((t) => t.id !== id);
    _notify();
  },
};

function useToasts() {
  const [toasts, setToasts] = useState(_toasts);
  useEffect(() => {
    _listeners.add(setToasts);
    return () => _listeners.delete(setToasts);
  }, []);
  return toasts;
}

function ToastContainer() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;

  const icons = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-item toast-item--${t.type}`}
          role="alert"
        >
          <span className={`toast-icon toast-icon--${t.type}`}>{icons[t.type] || "●"}</span>
          <span className="toast-msg">{t.message}</span>
          <button className="toast-close" onClick={() => toast.dismiss(t.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}
// ── End Toast System ───────────────────────────────────────────

const TOKEN_STORAGE_KEY = "ailogitrack_auth_token";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_REGISTRATION_PHONE = "+910000000000";
const SHIPMENT_STATUS_FILTERS = ["All", "ORDER_CREATED", "PICKUP_ASSIGNED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

const getCustomerDisplayName = (customer) =>
  customer?.name || customer?.username || customer?.email || "Customer";

const getCustomerInitials = (customer) => {
  const source = getCustomerDisplayName(customer).trim();
  if (!source) return "CU";
  const words = source.split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]).join("");
  return initials.toUpperCase();
};

const formatRole = (role = "customer") =>
  role
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

async function apiRequest(endpoint, { method = "GET", token, body } = {}) {
  const headers = { Accept: "application/json" };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed. Please try again.");
    error.payload = payload;
    throw error;
  }

  return payload;
}

const mapBackendStatusToDisplay = (status = "") => {
  if (status === "PENDING") return "ORDER_CREATED";
  if (status === "ASSIGNED_PICKUP") return "PICKUP_ASSIGNED";
  if (["PICKED_UP", "AT_ORIGIN_HUB", "DISPATCHED_FROM_ORIGIN", "IN_TRANSIT", "AT_DESTINATION_HUB"].includes(status)) {
    return "IN_TRANSIT";
  }
  if (status === "OUT_FOR_DELIVERY") return "OUT_FOR_DELIVERY";
  if (status === "DELIVERED") return "DELIVERED";
  return status || "UNKNOWN";
};

const getShipmentStatusBadgeClass = (displayStatus = "") => {
  if (displayStatus === "ORDER_CREATED") return "purple";
  if (displayStatus === "PICKUP_ASSIGNED") return "blue";
  if (displayStatus === "IN_TRANSIT") return "amber";
  if (displayStatus === "OUT_FOR_DELIVERY") return "cyan";
  if (displayStatus === "DELIVERED") return "green";
  return "gray";
};



const formatShipmentStatusLabel = (status = "") =>
  status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatShipmentDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPriorityBadgeClass = (priority = "") => {
  if (priority === "URGENT") return "red";
  if (priority === "HIGH") return "amber";
  return "gray";
};

async function fetchShipmentsFromApi(token) {
  const response = await apiRequest("/orders?limit=100&page=1", { token });
  return Array.isArray(response?.data) ? response.data : [];
}

// Fleet data is now fetched live from MongoDB via /api/delivery/* endpoints

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "⬡" },
  { id: "shipments", label: "Shipments", icon: "📦" },
  { id: "tracking", label: "Tracking", icon: "📡" },
  { id: "fleet", label: "Fleet", icon: "🚚" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

function generateNotificationsFromShipments(shipments) {
  if (!Array.isArray(shipments) || shipments.length === 0) {
    return [{ text: "No recent activity", type: "info", time: "just now" }];
  }
  const fmtAgo = (d) => {
    if (!d) return "";
    const ms = Date.now() - new Date(d).getTime();
    if (ms < 60000) return "just now";
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
    return `${Math.floor(ms / 86400000)}d ago`;
  };
  const statusNotif = { PENDING: "info", IN_TRANSIT: "warning", DELIVERED: "success", OUT_FOR_DELIVERY: "info", PICKED_UP: "info", CANCELLED: "alert" };
  return shipments
    .slice(0, 8)
    .map((s) => {
      const id = s.sellerOrderId || s._id;
      const st = s.status || "PENDING";
      const type = statusNotif[st] || "info";
      let text;
      if (st === "DELIVERED") text = `${id} delivered successfully`;
      else if (st === "IN_TRANSIT") text = `${id} is in transit`;
      else if (st === "OUT_FOR_DELIVERY") text = `${id} out for delivery`;
      else if (st === "PICKED_UP" || st === "ASSIGNED_PICKUP") text = `Pickup assigned for ${id}`;
      else text = `Shipment ${id} created`;
      return { text, type, time: fmtAgo(s.updatedAt || s.createdAt) };
    });
}

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

function Sidebar({ active, setActive, collapsed, setCollapsed, customer }) {
  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar__brand" onClick={() => setCollapsed(!collapsed)}>
        <div className="sidebar__logo">
          <span className="logo-hex">⬡</span>
          <span className="logo-inner">A</span>
        </div>
        {!collapsed && (
          <div className="sidebar__brand-text">
            <span className="brand-name">AI LogiTrack</span>
            <span className="brand-sub">Smart Logistics Platform</span>
          </div>
        )}
        <button className="sidebar__toggle">{collapsed ? "›" : "‹"}</button>
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar__nav-item ${active === item.id ? "sidebar__nav-item--active" : ""}`}
            onClick={() => setActive(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
            {!collapsed && active === item.id && <span className="nav-indicator" />}
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className="sidebar__footer">
          <div className="system-status">
            <span className="pulse-dot pulse-dot--green" />
            <span>Backend Connected</span>
          </div>
          <div className="ai-badge">
            <span className="ai-badge__dot" />
            AI Engine Online
          </div>
          {customer && (
            <div className="sidebar__user">
              <div className="sidebar__user-avatar">{getCustomerInitials(customer)}</div>
              <div className="sidebar__user-meta">
                <span className="sidebar__user-name">{getCustomerDisplayName(customer)}</span>
                <span className="sidebar__user-email">{customer.email}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function Navbar({ showNotifs, setShowNotifs, customer, onLogout, isLoggingOut, shipments = [], onTrackShipment }) {
  const [time, setTime] = useState(new Date());
  const [search, setSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const notifications = generateNotificationsFromShipments(shipments);

  const searchResults = (() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 2 || !Array.isArray(shipments)) return [];
    return shipments.filter((s) => {
      const id = (s.sellerOrderId || s._id || "").toLowerCase();
      const origin = `${s.pickupAddress?.city || ""} ${s.pickupAddress?.state || ""}`.toLowerCase();
      const dest = `${s.recipientDetails?.address?.city || ""} ${s.recipientDetails?.address?.state || ""}`.toLowerCase();
      const name = (s.recipientDetails?.name || "").toLowerCase();
      return id.includes(q) || origin.includes(q) || dest.includes(q) || name.includes(q);
    }).slice(0, 6);
  })();

  const handleSearchSelect = (shipment) => {
    const trackingId = shipment.sellerOrderId || shipment._id;
    setSearch("");
    setShowSearchResults(false);
    if (onTrackShipment) onTrackShipment(trackingId);
  };

  return (
    <header className="navbar">
      <div className="navbar__left">
        <div className="navbar__breadcrumb">
          <span className="breadcrumb-root">AI LogiTrack</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Operations Center</span>
        </div>
        <div className="navbar__clock">
          {time.toLocaleTimeString("en-US", { hour12: false })}
          <span className="clock-zone"> UTC+5:30</span>
        </div>
      </div>

      <div className="navbar__search">
        <span className="search-icon">⌕</span>
        <input
          type="text"
          placeholder="Search by shipment ID, city, name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowSearchResults(true); }}
          onFocus={() => search.trim().length >= 2 && setShowSearchResults(true)}
          onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
          className="search-input"
        />
        {!search && <span className="search-shortcut">⌘K</span>}
        {showSearchResults && search.trim().length >= 2 && (
          <div className="search-dropdown">
            {searchResults.length > 0 ? searchResults.map((s) => {
              const tid = s.sellerOrderId || s._id;
              const dStatus = mapBackendStatusToDisplay(s.status);
              return (
                <button key={s._id} className="search-result-item" onMouseDown={() => handleSearchSelect(s)}>
                  <span className="search-result-id">{tid}</span>
                  <span className="search-result-route">{s.pickupAddress?.city} → {s.recipientDetails?.address?.city}</span>
                  <span className={`mini-badge mini-badge--${getShipmentStatusBadgeClass(dStatus)}`}>{formatShipmentStatusLabel(dStatus)}</span>
                </button>
              );
            }) : <div className="search-empty">No shipments matching "{search}"</div>}
          </div>
        )}
      </div>

      <div className="navbar__right">
        <div className="notif-wrapper">
          <button className="icon-btn notif-btn" onClick={() => setShowNotifs(!showNotifs)}>
            <span>🔔</span>
            {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
          </button>
          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span>Activity Feed</span>
                <span className="notif-count">{notifications.length} recent</span>
              </div>
              {notifications.map((n, i) => (
                <div key={i} className={`notif-item notif-item--${n.type}`}>
                  <div className={`notif-dot notif-dot--${n.type}`} />
                  <div>
                    <p>{n.text}</p>
                    <span>{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="profile-chip">
          <div className="profile-avatar">{getCustomerInitials(customer)}</div>
          <div className="profile-info">
            <span className="profile-name">{getCustomerDisplayName(customer)}</span>
            <span className="profile-role">{formatRole(customer?.role)}</span>
          </div>
          <span className="profile-chevron">⌄</span>
        </div>
        <button className="logout-btn" onClick={onLogout} disabled={isLoggingOut}>
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </header>
  );
}

function KPICard({ label, value, unit, change, changeDir, icon, accent, sparkData }) {
  const bars = sparkData && sparkData.length > 0
    ? sparkData.slice(-10).map((v) => Math.max(v, 0))
    : null;
  const maxBar = bars ? Math.max(...bars, 1) : 1;
  return (
    <div className={`kpi-card kpi-card--${accent}`}>
      <div className="kpi-card__header">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon">{icon}</div>
      </div>
      <div className="kpi-value">
        {unit && <span className="kpi-unit">{unit}</span>}
        {value}
      </div>
      <div className={`kpi-change kpi-change--${changeDir}`}>
        <span>{changeDir === "up" ? "▲" : "▼"}</span>
        <span>{change}</span>
        <span className="kpi-period">{change === "Live" ? "real-time" : "vs last period"}</span>
      </div>
      {bars && (
        <div className="kpi-sparkline">
          {bars.map((h, i) => (
            <div key={i} className="spark-bar" style={{ height: `${(h / maxBar) * 100}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}

function ShipmentsTable({
  shipments = [],
  isLoading = false,
  loadError = "",
  onRetry,
  onNewShipmentClick,
  onTrackShipment,
  onDeleteShipment,
}) {
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered =
    filter === "All"
      ? shipments
      : shipments.filter((shipment) => mapBackendStatusToDisplay(shipment.status) === filter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeP = Math.min(page, totalPages);
  const paged = filtered.slice((safeP - 1) * PAGE_SIZE, safeP * PAGE_SIZE);

  const handleFilterChange = (f) => { setFilter(f); setPage(1); };

  const pageNums = [];
  for (let i = 1; i <= totalPages; i++) pageNums.push(i);

  return (
    <section className="section">
      <div className="section__header">
        <div>
          <h2 className="section__title">Shipment Operations</h2>
          <p className="section__sub">Live MongoDB-backed shipment records from backend APIs</p>
        </div>
        <div className="section__actions">
          <div className="filter-tabs">
            {SHIPMENT_STATUS_FILTERS.map((s) => (
              <button
                key={s}
                className={`filter-tab ${filter === s ? "filter-tab--active" : ""}`}
                onClick={() => handleFilterChange(s)}
              >
                {s === "All" ? "All" : formatShipmentStatusLabel(s)}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={onNewShipmentClick}>+ New Shipment</button>
        </div>
      </div>

      {loadError && (
        <div className="pricing-error">
          {loadError}
          {" "}
          <button type="button" className="btn-outline" onClick={onRetry}>Retry</button>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Shipment ID</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Carrier</th>
              <th>Weight</th>
              <th>Priority</th>
              <th>Status</th>
              <th>ETA</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="9" className="table-count">Loading shipments...</td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan="9" className="table-count">No shipments found for selected status.</td>
              </tr>
            )}
            {!isLoading && paged.map((shipment, i) => {
              const displayStatus = mapBackendStatusToDisplay(shipment.status);
              const trackingId = shipment.sellerOrderId || shipment.shippingDetails?.awb || shipment._id;

              return (
                <tr key={shipment._id || trackingId} className="table-row" style={{ animationDelay: `${i * 0.04}s` }}>
                  <td><span className="shipment-id">{trackingId}</span></td>
                  <td><span className="location-cell">{shipment.pickupAddress?.city}, {shipment.pickupAddress?.state}</span></td>
                  <td><span className="location-cell">{shipment.recipientDetails?.address?.city}, {shipment.recipientDetails?.address?.state}</span></td>
                  <td><span className="carrier-cell">{shipment.shippingDetails?.courierPartner || "AI Assigned"}</span></td>
                  <td><span className="mono">{shipment.packageDetails?.deadWeight_kg || "-"} kg</span></td>
                  <td>
                    <span className={`priority-badge priority-badge--${getPriorityBadgeClass(shipment.priority)}`}>
                      {formatShipmentStatusLabel(shipment.priority || "MEDIUM")}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-badge--${getShipmentStatusBadgeClass(displayStatus)}`}>
                      <span className="status-dot" />
                      {formatShipmentStatusLabel(displayStatus)}
                    </span>
                  </td>
                  <td><span className="mono eta-cell">{formatShipmentDate(shipment.shippingDetails?.estimatedDeliveryDate)}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="action-btn" onClick={() => onTrackShipment?.(trackingId)}>Track</button>
                      {onDeleteShipment && (
                        <button className="action-btn" style={{ color: "var(--red)" }} onClick={() => onDeleteShipment(shipment._id)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span className="table-count">Showing {(safeP - 1) * PAGE_SIZE + 1}–{Math.min(safeP * PAGE_SIZE, filtered.length)} of {filtered.length} shipments</span>
        <div className="pagination">
          <button className="page-btn" disabled={safeP <= 1} onClick={() => setPage(safeP - 1)}>‹</button>
          {pageNums.map((n) => (
            <button key={n} className={`page-btn ${n === safeP ? "page-btn--active" : ""}`} onClick={() => setPage(n)}>{n}</button>
          ))}
          <button className="page-btn" disabled={safeP >= totalPages} onClick={() => setPage(safeP + 1)}>›</button>
        </div>
      </div>
    </section>
  );
}

function TrackingSection({
  authToken,
  customer,
  onShipmentCreated,
  onShipmentUpdated,
  createFormFocusNonce,
  trackingLookupRequest,
}) {
  const createShipmentCardRef = useRef(null);
  const firstShipmentFieldRef = useRef(null);
  const trackingSearchInputRef = useRef(null);

  const [shipmentForm, setShipmentForm] = useState({
    pickupCityId: "bangalore",
    pickupAddressLine1: "",
    deliveryCityId: "mumbai",
    deliveryAddressLine1: "",
    recipientName: customer?.name || "",
    recipientPhone: customer?.phone || "",
    packageWeight: "2",
    declaredValue: "2500",
    paymentMethod: "PREPAID",
    fragile: false,
  });
  const [shipmentFormErrors, setShipmentFormErrors] = useState({});
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [shipmentCreateError, setShipmentCreateError] = useState("");
  const [shipmentCreateSuccess, setShipmentCreateSuccess] = useState("");

  const [trackingIdQuery, setTrackingIdQuery] = useState("");
  const [trackedShipment, setTrackedShipment] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  const [statusUpdateStep, setStatusUpdateStep] = useState("PICKUP_ASSIGNED");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState("");

  const workflowStages = [
    { code: "ORDER_CREATED", label: "Order Created", backendStatuses: ["PENDING", "ORDER_CREATED", "Order Created"] },
    { code: "PICKUP_ASSIGNED", label: "Pickup Assigned", backendStatuses: ["ASSIGNED_PICKUP"] },
    {
      code: "IN_TRANSIT",
      label: "In Transit",
      backendStatuses: ["PICKED_UP", "AT_ORIGIN_HUB", "DISPATCHED_FROM_ORIGIN", "IN_TRANSIT", "AT_DESTINATION_HUB"],
    },
    { code: "OUT_FOR_DELIVERY", label: "Out For Delivery", backendStatuses: ["OUT_FOR_DELIVERY"] },
    { code: "DELIVERED", label: "Delivered", backendStatuses: ["DELIVERED"] },
  ];

  const workflowStatusMap = {
    ORDER_CREATED: "PENDING",
    PICKUP_ASSIGNED: "ASSIGNED_PICKUP",
    IN_TRANSIT: "IN_TRANSIT",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
  };

  const [availableHubs, setAvailableHubs] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedHub, setSelectedHub] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  useEffect(() => {
    if (!authToken) return;
    let active = true;
    Promise.all([
      apiRequest("/delivery/hubs", { token: authToken }).catch(() => null),
      apiRequest("/delivery/vehicles", { token: authToken }).catch(() => null),
      apiRequest("/delivery/agents", { token: authToken }).catch(() => null),
    ]).then(([hRes, vRes, aRes]) => {
      if (!active) return;
      if (hRes?.data) setAvailableHubs(hRes.data);
      if (vRes?.data) setAvailableVehicles(vRes.data);
      if (aRes?.data) setAvailableAgents(aRes.data);
    });
    return () => { active = false; };
  }, [authToken]);

  useEffect(() => {
    if (!customer) return;
    setShipmentForm((prev) => ({
      ...prev,
      recipientName: prev.recipientName || customer.name || "",
      recipientPhone: prev.recipientPhone || customer.phone || "",
    }));
  }, [customer]);

  useEffect(() => {
    if (!createFormFocusNonce) return;
    createShipmentCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    firstShipmentFieldRef.current?.focus();
  }, [createFormFocusNonce]);

  useEffect(() => {
    if (!trackingLookupRequest?.trackingId) return;
    const query = trackingLookupRequest.trackingId.trim();
    if (!query) return;

    setTrackingIdQuery(query);
    trackingSearchInputRef.current?.focus();

    let active = true;

    const fetchByLookupRequest = async () => {
      setIsTrackingLoading(true);
      setTrackingError("");
      setStatusUpdateError("");

      try {
        const response = await apiRequest(`/orders/tracking/${encodeURIComponent(query)}`, {
          method: "GET",
          token: authToken,
        });

        if (active) {
          setTrackedShipment(response?.data || null);
        }
      } catch (error) {
        if (active) {
          setTrackedShipment(null);
          setTrackingError(error.message || "Unable to fetch shipment tracking");
          toast.error("Tracking lookup failed");
        }
      } finally {
        if (active) {
          setIsTrackingLoading(false);
        }
      }
    };

    fetchByLookupRequest();

    return () => {
      active = false;
    };
  }, [trackingLookupRequest, authToken]);

  const formatTimestamp = (value) => {
    if (!value) return "Pending";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Pending";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getWorkflowStageIndex = (status) => {
    const stageIndex = workflowStages.findIndex((stage) => stage.backendStatuses.includes(status));
    return stageIndex === -1 ? 0 : stageIndex;
  };

  const getStageTimestamp = (stage, trackingHistory = []) => {
    const event = trackingHistory.find((entry) => stage.backendStatuses.includes(entry.status));
    return event?.timestamp || null;
  };

  const clearShipmentFieldError = (field) => {
    setShipmentFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const fetchTracking = async (inputTrackingId) => {
    const query = (inputTrackingId || trackingIdQuery).trim();
    if (!query) {
      setTrackingError("Tracking ID is required");
      return;
    }

    setIsTrackingLoading(true);
    setTrackingError("");
    setStatusUpdateError("");
    toast.info(`Tracking shipment ${query}...`);

    try {
      const response = await apiRequest(`/orders/tracking/${encodeURIComponent(query)}`, {
        method: "GET",
        token: authToken,
      });
      setTrackedShipment(response?.data || null);
    } catch (error) {
      setTrackedShipment(null);
      setTrackingError(error.message || "Unable to fetch shipment tracking");
      toast.error("Tracking lookup failed");
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const validateShipmentForm = () => {
    const errors = {};

    if (!shipmentForm.pickupAddressLine1.trim()) errors.pickupAddressLine1 = "Pickup address is required";
    if (!shipmentForm.deliveryAddressLine1.trim()) errors.deliveryAddressLine1 = "Delivery address is required";
    if (!shipmentForm.recipientName.trim()) errors.recipientName = "Recipient name is required";
    if (!shipmentForm.recipientPhone.trim()) errors.recipientPhone = "Recipient phone is required";

    const weight = Number(shipmentForm.packageWeight);
    if (!shipmentForm.packageWeight || Number.isNaN(weight) || weight <= 0) {
      errors.packageWeight = "Enter a valid package weight";
    }

    const declaredValue = Number(shipmentForm.declaredValue);
    if (!shipmentForm.declaredValue || Number.isNaN(declaredValue) || declaredValue <= 0) {
      errors.declaredValue = "Enter a valid shipment value";
    }

    return errors;
  };

  const handleCreateShipment = async (event) => {
    event.preventDefault();
    if (isCreatingShipment) return;

    const errors = validateShipmentForm();
    if (Object.keys(errors).length > 0) {
      setShipmentFormErrors(errors);
      return;
    }

    const pickupCity = pricingCities.find((city) => city.id === shipmentForm.pickupCityId);
    const deliveryCity = pricingCities.find((city) => city.id === shipmentForm.deliveryCityId);

    if (!pickupCity || !deliveryCity) {
      setShipmentCreateError("Invalid pickup or delivery city selection");
      return;
    }

    const declaredValue = Number(shipmentForm.declaredValue);
    const packageWeight = Number(shipmentForm.packageWeight);

    const orderPayload = {
      customerId: customer?._id,
      pickupAddress: {
        addressLine1: shipmentForm.pickupAddressLine1.trim(),
        city: pickupCity.city,
        state: pickupCity.state,
        pincode: pickupCity.pincode,
        country: "India",
        phone: customer?.phone || shipmentForm.recipientPhone.trim(),
      },
      recipientDetails: {
        name: shipmentForm.recipientName.trim(),
        phone: shipmentForm.recipientPhone.trim(),
        email: customer?.email || "",
        address: {
          addressLine1: shipmentForm.deliveryAddressLine1.trim(),
          city: deliveryCity.city,
          state: deliveryCity.state,
          pincode: deliveryCity.pincode,
          country: "India",
        },
      },
      packageDetails: {
        items: [
          {
            name: "Shipment Package",
            quantity: 1,
            price: declaredValue,
            weight_grams: Math.round(packageWeight * 1000),
            category: "General",
          },
        ],
        deadWeight_kg: packageWeight,
        dimensions_cm: {
          length: 30,
          width: 20,
          height: 15,
        },
        fragile: shipmentForm.fragile,
      },
      paymentDetails: {
        method: shipmentForm.paymentMethod,
        totalValue: declaredValue,
        codAmount: shipmentForm.paymentMethod === "COD" ? declaredValue : 0,
      },
      orderType: shipmentForm.fragile ? "HANDLE_WITH_CARE" : "NORMAL",
      priority: "MEDIUM",
    };

    setIsCreatingShipment(true);
    setShipmentCreateError("");
    setShipmentCreateSuccess("");

    try {
      const response = await apiRequest("/orders", {
        method: "POST",
        token: authToken,
        body: orderPayload,
      });

      const createdOrder = response?.data?.order;
      if (!createdOrder?._id) {
        throw new Error("Shipment created but response is missing order details");
      }

      const createdTrackingId = createdOrder.sellerOrderId || createdOrder._id;
      setShipmentCreateSuccess(`Shipment created successfully. Tracking ID: ${createdTrackingId}`);
      toast.success(`Shipment ${createdTrackingId} created and saved to MongoDB`);
      
      // Trigger operational assignment notifications based on backend data
      if (createdOrder.routeOptimization) {
        setTimeout(() => {
          if (createdOrder.routeOptimization.transitRoute?.[0]?.hub) {
            toast.info(`Assigned to Origin Hub: ${createdOrder.routeOptimization.transitRoute[0].hub}`);
          }
        }, 800);
        
        setTimeout(() => {
          if (createdOrder.routeOptimization.assignedVehicle) {
            toast.info(`Vehicle ${createdOrder.routeOptimization.assignedVehicle.vehicleId} assigned`);
          }
        }, 1600);
        
        setTimeout(() => {
          if (createdOrder.routeOptimization.deliveryAgent) {
            toast.info(`Delivery Agent ${createdOrder.routeOptimization.deliveryAgent.name} assigned`);
          }
        }, 2400);
      }

      setTrackingIdQuery(createdTrackingId);
      if (onShipmentCreated) {
        onShipmentCreated(createdOrder);
      }
      await fetchTracking(createdTrackingId);
    } catch (error) {
      setShipmentCreateError(error.message || "Failed to create shipment");
      toast.error("Shipment creation failed: " + (error.message || "Unknown error"));
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleTrackShipment = async (event) => {
    event.preventDefault();
    await fetchTracking(trackingIdQuery);
  };

  const handleStatusUpdate = async () => {
    if (isUpdatingStatus || !trackedShipment?.order?._id) return;

    setIsUpdatingStatus(true);
    setStatusUpdateError("");

    try {
      const backendStatus = workflowStatusMap[statusUpdateStep];
      await apiRequest(`/orders/${trackedShipment.order._id}/status`, {
        method: "PUT",
        token: authToken,
        body: {
          status: backendStatus,
          location: `${trackedShipment.order.recipientDetails.address.city}, ${trackedShipment.order.recipientDetails.address.state}`,
          remarks: `Status updated from dashboard as ${statusUpdateStep}`,
        },
      });

      const lookupId = trackedShipment.order.sellerOrderId || trackedShipment.order._id;
      await fetchTracking(lookupId);
      if (onShipmentUpdated) {
        onShipmentUpdated();
      }
      toast.success(`Status updated to ${formatShipmentStatusLabel(statusUpdateStep)}`);
    } catch (error) {
      setStatusUpdateError(error.message || "Failed to update shipment status");
      toast.error("Status update failed");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssignResource = async (type, entityId, entityName) => {
    if (isAssigning || !trackedShipment?.order?._id || !entityId) return;

    setIsAssigning(true);
    try {
      await apiRequest(`/orders/${trackedShipment.order._id}/assign`, {
        method: "POST",
        token: authToken,
        body: { type, entityId, entityName }
      });
      
      const lookupId = trackedShipment.order.sellerOrderId || trackedShipment.order._id;
      await fetchTracking(lookupId);
      if (onShipmentUpdated) onShipmentUpdated();
      
      let toastMsg = `Successfully assigned ${type.toLowerCase()}`;
      if (type === 'HUB') toastMsg = `Hub assigned successfully`;
      if (type === 'VEHICLE') toastMsg = `Vehicle ${entityId} assigned`;
      if (type === 'AGENT') toastMsg = `Agent ${entityName} assigned`;
      toast.success(toastMsg);
    } catch (error) {
      toast.error(`Assignment failed: ${error.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const trackedOrder = trackedShipment?.order;
  const currentStatus = trackedOrder?.status || "PENDING";
  const currentDisplayStatus = mapBackendStatusToDisplay(currentStatus);
  const currentStageIndex = getWorkflowStageIndex(currentStatus);
  const statusBadgeClass = getShipmentStatusBadgeClass(currentDisplayStatus);
  const trackingProgress = trackedShipment?.progress || 0;
  const routeSummary = trackedOrder
    ? `${trackedOrder.pickupAddress.city}, ${trackedOrder.pickupAddress.state} -> ${trackedOrder.recipientDetails.address.city}, ${trackedOrder.recipientDetails.address.state}`
    : "";

  return (
    <section className="section tracking-section">
      <div className="section__header">
        <div>
          <h2 className="section__title">Shipment Workflow</h2>
          <p className="section__sub">Create shipments, track by tracking ID, and monitor status progression</p>
        </div>
      </div>

      <div className="tracking-layout">
        <div className="tracking-input-col">
          <div className="track-info-card" ref={createShipmentCardRef}>
            <div className="shipment-form-header">
              <h3 className="timeline-title">Create Shipment</h3>
              <span className="pricing-live-badge">MONGODB LIVE</span>
            </div>
            <form className="shipment-form-grid" onSubmit={handleCreateShipment}>
              <label className="pricing-field">
                Pickup City
                <select
                  className="pricing-input"
                  value={shipmentForm.pickupCityId}
                  onChange={(e) => {
                    setShipmentForm((prev) => ({ ...prev, pickupCityId: e.target.value }));
                    clearShipmentFieldError("pickupCityId");
                  }}
                  disabled={isCreatingShipment}
                >
                  {pricingCities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.city}, {city.state}
                    </option>
                  ))}
                </select>
              </label>

              <label className="pricing-field">
                Delivery City
                <select
                  className="pricing-input"
                  value={shipmentForm.deliveryCityId}
                  onChange={(e) => {
                    setShipmentForm((prev) => ({ ...prev, deliveryCityId: e.target.value }));
                    clearShipmentFieldError("deliveryCityId");
                  }}
                  disabled={isCreatingShipment}
                >
                  {pricingCities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.city}, {city.state}
                    </option>
                  ))}
                </select>
              </label>

              <label className="pricing-field">
                Pickup Address
                <input
                  ref={firstShipmentFieldRef}
                  className={`pricing-input ${shipmentFormErrors.pickupAddressLine1 ? "pricing-input--error" : ""}`}
                  type="text"
                  value={shipmentForm.pickupAddressLine1}
                  onChange={(e) => {
                    setShipmentForm((prev) => ({ ...prev, pickupAddressLine1: e.target.value }));
                    clearShipmentFieldError("pickupAddressLine1");
                  }}
                  placeholder="Pickup address line"
                  disabled={isCreatingShipment}
                />
                {shipmentFormErrors.pickupAddressLine1 && (
                  <span className="pricing-field-error">{shipmentFormErrors.pickupAddressLine1}</span>
                )}
              </label>

              <label className="pricing-field">
                Delivery Address
                <input
                  className={`pricing-input ${shipmentFormErrors.deliveryAddressLine1 ? "pricing-input--error" : ""}`}
                  type="text"
                  value={shipmentForm.deliveryAddressLine1}
                  onChange={(e) => {
                    setShipmentForm((prev) => ({ ...prev, deliveryAddressLine1: e.target.value }));
                    clearShipmentFieldError("deliveryAddressLine1");
                  }}
                  placeholder="Delivery address line"
                  disabled={isCreatingShipment}
                />
                {shipmentFormErrors.deliveryAddressLine1 && (
                  <span className="pricing-field-error">{shipmentFormErrors.deliveryAddressLine1}</span>
                )}
              </label>

              <label className="pricing-field">
                Recipient Name
                <input
                  className={`pricing-input ${shipmentFormErrors.recipientName ? "pricing-input--error" : ""}`}
                  type="text"
                  value={shipmentForm.recipientName}
                  onChange={(e) => {
                    setShipmentForm((prev) => ({ ...prev, recipientName: e.target.value }));
                    clearShipmentFieldError("recipientName");
                  }}
                  placeholder="Recipient full name"
                  disabled={isCreatingShipment}
                />
                {shipmentFormErrors.recipientName && (
                  <span className="pricing-field-error">{shipmentFormErrors.recipientName}</span>
                )}
              </label>

              <label className="pricing-field">
                Recipient Phone
                <input
                  className={`pricing-input ${shipmentFormErrors.recipientPhone ? "pricing-input--error" : ""}`}
                  type="text"
                  value={shipmentForm.recipientPhone}
                  onChange={(e) => {
                    setShipmentForm((prev) => ({ ...prev, recipientPhone: e.target.value }));
                    clearShipmentFieldError("recipientPhone");
                  }}
                  placeholder="+91XXXXXXXXXX"
                  disabled={isCreatingShipment}
                />
                {shipmentFormErrors.recipientPhone && (
                  <span className="pricing-field-error">{shipmentFormErrors.recipientPhone}</span>
                )}
              </label>

              <label className="pricing-field">
                Package Weight (kg)
                <input
                  className={`pricing-input ${shipmentFormErrors.packageWeight ? "pricing-input--error" : ""}`}
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={shipmentForm.packageWeight}
                  onChange={(e) => {
                    setShipmentForm((prev) => ({ ...prev, packageWeight: e.target.value }));
                    clearShipmentFieldError("packageWeight");
                  }}
                  disabled={isCreatingShipment}
                />
                {shipmentFormErrors.packageWeight && (
                  <span className="pricing-field-error">{shipmentFormErrors.packageWeight}</span>
                )}
              </label>

              <label className="pricing-field">
                Declared Value (INR)
                <input
                  className={`pricing-input ${shipmentFormErrors.declaredValue ? "pricing-input--error" : ""}`}
                  type="number"
                  min="1"
                  step="1"
                  value={shipmentForm.declaredValue}
                  onChange={(e) => {
                    setShipmentForm((prev) => ({ ...prev, declaredValue: e.target.value }));
                    clearShipmentFieldError("declaredValue");
                  }}
                  disabled={isCreatingShipment}
                />
                {shipmentFormErrors.declaredValue && (
                  <span className="pricing-field-error">{shipmentFormErrors.declaredValue}</span>
                )}
              </label>

              <label className="pricing-field">
                Payment Method
                <select
                  className="pricing-input"
                  value={shipmentForm.paymentMethod}
                  onChange={(e) => setShipmentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  disabled={isCreatingShipment}
                >
                  <option value="PREPAID">Prepaid</option>
                  <option value="COD">Cash on Delivery</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </label>

              <label className="pricing-field pricing-field--checkbox">
                <input
                  type="checkbox"
                  checked={shipmentForm.fragile}
                  onChange={(e) => setShipmentForm((prev) => ({ ...prev, fragile: e.target.checked }))}
                  disabled={isCreatingShipment}
                />
                <span>Fragile Shipment</span>
              </label>

              <button className="btn-primary pricing-submit-btn" type="submit" disabled={isCreatingShipment}>
                {isCreatingShipment ? "Creating Shipment..." : "Create Shipment"}
              </button>
            </form>

            {shipmentCreateError && <div className="pricing-error">{shipmentCreateError}</div>}
            {shipmentCreateSuccess && (
              <div className="auth-alert auth-alert--success shipment-create-success">{shipmentCreateSuccess}</div>
            )}
          </div>

          <form className="track-search" onSubmit={handleTrackShipment}>
            <input
              ref={trackingSearchInputRef}
              type="text"
              className="track-input"
              value={trackingIdQuery}
              onChange={(e) => setTrackingIdQuery(e.target.value)}
              placeholder="Enter tracking ID (e.g. ORD-...)"
            />
            <button className="track-btn" type="submit" disabled={isTrackingLoading}>
              {isTrackingLoading ? "Tracking..." : "Track"}
            </button>
          </form>

          {trackingError && <div className="pricing-error">{trackingError}</div>}

          {trackedOrder && (
            <div className="track-info-card">
              <div className="track-info-header">
                <div>
                  <span className="track-id">{trackedOrder.sellerOrderId || trackedOrder._id}</span>
                  <div className="track-route">{routeSummary}</div>
                </div>
                <span className={`status-badge status-badge--${statusBadgeClass}`}>
                  <span className="status-dot" /> {formatShipmentStatusLabel(currentDisplayStatus)}
                </span>
              </div>
              <div className="track-stats">
                <div className="track-stat">
                  <span className="track-stat-label">Package Weight</span>
                  <span className="track-stat-value mono">{trackedOrder.packageDetails.deadWeight_kg} kg</span>
                </div>
                <div className="track-stat">
                  <span className="track-stat-label">Payment</span>
                  <span className="track-stat-value">{trackedOrder.paymentDetails.method}</span>
                </div>
                <div className="track-stat">
                  <span className="track-stat-label">ETA</span>
                  <span className="track-stat-value mono">{formatTimestamp(trackedShipment.estimatedDelivery)}</span>
                </div>
                <div className="track-stat">
                  <span className="track-stat-label">Progress</span>
                  <span className="track-stat-value">{trackingProgress}%</span>
                </div>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${trackingProgress}%` }} />
                  <div className="progress-pulse" style={{ left: `${trackingProgress}%` }} />
                </div>
                <div className="progress-labels">
                  <span>{trackedOrder.pickupAddress.city}</span>
                  <span>{trackedOrder.recipientDetails.address.city}</span>
                </div>
              </div>
              
              {/* Fleet Assignments */}
              {(trackedOrder.routeOptimization?.deliveryAgent || trackedOrder.routeOptimization?.assignedVehicle || trackedOrder.routeOptimization?.transitRoute?.[0]?.hub) && (
                <div className="track-assignments-section">
                  <h4 className="track-assignments-title">Operational Assignments</h4>
                  <div className="track-assignments-grid">
                    {trackedOrder.routeOptimization?.transitRoute?.[0]?.hub && (
                      <div className="track-assignment-item">
                        <span className="track-assignment-icon">🏢</span>
                        <div className="track-assignment-info">
                          <span className="track-assignment-label">Origin Hub</span>
                          <span className="track-assignment-value">{trackedOrder.routeOptimization.transitRoute[0].hub}</span>
                        </div>
                      </div>
                    )}
                    {trackedOrder.routeOptimization?.assignedVehicle && (
                      <div className="track-assignment-item">
                        <span className="track-assignment-icon">🚚</span>
                        <div className="track-assignment-info">
                          <span className="track-assignment-label">Vehicle ({trackedOrder.routeOptimization.assignedVehicle.type || "Truck"})</span>
                          <span className="track-assignment-value">{trackedOrder.routeOptimization.assignedVehicle.vehicleId}</span>
                        </div>
                      </div>
                    )}
                    {trackedOrder.routeOptimization?.deliveryAgent && (
                      <div className="track-assignment-item">
                        <span className="track-assignment-icon">👤</span>
                        <div className="track-assignment-info">
                          <span className="track-assignment-label">Delivery Agent</span>
                          <span className="track-assignment-value">{trackedOrder.routeOptimization.deliveryAgent.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="timeline-col">
          <h3 className="timeline-title">Shipment Timeline</h3>
          <div className="timeline">
            {workflowStages.map((stage, index) => {
              const done = index < currentStageIndex || (index === currentStageIndex && currentStatus === "DELIVERED");
              const active = index === currentStageIndex;

              return (
                <div key={stage.code} className={`timeline-step ${done ? "timeline-step--done" : ""} ${active ? "timeline-step--active" : ""}`}>
                  <div className="timeline-connector" />
                  <div className="timeline-dot">
                    {done && !active ? "✓" : active ? "●" : ""}
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-label">{stage.label}</span>
                    <span className="timeline-time">
                      {trackedOrder ? formatTimestamp(getStageTimestamp(stage, trackedShipment?.trackingHistory || [])) : "Pending"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {trackedOrder && (
            <>
              <div className="track-info-card status-update-card">
                <h3 className="timeline-title">Demo Status Progression</h3>
                <div className="status-update-controls">
                  <select
                    className="pricing-input"
                    value={statusUpdateStep}
                    onChange={(e) => setStatusUpdateStep(e.target.value)}
                    disabled={isUpdatingStatus}
                  >
                    <option value="ORDER_CREATED">ORDER_CREATED</option>
                    <option value="PICKUP_ASSIGNED">PICKUP_ASSIGNED</option>
                    <option value="IN_TRANSIT">IN_TRANSIT</option>
                    <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                    <option value="DELIVERED">DELIVERED</option>
                  </select>
                  <button className="btn-outline" onClick={handleStatusUpdate} disabled={isUpdatingStatus}>
                    {isUpdatingStatus ? "Updating..." : "Update Status"}
                  </button>
                </div>
                {statusUpdateError && <div className="pricing-error">{statusUpdateError}</div>}
              </div>

              <div className="track-info-card status-update-card" style={{ marginTop: '16px' }}>
                <h3 className="timeline-title">Operational Reassignment</h3>
                
                <div className="status-update-controls" style={{ marginBottom: '10px' }}>
                  <select className="pricing-input" value={selectedHub} onChange={e => setSelectedHub(e.target.value)} disabled={isAssigning}>
                    <option value="">Select Origin Hub...</option>
                    {availableHubs.map(h => <option key={h.hubId} value={h.hubId}>{h.city} - {h.area}</option>)}
                  </select>
                  <button className="btn-outline" onClick={() => handleAssignResource('HUB', selectedHub)} disabled={isAssigning || !selectedHub}>
                    Assign Hub
                  </button>
                </div>

                <div className="status-update-controls" style={{ marginBottom: '10px' }}>
                  <select className="pricing-input" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} disabled={isAssigning}>
                    <option value="">Select Vehicle...</option>
                    {availableVehicles.map(v => <option key={v.vehicleId} value={v.vehicleId}>{v.vehicleId} ({v.type})</option>)}
                  </select>
                  <button className="btn-outline" onClick={() => {
                    const v = availableVehicles.find(x => x.vehicleId === selectedVehicle);
                    handleAssignResource('VEHICLE', selectedVehicle, v?.type);
                  }} disabled={isAssigning || !selectedVehicle}>
                    Assign Vehicle
                  </button>
                </div>

                <div className="status-update-controls">
                  <select className="pricing-input" value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} disabled={isAssigning}>
                    <option value="">Select Agent...</option>
                    {availableAgents.map(a => <option key={a.agentId} value={a.agentId}>{a.name} ({a.area})</option>)}
                  </select>
                  <button className="btn-outline" onClick={() => {
                    const a = availableAgents.find(x => x.agentId === selectedAgent);
                    handleAssignResource('AGENT', selectedAgent, a?.name);
                  }} disabled={isAssigning || !selectedAgent}>
                    Assign Agent
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function FleetSection({ authToken, shipments }) {
  const [hubs, setHubs] = useState([]);
  const [agents, setAgents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fetchFleetData = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [hubsRes, agentsRes, vehiclesRes] = await Promise.all([
        apiRequest("/delivery/hubs", { token: authToken }),
        apiRequest("/delivery/agents", { token: authToken }),
        apiRequest("/delivery/vehicles", { token: authToken }),
      ]);
      setHubs(Array.isArray(hubsRes?.data) ? hubsRes.data : []);
      setAgents(Array.isArray(agentsRes?.data) ? agentsRes.data : []);
      setVehicles(Array.isArray(vehiclesRes?.data) ? vehiclesRes.data : []);
    } catch (error) {
      setLoadError(error.message || "Failed to load fleet data");
      toast.error("Failed to load fleet data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFleetData();
  }, [authToken, shipments?.length]);

  const vStatusColor = (s) => ({ IN_TRANSIT: "cyan", LOADING: "amber", AVAILABLE: "green", MAINTENANCE: "red" }[s] || "gray");
  const aStatusColor = (s) => ({ AVAILABLE: "green", ON_DELIVERY: "cyan", OFF_DUTY: "gray", BREAK: "amber" }[s] || "gray");
  const activeAgents = agents.filter((a) => a.status === "ON_DELIVERY" || a.status === "AVAILABLE").length;
  const activeVehicles = vehicles.filter((v) => v.status === "IN_TRANSIT" || v.status === "LOADING").length;

  return (
    <section className="section fleet-section">
      <div className="section__header">
        <div>
          <h2 className="section__title">Fleet Overview</h2>
          <p className="section__sub">Live delivery infrastructure from MongoDB</p>
        </div>
        <span className="pricing-live-badge">MONGODB LIVE</span>
      </div>

      {loadError && (
        <div className="pricing-error">
          {loadError}{" "}
          <button type="button" className="btn-outline" onClick={fetchFleetData}>Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="fleet-loading"><div className="fleet-loading-spinner" /><p>Loading fleet data...</p></div>
      ) : (
        <>
          <div className="fleet-summary">
            <div className="fleet-stat-card"><span className="fleet-stat-num cyan">{hubs.length}</span><span className="fleet-stat-label">Delivery Hubs</span></div>
            <div className="fleet-stat-card"><span className="fleet-stat-num green">{agents.length}</span><span className="fleet-stat-label">Delivery Agents</span></div>
            <div className="fleet-stat-card"><span className="fleet-stat-num amber">{vehicles.length}</span><span className="fleet-stat-label">Fleet Vehicles</span></div>
            <div className="fleet-stat-card"><span className="fleet-stat-num red">{activeVehicles + activeAgents}</span><span className="fleet-stat-label">Active Now</span></div>
          </div>

          {hubs.length > 0 && (
            <div className="fleet-subsection">
              <h3 className="fleet-sub-title">Delivery Hubs</h3>
              <div className="fleet-hubs-grid">
                {hubs.slice(0, 8).map((hub) => (
                  <div key={hub.hubId || hub._id} className="fleet-hub-card">
                    <div className="fleet-hub-header">
                      <span className="fleet-hub-id">{hub.hubId}</span>
                      <span className={`mini-badge mini-badge--${hub.isActive !== false ? "green" : "gray"}`}>{hub.isActive !== false ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="fleet-hub-location">{hub.city}, {hub.state}</div>
                    <div className="fleet-hub-meta">
                      <span className="fleet-hub-area-tag">{hub.area}</span>
                      <span className="fleet-hub-capacity">{hub.capacity?.currentLoad || 0}/{hub.capacity?.maxOrders || 1000}</span>
                    </div>
                  </div>
                ))}
              </div>
              {hubs.length > 8 && <p className="fleet-more-text">+ {hubs.length - 8} more hubs</p>}
            </div>
          )}

          {vehicles.length > 0 && (
            <div className="fleet-subsection">
              <h3 className="fleet-sub-title">Fleet Vehicles</h3>
              <div className="fleet-grid">
                {vehicles.slice(0, 6).map((v) => (
                  <div key={v.vehicleId || v._id} className={`fleet-card fleet-card--${vStatusColor(v.status)}`}>
                    <div className="fleet-card__header">
                      <div className="fleet-vehicle-id">{v.vehicleId}</div>
                      <span className={`mini-badge mini-badge--${vStatusColor(v.status)}`}>{formatShipmentStatusLabel(v.status || "UNKNOWN")}</span>
                    </div>
                    <div className="fleet-driver">
                      <span className="driver-avatar">{(v.driver?.name || "??").split(" ").map((n) => n[0]).join("")}</span>
                      <div>
                        <div className="driver-name">{v.driver?.name || "Unassigned"}</div>
                        <div className="driver-route">{v.type || "Vehicle"} • {v.registrationNumber || "-"}</div>
                      </div>
                    </div>
                    <div className="fleet-metrics">
                      <div className="fleet-metric"><span className="fleet-metric-label">Type</span><span className="fleet-metric-val mono">{formatShipmentStatusLabel(v.type || "-")}</span></div>
                      <div className="fleet-metric">
                        <span className="fleet-metric-label">Load</span>
                        <div className="metric-bar-wrap">
                          <div className="metric-bar"><div className="metric-fill metric-fill--cyan" style={{ width: `${Math.min(((v.assignedOrders?.length || 0) / (v.capacity?.maxOrders || 500)) * 100, 100)}%` }} /></div>
                          <span className="mono">{v.assignedOrders?.length || 0}/{v.capacity?.maxOrders || 500}</span>
                        </div>
                      </div>
                      <div className="fleet-metric"><span className="fleet-metric-label">Max Weight</span><span className="fleet-metric-val mono">{v.capacity?.maxWeight_kg || 0} kg</span></div>
                    </div>
                  </div>
                ))}
              </div>
              {vehicles.length > 6 && <p className="fleet-more-text">+ {vehicles.length - 6} more vehicles</p>}
            </div>
          )}

          {agents.length > 0 && (
            <div className="fleet-subsection">
              <h3 className="fleet-sub-title">Delivery Agents</h3>
              <div className="fleet-agents-grid">
                {agents.slice(0, 8).map((agent) => (
                  <div key={agent.agentId || agent._id} className={`fleet-agent-card fleet-agent-card--${aStatusColor(agent.status)}`}>
                    <div className="fleet-agent-header">
                      <span className="driver-avatar">{(agent.name || "??").split(" ").map((n) => n[0]).join("")}</span>
                      <div className="fleet-agent-info">
                        <span className="fleet-agent-name">{agent.name}</span>
                        <span className="fleet-agent-hub">{agent.hubId}</span>
                      </div>
                      <span className={`mini-badge mini-badge--${aStatusColor(agent.status)}`}>{formatShipmentStatusLabel(agent.status || "UNKNOWN")}</span>
                    </div>
                    <div className="fleet-agent-details">
                      <span>{agent.area} Area</span>
                      <span>{agent.vehicleType || "BIKE"}</span>
                      <span>{agent.currentCapacity?.currentOrders || 0}/{agent.currentCapacity?.maxOrders || 20} orders</span>
                    </div>
                  </div>
                ))}
              </div>
              {agents.length > 8 && <p className="fleet-more-text">+ {agents.length - 8} more agents</p>}
            </div>
          )}

          {hubs.length === 0 && vehicles.length === 0 && agents.length === 0 && (
            <div className="fleet-empty-state">
              <p className="fleet-empty-title">No Fleet Data Yet</p>
              <p className="fleet-empty-sub">Create shipments to automatically build your delivery network with hubs, agents, and vehicles.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function AnalyticsSection({ analyticsData: externalData, isLoading: externalLoading, authToken }) {
  const [selfData, setSelfData] = useState(null);
  const [selfLoading, setSelfLoading] = useState(false);

  // Self-fetch when rendered standalone (no external data and authToken provided)
  useEffect(() => {
    if (externalData !== undefined && externalData !== null) return;
    if (!authToken) return;
    let active = true;
    setSelfLoading(true);
    apiRequest("/orders/analytics/summary", { token: authToken })
      .then((res) => { if (active) setSelfData(res?.data || null); })
      .catch(() => { if (active) setSelfData(null); })
      .finally(() => { if (active) setSelfLoading(false); });
    return () => { active = false; };
  }, [authToken, externalData]);

  const analyticsData = externalData || selfData;
  const isLoading = externalLoading || selfLoading;

  const statusDist = analyticsData?.statusDistribution || [];
  const dailyTrends = analyticsData?.dailyTrends || [];
  const summary = analyticsData?.summary || {};
  const hasRealData = statusDist.length > 0 || dailyTrends.length > 0;

  const recentTrends = dailyTrends.slice(-14);
  const maxOrders = recentTrends.length > 0 ? Math.max(...recentTrends.map((t) => t.orders), 1) : 1;
  const maxRevenue = recentTrends.length > 0 ? Math.max(...recentTrends.map((t) => t.revenue || 0), 1) : 1;
  const totalStatusOrders = statusDist.reduce((sum, s) => sum + s.count, 0);

  const fmtTrendDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const statusColorMap = {
    PENDING: "purple", ASSIGNED_PICKUP: "blue", PICKED_UP: "blue",
    AT_ORIGIN_HUB: "amber", IN_TRANSIT: "amber", AT_DESTINATION_HUB: "amber",
    OUT_FOR_DELIVERY: "cyan", DELIVERED: "green", CANCELLED: "red", RETURNED: "red",
  };

  return (
    <section className="section analytics-section">
      <div className="section__header">
        <div>
          <h2 className="section__title">Order Analytics</h2>
          <p className="section__sub">
            {hasRealData ? "Live analytics from MongoDB aggregation pipeline" : "Analytics will populate as orders are created"}
          </p>
        </div>
        {hasRealData && <span className="pricing-live-badge">MONGODB LIVE</span>}
      </div>

      {isLoading ? (
        <div className="fleet-loading"><div className="fleet-loading-spinner" /><p>Loading analytics...</p></div>
      ) : (
        <>
          <div className="analytics-grid">
            <div className="chart-card chart-card--large">
              <div className="chart-card__header">
                <div>
                  <h3 className="chart-title">Daily Order Volume</h3>
                  <span className="chart-current cyan">{summary.totalOrders || 0} total orders</span>
                </div>
                <div className="chart-legend"><span className="legend-dot legend-dot--cyan" /> Orders/Day</div>
              </div>
              <div className="bar-chart">
                {recentTrends.length > 0 ? recentTrends.map((t, i) => (
                  <div key={t._id || i} className="bar-col">
                    <div className="bar-wrap">
                      <div className="bar bar--cyan" style={{ height: `${(t.orders / maxOrders) * 100}%` }} title={`${t.orders} orders`}>
                        <span className="bar-tooltip">{t.orders}</span>
                      </div>
                    </div>
                    <span className="bar-label">{fmtTrendDate(t._id)}</span>
                  </div>
                )) : <div className="chart-empty">No trend data yet. Create orders to see daily volume.</div>}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-card__header">
                <div>
                  <h3 className="chart-title">Revenue Trend</h3>
                  <span className="chart-current amber">₹{(summary.totalValue || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="bar-chart bar-chart--small">
                {recentTrends.length > 0 ? recentTrends.map((t, i) => (
                  <div key={t._id || i} className="bar-col">
                    <div className="bar-wrap">
                      <div className="bar bar--amber" style={{ height: `${((t.revenue || 0) / maxRevenue) * 100}%` }} title={`₹${(t.revenue || 0).toLocaleString("en-IN")}`} />
                    </div>
                    <span className="bar-label">{fmtTrendDate(t._id)?.slice(0, 2)}</span>
                  </div>
                )) : <div className="chart-empty">No revenue data yet</div>}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-card__header">
                <div>
                  <h3 className="chart-title">Status Distribution</h3>
                  <span className="chart-current green">{totalStatusOrders} orders</span>
                </div>
              </div>
              {statusDist.length > 0 ? (
                <div className="status-distribution">
                  {statusDist.map((s) => {
                    const pct = totalStatusOrders > 0 ? Math.round((s.count / totalStatusOrders) * 100) : 0;
                    const color = statusColorMap[s._id] || "gray";
                    return (
                      <div key={s._id} className="status-dist-row">
                        <div className="status-dist-label">
                          <span className={`status-dist-dot status-dist-dot--${color}`} />
                          <span>{formatShipmentStatusLabel(s._id)}</span>
                        </div>
                        <div className="status-dist-bar-wrap">
                          <div className="status-dist-bar">
                            <div className={`status-dist-fill status-dist-fill--${color}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="status-dist-count">{s.count} ({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="chart-empty">No status data yet</div>}
            </div>
          </div>

          <div className="ai-metrics-row">
            {[
              { label: "Total Orders", value: summary.totalOrders || 0, sub: "all time", color: "cyan" },
              { label: "Total Revenue", value: `₹${(summary.totalValue || 0).toLocaleString("en-IN")}`, sub: "all orders", color: "green" },
              { label: "Avg Delivery Time", value: `${(summary.avgDeliveryTime || 0).toFixed(1)} days`, sub: "order to delivery", color: "amber" },
              { label: "Delivered", value: statusDist.find((s) => s._id === "DELIVERED")?.count || 0, sub: "completed orders", color: "green" },
              { label: "In Transit", value: statusDist.find((s) => s._id === "IN_TRANSIT")?.count || 0, sub: "moving now", color: "cyan" },
              { label: "Pending", value: statusDist.find((s) => s._id === "PENDING")?.count || 0, sub: "awaiting pickup", color: "amber" },
            ].map((m, i) => (
              <div key={i} className={`ai-metric-card ai-metric-card--${m.color}`}>
                <span className="ai-metric-val">{m.value}</span>
                <span className="ai-metric-label">{m.label}</span>
                <span className="ai-metric-sub">{m.sub}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function PricingEstimatorSection({ authToken }) {
  const [form, setForm] = useState({
    pickupCityId: "bangalore",
    deliveryCityId: "mumbai",
    packageWeight: "2",
    paymentMethod: "PREPAID",
    fragile: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [estimate, setEstimate] = useState(null);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    if (apiError) setApiError("");
  };

  const validateForm = () => {
    const errors = {};

    if (!form.pickupCityId) errors.pickupCityId = "Pickup city is required";
    if (!form.deliveryCityId) errors.deliveryCityId = "Delivery city is required";
    if (form.pickupCityId && form.deliveryCityId && form.pickupCityId === form.deliveryCityId) {
      errors.deliveryCityId = "Pickup and delivery cities must be different";
    }

    const weight = Number(form.packageWeight);
    if (!form.packageWeight || Number.isNaN(weight) || weight <= 0) {
      errors.packageWeight = "Enter a valid package weight";
    }

    if (!form.paymentMethod) {
      errors.paymentMethod = "Payment method is required";
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const pickupCity = pricingCities.find((city) => city.id === form.pickupCityId);
    const deliveryCity = pricingCities.find((city) => city.id === form.deliveryCityId);

    if (!pickupCity || !deliveryCity) {
      setApiError("Invalid city selection. Please select cities again.");
      return;
    }

    const requestBody = {
      pickupAddress: {
        city: pickupCity.city,
        state: pickupCity.state,
        pincode: pickupCity.pincode,
      },
      deliveryAddress: {
        city: deliveryCity.city,
        state: deliveryCity.state,
        pincode: deliveryCity.pincode,
      },
      packageDetails: {
        deadWeight_kg: Number(form.packageWeight),
        dimensions_cm: { length: 30, width: 20, height: 15 },
        fragile: form.fragile,
      },
      paymentDetails: {
        method: form.paymentMethod,
        totalValue: 2500,
        codAmount: form.paymentMethod === "COD" ? 2500 : 0,
      },
      orderType: form.fragile ? "HANDLE_WITH_CARE" : "NORMAL",
    };

    setIsLoading(true);
    setApiError("");

    try {
      const response = await apiRequest("/pricing/estimate", {
        method: "POST",
        token: authToken,
        body: requestBody,
      });

      const pricingResult = response?.data;
      if (!pricingResult?.pricing || !pricingResult?.deliveryEstimation) {
        throw new Error("Invalid pricing response from server");
      }

      setEstimate(pricingResult);
      toast.success("Pricing estimate calculated successfully");
    } catch (error) {
      setApiError(error.message || "Failed to fetch pricing estimate");
      toast.error("Pricing estimation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const pricing = estimate?.pricing || {};
  const deliveryEstimation = estimate?.deliveryEstimation || {};
  const serviceRecommendations = estimate?.serviceRecommendations || [];
  const aiRecommendations = Array.isArray(pricing?.recommendations) ? pricing.recommendations : [];
  const riskFactors = Array.isArray(deliveryEstimation?.risks) ? deliveryEstimation.risks : [];
  const etaFactors = Array.isArray(deliveryEstimation?.factors) ? deliveryEstimation.factors : [];

  return (
    <section className="section pricing-section">
      <div className="section__header">
        <div>
          <h2 className="section__title">AI Pricing Estimator</h2>
          <p className="section__sub">Live backend pricing engine with delivery intelligence</p>
        </div>
        <span className="pricing-live-badge">LIVE API</span>
      </div>

      <form className="pricing-form" onSubmit={handleSubmit}>
        <label className="pricing-field">
          Pickup City
          <select
            className={`pricing-input ${fieldErrors.pickupCityId ? "pricing-input--error" : ""}`}
            value={form.pickupCityId}
            onChange={(e) => handleFieldChange("pickupCityId", e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select pickup city</option>
            {pricingCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.city}, {city.state}
              </option>
            ))}
          </select>
          {fieldErrors.pickupCityId && (
            <span className="pricing-field-error">{fieldErrors.pickupCityId}</span>
          )}
        </label>

        <label className="pricing-field">
          Delivery City
          <select
            className={`pricing-input ${fieldErrors.deliveryCityId ? "pricing-input--error" : ""}`}
            value={form.deliveryCityId}
            onChange={(e) => handleFieldChange("deliveryCityId", e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select delivery city</option>
            {pricingCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.city}, {city.state}
              </option>
            ))}
          </select>
          {fieldErrors.deliveryCityId && (
            <span className="pricing-field-error">{fieldErrors.deliveryCityId}</span>
          )}
        </label>

        <label className="pricing-field">
          Package Weight (kg)
          <input
            className={`pricing-input ${fieldErrors.packageWeight ? "pricing-input--error" : ""}`}
            type="number"
            min="0.1"
            step="0.1"
            value={form.packageWeight}
            onChange={(e) => handleFieldChange("packageWeight", e.target.value)}
            placeholder="Enter weight in kg"
            disabled={isLoading}
          />
          {fieldErrors.packageWeight && (
            <span className="pricing-field-error">{fieldErrors.packageWeight}</span>
          )}
        </label>

        <label className="pricing-field">
          Payment Method
          <select
            className={`pricing-input ${fieldErrors.paymentMethod ? "pricing-input--error" : ""}`}
            value={form.paymentMethod}
            onChange={(e) => handleFieldChange("paymentMethod", e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select payment method</option>
            <option value="PREPAID">Prepaid</option>
            <option value="COD">Cash on Delivery</option>
          </select>
          {fieldErrors.paymentMethod && (
            <span className="pricing-field-error">{fieldErrors.paymentMethod}</span>
          )}
        </label>

        <label className="pricing-field pricing-field--checkbox">
          <input
            type="checkbox"
            checked={form.fragile}
            onChange={(e) => handleFieldChange("fragile", e.target.checked)}
            disabled={isLoading}
          />
          <span>Fragile Shipment</span>
        </label>

        <button className="btn-primary pricing-submit-btn" type="submit" disabled={isLoading}>
          {isLoading ? "Calculating..." : "Get Pricing Estimate"}
        </button>
      </form>

      {apiError && <div className="pricing-error">{apiError}</div>}

      {estimate && (
        <div className="pricing-results">
          <div className="pricing-summary-grid">
            <div className="pricing-stat-card">
              <span className="pricing-stat-label">Estimated Shipping Cost</span>
              <span className="pricing-stat-value">{formatCurrency(pricing.totalCost)}</span>
            </div>
            <div className="pricing-stat-card">
              <span className="pricing-stat-label">Courier Cost</span>
              <span className="pricing-stat-value">{formatCurrency(pricing.courierPartnerCost)}</span>
            </div>
            <div className="pricing-stat-card">
              <span className="pricing-stat-label">Profit Margin</span>
              <span className="pricing-stat-value">{formatCurrency(pricing.profitMargin)}</span>
            </div>
            <div className="pricing-stat-card">
              <span className="pricing-stat-label">Estimated Delivery ETA</span>
              <span className="pricing-stat-value">{deliveryEstimation.estimatedDays || "-"} days</span>
              <span className="pricing-stat-sub">{formatDateTime(deliveryEstimation.estimatedDeliveryDate)}</span>
            </div>
          </div>

          <div className="pricing-detail-grid">
            <div className="pricing-panel">
              <h3 className="pricing-panel-title">Pricing Breakdown</h3>
              <div className="pricing-breakdown-list">
                {[
                  { label: "Base Cost", value: pricing.baseCost },
                  { label: "Weight Charges", value: pricing.weightCharges },
                  { label: "Distance Charges", value: pricing.distanceCharges },
                  { label: "Order Type Surcharge", value: pricing.orderTypeSurcharge },
                  { label: "Fuel Surcharge", value: pricing.fuelSurcharge },
                  { label: "Handling Charges", value: pricing.handlingCharges },
                  { label: "COD Charges", value: pricing.codCharges },
                  { label: "Insurance Charges", value: pricing.insuranceCharges },
                ].map((item) => (
                  <div key={item.label} className="pricing-breakdown-row">
                    <span>{item.label}</span>
                    <span>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pricing-panel">
              <h3 className="pricing-panel-title">AI Recommendations</h3>
              <div className="pricing-list">
                {aiRecommendations.length === 0 && serviceRecommendations.length === 0 && (
                  <p className="pricing-list-empty">No recommendations returned by API.</p>
                )}
                {aiRecommendations.map((item, index) => (
                  <div key={`${item}-${index}`} className="pricing-list-item">
                    {item}
                  </div>
                ))}
                {serviceRecommendations.map((item, index) => (
                  <div key={`${item.type}-${index}`} className="pricing-list-item">
                    {item.message || item.note || "Recommendation available"}
                  </div>
                ))}
              </div>
            </div>

            <div className="pricing-panel">
              <h3 className="pricing-panel-title">Risk Factors</h3>
              <div className="pricing-list">
                {riskFactors.length === 0 && <p className="pricing-list-empty">No risk factors returned by API.</p>}
                {riskFactors.map((risk, index) => (
                  <div key={`${risk}-${index}`} className="pricing-list-item pricing-list-item--risk">
                    {risk}
                  </div>
                ))}
              </div>
            </div>

            <div className="pricing-panel">
              <h3 className="pricing-panel-title">ETA Confidence</h3>
              <div className="pricing-confidence">
                <span className="pricing-confidence-value">{deliveryEstimation.confidence || 0}%</span>
                <span className="pricing-confidence-label">prediction confidence</span>
              </div>
              <div className="pricing-list">
                {etaFactors.length === 0 && <p className="pricing-list-empty">No ETA factors returned by API.</p>}
                {etaFactors.map((factor, index) => (
                  <div key={`${factor}-${index}`} className="pricing-list-item">
                    {factor}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Dashboard({
  authToken,
  customer,
  shipments,
  isShipmentsLoading,
  shipmentsLoadError,
  onRetryShipments,
  onNewShipmentClick,
  onTrackShipment,
  onShipmentCreated,
  onShipmentUpdated,
  onDeleteShipment,
  createFormFocusNonce,
  trackingLookupRequest,
}) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchAnalytics = async () => {
      setIsAnalyticsLoading(true);
      try {
        const response = await apiRequest("/orders/analytics/summary", { token: authToken });
        if (active) setAnalyticsData(response?.data || null);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        if (active) setAnalyticsData(null);
      } finally {
        if (active) setIsAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
    return () => { active = false; };
  }, [authToken, shipments.length]);

  const summary = analyticsData?.summary || {};
  const statusDist = analyticsData?.statusDistribution || [];
  const deliveredCount = statusDist.find((s) => s._id === "DELIVERED")?.count || 0;
  const activeCount = statusDist
    .filter((s) => !["DELIVERED", "CANCELLED", "RETURNED", "PENDING"].includes(s._id))
    .reduce((sum, s) => sum + s.count, 0);
  const totalOrders = summary.totalOrders || 0;
  const totalRevenue = summary.totalValue || 0;

  const fmtKpiNum = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));
  const fmtRevenue = (n) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
  };

  const dailyTrends = analyticsData?.dailyTrends || [];
  const orderSpark = dailyTrends.slice(-10).map((t) => t.orders || 0);
  const revSpark = dailyTrends.slice(-10).map((t) => t.revenue || 0);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard
          title="Total Shipments"
          value={isAnalyticsLoading ? "..." : fmtKpiNum(totalOrders)}
          trend={totalOrders > 0 ? "up" : null}
          trendValue="Live"
          icon={Package}
          iconColor="var(--color-accent-primary)"
        />
        <StatCard
          title="Active Deliveries"
          value={isAnalyticsLoading ? "..." : fmtKpiNum(activeCount)}
          trend={activeCount > 0 ? "up" : null}
          trendValue="Live"
          icon={Truck}
          iconColor="var(--color-warning-text)"
        />
        <StatCard
          title="Delivered Orders"
          value={isAnalyticsLoading ? "..." : fmtKpiNum(deliveredCount)}
          trend={deliveredCount > 0 ? "up" : null}
          trendValue="Live"
          icon={CheckCircle2}
          iconColor="var(--color-success-text)"
        />
        <StatCard
          title="Total Revenue"
          value={isAnalyticsLoading ? "..." : fmtRevenue(totalRevenue)}
          trend={totalRevenue > 0 ? "up" : null}
          trendValue="Live"
          icon={IndianRupee}
          iconColor="var(--color-info-text)"
        />
      </div>
      <PricingEstimatorSection authToken={authToken} />
      <ShipmentsTable
        shipments={shipments}
        isLoading={isShipmentsLoading}
        loadError={shipmentsLoadError}
        onRetry={onRetryShipments}
        onNewShipmentClick={onNewShipmentClick}
        onTrackShipment={onTrackShipment}
        onDeleteShipment={onDeleteShipment}
      />
      <TrackingSection
        authToken={authToken}
        customer={customer}
        onShipmentCreated={onShipmentCreated}
        onShipmentUpdated={onShipmentUpdated}
        createFormFocusNonce={createFormFocusNonce}
        trackingLookupRequest={trackingLookupRequest}
      />
      <FleetSection authToken={authToken} shipments={shipments} />
      <AnalyticsSection analyticsData={analyticsData} isLoading={isAnalyticsLoading} />
    </>
  );
}

function SettingsSection({ customer, authToken, onLogout, onProfileUpdated }) {
  const [profileForm, setProfileForm] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [prefs, setPrefs] = useState({
    shipmentAlerts: true,
    deliveryUpdates: true,
    pricingChanges: false,
    systemMaintenance: true,
    weeklyReports: true,
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMsg("");
    setSaveErr("");
    try {
      const response = await apiRequest("/auth/me", {
        method: "PUT",
        token: authToken,
        body: { name: profileForm.name, phone: profileForm.phone },
      });
      setSaveMsg("Profile updated successfully");
      toast.success("Profile updated successfully");
      if (onProfileUpdated && response?.data?.customer) {
        onProfileUpdated(response.data.customer);
      }
    } catch (error) {
      setSaveErr(error.message || "Failed to update profile");
      toast.error("Profile update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const togglePref = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <section className="section">
      <div className="section__header">
        <div>
          <h2 className="section__title">Account & Settings</h2>
          <p className="section__sub">Manage your profile and platform preferences</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Profile Card */}
        <div className="settings-card settings-card--wide">
          <div className="settings-profile-header">
            <div className="settings-avatar">
              {getCustomerInitials(customer)}
            </div>
            <div className="settings-profile-meta">
              <h3 className="settings-profile-name">{getCustomerDisplayName(customer)}</h3>
              <span className="settings-profile-role">{formatRole(customer?.role)}</span>
              <span className="settings-profile-email">{customer?.email || "-"}</span>
            </div>
          </div>
          <div className="settings-profile-stats">
            <div className="settings-stat">
              <span className="settings-stat-value">{customer?.orderHistory?.length || 0}</span>
              <span className="settings-stat-label">Shipments</span>
            </div>
            <div className="settings-stat">
              <span className="settings-stat-value">{formatRole(customer?.role)}</span>
              <span className="settings-stat-label">Account Type</span>
            </div>
            <div className="settings-stat">
              <span className="settings-stat-value">{customer?.createdAt ? new Date(customer.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "-"}</span>
              <span className="settings-stat-label">Member Since</span>
            </div>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="settings-card">
          <h4 className="settings-card-title">Edit Profile</h4>
          <p className="settings-card-sub">Update your personal information</p>
          {saveMsg && <div className="auth-alert auth-alert--success">{saveMsg}</div>}
          {saveErr && <div className="auth-alert">{saveErr}</div>}
          <form className="settings-form" onSubmit={handleProfileUpdate}>
            <label className="auth-label">
              Full Name
              <input
                type="text"
                className="auth-input"
                value={profileForm.name}
                onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Enter your full name"
              />
            </label>
            <label className="auth-label">
              Phone Number
              <input
                type="text"
                className="auth-input"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+91XXXXXXXXXX"
              />
            </label>
            <label className="auth-label">
              Email Address
              <input type="email" className="auth-input" value={customer?.email || ""} disabled style={{ opacity: 0.5 }} />
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>Email cannot be changed</span>
            </label>
            <button type="submit" className="btn-primary" disabled={isSaving} style={{ marginTop: 8 }}>
              {isSaving ? "Saving..." : "Update Profile"}
            </button>
          </form>
        </div>

        {/* Notification Preferences */}
        <div className="settings-card">
          <h4 className="settings-card-title">Notification Preferences</h4>
          <p className="settings-card-sub">Control which alerts you receive</p>
          <div className="settings-toggles">
            {[
              { key: "shipmentAlerts", label: "Shipment Alerts", desc: "Get notified for new shipments" },
              { key: "deliveryUpdates", label: "Delivery Updates", desc: "Status changes & delivery confirmations" },
              { key: "pricingChanges", label: "Pricing Changes", desc: "Rate changes & pricing updates" },
              { key: "systemMaintenance", label: "System Maintenance", desc: "Platform maintenance alerts" },
              { key: "weeklyReports", label: "Weekly Reports", desc: "Weekly analytics summaries" },
            ].map((item) => (
              <div key={item.key} className="settings-toggle-row">
                <div>
                  <span className="settings-toggle-label">{item.label}</span>
                  <span className="settings-toggle-desc">{item.desc}</span>
                </div>
                <button
                  type="button"
                  className={`settings-toggle-btn ${prefs[item.key] ? "settings-toggle-btn--on" : ""}`}
                  onClick={() => togglePref(item.key)}
                >
                  <span className="settings-toggle-knob" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="settings-card">
          <h4 className="settings-card-title">Quick Actions</h4>
          <p className="settings-card-sub">Account management shortcuts</p>
          <div className="settings-actions-list">
            <button type="button" className="btn-outline settings-action-btn" onClick={onLogout}>
              ⎋ Sign Out
            </button>
            <div className="settings-info-item">
              <span className="settings-info-label">Account ID</span>
              <span className="settings-info-value">{customer?._id || "-"}</span>
            </div>
            <div className="settings-info-item">
              <span className="settings-info-label">Username</span>
              <span className="settings-info-value">{customer?.username || "-"}</span>
            </div>
            <div className="settings-info-item">
              <span className="settings-info-label">Auth Method</span>
              <span className="settings-info-value">JWT Bearer Token</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AuthScreen({ onLogin, onRegister }) {
  const [loginIntent, setLoginIntent] = useState("customer"); // "customer" or "agent" — UI only, NOT authorization
  const [mode, setMode] = useState("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleModeSwitch = (nextMode) => {
    if (isSubmitting) return;
    setMode(nextMode);
    setFormError("");
    setFormSuccess("");
    setFieldErrors({});
  };

  const handleIntentSwitch = (intent) => {
    if (isSubmitting) return;
    setLoginIntent(intent);
    // Agent intent forces login mode — no public agent registration
    if (intent === "agent") setMode("login");
    setFormError("");
    setFormSuccess("");
    setFieldErrors({});
  };

  const handleFieldChange = (setter, field) => (event) => {
    const value = event.target.value;
    setter((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    if (formError) setFormError("");
    if (formSuccess) setFormSuccess("");
  };

  const PHONE_PATTERN = /^[6-9]\d{9}$/;

  const validateLogin = (values) => {
    const errors = {};

    if (!values.email) {
      errors.email = "Email is required";
    } else if (!EMAIL_PATTERN.test(values.email)) {
      errors.email = "Enter a valid email address";
    }

    if (!values.password) {
      errors.password = "Password is required";
    }

    return errors;
  };

  const validateRegister = (values) => {
    const errors = {};

    if (!values.name) errors.name = "Full name is required";
    if (!values.username) errors.username = "Username is required";

    if (!values.email) {
      errors.email = "Email is required";
    } else if (!EMAIL_PATTERN.test(values.email)) {
      errors.email = "Enter a valid email address";
    }

    if (!values.phone) {
      errors.phone = "Phone number is required";
    } else if (!PHONE_PATTERN.test(values.phone)) {
      errors.phone = "Enter a valid 10-digit Indian mobile number";
    }

    if (!values.password) {
      errors.password = "Password is required";
    } else if (values.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (!values.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const loginValues = {
      email: loginForm.email.trim().toLowerCase(),
      password: loginForm.password,
    };

    const registerValues = {
      name: registerForm.name.trim(),
      username: registerForm.username.trim(),
      email: registerForm.email.trim().toLowerCase(),
      phone: registerForm.phone.trim(),
      password: registerForm.password,
      confirmPassword: registerForm.confirmPassword,
    };

    const errors =
      mode === "login" ? validateLogin(loginValues) : validateRegister(registerValues);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      if (mode === "login") {
        await onLogin(loginValues);
        // After login, AuthContext reads the backend role and RoleRoute handles routing.
        // The loginIntent selector is NOT used for authorization.
      } else {
        // Send registration — backend always forces role=customer
        const { confirmPassword, ...registrationPayload } = registerValues;
        await onRegister(registrationPayload);
        setRegisterForm({
          name: "",
          username: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
        });
        setLoginForm((prev) => ({
          ...prev,
          email: registerValues.email,
          password: "",
        }));
        setFieldErrors({});
        setMode("login");
        setFormSuccess("Registration successful! Please sign in.");
      }
    } catch (error) {
      setFormError(error.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoginMode = mode === "login";
  const isAgentIntent = loginIntent === "agent";

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            <span className="logo-hex">⬡</span>
            <span className="logo-inner">A</span>
          </div>
          <div>
            <h1 className="auth-title">AI LogiTrack</h1>
            <p className="auth-subtitle">Welcome back</p>
          </div>
        </div>

        {/* Login Intent Selector — UI only, NOT authorization */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => handleIntentSwitch("customer")}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '8px',
              border: loginIntent === "customer" ? '2px solid var(--color-accent-primary, #6366f1)' : '1px solid var(--color-border-subtle, #333)',
              background: loginIntent === "customer" ? 'var(--color-accent-bg, rgba(99,102,241,0.1))' : 'transparent',
              color: loginIntent === "customer" ? 'var(--color-accent-primary, #6366f1)' : 'var(--color-text-secondary, #999)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.15s ease'
            }}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => handleIntentSwitch("agent")}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '8px',
              border: loginIntent === "agent" ? '2px solid var(--color-accent-primary, #6366f1)' : '1px solid var(--color-border-subtle, #333)',
              background: loginIntent === "agent" ? 'var(--color-accent-bg, rgba(99,102,241,0.1))' : 'transparent',
              color: loginIntent === "agent" ? 'var(--color-accent-primary, #6366f1)' : 'var(--color-text-secondary, #999)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.15s ease'
            }}
          >
            Delivery Agent
          </button>
        </div>

        {/* Tabs — only show Login/Register for customer intent */}
        {!isAgentIntent && (
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${isLoginMode ? "auth-tab--active" : ""}`}
              onClick={() => handleModeSwitch("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-tab ${!isLoginMode ? "auth-tab--active" : ""}`}
              onClick={() => handleModeSwitch("register")}
            >
              Register
            </button>
          </div>
        )}

        {/* Agent provisioning message */}
        {isAgentIntent && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-info-bg, rgba(59,130,246,0.08))',
            border: '1px solid var(--color-info-border, rgba(59,130,246,0.2))',
            color: 'var(--color-info-text, #60a5fa)',
            fontSize: '12px',
            marginBottom: '12px',
            lineHeight: '1.5'
          }}>
            Delivery agent accounts are provisioned by the organization. Contact your administrator if you need access.
          </div>
        )}

        {formError && <div className="auth-alert">{formError}</div>}
        {formSuccess && <div className="auth-alert auth-alert--success">{formSuccess}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Registration fields — only for customer intent */}
          {!isLoginMode && !isAgentIntent && (
            <>
              <label className="auth-label">
                Full Name
                <input
                  className={`auth-input ${fieldErrors.name ? "auth-input--error" : ""}`}
                  type="text"
                  value={registerForm.name}
                  onChange={handleFieldChange(setRegisterForm, "name")}
                  placeholder="John Doe"
                  disabled={isSubmitting}
                />
                {fieldErrors.name && <span className="auth-field-error">{fieldErrors.name}</span>}
              </label>

              <label className="auth-label">
                Username
                <input
                  className={`auth-input ${fieldErrors.username ? "auth-input--error" : ""}`}
                  type="text"
                  value={registerForm.username}
                  onChange={handleFieldChange(setRegisterForm, "username")}
                  placeholder="johndoe"
                  disabled={isSubmitting}
                />
                {fieldErrors.username && (
                  <span className="auth-field-error">{fieldErrors.username}</span>
                )}
              </label>
            </>
          )}

          <label className="auth-label">
            Email
            <input
              className={`auth-input ${fieldErrors.email ? "auth-input--error" : ""}`}
              type="email"
              value={isLoginMode || isAgentIntent ? loginForm.email : registerForm.email}
              onChange={
                isLoginMode || isAgentIntent
                  ? handleFieldChange(setLoginForm, "email")
                  : handleFieldChange(setRegisterForm, "email")
              }
              placeholder={isAgentIntent ? "agent@example.com" : "customer@example.com"}
              disabled={isSubmitting}
            />
            {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
          </label>

          {/* Phone — only for customer registration */}
          {!isLoginMode && !isAgentIntent && (
            <label className="auth-label">
              Phone
              <input
                className={`auth-input ${fieldErrors.phone ? "auth-input--error" : ""}`}
                type="tel"
                value={registerForm.phone}
                onChange={handleFieldChange(setRegisterForm, "phone")}
                placeholder="9876543210"
                maxLength={10}
                disabled={isSubmitting}
              />
              {fieldErrors.phone && <span className="auth-field-error">{fieldErrors.phone}</span>}
            </label>
          )}

          <label className="auth-label">
            Password
            <input
              className={`auth-input ${fieldErrors.password ? "auth-input--error" : ""}`}
              type="password"
              value={isLoginMode || isAgentIntent ? loginForm.password : registerForm.password}
              onChange={
                isLoginMode || isAgentIntent
                  ? handleFieldChange(setLoginForm, "password")
                  : handleFieldChange(setRegisterForm, "password")
              }
              placeholder="At least 8 characters"
              disabled={isSubmitting}
            />
            {fieldErrors.password && (
              <span className="auth-field-error">{fieldErrors.password}</span>
            )}
          </label>

          {/* Confirm password — only for customer registration */}
          {!isLoginMode && !isAgentIntent && (
            <label className="auth-label">
              Confirm Password
              <input
                className={`auth-input ${fieldErrors.confirmPassword ? "auth-input--error" : ""}`}
                type="password"
                value={registerForm.confirmPassword}
                onChange={handleFieldChange(setRegisterForm, "confirmPassword")}
                placeholder="Re-enter your password"
                disabled={isSubmitting}
              />
              {fieldErrors.confirmPassword && (
                <span className="auth-field-error">{fieldErrors.confirmPassword}</span>
              )}
            </label>
          )}

          <button type="submit" className="btn-primary auth-submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait..."
              : isLoginMode || isAgentIntent
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        {/* Link to switch between login/register for customers */}
        {!isAgentIntent && isLoginMode && (
          <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--color-text-muted, #666)' }}>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => handleModeSwitch("register")}
              style={{ background: 'none', border: 'none', color: 'var(--color-accent-primary, #6366f1)', cursor: 'pointer', fontWeight: 600, fontSize: '13px', padding: 0 }}
            >
              Create one
            </button>
          </p>
        )}
        {!isAgentIntent && !isLoginMode && (
          <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--color-text-muted, #666)' }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => handleModeSwitch("login")}
              style={{ background: 'none', border: 'none', color: 'var(--color-accent-primary, #6366f1)', cursor: 'pointer', fontWeight: 600, fontSize: '13px', padding: 0 }}
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

function AuthLoadingScreen() {
  return (
    <div className="auth-screen">
      <div className="auth-loading-card">
        <div className="auth-spinner" />
        <p>Checking your session...</p>
      </div>
    </div>
  );
}

import { useOutletContext } from 'react-router-dom';

export default function App() {
  const [activeNav, setActiveNav] = useState("dashboard");
  // M2-B Integration: Consume auth state from Outlet Context instead of managing locally
  const context = useOutletContext();
  const customer = context?.customer || null;
  const authToken = context?.authToken || "";
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [isShipmentsLoading, setIsShipmentsLoading] = useState(false);
  const [shipmentsLoadError, setShipmentsLoadError] = useState("");
  const [createFormFocusNonce, setCreateFormFocusNonce] = useState(0);
  const [trackingLookupRequest, setTrackingLookupRequest] = useState(null);

  // M2-B Hook sync
  const location = useLocation();
  const locationPath = location.pathname;
  useEffect(() => {
    if (locationPath.includes("/shipments")) setActiveNav("shipments");
    else if (locationPath.includes("/tracking")) setActiveNav("tracking");
    else if (locationPath.includes("/fleet")) setActiveNav("fleet");
    else if (locationPath.includes("/analytics")) setActiveNav("analytics");
    else if (locationPath.includes("/profile") || locationPath.includes("/settings")) setActiveNav("settings");
    else setActiveNav("dashboard");
  }, [locationPath]);

  useEffect(() => {
    let active = true;

    const loadShipments = async () => {
      if (!customer) {
        if (active) {
          setShipments([]);
          setShipmentsLoadError("");
          setIsShipmentsLoading(false);
        }
        return;
      }

      if (active) {
        setIsShipmentsLoading(true);
        setShipmentsLoadError("");
      }

      try {
        const backendShipments = await fetchShipmentsFromApi(authToken);
        if (active) {
          setShipments(backendShipments);
        }
      } catch (error) {
        if (active) {
          setShipments([]);
          setShipmentsLoadError(error.message || "Failed to load shipments");
        }
      } finally {
        if (active) {
          setIsShipmentsLoading(false);
        }
      }
    };

    loadShipments();

    return () => {
      active = false;
    };
  }, [authToken, customer]);

  const refreshShipments = async ({ showLoader = true } = {}) => {
    if (!customer) {
      setShipments([]);
      setShipmentsLoadError("");
      return;
    }

    if (showLoader) {
      setIsShipmentsLoading(true);
    }
    setShipmentsLoadError("");

    try {
      const backendShipments = await fetchShipmentsFromApi(authToken);
      setShipments(backendShipments);
    } catch (error) {
      setShipmentsLoadError(error.message || "Failed to load shipments");
    } finally {
      if (showLoader) {
        setIsShipmentsLoading(false);
      }
    }
  };

  const persistSession = (token, authCustomer) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setAuthToken(token);
    setCustomer(authCustomer);
  };

  const handleLogin = async (credentials) => {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: credentials,
    });
    const token = response?.data?.token;
    const authCustomer = response?.data?.customer;

    if (!token || !authCustomer) {
      throw new Error("Invalid login response from server");
    }

    persistSession(token, authCustomer);
    toast.success(`Welcome back, ${authCustomer.name || authCustomer.username || "user"}!`);
  };

  const handleRegister = async (details) => {
    const response = await apiRequest("/auth/register", {
      method: "POST",
      body: details,
    });

    if (!response?.success) {
      throw new Error("Invalid registration response from server");
    }

    toast.success("Account created successfully! Please sign in.");
    return response?.message || "Registration successful. Please login.";
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      if (authToken) {
        await apiRequest("/auth/logout", {
          method: "POST",
          token: authToken,
        });
      }
    } catch {
      // Logout on JWT is client-side; clear local state even if API call fails.
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setAuthToken("");
      setCustomer(null);
      setShipments([]);
      setShipmentsLoadError("");
      setShowNotifs(false);
      setActiveNav("dashboard");
      setIsLoggingOut(false);
      toast.info("Signed out successfully");
    }
  };

  const handleNewShipmentFocus = () => {
    setActiveNav("tracking");
    setCreateFormFocusNonce((prev) => prev + 1);
  };

  const handleTrackShipment = (trackingId) => {
    if (!trackingId) return;
    setActiveNav("tracking");
    setTrackingLookupRequest({
      trackingId,
      nonce: Date.now(),
    });
  };

  const handleShipmentCreated = async () => {
    await refreshShipments({ showLoader: false });
  };

  const handleDeleteShipment = async (shipmentId) => {
    if (!window.confirm("Are you sure you want to delete this shipment? This operational action cannot be undone.")) return;
    try {
      await apiRequest(`/orders/${shipmentId}`, { method: "DELETE", token: authToken });
      toast.success("Shipment permanently deleted from MongoDB");
      await refreshShipments({ showLoader: false });
    } catch (error) {
      toast.error(`Failed to delete shipment: ${error.message}`);
    }
  };

  const renderContent = () => {
    switch (activeNav) {
      case "dashboard": return (
        <Dashboard
          authToken={authToken}
          customer={customer}
          shipments={shipments}
          isShipmentsLoading={isShipmentsLoading}
          shipmentsLoadError={shipmentsLoadError}
          onRetryShipments={refreshShipments}
          onNewShipmentClick={handleNewShipmentFocus}
          onTrackShipment={handleTrackShipment}
          onShipmentCreated={handleShipmentCreated}
          onShipmentUpdated={handleShipmentCreated}
          onDeleteShipment={handleDeleteShipment}
          createFormFocusNonce={createFormFocusNonce}
          trackingLookupRequest={trackingLookupRequest}
        />
      );
      case "shipments": return (
        <ShipmentsTable
          shipments={shipments}
          isLoading={isShipmentsLoading}
          loadError={shipmentsLoadError}
          onRetry={refreshShipments}
          onNewShipmentClick={handleNewShipmentFocus}
          onTrackShipment={handleTrackShipment}
          onDeleteShipment={handleDeleteShipment}
        />
      );
      case "tracking": return (
        <TrackingSection
          authToken={authToken}
          customer={customer}
          onShipmentCreated={handleShipmentCreated}
          onShipmentUpdated={handleShipmentCreated}
          createFormFocusNonce={createFormFocusNonce}
          trackingLookupRequest={trackingLookupRequest}
        />
      );
      case "fleet": return <FleetSection authToken={authToken} shipments={shipments} />;
      case "analytics": return <AnalyticsSection authToken={authToken} />;
      case "settings": return <SettingsSection customer={customer} authToken={authToken} onLogout={handleLogout} onProfileUpdated={(c) => setCustomer(c)} />;
      default: return (
        <Dashboard
          authToken={authToken}
          customer={customer}
          shipments={shipments}
          isShipmentsLoading={isShipmentsLoading}
          shipmentsLoadError={shipmentsLoadError}
          onRetryShipments={refreshShipments}
          onNewShipmentClick={handleNewShipmentFocus}
          onTrackShipment={handleTrackShipment}
          onShipmentCreated={handleShipmentCreated}
          onShipmentUpdated={handleShipmentCreated}
          createFormFocusNonce={createFormFocusNonce}
          trackingLookupRequest={trackingLookupRequest}
        />
      );
    }
  };

  if (isAuthChecking) {
    return <AuthLoadingScreen />;
  }

  return (
    <main className="content" onClick={(e) => e.stopPropagation()}>
      <div className="content-inner">
        {renderContent()}
      </div>
    </main>
  );
}
