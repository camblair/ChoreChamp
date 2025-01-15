const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3050/';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}api/auth/login`,
    REGISTER_PARENT: `${API_BASE_URL}api/auth/register/parent`,
    REGISTER_CHILD: `${API_BASE_URL}api/auth/register/child`,
    PROFILE: `${API_BASE_URL}api/auth/profile`,
    CHILDREN: `${API_BASE_URL}api/auth/children`,
  },
  CHORES: {
    LIST: `${API_BASE_URL}api/chores`,
    CREATE: `${API_BASE_URL}api/chores`,
    UPDATE: (id) => `${API_BASE_URL}api/chores/${id}`,
    DELETE: (id) => `${API_BASE_URL}api/chores/${id}`,
    COMPLETE: (id) => `${API_BASE_URL}api/chores/${id}/complete`,
  }
};

export const createHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (includeAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};
