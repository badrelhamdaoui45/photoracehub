import { supabase } from './supabase';

export async function processImageWithWatermark(file: File): Promise<{ originalUrl: string; watermarkUrl: string }> {
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    
    // Upload original image
    const { data: originalData, error: uploadError } = await supabase.storage
      .from('race-photos')
      .upload(`originals/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });
      
    if (uploadError) throw uploadError;

    // For now, use the same image for watermark
    const { data: watermarkData, error: watermarkError } = await supabase.storage
      .from('race-photos')
      .copy(`originals/${fileName}`, `watermarked/${fileName}`);

    if (watermarkError) throw watermarkError;

    // Return the storage paths
    return {
      originalUrl: `originals/${fileName}`,
      watermarkUrl: `watermarked/${fileName}`
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}