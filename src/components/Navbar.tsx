import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Camera, Menu, X, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = React.useState<any>(null);
  const [userRole, setUserRole] = React.useState<'photographer' | 'racer' | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setUserRole(user?.user_metadata?.role || null);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setUserRole(session?.user?.user_metadata?.role || null);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Camera className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl text-gray-900">RacePhotoHub</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                {userRole === 'photographer' ? (
                  <>
                    <Link 
                      to="/gallery" 
                      className={`text-sm font-medium ${isActive('/gallery') ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Albums
                    </Link>
                    <Link 
                      to="/upload" 
                      className={`text-sm font-medium ${isActive('/upload') ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Upload
                    </Link>
                  </>
                ) : (
                  <Link 
                    to="/gallery" 
                    className={`text-sm font-medium ${isActive('/gallery') ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    Find Photos
                  </Link>
                )}
                
                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-light text-white flex items-center justify-center">
                      {user.email?.[0].toUpperCase()}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/auth?mode=login"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Log In
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="text-sm font-medium text-white bg-primary hover:bg-primary-light px-4 py-2 rounded-lg transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-100">
          <div className="px-4 py-3 space-y-3">
            {user ? (
              <>
                <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary-light text-white flex items-center justify-center">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                    <div className="text-xs text-gray-500">{userRole}</div>
                  </div>
                </div>
                {userRole === 'photographer' ? (
                  <>
                    <Link 
                      to="/gallery" 
                      className="block px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Albums
                    </Link>
                    <Link 
                      to="/upload" 
                      className="block px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Upload
                    </Link>
                  </>
                ) : (
                  <Link 
                    to="/gallery" 
                    className="block px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Find Photos
                  </Link>
                )}
                <Link 
                  to="/profile" 
                  className="block px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/auth?mode=login"
                  className="block w-full text-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="block w-full text-center px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-light rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}