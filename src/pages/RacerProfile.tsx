import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Timer, Image, User } from 'lucide-react';

interface Purchase {
  id: string;
  photo: {
    event_name: string;
    url: string;
    price: number;
  };
  created_at: string;
  amount: number;
}

export default function RacerProfile() {
  const [user, setUser] = useState<any>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
    loadPurchases();
  }, []);

  async function checkUser() {
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!currentUser) return;

      setUser(currentUser);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!profile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            username: currentUser.email?.split('@')[0] || 'user',
            full_name: currentUser.user_metadata?.full_name || ''
          });

        if (insertError) throw insertError;
      }

    } catch (error) {
      console.error('Error checking user:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  }

  async function loadPurchases() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('purchases')
        .select(`
          id,
          amount,
          created_at,
          photo:photos (
            event_name,
            url,
            price
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
      setError('Failed to load purchases');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-100 p-3 rounded-full">
              <Timer className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {user?.email}
              </h2>
              <p className="text-gray-500">Racer Account</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">My Purchased Photos</h3>
          
          {purchases.length === 0 ? (
            <div className="text-center py-12">
              <Image className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">No purchased photos yet</p>
              <a href="/gallery" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
                Browse Photos
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchases.map((purchase) => (
                <div key={purchase.id} className="border rounded-lg overflow-hidden">
                  <img
                    src={supabase.storage.from('race-photos').getPublicUrl(purchase.photo.url).data.publicUrl}
                    alt={`Photo from ${purchase.photo.event_name}`}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900">{purchase.photo.event_name}</h4>
                    <div className="mt-2 flex justify-between text-sm text-gray-500">
                      <span>Purchased on {new Date(purchase.created_at).toLocaleDateString()}</span>
                      <span>${purchase.amount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}