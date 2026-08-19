export const getCustomerDisplayName = (customer) =>
  customer?.name || customer?.username || customer?.email || "Customer";

export const getCustomerInitials = (customer) => {
  const source = getCustomerDisplayName(customer).trim();
  if (!source) return "CU";
  const words = source.split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]).join("");
  return initials.toUpperCase();
};

export const formatRole = (role = "customer") =>
  role
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export const mapBackendStatusToDisplay = (status = "") => {
  if (status === "PENDING") return "ORDER_CREATED";
  if (status === "ASSIGNED_PICKUP") return "PICKUP_ASSIGNED";
  if (["PICKED_UP", "AT_ORIGIN_HUB", "DISPATCHED_FROM_ORIGIN", "IN_TRANSIT", "AT_DESTINATION_HUB"].includes(status)) {
    return "IN_TRANSIT";
  }
  if (status === "OUT_FOR_DELIVERY") return "OUT_FOR_DELIVERY";
  if (status === "DELIVERED") return "DELIVERED";
  return status || "UNKNOWN";
};

export const getShipmentStatusBadgeClass = (displayStatus = "") => {
  if (displayStatus === "ORDER_CREATED") return "purple";
  if (displayStatus === "PICKUP_ASSIGNED") return "blue";
  if (displayStatus === "IN_TRANSIT") return "amber";
  if (displayStatus === "OUT_FOR_DELIVERY") return "cyan";
  if (displayStatus === "DELIVERED") return "green";
  return "gray";
};

export const formatShipmentStatusLabel = (status = "") =>
  status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatShipmentDate = (value) => {
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

export const getPriorityBadgeClass = (priority = "") => {
  if (priority === "URGENT") return "red";
  if (priority === "HIGH") return "amber";
  return "gray";
};

export function generateNotificationsFromShipments(shipments) {
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
      return {
        text: `Shipment ${id} is now ${formatShipmentStatusLabel(s.status)}`,
        type: statusNotif[s.status] || "info",
        time: fmtAgo(s.updatedAt || s.createdAt),
      };
    });
}
