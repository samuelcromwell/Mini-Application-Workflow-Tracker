const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const contentType = response.headers.get("content-type");
  const body = contentType?.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(body?.detail || "Something went wrong. Please try again.");
  }

  return body;
}

export function listApplications() {
  return request("/applications");
}

export function createApplication(payload) {
  return request("/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateApplication(id, payload) {
  return request(`/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function submitApplication(id) {
  return request(`/applications/${id}/submit`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function startReview(id) {
  return request(`/applications/${id}/start-review`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function recordDecision(id, payload) {
  return request(`/applications/${id}/decision`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
