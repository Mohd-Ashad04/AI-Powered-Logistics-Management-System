const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function apiRequest(endpoint, { method = "GET", token, body, signal } = {}) {
  const headers = { Accept: "application/json" };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  // If a token is explicitly provided (e.g. from state), use it.
  // Otherwise, attempt to read from localStorage.
  const authToken = token || localStorage.getItem("ailogitrack_auth_token");
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal
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
    error.status = response.status;
    
    // Intercept 401 Unauthorized for global handling if needed (can be caught by React Query)
    if (response.status === 401) {
      error.isUnauthorized = true;
    }
    
    throw error;
  }

  return payload;
}
