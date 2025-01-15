import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Import pages
import Login from './pages/Login';
import Register from './pages/Register';
import ChoresPage from './pages/Chores';
import Family from './pages/Family';
import Child from './pages/Child';
import HouseholdPage from './pages/household/HouseholdPage';
import HouseholdSettings from './pages/household/HouseholdSettings';
import ManageChildren from './pages/ManageChildren';
import AdminDashboard from './pages/admin/AdminDashboard';

// Create a SuperUser route wrapper
const SuperUserRoute = ({ children }) => {
  const { user } = useAuth();
  const isSuperUser = localStorage.getItem('isSuperUserMode') === 'true';
  
  if (!user || user.email !== 'dadblair@gmail.com' || !isSuperUser) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/chores" element={
                <PrivateRoute>
                  <ChoresPage />
                </PrivateRoute>
              } />
              <Route path="/family" element={
                <PrivateRoute>
                  <Family />
                </PrivateRoute>
              } />
              <Route path="/child/:id" element={
                <PrivateRoute>
                  <Child />
                </PrivateRoute>
              } />
              <Route path="/manage-children" element={
                <PrivateRoute>
                  <ManageChildren />
                </PrivateRoute>
              } />
              <Route path="/household" element={
                <PrivateRoute>
                  <HouseholdPage />
                </PrivateRoute>
              } />
              <Route path="/join-household/:token" element={
                <PrivateRoute>
                  <HouseholdPage />
                </PrivateRoute>
              } />
              <Route path="/household/settings" element={
                <PrivateRoute>
                  <HouseholdSettings />
                </PrivateRoute>
              } />
              <Route path="/admin" element={
                <SuperUserRoute>
                  <AdminDashboard />
                </SuperUserRoute>
              } />
              <Route path="/" element={<Navigate to="/chores" replace />} />
            </Routes>
          </Layout>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
