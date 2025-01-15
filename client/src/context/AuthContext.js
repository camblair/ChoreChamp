import React, { createContext, useState, useContext, useEffect } from 'react';
import API_ENDPOINTS from '../constants/apiEndpoints';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [selectedHousehold, setSelectedHousehold] = useState(localStorage.getItem('selectedHousehold'));

  const updateSelectedHousehold = (householdId) => {
    setSelectedHousehold(householdId);
    if (householdId) {
      localStorage.setItem('selectedHousehold', householdId);
    } else {
      localStorage.removeItem('selectedHousehold');
    }
  };

  const checkAuth = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.PROFILE, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && !data.error) {
        setUser(data);
        // If user is a parent and no household is selected, try to select one
        if (data.role === 'parent' && !selectedHousehold) {
          fetchAndSetDefaultHousehold(token);
        }
      } else {
        console.error('Auth check failed:', data.error);
        handleLogout();
        setError('Session expired. Please login again.');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      handleLogout();
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAndSetDefaultHousehold = async (authToken) => {
    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.GET_ALL_HOUSEHOLDS, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched households:', data);
        const households = Array.isArray(data) ? data : [data];
        if (households.length > 0) {
          console.log('Setting default household:', households[0]._id);
          updateSelectedHousehold(households[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch default household:', err);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    updateSelectedHousehold(null);
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const login = async (username, password) => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setError(null);
        
        // If user is a parent, fetch and set default household
        if (data.user.role === 'parent') {
          await fetchAndSetDefaultHousehold(data.token);
        }
        
        return { success: true };
      } else {
        setError(data.error || 'Login failed');
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setError(null);
        return { success: true };
      } else {
        setError(data.error || 'Registration failed');
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please try again.');
      return { success: false, error: 'Network error' };
    }
  };

  const updateCurrentUser = async (updatedData) => {
    try {
      // Just update the local state with the provided data
      setUser(prevUser => ({
        ...prevUser,
        ...updatedData
      }));
      return updatedData;
    } catch (error) {
      console.error('Error updating user state:', error);
      throw error;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const contextValue = {
    user,
    token,
    loading,
    error,
    selectedHousehold,
    setSelectedHousehold: updateSelectedHousehold,
    login,
    logout: handleLogout,
    register,
    updateCurrentUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
