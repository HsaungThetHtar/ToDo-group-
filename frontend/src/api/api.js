const API_URL = "http://localhost:5001/api";

// Helper function to make authenticated requests
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };
  
  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok) {
    // If token is invalid (401), clear storage
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("todo_username");
    }
    throw new Error(data.message || "Request failed");
  }
  
  return data;
}

// Specific API functions
export const api = {
  // Auth
  login: (username, password) =>
    fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).then(res => res.json()),
  
  register: (fullName, username, password) =>
    fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        username,
        password,
      }),
    }).then(res => res.json()),
  
  // Todos (these require authentication)
  getTodos: () => apiRequest("/todos"),
  
  addTodo: (task, targetDatetime) => 
    apiRequest("/todos", {
      method: "POST",
      body: JSON.stringify({ task, targetDatetime }),
    }),
  
  updateTodo: (id, status, targetDatetime) =>
    apiRequest(`/todos/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status, targetDatetime }),
    }),
  
  deleteTodo: (id) =>
    apiRequest(`/todos/${id}`, {
      method: "DELETE",
    }),
  
  // Profile
  getProfile: (username) => apiRequest(`/profile/${username}`),
};