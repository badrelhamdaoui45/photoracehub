import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  Camera, 
  Calendar, 
  User, 
  Filter, 
  ChevronDown, 
  Download, 
  ArrowLeft, 
  ShoppingCart, 
  CreditCard,
  X,
  Hash,
  Mail,
  Lock,
  AlertCircle
} from 'lucide-react';

interface Album {
  event_name: string;
  photo_count: number;
  photographer: {
    id: string;
    username: string;
  };
  preview_url?: string;
}

interface Photo {
  id: string;
  url: string;
  watermark_url: string;
  title: string;
  price: number;
  bib_numbers: string[];
  photographer: {
    id: string;
    username: string;
  };
}

interface CartItem {
  photoId: string;
  price: number;
}

interface CheckoutFormData {
  email: string;
  password: string;
}

export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'photographer' | 'racer' | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [filteredAlbums, setFilteredAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('event') || '');
  const [bibSearchQuery, setBibSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(searchParams.get('event'));
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [checkoutFormData, setCheckoutFormData] = useState<CheckoutFormData>({
    email: '',
    password: ''
  });
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
    if (selectedEvent) {
      loadPhotos();
    } else {
      loadAlbums();
    }
  }, [selectedEvent]);

  useEffect(() => {
    filterAlbums();
  }, [searchQuery, albums]);

  useEffect(() => {
    filterPhotosByBib();
  }, [bibSearchQuery, photos]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setUserRole(user?.user_metadata?.role || null);
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('photos')
        .select(`
          event_name,
          photographer:profiles(id, username),
          url,
          preview_image
        `)
        .not('url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const albumMap = data.reduce((acc, photo) => {
        if (!acc[photo.event_name]) {
          acc[photo.event_name] = {
            event_name: photo.event_name,
            photo_count: 1,
            photographer: photo.photographer,
            preview_url: photo.preview_image || photo.url
          };
        } else {
          acc[photo.event_name].photo_count++;
          if (!acc[photo.event_name].preview_url && photo.preview_image) {
            acc[photo.event_name].preview_url = photo.preview_image;
          }
        }
        return acc;
      }, {} as Record<string, Album>);

      const albumList = Object.values(albumMap);
      setAlbums(albumList);
      setFilteredAlbums(albumList);
    } catch (error) {
      console.error('Error loading albums:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    if (!selectedEvent) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('photos')
        .select(`
          id,
          url,
          watermark_url,
          title,
          price,
          bib_numbers,
          photographer:profiles(id, username)
        `)
        .eq('event_name', selectedEvent)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
      setFilteredPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAlbums = () => {
    if (!searchQuery.trim()) {
      setFilteredAlbums(albums);
      return;
    }

    const filtered = albums.filter(album =>
      album.event_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredAlbums(filtered);
  };

  const filterPhotosByBib = () => {
    if (!bibSearchQuery.trim()) {
      setFilteredPhotos(photos);
      return;
    }

    const filtered = photos.filter(photo =>
      photo.bib_numbers?.some(bib => 
        bib.toLowerCase().includes(bibSearchQuery.toLowerCase())
      )
    );
    setFilteredPhotos(filtered);
  };

  const handleViewAlbum = (eventName: string) => {
    setSelectedEvent(eventName);
    setSearchParams({ event: eventName });
    setBibSearchQuery('');
  };

  const handleBackToAlbums = () => {
    setSelectedEvent(null);
    setSearchParams({});
    setPhotos([]);
    setFilteredPhotos([]);
    setBibSearchQuery('');
  };

  const addToCart = (photo: Photo) => {
    setCart(prev => [...prev, { photoId: photo.id, price: photo.price }]);
  };

  const removeFromCart = (photoId: string) => {
    setCart(prev => prev.filter(item => item.photoId !== photoId));
  };

  const isInCart = (photoId: string) => {
    return cart.some(item => item.photoId === photoId);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.price, 0);
  };

  const handleCheckoutFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    setProcessingPayment(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: checkoutFormData.email,
        password: checkoutFormData.password,
        options: {
          data: {
            role: 'racer'
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: checkoutFormData.email.split('@')[0],
            full_name: '',
            avatar_url: ''
          });

        if (profileError) throw profileError;

        const purchases = cart.map(item => ({
          photo_id: item.photoId,
          buyer_id: data.user.id,
          amount: item.price
        }));

        const { error: purchaseError } = await supabase
          .from('purchases')
          .insert(purchases);

        if (purchaseError) throw purchaseError;

        setCart([]);
        setShowCart(false);
        setShowCheckoutForm(false);
        alert('Account created and purchase successful! You can view your photos in your profile.');
        navigate('/profile');
      }
    } catch (error: any) {
      console.error('Error during checkout:', error);
      setCheckoutError(error.message || 'Failed to process checkout');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      setShowCheckoutForm(true);
      return;
    }

    setProcessingPayment(true);
    try {
      const purchases = cart.map(item => ({
        photo_id: item.photoId,
        buyer_id: user.id,
        amount: item.price
      }));

      const { error } = await supabase
        .from('purchases')
        .insert(purchases);

      if (error) throw error;

      setCart([]);
      setShowCart(false);
      alert('Purchase successful! You can view your photos in your profile.');
    } catch (error) {
      console.error('Error processing purchase:', error);
      alert('Failed to process purchase. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getPhotoUrl = (photo: Photo) => {
    try {
      const path = photo.url;
      const { data } = supabase.storage
        .from('race-photos')
        .getPublicUrl(path);
        
      return data.publicUrl;
    } catch (error) {
      console.error('Error getting photo URL:', error);
      return 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80';
    }
  };

  const getAlbumPreviewUrl = (album: Album) => {
    if (!album.preview_url) {
      return 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80';
    }
    
    const { data } = supabase.storage
      .from('race-photos')
      .getPublicUrl(album.preview_url);
      
    return data.publicUrl;
  };

  return (
    <div className="min-h-screen bg-background-light">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Shopping Cart Button */}
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={() => setShowCart(true)}
            className="bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primary-light transition-colors relative"
          >
            <ShoppingCart className="w-6 h-6" />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {/* Shopping Cart Modal */}
        {showCart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Shopping Cart</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-4 mb-4">
                    {cart.map(item => {
                      const photo = photos.find(p => p.id === item.photoId);
                      return (
                        <div key={item.photoId} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{photo?.title || 'Photo'}</p>
                            <p className="text-sm text-gray-500">${item.price}</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.photoId)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold">Total:</span>
                      <span className="font-semibold">${getCartTotal().toFixed(2)}</span>
                    </div>
                    <button
                      onClick={handleCheckout}
                      disabled={processingPayment}
                      className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {processingPayment ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <CreditCard className="w-5 h-5 mr-2" />
                          Checkout
                        </span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Checkout Form Modal */}
        {showCheckoutForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Account to Continue</h3>
                <button
                  onClick={() => setShowCheckoutForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {checkoutError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center text-red-700">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <p className="text-sm">{checkoutError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleCheckoutFormSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={checkoutFormData.email}
                      onChange={(e) => setCheckoutFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      value={checkoutFormData.password}
                      onChange={(e) => setCheckoutFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="Create a password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={processingPayment}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {processingPayment ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    'Create Account & Complete Purchase'
                  )}
                </button>

                <p className="text-sm text-gray-500 text-center">
                  Already have an account?{' '}
                  <Link to="/auth" className="text-primary hover:text-primary-light">
                    Sign in here
                  </Link>
                </p>
              </form>
            </div>
          </div>
        )}

        {selectedEvent ? (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <button
                  onClick={handleBackToAlbums}
                  className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Albums
                </button>
                <h1 className="text-2xl font-bold text-gray-900">{selectedEvent}</h1>
                <p className="mt-1 text-gray-500">
                  {photos.length} photos available
                </p>
              </div>
              
              {/* Bib Search */}
              <div className="w-full sm:w-auto">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={bibSearchQuery}
                    onChange={(e) => setBibSearchQuery(e.target.value)}
                    placeholder="Search by bib number..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Photos Grid */}
            {loading ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPhotos.map((photo) => {
                  const photoUrl = getPhotoUrl(photo);
                  const isPhotoInCart = isInCart(photo.id);
                  return (
                    <div key={photo.id} className="group relative">
                      <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={photoUrl}
                          alt={photo.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <button
                              onClick={() => isPhotoInCart ? removeFromCart(photo.id) : addToCart(photo)}
                              className={`w-full font-medium px-4 py-2 rounded-lg transition-colors ${
                                isPhotoInCart
                                  ? 'bg-red-500 text-white hover:bg-red-600'
                                  : 'bg-white text-primary hover:bg-gray-50'
                              }`}
                            >
                              {isPhotoInCart ? 'Remove from Cart' : `Add to Cart - $${photo.price}`}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">${photo.price}</p>
                          <Link
                            to={`/photographer/${photo.photographer?.id}`}
                            className="text-sm text-gray-500 hover:text-primary"
                          >
                            By {photo.photographer?.username}
                          </Link>
                        </div>
                        {photo.bib_numbers && photo.bib_numbers.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {photo.bib_numbers.map((bib, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary"
                              >
                                <Hash className="w-3 h-3 mr-1" />
                                {bib}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && filteredPhotos.length === 0 && (
              <div className="text-center py-12">
                <Camera className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No photos found</h3>
                <p className="mt-2 text-gray-500">
                  {bibSearchQuery
                    ? `No photos found with bib number "${bibSearchQuery}"`
                    : "This event doesn't have any photos yet"}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Albums View */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Photo Albums
                </h1>
                <p className="mt-1 text-gray-500">
                  Browse and discover race photos from various events
                </p>
              </div>
            </div>

            {/* Search Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events by name..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Albums Grid */}
            {loading ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredAlbums.map((album) => (
                  <div
                    key={album.event_name}
                    className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100"
                  >
                    <div className="relative h-48">
                      <img
                        src={getAlbumPreviewUrl(album)}
                        alt={album.event_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-lg font-semibold text-white">{album.event_name}</h3>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <div className="flex items-center">
                          <Camera className="h-4 w-4 mr-1" />
                          <span>{album.photo_count} photos</span>
                        </div>
                        <Link
                          to={`/photographer/${album.photographer?.id}`}
                          className="flex items-center hover:text-primary"
                        >
                          <User className="h-4 w-4 mr-1" />
                          <span>{album.photographer?.username || 'Unknown'}</span>
                        </Link>
                      </div>
                      <button
                        onClick={() => handleViewAlbum(album.event_name)}
                        className="w-full mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
                      >
                        View Photos
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredAlbums.length === 0 && (
              <div className="text-center py-12">
                <Camera className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No albums found</h3>
                <p className="mt-2 text-gray-500">
                  {searchQuery
                    ? `No albums match "${searchQuery}"`
                    : 'No albums have been created yet'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}