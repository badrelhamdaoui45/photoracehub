import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart3, 
  DollarSign, 
  Image as ImageIcon, 
  TrendingUp, 
  Calendar, 
  ChevronDown,
  Filter,
  Download,
  Camera,
  Upload,
  X,
  User,
  AlertCircle,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

interface Album {
  id: string;
  name: string;
  created_at: string;
  photo_count: number;
}

interface Photo {
  id: string;
  url: string;
  title: string;
  event_name: string;
  price: number;
  created_at: string;
  sales_count?: number;
  total_revenue?: number;
}

interface SalesAnalytics {
  total_revenue: number;
  total_sales: number;
  recent_sales: {
    date: string;
    amount: number;
  }[];
}

interface Profile {
  username: string;
  avatar_url: string | null;
}

interface Transaction {
  id: string;
  buyer: {
    username: string;
    full_name: string;
  };
  photo: {
    event_name: string;
  };
  amount: number;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isPhotographer, setIsPhotographer] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [showNewAlbumModal, setShowNewAlbumModal] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const [profile, setProfile] = useState<Profile>({ username: '', avatar_url: null });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // New states for sales history
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterAlbum, setFilterAlbum] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && isPhotographer) {
      loadData();
      loadSalesAnalytics();
      loadTransactions();
    }
  }, [user, isPhotographer, selectedAlbum, dateRange]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, filterAlbum, filterDateStart, filterDateEnd]);

  const loadTransactions = async () => {
    if (!user) return;
    
    try {
      setLoadingTransactions(true);
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          id,
          amount,
          created_at,
          buyer:profiles!purchases_buyer_id_fkey(
            username,
            full_name
          ),
          photo:photos(
            event_name
          )
        `)
        .eq('photos.photographer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load transaction history');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    if (filterAlbum) {
      filtered = filtered.filter(t => 
        t.photo.event_name.toLowerCase().includes(filterAlbum.toLowerCase())
      );
    }

    if (filterDateStart) {
      filtered = filtered.filter(t => 
        new Date(t.created_at) >= new Date(filterDateStart)
      );
    }

    if (filterDateEnd) {
      filtered = filtered.filter(t => 
        new Date(t.created_at) <= new Date(filterDateEnd)
      );
    }

    setFilteredTransactions(filtered);
    setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
    setCurrentPage(1);
  };

  const getCurrentPageTransactions = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const exportSalesReport = () => {
    const csvContent = [
      ['Date', 'Buyer', 'Album', 'Amount'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.created_at).toLocaleDateString(),
        t.buyer.full_name || t.buyer.username,
        t.photo.event_name,
        `$${t.amount.toFixed(2)}`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const checkUser = async () => {
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw userError;
      }

      if (!currentUser) {
        navigate('/auth');
        return;
      }

      setUser(currentUser);
      setIsPhotographer(currentUser.user_metadata?.role === 'photographer');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!profile && !profileError) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            username: currentUser.email?.split('@')[0] || 'user',
            full_name: currentUser.user_metadata?.full_name || '',
            avatar_url: currentUser.user_metadata?.avatar_url || ''
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw new Error('Failed to create user profile');
        }
      } else if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw new Error('Failed to fetch user profile');
      }

      setError(null);
    } catch (error) {
      console.error('Error checking user:', error);
      setError('Failed to load user profile. Please try signing in again.');
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadSalesAnalytics = async () => {
    if (!user) return;

    try {
      const startDate = new Date();
      switch (dateRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const { data: sales, error: salesError } = await supabase
        .from('purchases')
        .select(`
          amount,
          created_at,
          photos (
            id,
            event_name
          )
        `)
        .gte('created_at', startDate.toISOString())
        .eq('photos.photographer_id', user.id);

      if (salesError) throw salesError;

      const analytics: SalesAnalytics = {
        total_revenue: 0,
        total_sales: 0,
        recent_sales: []
      };

      if (sales) {
        analytics.total_sales = sales.length;
        analytics.total_revenue = sales.reduce((sum, sale) => sum + Number(sale.amount), 0);
        
        const salesByDate = sales.reduce((acc, sale) => {
          const date = new Date(sale.created_at).toLocaleDateString();
          acc[date] = (acc[date] || 0) + Number(sale.amount);
          return acc;
        }, {} as Record<string, number>);

        analytics.recent_sales = Object.entries(salesByDate).map(([date, amount]) => ({
          date,
          amount: Number(amount)
        }));
      }

      setSalesAnalytics(analytics);
    } catch (error) {
      console.error('Error loading sales analytics:', error);
    }
  };

  const loadData = async () => {
    if (!user || !isPhotographer) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data: albumsData, error: albumsError } = await supabase
        .rpc('get_event_counts', { photographer_id: user.id });

      if (albumsError) throw albumsError;

      setAlbums(albumsData?.map(a => ({
        id: a.event_name,
        name: a.event_name,
        photo_count: parseInt(a.count),
        created_at: new Date().toISOString()
      })) || []);

      if (selectedAlbum) {
        const { data: photosData, error: photosError } = await supabase
          .from('photos')
          .select(`
            *,
            purchases (
              amount
            )
          `)
          .eq('photographer_id', user.id)
          .eq('event_name', selectedAlbum)
          .order('created_at', { ascending: false });

        if (photosError) throw photosError;
        
        const processedPhotos = photosData?.map(photo => ({
          ...photo,
          sales_count: photo.purchases?.length || 0,
          total_revenue: photo.purchases?.reduce((sum, purchase) => sum + Number(purchase.amount), 0) || 0
        })) || [];
        
        setPhotos(processedPhotos);
      } else {
        setPhotos([]);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load data';
      console.error('Error loading data:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSavingProfile(true);
      setError(null);

      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `avatars/${user.id}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('race-photos')
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        avatarUrl = filePath;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: newUsername || profile.username,
          avatar_url: avatarUrl
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({
        ...prev,
        username: newUsername || prev.username,
        avatar_url: avatarUrl
      }));

      setIsEditingProfile(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : !isPhotographer ? (
          <div className="text-center py-12">
            <Camera className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              This area is for photographers only
            </h2>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Section */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {isEditingProfile ? (
                      <div className="relative w-20 h-20">
                        <img
                          src={avatarPreview || (profile.avatar_url ? 
                            supabase.storage.from('race-photos').getPublicUrl(profile.avatar_url).data.publicUrl :
                            'https://via.placeholder.com/80')}
                          alt="Profile"
                          className="w-full h-full rounded-full object-cover"
                        />
                        <label className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-full cursor-pointer">
                          <Upload className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                        </label>
                      </div>
                    ) : (
                      <img
                        src={profile.avatar_url ? 
                          supabase.storage.from('race-photos').getPublicUrl(profile.avatar_url).data.publicUrl :
                          'https://via.placeholder.com/80'}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder={profile.username}
                        className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    ) : (
                      <>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {profile.username}
                        </h2>
                        <p className="text-gray-500">Photographer</p>
                      </>
                    )}
                  </div>
                </div>
                {isEditingProfile ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleProfileUpdate}
                      disabled={savingProfile}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:bg-gray-300"
                    >
                      {savingProfile ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingProfile(false);
                        setAvatarFile(null);
                        setAvatarPreview(null);
                        setNewUsername('');
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditingProfile(true);
                      setNewUsername(profile.username);
                    }}
                    className="px-4 py-2 text-primary hover:text-primary-light"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Albums Section */}
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">My Albums</h3>
                <Link
                  to="/upload"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light"
                >
                  <Upload className="w-4 h-4" />
                  Upload New Photos
                </Link>
              </div>

              {albums.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No albums yet</h3>
                  <p className="mt-2 text-gray-500">
                    Start by uploading photos to create your first album
                  </p>
                  <Link
                    to="/upload"
                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Photos
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {albums.map((album) => (
                    <Link
                      key={album.id}
                      to={`/gallery?event=${encodeURIComponent(album.name)}`}
                      className="group bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Camera className="w-5 h-5 text-primary" />
                            </div>
                            <h4 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                              {album.name}
                            </h4>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-500">
                            <ImageIcon className="w-4 h-4 mr-2" />
                            {album.photo_count} photos
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-2" />
                            Created {new Date(album.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Sales History Section */}
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Sales History</h3>
                <button
                  onClick={exportSalesReport}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light"
                >
                  <FileText className="w-4 h-4" />
                  Export Report
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Album Name
                  </label>
                  <input
                    type="text"
                    value={filterAlbum}
                    onChange={(e) => setFilterAlbum(e.target.value)}
                    placeholder="Filter by album name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filterDateStart}
                    onChange={(e) => setFilterDateStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filterDateEnd}
                    onChange={(e) => setFilterDateEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ${filteredTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {filteredTransactions.length}
                  </p>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Buyer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Album
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loadingTransactions ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </div>
                        </td>
                      </tr>
                    ) : getCurrentPageTransactions().length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      getCurrentPageTransactions().map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.buyer.full_name || transaction.buyer.username}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.photo.event_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${transaction.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-600 hover:text-primary disabled:text-gray-400"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-600 hover:text-primary disabled:text-gray-400"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;