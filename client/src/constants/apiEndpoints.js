const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER_PARENT: `${API_BASE_URL}/api/auth/register/parent`,
    REGISTER_CHILD: `${API_BASE_URL}/api/auth/register/child`,
    PROFILE: `${API_BASE_URL}/api/auth/profile`,
    UPDATE_USER: (id) => `${API_BASE_URL}/api/auth/user/${id}`,  
    DELETE_USER: `${API_BASE_URL}/api/auth/user/delete`,
    UPDATE_PROFILE: (id) => `${API_BASE_URL}/api/auth/user/${id}`,  
    UPDATE_CHILD: (id) => `${API_BASE_URL}/api/auth/child/${id}`,
    DELETE_CHILD: (childId) => `${API_BASE_URL}/api/auth/children/${childId}`,
    CHILDREN: `${API_BASE_URL}/api/auth/children`,
  },
  HOUSEHOLD: {
    CREATE: `${API_BASE_URL}/api/household/create`,
    GET: `${API_BASE_URL}/api/household`,
    GET_BY_ID: (id) => `${API_BASE_URL}/api/household?householdId=${id}`,
    UPDATE: `${API_BASE_URL}/api/household/update`,
    DELETE: `${API_BASE_URL}/api/household/delete`,
    INVITE: `${API_BASE_URL}/api/household/invite`,
    JOIN: (token) => `${API_BASE_URL}/api/household/join/${token}`,
    REMOVE_PARENT: (householdId, userId) => `${API_BASE_URL}/api/household/parents/${userId}`,
    GET_AVAILABLE_CHILDREN: `${API_BASE_URL}/api/auth/available-children`,
    ADD_CHILDREN: `${API_BASE_URL}/api/household/add-children`,
    REMOVE_CHILD: (householdId, childId) => `${API_BASE_URL}/api/household/children/${childId}`,
    GET_ALL_HOUSEHOLDS: `${API_BASE_URL}/api/household/all`,
    PARENTS: (householdId) => `${API_BASE_URL}/api/household?householdId=${householdId}&type=parents`,
    CHILDREN: (householdId) => `${API_BASE_URL}/api/household?householdId=${householdId}&type=children`,
    GET_MEMBERS: (householdId) => `${API_BASE_URL}/api/household?householdId=${householdId}&type=members`,
  },
  CHORES: {
    GET: (householdId) => `${API_BASE_URL}/api/chores?householdId=${householdId}`,
    CREATE: `${API_BASE_URL}/api/chores`,
    UPDATE: (choreId) => `${API_BASE_URL}/api/chores/${choreId}`,
    DELETE: (choreId) => `${API_BASE_URL}/api/chores/${choreId}`,
    ASSIGN: (choreId) => `${API_BASE_URL}/api/chores/${choreId}/assign`,
    COMPLETE: (choreId) => `${API_BASE_URL}/api/chores/${choreId}/complete`,
    VERIFY: (id) => `${API_BASE_URL}/api/chores/${id}/verify`,
    UNASSIGN: (id) => `${API_BASE_URL}/api/chores/${id}/unassign`,
    UNDO_COMPLETE: (id) => `${API_BASE_URL}/api/chores/${id}/undo-complete`,
    ROTATE: `${API_BASE_URL}/api/chores/rotate`,
  }
};

export default API_ENDPOINTS;
