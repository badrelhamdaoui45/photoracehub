import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Camera, Calendar, Users, ChevronDown, Image as ImageIcon } from 'lucide-react';

interface Album {
  event_name: string;
  photo_count: number;
  preview_url?: string;
}

interface Profile {
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
}

export default function PhotographerProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(6);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadPhotographerData();
  }, [id]);

  async function loadPhotographerData() {
    try {
      setLoading(true);
      setError(null);

      // Load photographer profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load photographer's albums
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select(`
          event_name,
          url,
          watermark_url
        `)
        .eq('photographer_id', id)
        .not('url', 'eq', '')
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;

      // Group photos by event and get counts
      const albumMap = new Map<string, Album>();
      photosData.forEach(photo => {
        if (!albumMap.has(photo.event_name)) {
          albumMap.set(photo.event_name, {
            event_name: photo.event_name,
            photo_count: 1,
            preview_url: photo.watermark_url
          });
        } else {
          const album = albumMap.get(photo.event_name)!;
          album.photo_count++;
        }
      });

      const albumList = Array.from(albumMap.values());
      setAlbums(albumList);
      setHasMore(albumList.length > displayCount);

    } catch (error) {
      console.error('Error loading photographer data:', error);
      setError('Failed to load photographer data');
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
      return 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&q=80';
    }
    
    const { data } = supabase.storage
      .from('race-photos')
      .getPublicUrl(album.preview_url);
      
    return data.publicUrl;
  };

  const getProfileImage = () => {
    if (!profile?.avatar_url) {
      return null;
    }
    
    const { data } = supabase.storage
      .from('race-photos')
      .getPublicUrl(profile.avatar_url);
      
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {error || "Photographer not found"}
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Photographer Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {getProfileImage() ? (
                <img
                  src={getProfileImage()!}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.full_name || profile.username}
              </h1>
              <p className="mt-1 text-gray-500">Photographer</p>
              {profile.bio && (
                <p className="mt-2 text-gray-600 max-w-2xl">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Albums Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Photo Albums</h2>
            <p className="mt-1 text-gray-500">{albums.length} albums available</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {albums.slice(0, displayCount).map((album) => (
            <Link
              key={album.event_name}
              to={`/gallery?event=${encodeURIComponent(album.event_name)}`}
              className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100"
            >
              <div className="relative h-48">
                <img
                  src={getAlbumPreviewUrl(album)}
                  alt={album.event_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-lg font-semibold text-white">{album.event_name}</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <Camera className="h-4 w-4 mr-1" />
                    <span>{album.photo_count} photos</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2 overflow-hidden">
                      {getProfileImage() ? (
                        <img
                          src={getProfileImage()!}
                          alt={profile.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <span className="text-gray-700 font-medium">{profile.username}</span>
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

        {albums.length === 0 && (
          <div className="text-center py-12">
            <Camera className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No albums yet</h3>
            <p className="mt-2 text-gray-500">
              This photographer hasn't uploaded any photos yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}