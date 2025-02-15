import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Calendar, MapPin, Users, ChevronDown, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Album {
  event_name: string;
  photo_count: number;
  photographer: {
    username: string;
  };
  preview_url?: string;
}

export default function Home() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(6);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadAlbums();
  }, []);

  async function loadAlbums() {
    try {
      setLoading(true);
      setError(null);

      // Test connection first
      const { error: healthError } = await supabase.from('photos').select('count').limit(1);
      if (healthError) {
        throw new Error('Database connection failed. Please try again later.');
      }

      const { data, error } = await supabase
        .from('photos')
        .select(`
          event_name,
          photographer:profiles(username),
          url,
          preview_image
        `)
        .not('url', 'eq', '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group photos by event and get the first photo as preview
      const albumMap = data.reduce((acc, photo) => {
        if (!acc[photo.event_name]) {
          acc[photo.event_name] = {
            event_name: photo.event_name,
            photo_count: 1,
            photographer: photo.photographer,
            preview_url: photo.preview_image || photo.url // Use preview_image if available, fallback to url
          };
        } else {
          acc[photo.event_name].photo_count++;
          // Update preview_url only if it's not set yet and we have a preview_image
          if (!acc[photo.event_name].preview_url && photo.preview_image) {
            acc[photo.event_name].preview_url = photo.preview_image;
          }
        }
        return acc;
      }, {} as Record<string, Album>);

      const albumList = Object.values(albumMap);
      setAlbums(albumList);
      setHasMore(albumList.length > displayCount);
    } catch (error) {
      console.error('Error loading albums:', error);
      setError(error instanceof Error ? error.message : 'Failed to load albums');
    } finally {
      setLoading(false);
    }
  }

  const loadMore = () => {
    setDisplayCount(prev => {
      const next = prev + 6;
      setHasMore(albums.length > next);
      return next;
    });
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
    <div className="min-h-[calc(100vh-64px)] bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20">
            <div className="space-y-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
                Welcome to <span className="text-primary">RacePhotoHub</span>
              </h1>
              <p className="text-xl text-gray-600">
                Find and purchase your professional race photos from major marathons and running events.
              </p>
              <div className="pt-4">
                <Link
                  to="/gallery"
                  className="inline-block px-8 py-4 text-lg font-semibold text-white bg-primary hover:bg-primary-light rounded-lg transition-colors"
                >
                  FIND MY PHOTOS
                </Link>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&q=80"
                alt="Runner in action"
                className="w-full h-[600px] object-cover rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Albums Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Featured Events</h2>
            <p className="mt-4 text-lg text-gray-600">Browse photos from recent running events</p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
              <button
                onClick={loadAlbums}
                className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium"
              >
                Try Again
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {albums.slice(0, displayCount).map((album) => (
                  <Link
                    key={album.event_name}
                    to={`/gallery?event=${encodeURIComponent(album.event_name)}`}
                    className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow"
                  >
                    <div className="relative h-48">
                      <img
                        src={getAlbumPreviewUrl(album)}
                        alt={album.event_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{album.event_name}</h3>
                      <div className="space-y-2">
                        <div className="flex items-center text-gray-600">
                          <Camera className="h-5 w-5 mr-2" />
                          <span>{album.photo_count} photos</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Users className="h-5 w-5 mr-2" />
                          <span>By {album.photographer?.username || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {hasMore && (
                <div className="mt-12 text-center">
                  <button
                    onClick={loadMore}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                  >
                    Load More
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}

              {albums.length === 0 && !error && (
                <div className="text-center py-12">
                  <Camera className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-gray-500">No events available yet</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}