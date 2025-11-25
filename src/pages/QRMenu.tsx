import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Plus, Minus, ShoppingCart, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_featured: boolean;
  preparation_time_minutes?: number;
}

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  menu_items: MenuItem[];
}

interface Establishment {
  id: string;
  name: string;
  description?: string;
  establishment_type: string;
  location: string;
  phone?: string;
  logo_image_url?: string;
  banner_image_url?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

export default function QRMenu() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchEstablishmentAndMenu();
    }
  }, [slug]);

  const fetchEstablishmentAndMenu = async () => {
    try {
      setLoading(true);

      // Fetch establishment
      const { data: estData, error: estError } = await supabase
        .from('establishments')
        .select('*')
        .eq('qr_code_slug', slug)
        .eq('is_active', true)
        .single();

      if (estError || !estData) {
        toast({
          title: 'Établissement introuvable',
          description: 'Ce menu n\'existe plus ou a été désactivé',
          variant: 'destructive',
        });
        navigate('/marketplace');
        return;
      }

      setEstablishment(estData);

      // Fetch categories and menu items
      const { data: categoriesData, error: catError } = await supabase
        .from('menu_categories')
        .select(
          `
          id,
          name,
          description,
          menu_items (
            id,
            name,
            description,
            price,
            image_url,
            is_available,
            is_featured,
            preparation_time_minutes
          )
        `
        )
        .eq('establishment_id', estData.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (catError) throw catError;

      const categoriesWithItems = (categoriesData || [])
        .map((cat) => ({
          ...cat,
          menu_items: cat.menu_items
            ? (cat.menu_items as MenuItem[]).sort((a, b) => {
                // Featured items first
                if (a.is_featured !== b.is_featured) {
                  return a.is_featured ? -1 : 1;
                }
                return 0;
              })
            : [],
        }))
        .filter((cat) => (cat.menu_items || []).length > 0) as MenuCategory[];

      setCategories(categoriesWithItems);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de charger le menu',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    if (!item.is_available) return;

    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });

    toast({
      title: 'Ajouté',
      description: `${item.name} ajouté au panier`,
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du menu...</p>
        </div>
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Menu introuvable</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{establishment.name}</h1>
              <p className="text-sm text-muted-foreground">
                {establishment.establishment_type.charAt(0).toUpperCase() +
                  establishment.establishment_type.slice(1)} • {establishment.location}
              </p>
            </div>
            <Button
              onClick={() => setShowCart(!showCart)}
              className="gap-2"
              variant={cartItemCount > 0 ? 'default' : 'outline'}
            >
              <ShoppingCart className="h-4 w-4" />
              {cartItemCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {cartItemCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu */}
          <div className="lg:col-span-2">
            {categories.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Aucun menu disponible pour le moment
                </AlertDescription>
              </Alert>
            ) : (
              <Tabs defaultValue={categories[0]?.id} className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 mb-6">
                  {categories.map((cat) => (
                    <TabsTrigger key={cat.id} value={cat.id}>
                      {cat.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {categories.map((category) => (
                  <TabsContent key={category.id} value={category.id} className="space-y-4">
                    {category.description && (
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}

                    <div className="space-y-3">
                      {(category.menu_items || []).map((item) => (
                        <Card
                          key={item.id}
                          className={`overflow-hidden transition ${
                            !item.is_available ? 'opacity-50' : 'hover:shadow-lg'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {item.image_url && (
                                <div className="flex-shrink-0 w-24 h-24">
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-full h-full object-cover rounded"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}

                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                  <div>
                                    <h3 className="font-semibold">{item.name}</h3>
                                    {item.is_featured && (
                                      <Badge variant="default" className="mt-1">
                                        ⭐ Populaire
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="font-bold text-lg text-primary">
                                    {item.price.toLocaleString('fr-FR', {
                                      style: 'currency',
                                      currency: 'XAF',
                                    })}
                                  </span>
                                </div>

                                {item.description && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {item.description}
                                  </p>
                                )}

                                {item.preparation_time_minutes && (
                                  <p className="text-xs text-muted-foreground">
                                    ⏱️ {item.preparation_time_minutes} min
                                  </p>
                                )}

                                {!item.is_available && (
                                  <Badge variant="secondary" className="mt-2">
                                    Indisponible
                                  </Badge>
                                )}

                                {item.is_available && (
                                  <Button
                                    size="sm"
                                    onClick={() => addToCart(item)}
                                    className="mt-2 gap-1"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Ajouter
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>

          {/* Cart Sidebar */}
          {showCart && (
            <div className="lg:col-span-1 h-fit sticky top-24">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-bold text-lg">Mon Panier</h2>

                  {cart.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Votre panier est vide
                    </p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {cart.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center p-2 bg-white rounded"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(item.price * item.quantity).toLocaleString('fr-FR', {
                                  style: 'currency',
                                  currency: 'XAF',
                                })}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span className="text-primary">
                            {cartTotal.toLocaleString('fr-FR', {
                              style: 'currency',
                              currency: 'XAF',
                            })}
                          </span>
                        </div>

                        <Button
                          className="w-full gap-2"
                          onClick={() => {
                            navigate('/checkout', {
                              state: {
                                establishment,
                                cart,
                                total: cartTotal,
                              },
                            });
                          }}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Passer la commande
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
