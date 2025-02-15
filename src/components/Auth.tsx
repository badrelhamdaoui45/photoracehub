import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Camera, Timer, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [userType, setUserType] = useState<'photographer' | 'racer' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: userType
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          // Use upsert instead of insert for profile creation
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              username: email.split('@')[0],
              full_name: '',
              avatar_url: ''
            }, {
              onConflict: 'id',
              ignoreDuplicates: true
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
          }

          navigate('/');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        navigate('/');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.message === 'User already registered') {
        setError('This email is already registered. Please sign in instead.');
      } else if (error.message === 'Invalid login credentials') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(error.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {isSignUp ? (
            userType === 'photographer' ? (
              <Camera className="h-12 w-12 text-indigo-600" />
            ) : userType === 'racer' ? (
              <Timer className="h-12 w-12 text-indigo-600" />
            ) : (
              <div className="flex space-x-4">
                <Camera className="h-12 w-12 text-indigo-600" />
                <Timer className="h-12 w-12 text-indigo-600" />
              </div>
            )
          ) : (
            <Camera className="h-12 w-12 text-indigo-600" />
          )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {isSignUp && !userType && (
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-medium text-center text-gray-900">Choose your role</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setUserType('photographer')}
                  className="flex flex-col items-center p-4 border-2 rounded-lg hover:border-indigo-500 hover:bg-indigo-50"
                >
                  <Camera className="h-8 w-8 text-indigo-600 mb-2" />
                  <span className="font-medium">Photographer</span>
                </button>
                <button
                  onClick={() => setUserType('racer')}
                  className="flex flex-col items-center p-4 border-2 rounded-lg hover:border-indigo-500 hover:bg-indigo-50"
                >
                  <Timer className="h-8 w-8 text-indigo-600 mb-2" />
                  <span className="font-medium">Racer</span>
                </button>
              </div>
            </div>
          )}

          {(!isSignUp || userType) && (
            <form onSubmit={handleEmailAuth} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    loading
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isSignUp ? 'Creating account...' : 'Signing in...'}
                    </div>
                  ) : (
                    <span>{isSignUp ? 'Sign up' : 'Sign in'}</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {(!isSignUp || userType) && (
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setUserType(null);
                  setError(null);
                }}
                className="text-sm text-indigo-600 hover:text-indigo-500"
                disabled={loading}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}