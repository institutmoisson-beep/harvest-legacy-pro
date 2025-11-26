import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';

interface OrderImageUploaderProps {
  orderId: string | null;
  onImagesChange?: (images: any[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export default function OrderImageUploader({
  orderId,
  onImagesChange,
  maxImages = 3,
  disabled = false,
}: OrderImageUploaderProps) {
  const { user } = useAuth();
  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file: File) => {
    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour ajouter des images',
        variant: 'destructive',
      });
      return;
    }

    if (images.length >= maxImages) {
      toast({
        title: 'Limite atteinte',
        description: `Vous pouvez ajouter maximum ${maxImages} images`,
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > 5242880) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'Maximum 5 MB par image',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      let imageUrl = '';
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${user.id}/orders/${orderId || 'temp'}/${timestamp}.${fileExt}`;

      // Method 1: Try Supabase Storage
      try {
        const { error: uploadError, data } = await supabase.storage
          .from('order-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('order-images')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      } catch (storageError: any) {
        console.warn('Storage upload failed:', storageError);

        // Method 2: Fallback to base64 encoding
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        imageUrl = reader.result as string;

        toast({
          title: 'Upload indirect utilisé',
          description: 'Image stockée temporairement en local',
        });
      }

      // Create database record (but only if orderId is a real UUID)
      if (orderId && orderId !== 'pending') {
        try {
          const { error: dbError } = await supabase
            .from('order_images')
            .insert({
              order_id: orderId,
              image_url: imageUrl,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: user.id,
            });

          if (dbError) {
            console.warn('Could not save image to database:', dbError);
          }
        } catch (dbError) {
          console.warn('Database insert failed:', dbError);
        }
      }

      const newImage = {
        id: `pending-${timestamp}`,
        order_id: orderId,
        image_url: imageUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        created_at: new Date().toISOString(),
        isPending: !orderId || orderId === 'pending',
      };

      const updatedImages = [...images, newImage];
      setImages(updatedImages);
      onImagesChange?.(updatedImages);

      toast({
        title: 'Succès!',
        description: 'Image ajoutée avec succès',
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du téléchargement de l\'image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette image?')) {
      return;
    }

    try {
      setUploading(true);

      // Handle storage deletion if not a base64 or pending image
      if (!imageUrl.startsWith('data:') && !imageId.startsWith('pending-')) {
        // Extract path from URL
        const imagePath = imageUrl.split('/order-images/')[1];

        if (imagePath) {
          try {
            // Try to delete from storage
            await supabase.storage
              .from('order-images')
              .remove([imagePath])
              .catch(err => console.warn('Storage delete failed:', err));
          } catch (err) {
            console.warn('Storage delete error:', err);
          }
        }

        // Try to delete from database
        try {
          await supabase
            .from('order_images')
            .delete()
            .eq('id', imageId)
            .catch(err => console.warn('Database delete failed:', err));
        } catch (err) {
          console.warn('Database delete error:', err);
        }
      }

      const updatedImages = images.filter(img => img.id !== imageId);
      setImages(updatedImages);
      onImagesChange?.(updatedImages);

      toast({
        title: 'Succès!',
        description: 'Image supprimée',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer l\'image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      Array.from(files).forEach((file) => {
        handleImageUpload(file);
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition">
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInputChange}
            disabled={uploading || images.length >= maxImages || disabled}
            className="hidden"
          />
          <div className="space-y-2">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
            <div>
              <p className="font-semibold">Cliquez ou glissez des images (optionnel)</p>
              <p className="text-sm text-muted-foreground">
                PNG, JPG, WebP jusqu'à 5 MB ({images.length}/{maxImages})
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Setup Helper */}
      {!bucketReady && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
            💡 Si vous avez des problèmes de téléchargement, cliquez ici:
          </p>
          <a
            href="/setup/storage"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline hover:no-underline"
          >
            Initialiser le stockage →
          </a>
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group rounded-lg overflow-hidden border-2 border-border hover:border-primary/50 transition"
            >
              <img
                src={img.image_url}
                alt={img.file_name}
                className="w-full h-32 object-cover"
              />
              {img.isPending && (
                <Badge variant="secondary" className="absolute top-2 left-2">
                  En attente
                </Badge>
              )}
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                onClick={() => handleDeleteImage(img.id, img.image_url)}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
