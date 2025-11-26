import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
        description: 'Vous devez être connecté',
        variant: 'destructive',
      });
      return;
    }

    if (images.length >= maxImages) {
      toast({
        title: 'Limite atteinte',
        description: `Maximum ${maxImages} images`,
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5242880) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'Maximum 5 MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      const timestamp = Date.now();

      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const newImage = {
        id: `pending-${timestamp}`,
        order_id: orderId,
        image_url: base64,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        created_at: new Date().toISOString(),
        isPending: true,
      };

      const updatedImages = [...images, newImage];
      setImages(updatedImages);
      onImagesChange?.(updatedImages);

      toast({
        title: 'ОК',
        description: 'Image ajoutée ✓',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter l\'image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = (imageId: string) => {
    if (!confirm('Supprimer cette image?')) return;

    const updatedImages = images.filter(img => img.id !== imageId);
    setImages(updatedImages);
    onImagesChange?.(updatedImages);

    toast({
      title: 'Image supprimée',
    });
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
      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition cursor-pointer">
        <label className="cursor-pointer block">
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
              <p className="font-semibold text-sm">Cliquez ou glissez des images</p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP - Max 5 MB ({images.length}/{maxImages})
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
                onClick={() => handleDeleteImage(img.id)}
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
