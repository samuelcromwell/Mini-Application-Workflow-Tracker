const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
      ...options,
    });
  } catch (networkError) {
    throw new Error(
      "Could not reach the API. Make sure the backend is running on port 8000.",
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const detail =
      body?.detail ||
      (Array.isArray(body?.errors) && body.errors[0]?.msg) ||
      (Array.isArray(body?.detail) && body.detail[0]?.msg) ||
      `Request failed with status ${response.status}.`;
    throw new Error(detail);
  }

  return body;
}

export function listApplications() {
  return request("/applications");
}

export function getApplication(id) {
  return request(`/applications/${id}`);
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
