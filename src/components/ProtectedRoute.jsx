import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white text-xl font-black tracking-widest">
        Verifying Access...
      </div>
    );
  }

  if (!user || user.isBlocked) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
