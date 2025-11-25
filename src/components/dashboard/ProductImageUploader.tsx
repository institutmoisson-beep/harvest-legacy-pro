import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Star } from 'lucide-react';

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

interface ProductImageUploaderProps {
  productListingId: string;
  onImagesChange?: (images: ProductImage[]) => void;
  maxImages?: number;
}

export default function ProductImageUploader({
  productListingId,
  onImagesChange,
  maxImages = 5,
}: ProductImageUploaderProps) {
  const { user } = useAuth();
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (productListingId) {
      fetchImages();
    }
  }, [productListingId]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_listing_id', productListingId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setImages(data || []);
      onImagesChange?.(data || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user || !productListingId) return;

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
      const fileName = `${user.id}/${productListingId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError, data } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Create database record
      const { error: dbError } = await supabase
        .from('product_images')
        .insert({
          product_listing_id: productListingId,
          user_id: user.id,
          image_url: imageUrl,
          image_path: fileName,
          display_order: images.length,
          is_primary: images.length === 0, // First image is primary
          size_bytes: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Succès!',
        description: 'Image ajoutée avec succès',
      });

      fetchImages();
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

  const handleDeleteImage = async (imageId: string, imagePath: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette image?')) {
      return;
    }

    try {
      setLoading(true);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('product-images')
        .remove([imagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      toast({
        title: 'Succès!',
        description: 'Image supprimée',
      });

      fetchImages();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      // Remove primary from all images
      const { error: updateError } = await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_listing_id', productListingId);

      if (updateError) throw updateError;

      // Set this image as primary
      const { error: setPrimaryError } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (setPrimaryError) throw setPrimaryError;

      toast({
        title: 'Succès!',
        description: 'Image définie comme principale',
      });

      fetchImages();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📸 Images du Produit ({images.length}/{maxImages})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition">
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInputChange}
              disabled={uploading || images.length >= maxImages}
              className="hidden"
            />
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <div>
                <p className="font-semibold">Cliquez ou glissez des images</p>
                <p className="text-sm text-muted-foreground">
                  PNG, JPG, WebP jusqu'à 5 MB
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
                className="relative group rounded-lg overflow-hidden border-2"
                style={{
                  borderColor: img.is_primary ? '#3b82f6' : '#e5e7eb',
                }}
              >
                <img
                  src={img.image_url}
                  alt="Product"
                  className="w-full h-40 object-cover"
                />

                {img.is_primary && (
                  <Badge className="absolute top-2 left-2 bg-blue-500">
                    <Star className="w-3 h-3 mr-1" />
                    Principal
                  </Badge>
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  {!img.is_primary && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetPrimary(img.id)}
                      disabled={loading}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Principal
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteImage(img.id, img.image_path)}
                    disabled={loading}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-center py-4 text-muted-foreground">
            Chargement...
          </div>
        )}

        {images.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucune image pour le moment</p>
            <p className="text-sm">Ajoutez des images en haut</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
