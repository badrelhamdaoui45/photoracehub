import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Upload as UploadIcon, 
  X, 
  AlertCircle, 
  Image as ImageIcon,
  Scan,
  Edit2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
  DollarSign
} from 'lucide-react';
import { processImageWithWatermark } from '../lib/imageService';
import { detectBibNumbers, testGeminiAPI } from '../lib/bibDetectionService';

interface UploadedPhoto {
  file: File;
  preview: string;
  progress: number;
  error?: string;
  bibNumbers: string[];
  bibStatus: 'detecting' | 'success' | 'error' | 'multiple' | 'none';
  editingBibs: boolean;
  manualBibNumbers: string;
}

interface PriceTier {
  quantity: number;
  price: number;
}

export default function Upload() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState(searchParams.get('event') || '');
  const [events, setEvents] = useState<string[]>([]);
  const [bibSearchQuery, setBibSearchQuery] = useState('');
  const [detectingBibs, setDetectingBibs] = useState(false);
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([
    { quantity: 1, price: 9.99 }
  ]);

  useEffect(() => {
    checkUser();
    loadEvents();
    // Test Gemini API connection
    testGeminiAPI().then(isValid => {
      if (!isValid) {
        setError('Unable to connect to Gemini API. Please check your API key configuration.');
      }
    });
  }, []);

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      if (user.user_metadata?.role !== 'photographer') {
        navigate('/');
        return;
      }
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/auth');
    }
  }

  async function loadEvents() {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('event_name')
        .not('event_name', 'eq', '')
        .order('event_name');

      if (error) throw error;

      const uniqueEvents = [...new Set(data.map(photo => photo.event_name))];
      setEvents(uniqueEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const files = Array.from(e.target.files);
    const newPhotos: UploadedPhoto[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      bibNumbers: [],
      bibStatus: 'none',
      editingBibs: false,
      manualBibNumbers: ''
    }));
    setUploadedPhotos(prev => [...prev, ...newPhotos]);
  }, []);

  const handlePreviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewImage(file);
      setPreviewImageUrl(URL.createObjectURL(file));
    }
  };

  const removePhoto = useCallback((index: number) => {
    setUploadedPhotos(prev => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  }, []);

  const addPriceTier = () => {
    setPriceTiers(prev => [...prev, { quantity: prev.length + 1, price: 9.99 }]);
  };

  const removePriceTier = (index: number) => {
    setPriceTiers(prev => prev.filter((_, i) => i !== index));
  };

  const updatePriceTier = (index: number, field: keyof PriceTier, value: number) => {
    setPriceTiers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const detectBibsForPhoto = async (photo: UploadedPhoto, index: number) => {
    try {
      setUploadedPhotos(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], bibStatus: 'detecting' };
        return updated;
      });

      const bibNumbers = await detectBibNumbers(photo.file);
      
      setUploadedPhotos(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          bibNumbers,
          bibStatus: bibNumbers.length === 0 ? 'none' : 
                    bibNumbers.length > 1 ? 'multiple' : 'success',
          manualBibNumbers: bibNumbers.join(', ')
        };
        return updated;
      });
    } catch (error) {
      console.error('Error detecting bib numbers:', error);
      setUploadedPhotos(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], bibStatus: 'error' };
        return updated;
      });
    }
  };

  const detectAllBibs = async () => {
    setDetectingBibs(true);
    try {
      for (let i = 0; i < uploadedPhotos.length; i++) {
        if (uploadedPhotos[i].bibStatus === 'none') {
          await detectBibsForPhoto(uploadedPhotos[i], i);
        }
      }
    } finally {
      setDetectingBibs(false);
    }
  };

  const updateBibNumbers = (index: number, value: string) => {
    setUploadedPhotos(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        manualBibNumbers: value,
        bibNumbers: value.split(',').map(bib => bib.trim()).filter(Boolean)
      };
      return updated;
    });
  };

  const toggleBibEdit = (index: number) => {
    setUploadedPhotos(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        editingBibs: !updated[index].editingBibs
      };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) {
      setError('Please select or enter an event name');
      return;
    }

    if (!previewImage) {
      setError('Please select a preview image for the album');
      return;
    }

    setUploading(true);
    setError(null);
    let successCount = 0;

    try {
      // Upload preview image first
      const previewTimestamp = Date.now();
      const previewExt = previewImage.name.split('.').pop();
      const previewPath = `public/previews/${previewTimestamp}-${Math.random().toString(36).substring(7)}.${previewExt}`;
      
      console.log('Uploading preview image...');
      const { error: previewError, data: previewData } = await supabase.storage
        .from('race-photos')
        .upload(previewPath, previewImage);

      if (previewError) {
        console.error('Preview image upload error:', previewError);
        throw previewError;
      }

      console.log('Preview image uploaded successfully');

      // Save price tiers
      console.log('Saving price tiers...');
      const { error: priceTiersError } = await supabase
        .from('price_tiers')
        .insert(
          priceTiers.map(tier => ({
            photographer_id: user.id,
            event_name: selectedEvent,
            quantity: tier.quantity,
            price: tier.price
          }))
        );

      if (priceTiersError) {
        console.error('Price tiers error:', priceTiersError);
        throw priceTiersError;
      }

      // Upload photos
      for (let i = 0; i < uploadedPhotos.length; i++) {
        const photo = uploadedPhotos[i];
        try {
          console.log(`Processing photo ${i + 1}/${uploadedPhotos.length}`);
          
          setUploadedPhotos(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], progress: 10 };
            return updated;
          });

          // Process image and detect bib numbers if not already detected
          const processedImages = await processImageWithWatermark(photo.file);
          const bibNumbers = photo.bibNumbers.length > 0 
            ? photo.bibNumbers 
            : await detectBibNumbers(photo.file).catch(error => {
                console.error('Bib detection error:', error);
                return [];
              });

          setUploadedPhotos(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], progress: 50 };
            return updated;
          });

          // Create database entry
          const { error: dbError } = await supabase
            .from('photos')
            .insert({
              photographer_id: user.id,
              event_name: selectedEvent,
              title: photo.file.name,
              url: processedImages.originalUrl,
              watermark_url: processedImages.watermarkUrl,
              preview_image: i === 0 ? previewPath : null,
              price: priceTiers[0].price,
              bib_numbers: bibNumbers
            });

          if (dbError) {
            console.error('Database insert error:', dbError);
            throw dbError;
          }

          successCount++;
          setUploadedPhotos(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], progress: 100, bibNumbers };
            return updated;
          });
        } catch (error) {
          console.error(`Error uploading photo ${i + 1}:`, error);
          setUploadedPhotos(prev => {
            const updated = [...prev];
            updated[i] = { 
              ...updated[i], 
              error: error instanceof Error ? error.message : 'Upload failed',
              progress: 0 
            };
            return updated;
          });
        }
        setOverallProgress(((i + 1) / uploadedPhotos.length) * 100);
      }

      if (successCount === uploadedPhotos.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await supabase
          .from('photos')
          .select()
          .eq('event_name', selectedEvent);
        navigate(`/gallery?event=${encodeURIComponent(selectedEvent)}`);
      } else if (successCount > 0) {
        setError(`${successCount} of ${uploadedPhotos.length} photos uploaded successfully`);
      } else {
        setError('All uploads failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during upload process:', error);
      setError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getBibStatusColor = (status: UploadedPhoto['bibStatus']) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'multiple': return 'text-yellow-500';
      case 'detecting': return 'text-blue-500';
      default: return 'text-gray-400';
    }
  };

  const getBibStatusIcon = (status: UploadedPhoto['bibStatus']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      case 'multiple': return <AlertTriangle className="w-5 h-5" />;
      case 'detecting': return (
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
      );
      default: return <Scan className="w-5 h-5" />;
    }
  };

  const filteredPhotos = uploadedPhotos.filter(photo => 
    !bibSearchQuery || 
    photo.bibNumbers.some(bib => 
      bib.toLowerCase().includes(bibSearchQuery.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-background-light">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Upload Photos</h1>
              <p className="mt-1 text-gray-500">Add photos to your event collection</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Name
                </label>
                <input
                  type="text"
                  id="event"
                  list="events"
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Enter or select event name"
                  required
                />
                <datalist id="events">
                  {events.map(event => (
                    <option key={event} value={event} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Album Preview Image
                </label>
                <div className="mt-1 flex items-center">
                  {previewImageUrl ? (
                    <div className="relative w-32 h-32">
                      <img
                        src={previewImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewImage(null);
                          setPreviewImageUrl('');
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-sm hover:bg-gray-100"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadIcon className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-xs text-gray-500">Upload preview</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handlePreviewImageChange}
                        accept="image/*"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Price Tiers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Price Tiers</h3>
                <button
                  type="button"
                  onClick={addPriceTier}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary-light"
                >
                  <Plus className="w-4 h-4" />
                  Add Tier
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {priceTiers.map((tier, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={tier.quantity}
                        onChange={(e) => updatePriceTier(index, 'quantity', parseInt(e.target.value))}
                        min="1"
                        className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price ($)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          value={tier.price}
                          onChange={(e) => updatePriceTier(index, 'price', parseFloat(e.target.value))}
                          min="0.01"
                          step="0.01"
                          className="block w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removePriceTier(index)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="photos"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadIcon className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                  <input
                    id="photos"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
              </div>

              {uploadedPhotos.length > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={detectAllBibs}
                        disabled={detectingBibs || uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:bg-gray-300"
                      >
                        <Scan className="w-4 h-4" />
                        Detect All Race Bibs
                      </button>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search by bib number..."
                          value={bibSearchQuery}
                          onChange={(e) => setBibSearchQuery(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPhotos.map((photo, index) => (
                      <div key={index} className="relative">
                        <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={photo.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-gray-100"
                          >
                            <X className="w-4 h-4 text-gray-500" />
                          </button>
                          {photo.progress > 0 && photo.progress < 100 && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <div className="w-16 h-16 rounded-full border-4 border-white border-t-transparent animate-spin" />
                            </div>
                          )}
                          {photo.error && (
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-red-50">
                              <div className="flex items-center gap-2 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                <p>Upload failed. Click remove and try again.</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`${getBibStatusColor(photo.bibStatus)}`}>
                                {getBibStatusIcon(photo.bibStatus)}
                              </span>
                              <span className="text-sm font-medium text-gray-700">
                                {photo.bibStatus === 'none' ? 'No bib detected' :
                                 photo.bibStatus === 'detecting' ? 'Detecting bib...' :
                                 photo.bibStatus === 'multiple' ? 'Multiple bibs found' :
                                 photo.bibStatus === 'error' ? 'Detection failed' :
                                 'Bib detected'}
                              </span>
                            </div>
                            {photo.bibStatus !== 'detecting' && (
                              <button
                                type="button"
                                onClick={() => photo.editingBibs ? toggleBibEdit(index) : detectBibsForPhoto(photo, index)}
                                className="p-1 text-gray-500 hover:text-primary"
                              >
                                {photo.editingBibs ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <Edit2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                          {photo.editingBibs ? (
                            <input
                              type="text"
                              value={photo.manualBibNumbers}
                              onChange={(e) => updateBibNumbers(index, e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-primary focus:border-primary"
                              placeholder="Enter bib numbers, comma separated"
                            />
                          ) : photo.bibNumbers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {photo.bibNumbers.map((bib, bibIndex) => (
                                <span
                                  key={bibIndex}
                                  className="px-2 py-1 text-xs font-medium bg-gray-100 rounded"
                                >
                                  #{bib}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {uploading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Overall Progress</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={uploading || uploadedPhotos.length === 0 || !previewImage}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadIcon className="h-5 w-5" />
                    <span>Upload Photos</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}