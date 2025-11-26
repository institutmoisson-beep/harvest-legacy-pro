import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

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
    if (!user || !orderId) {
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger l\'image',
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

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/orders/${orderId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError, data } = await supabase.storage
        .from('order-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('order-images')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Create database record (but only if orderId is a real UUID)
      if (orderId && orderId !== 'pending') {
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
          console.warn('Could not save image to database (order not yet created):', dbError);
        }
      }

      const newImage = {
        id: `pending-${Date.now()}`,
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
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du téléchargement',
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

      // Extract path from URL
      const imagePath = imageUrl.split('/order-images/')[1];
      
      if (imagePath && !imageId.startsWith('pending-')) {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('order-images')
          .remove([imagePath]);

        if (storageError) throw storageError;

        // Delete from database
        const { error: dbError } = await supabase
          .from('order_images')
          .delete()
          .eq('id', imageId);

        if (dbError) throw dbError;
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
        description: error.message,
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
