import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { MapPin, Search, Plus, Heart, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
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

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
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
            is_primary
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les produits',
          variant: 'destructive',
        });
        return;
      }

      setProducts(data || []);
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

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.product_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getPrimaryImage = (images: ProductImage[]) => {
    const primary = images.find((img) => img.is_primary);
    return primary?.image_url || images[0]?.image_url || '/placeholder.svg';
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
      }
      return newFavorites;
    });
  };

  const handleContactSeller = (sellerId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/messages?user=${sellerId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold gradient-text-cosmic mb-2">
                🏪 Marketplace Moissonneur
              </h1>
              <p className="text-muted-foreground">
                Découvrez les produits proposés par la communauté
              </p>
            </div>
            {user && (
              <Button
                onClick={() => navigate('/proposer')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Proposer un produit
              </Button>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit, une marque..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement des produits...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {searchTerm ? 'Aucun produit ne correspond à votre recherche.' : 'Aucun produit disponible pour le moment.'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="hover:shadow-lg transition-shadow overflow-hidden group cursor-pointer"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                {/* Product Image */}
                <div className="relative overflow-hidden bg-muted h-48">
                  <img
                    src={getPrimaryImage(product.product_images)}
                    alt={product.product_name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(product.id);
                    }}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        favorites.has(product.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-400'
                      }`}
                    />
                  </Button>
                  {product.product_images.length > 1 && (
                    <Badge className="absolute bottom-2 right-2 bg-black/50">
                      +{product.product_images.length - 1}
                    </Badge>
                  )}
                </div>

                <CardContent className="p-4">
                  {/* Product Info */}
                  <div className="space-y-2 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{product.brand}</p>
                      <h3 className="font-semibold line-clamp-2 text-sm">
                        {product.product_name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{product.location}</span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-lg font-bold text-primary">
                        {product.price.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'XAF',
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Qté: {product.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Contact Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContactSeller(product.user_id);
                    }}
                  >
                    <MessageCircle className="h-3 w-3" />
                    Contacter
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
