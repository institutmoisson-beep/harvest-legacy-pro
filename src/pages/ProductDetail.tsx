import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { MapPin, Heart, MessageCircle, Loader2, AlertCircle, ArrowLeft, Share2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

interface ProductListing {
  id: string;
  product_name: string;
  brand: string;
  quantity: number;
  price: number;
  location: string;
  user_id: string;
  status: string;
  created_at: string;
  product_images: ProductImage[];
}

interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
}

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductListing | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_listings')
        .select(`
          id,
          product_name,
          brand,
          quantity,
          price,
          location,
          user_id,
          status,
          created_at,
          product_images (
            id,
            image_url,
            is_primary,
            display_order
          )
        `)
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        toast({
          title: 'Erreur',
          description: 'Produit introuvable',
          variant: 'destructive',
        });
        navigate('/marketplace');
        return;
      }

      if (data) {
        setProduct(data);
        fetchUserProfile(data.user_id);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setUserProfile(data);
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleContactSeller = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (product) {
      navigate(`/messages?user=${product.user_id}`);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.product_name,
        text: `Découvrez ce produit: ${product?.product_name} - ${product?.price} MSN`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Copié!',
        description: 'Lien copié dans le presse-papiers',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du produit...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Produit introuvable</AlertDescription>
        </Alert>
      </div>
    );
  }

  const images = product.product_images.sort((a, b) => a.display_order - b.display_order);
  const currentImage = images[selectedImageIndex]?.image_url || '/placeholder.svg';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/marketplace')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la marketplace
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Images Section */}
          <div className="md:col-span-2">
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square">
                <img
                  src={currentImage}
                  alt={product.product_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-4 right-4 bg-white/80 hover:bg-white"
                  onClick={() => setIsFavorite(!isFavorite)}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
                    }`}
                  />
                </Button>
              </div>

              {/* Thumbnail Images */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, index) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImageIndex === index
                          ? 'border-primary'
                          : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={img.image_url}
                        alt={`Image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            {/* Product Info Card */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Marque</p>
                  <p className="text-lg font-semibold">{product.brand}</p>
                </div>

                <div>
                  <h1 className="text-2xl font-bold mb-2">{product.product_name}</h1>
                  <p className="text-xs text-muted-foreground">
                    Publié {new Date(product.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold text-primary">
                      {product.price.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'XAF',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{product.location}</span>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted-foreground">Quantité disponible</p>
                    <p className="text-lg font-semibold">{product.quantity} unité(s)</p>
                  </div>
                </div>

                {/* Number of Images */}
                {images.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    📸 {images.length} photo(s)
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seller Info Card */}
            {userProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vendeur</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    {userProfile.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt={userProfile.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {userProfile.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{userProfile.full_name || 'Utilisateur'}</p>
                      <p className="text-xs text-muted-foreground">Moissonneur membre</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={handleContactSeller}
              >
                <MessageCircle className="h-4 w-4" />
                Contacter le vendeur
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
                Partager
              </Button>
            </div>

            {user?.id === product.user_id && (
              <Alert>
                <AlertDescription>
                  C'est votre produit. Vous pouvez le modifier depuis votre tableau de bord.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
