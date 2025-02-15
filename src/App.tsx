import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Upload from './pages/Upload';
import Profile from './pages/Profile';
import RacerProfile from './pages/RacerProfile';
import PhotographerProfile from './pages/PhotographerProfile';
import Auth from './components/Auth';
import AuthCallback from './pages/AuthCallback';
import Footer from './components/Footer';
import { supabase } from './lib/supabase';

function App() {
  const [userRole, setUserRole] = React.useState<'photographer' | 'racer' | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserRole(user?.user_metadata?.role || null);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setUserRole(session?.user?.user_metadata?.role || null);
    });
  }, []);

  const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode; allowedRole: 'photographer' | 'racer' }) => {
    if (!userRole) {
      return <Navigate to="/auth" />;
    }
    if (userRole !== allowedRole) {
      return <Navigate to="/" />;
    }
    return <>{children}</>;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route 
              path="/upload" 
              element={
                <ProtectedRoute allowedRole="photographer">
                  <Upload />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                userRole === 'photographer' ? (
                  <ProtectedRoute allowedRole="photographer">
                    <Profile />
                  </ProtectedRoute>
                ) : (
                  <ProtectedRoute allowedRole="racer">
                    <RacerProfile />
                  </ProtectedRoute>
                )
              } 
            />
            <Route path="/photographer/:id" element={<PhotographerProfile />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;