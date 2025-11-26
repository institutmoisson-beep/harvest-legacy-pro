import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Store, Plus, ExternalLink, Copy, Package, ShoppingBag, DollarSign, TrendingUp, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function ShopDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createShopOpen, setCreateShopOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [shopData, setShopData] = useState({
    shop_name: '',
    shop_url_slug: '',
    description: '',
    background_theme: 'gradient-purple',
  });

  const [productData, setProductData] = useState({
    product_name: '',
    description: '',
    price: '',
    stock: '',
    payment_link: '',
    product_type: 'physical',
    image_url: '',
    file_url: '',
  });

  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchShopData();
    }
  }, [user]);

  const fetchShopData = async () => {
    setLoading(true);
    
    const { data: shopData, error } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching shop:', error);
    }

    setShop(shopData);

    if (shopData) {
      await Promise.all([
        fetchProducts(shopData.id),
        fetchOrders(shopData.id)
      ]);
    }

    setLoading(false);
  };

  const fetchProducts = async (shopId: number) => {
    const { data } = await supabase
      .from('shop_products')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    setProducts(data || []);
  };

  const fetchOrders = async (shopId: number) => {
    const { data } = await supabase
      .from('shop_orders')
      .select('*, shop_products(product_name)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    setOrders(data || []);
  };

  const createShop = async () => {
    if (!shopData.shop_name || !shopData.shop_url_slug) {
      toast({ title: 'Erreur', description: 'Nom et URL requis', variant: 'destructive' });
      return;
    }

    const slug = shopData.shop_url_slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const { data, error } = await supabase
      .from('shop_settings')
      .insert({
        user_id: user?.id,
        shop_name: shopData.shop_name,
        shop_url_slug: slug,
        description: shopData.description,
        background_theme: shopData.background_theme,
        active: true,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Boutique créée avec succès!' });
      setShop(data);
      setCreateShopOpen(false);
      setShopData({ shop_name: '', shop_url_slug: '', description: '', background_theme: 'gradient-purple' });
    }
  };

  const updateShopTheme = async (theme: string) => {
    const { error } = await supabase
      .from('shop_settings')
      .update({ background_theme: theme })
      .eq('id', shop.id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Thème mis à jour!' });
      setShop({ ...shop, background_theme: theme });
    }
  };

  const uploadProductImage = async (file: File, productId?: number): Promise<string | null> => {
    try {
      setUploading(true);
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64String = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
      const dataUrl = `data:${file.type};base64,${base64String}`;

      if (productId) {
        const { error } = await supabase
          .from('product_media')
          .upsert({
            product_id: productId,
            media_type: 'image',
            file_name: file.name,
            file_size: file.size,
            file_data: uint8Array,
            mime_type: file.type,
            is_primary: true,
          });

        if (error) {
          toast({ title: 'Erreur', description: `Erreur lors du téléchargement: ${error.message}`, variant: 'destructive' });
          return null;
        }
      }

      return dataUrl;
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadProductFile = async (file: File, productId?: number): Promise<string | null> => {
    try {
      setUploading(true);
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      if (productId) {
        const { error } = await supabase
          .from('product_media')
          .insert({
            product_id: productId,
            media_type: 'file',
            file_name: file.name,
            file_size: file.size,
            file_data: uint8Array,
            mime_type: file.type,
          });

        if (error) {
          toast({ title: 'Erreur', description: `Erreur lors du téléchargement: ${error.message}`, variant: 'destructive' });
          return null;
        }
      }

      return file.name;
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const addProduct = async () => {
    if (!productData.product_name || !productData.price || !productData.stock) {
      toast({ title: 'Erreur', description: 'Nom, prix et stock requis', variant: 'destructive' });
      return;
    }

    if (productData.product_type === 'digital' && !filePreview) {
      toast({ title: 'Erreur', description: 'Un fichier téléchargeable est requis pour les produits numériques', variant: 'destructive' });
      return;
    }

    const { data: newProduct, error } = await supabase
      .from('shop_products')
      .insert({
        shop_id: shop.id,
        product_name: productData.product_name,
        description: productData.description,
        price: parseFloat(productData.price),
        stock: parseInt(productData.stock),
        payment_link: productData.payment_link,
        product_type: productData.product_type,
        image_url: imagePreview ? 'stored_in_media' : null,
        file_url: filePreview ? 'stored_in_media' : null,
        is_active: true,
        is_approved: true,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Produit ajouté!' });
      setAddProductOpen(false);
      setProductData({ product_name: '', description: '', price: '', stock: '', payment_link: '', product_type: 'physical', image_url: '', file_url: '' });
      setImagePreview(null);
      setFilePreview(null);
      fetchProducts(shop.id);
    }
  };

  const updateProduct = async () => {
    if (!selectedProduct) return;

    if (productData.product_type === 'digital' && !filePreview) {
      toast({ title: 'Erreur', description: 'Un fichier téléchargeable est requis pour les produits numériques', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('shop_products')
      .update({
        product_name: productData.product_name,
        description: productData.description,
        price: parseFloat(productData.price),
        stock: parseInt(productData.stock),
        payment_link: productData.payment_link,
        product_type: productData.product_type,
        image_url: imagePreview ? 'stored_in_media' : null,
        file_url: filePreview ? 'stored_in_media' : null,
      })
      .eq('id', selectedProduct.id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Produit mis à jour!' });
      setEditProductOpen(false);
      setSelectedProduct(null);
      setImagePreview(null);
      setFilePreview(null);
      fetchProducts(shop.id);
    }
  };

  const deleteProduct = async (productId: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce produit?')) return;

    const { error } = await supabase
      .from('shop_products')
      .delete()
      .eq('id', productId);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Produit supprimé!' });
      fetchProducts(shop.id);
    }
  };

  const toggleProductStatus = async (productId: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from('shop_products')
      .update({ is_active: !currentStatus })
      .eq('id', productId);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: `Produit ${!currentStatus ? 'activé' : 'désactivé'}` });
      fetchProducts(shop.id);
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    const { error } = await supabase
      .from('shop_orders')
      .update({ order_status: status })
      .eq('id', orderId);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Statut mis à jour!' });
      fetchOrders(shop.id);
    }
  };

  const copyShopUrl = () => {
    const url = `${window.location.origin}/shop/${shop.shop_url_slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Copié!', description: 'Lien de la boutique copié' });
  };

  const openEditProduct = (product: any) => {
    setSelectedProduct(product);
    setProductData({
      product_name: product.product_name,
      description: product.description || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      payment_link: product.payment_link || '',
      product_type: product.product_type || 'physical',
      image_url: product.image_url || '',
      file_url: product.file_url || '',
    });
    setImagePreview(product.image_url || null);
    setFilePreview(product.file_url ? product.file_url.split('/').pop() : null);
    setEditProductOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Store className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          <Card>
            <CardHeader className="text-center">
              <Store className="h-16 w-16 mx-auto mb-4 text-primary" />
              <CardTitle>Créer votre boutique</CardTitle>
              <CardDescription>
                Commencez à vendre vos produits en ligne avec votre propre boutique
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nom de la boutique</Label>
                <Input
                  value={shopData.shop_name}
                  onChange={(e) => setShopData({ ...shopData, shop_name: e.target.value })}
                  placeholder="Ma Super Boutique"
                />
              </div>

              <div>
                <Label>URL de la boutique</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/shop/</span>
                  <Input
                    value={shopData.shop_url_slug}
                    onChange={(e) => setShopData({ ...shopData, shop_url_slug: e.target.value })}
                    placeholder="ma-boutique"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={shopData.description}
                  onChange={(e) => setShopData({ ...shopData, description: e.target.value })}
                  placeholder="Description de votre boutique..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Thème de fond</Label>
                <Select
                  value={shopData.background_theme}
                  onValueChange={(value) => setShopData({ ...shopData, background_theme: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un thème" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gradient-purple">Dégradé Violet</SelectItem>
                    <SelectItem value="gradient-blue">Dégradé Bleu</SelectItem>
                    <SelectItem value="gradient-green">Dégradé Vert</SelectItem>
                    <SelectItem value="gradient-orange">Dégradé Orange</SelectItem>
                    <SelectItem value="gradient-pink">Dégradé Rose</SelectItem>
                    <SelectItem value="solid-dark">Sombre</SelectItem>
                    <SelectItem value="solid-light">Clair</SelectItem>
                    <SelectItem value="pattern-dots">Motif Points</SelectItem>
                    <SelectItem value="pattern-grid">Motif Grille</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={createShop} className="w-full">
                <Store className="h-4 w-4 mr-2" />
                Créer ma boutique
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeProducts = products.filter(p => p.is_active);
  const totalRevenue = orders
    .filter(o => o.order_status === 'completed')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const pendingOrders = orders.filter(o => o.order_status === 'pending').length;

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 sm:flex-none">
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Store className="h-5 sm:h-6 w-5 sm:w-6 text-primary flex-shrink-0" />
                <span className="truncate">{shop.shop_name}</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{shop.description}</p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={copyShopUrl} className="flex-1 sm:flex-none text-xs sm:text-sm">
              <Copy className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Copier le lien</span>
              <span className="sm:hidden">Copier</span>
            </Button>
            <Button size="sm" onClick={() => window.open(`/shop/${shop.shop_url_slug}`, '_blank')} className="flex-1 sm:flex-none text-xs sm:text-sm">
              <ExternalLink className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Voir la boutique</span>
              <span className="sm:hidden">Voir</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Produits actifs</p>
                  <p className="text-2xl font-bold">{activeProducts.length}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Commandes en attente</p>
                  <p className="text-2xl font-bold">{pendingOrders}</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total commandes</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenu total</p>
                  <p className="text-2xl font-bold">{totalRevenue.toLocaleString()} FCFA</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" />
              Produits
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Commandes
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Store className="h-4 w-4 mr-2" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg sm:text-xl font-semibold">Mes produits</h2>
              <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un produit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto px-4 sm:px-6">
                  <DialogHeader>
                    <DialogTitle>Ajouter un produit</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
                    <div>
                      <Label>Nom du produit</Label>
                      <Input
                        value={productData.product_name}
                        onChange={(e) => setProductData({ ...productData, product_name: e.target.value })}
                        placeholder="iPhone 15 Pro Max"
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={productData.description}
                        onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                        placeholder="Description détaillée du produit..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>Image du produit</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition">
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toast({ title: 'Erreur', description: 'L\'image ne doit pas dépasser 5MB', variant: 'destructive' });
                                return;
                              }
                              const url = await uploadProductImage(file);
                              if (url) {
                                setImagePreview(url);
                              }
                            }
                          }}
                          className="hidden"
                          id="product-image-input"
                        />
                        <label htmlFor="product-image-input" className="cursor-pointer">
                          {imagePreview ? (
                            <div className="space-y-2">
                              <img src={imagePreview} alt="Aperçu" className="w-32 h-32 mx-auto object-cover rounded" />
                              <p className="text-sm text-muted-foreground">Cliquez pour changer</p>
                            </div>
                          ) : (
                            <div className="py-4">
                              <p className="text-sm text-muted-foreground">Cliquez pour ajouter une image</p>
                              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF jusqu'à 5MB</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Prix (FCFA)</Label>
                        <Input
                          type="number"
                          value={productData.price}
                          onChange={(e) => setProductData({ ...productData, price: e.target.value })}
                          placeholder="50000"
                        />
                      </div>

                      <div>
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          value={productData.stock}
                          onChange={(e) => setProductData({ ...productData, stock: e.target.value })}
                          placeholder="10"
                          disabled={productData.product_type === 'digital'}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Type de produit</Label>
                      <Select
                        value={productData.product_type}
                        onValueChange={(value) => {
                          setProductData({ ...productData, product_type: value });
                          if (value === 'digital') {
                            setProductData(prev => ({ ...prev, stock: '1' }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="physical">Produit physique</SelectItem>
                          <SelectItem value="digital">Produit numérique</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {productData.product_type === 'digital' && (
                      <div>
                        <Label>Fichier téléchargeable</Label>
                        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition">
                          <input
                            type="file"
                            disabled={uploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 100 * 1024 * 1024) {
                                  toast({ title: 'Erreur', description: 'Le fichier ne doit pas dépasser 100MB', variant: 'destructive' });
                                  return;
                                }
                                const fileName = await uploadProductFile(file);
                                if (fileName) {
                                  setFilePreview(file.name);
                                }
                              }
                            }}
                            className="hidden"
                            id="product-file-input"
                          />
                          <label htmlFor="product-file-input" className="cursor-pointer">
                            {filePreview ? (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">✓ {filePreview}</p>
                                <p className="text-xs text-muted-foreground">Cliquez pour changer</p>
                              </div>
                            ) : (
                              <div className="py-4">
                                <p className="text-sm text-muted-foreground">Cliquez pour ajouter un fichier</p>
                                <p className="text-xs text-muted-foreground mt-1">PDF, ZIP, etc. jusqu'à 100MB</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>Lien de paiement (optionnel)</Label>
                      <Input
                        value={productData.payment_link}
                        onChange={(e) => setProductData({ ...productData, payment_link: e.target.value })}
                        placeholder="https://pay.exemple.com/..."
                      />
                    </div>

                    <Button onClick={addProduct} className="w-full" disabled={uploading}>
                      {uploading ? 'Téléchargement...' : 'Ajouter le produit'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  {product.image_url && (
                    <div className="w-full h-48 bg-muted overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.product_name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      </div>
                      <Badge variant={product.is_active ? 'default' : 'secondary'}>
                        {product.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{product.price.toLocaleString()} FCFA</span>
                      <span className="text-muted-foreground">
                        {product.product_type === 'digital' ? 'Numérique' : `Stock: ${product.stock}`}
                      </span>
                    </div>

                    {product.payment_link && (
                      <div className="text-xs text-muted-foreground truncate">
                        <DollarSign className="h-3 w-3 inline mr-1" />
                        Lien de paiement configuré
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditProduct(product)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleProductStatus(product.id, product.is_active)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteProduct(product.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {products.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucun produit pour le moment</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Ajoutez votre premier produit pour commencer à vendre
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Mes commandes</h2>

            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold">
                          {order.shop_products?.product_name || 'Produit inconnu'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Client: {order.buyer_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tél: {order.buyer_phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{order.total_amount?.toLocaleString()} FCFA</p>
                        <p className="text-sm text-muted-foreground">Qté: {order.quantity}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <Badge
                        variant={
                          order.order_status === 'completed'
                            ? 'default'
                            : order.order_status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {order.order_status === 'completed' && 'Complétée'}
                        {order.order_status === 'pending' && 'En attente'}
                        {order.order_status === 'cancelled' && 'Annulée'}
                      </Badge>

                      {order.order_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                          >
                            Marquer complétée
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          >
                            Annuler
                          </Button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(order.created_at).toLocaleString('fr-FR')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {orders.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucune commande pour le moment</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres de la boutique</CardTitle>
                <CardDescription>Personnalisez l'apparence de votre boutique</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Thème de fond</Label>
                  <Select
                    value={shop.background_theme || 'gradient-purple'}
                    onValueChange={updateShopTheme}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un thème" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gradient-purple">Dégradé Violet</SelectItem>
                      <SelectItem value="gradient-blue">Dégradé Bleu</SelectItem>
                      <SelectItem value="gradient-green">Dégradé Vert</SelectItem>
                      <SelectItem value="gradient-orange">Dégradé Orange</SelectItem>
                      <SelectItem value="gradient-pink">Dégradé Rose</SelectItem>
                      <SelectItem value="solid-dark">Sombre</SelectItem>
                      <SelectItem value="solid-light">Clair</SelectItem>
                      <SelectItem value="pattern-dots">Motif Points</SelectItem>
                      <SelectItem value="pattern-grid">Motif Grille</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    Ce thème sera appliqué à votre boutique publique
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Lien de votre boutique</h3>
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={`${window.location.origin}/shop/${shop.shop_url_slug}`}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={copyShopUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Product Dialog */}
        <Dialog open={editProductOpen} onOpenChange={setEditProductOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le produit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom du produit</Label>
                <Input
                  value={productData.product_name}
                  onChange={(e) => setProductData({ ...productData, product_name: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={productData.description}
                  onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label>Image du produit</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast({ title: 'Erreur', description: 'L\'image ne doit pas dépasser 5MB', variant: 'destructive' });
                          return;
                        }
                        const url = await uploadProductImage(file, selectedProduct?.id);
                        if (url) {
                          setImagePreview(url);
                        }
                      }
                    }}
                    className="hidden"
                    id="edit-product-image-input"
                  />
                  <label htmlFor="edit-product-image-input" className="cursor-pointer">
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img src={imagePreview} alt="Aperçu" className="w-32 h-32 mx-auto object-cover rounded" />
                        <p className="text-sm text-muted-foreground">Cliquez pour changer</p>
                      </div>
                    ) : (
                      <div className="py-4">
                        <p className="text-sm text-muted-foreground">Cliquez pour ajouter une image</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF jusqu'à 5MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prix (FCFA)</Label>
                  <Input
                    type="number"
                    value={productData.price}
                    onChange={(e) => setProductData({ ...productData, price: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={productData.stock}
                    onChange={(e) => setProductData({ ...productData, stock: e.target.value })}
                    disabled={productData.product_type === 'digital'}
                  />
                </div>
              </div>

              <div>
                <Label>Type de produit</Label>
                <Select
                  value={productData.product_type}
                  onValueChange={(value) => {
                    setProductData({ ...productData, product_type: value });
                    if (value === 'digital') {
                      setProductData(prev => ({ ...prev, stock: '1' }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Produit physique</SelectItem>
                    <SelectItem value="digital">Produit numérique</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {productData.product_type === 'digital' && (
                <div>
                  <Label>Fichier téléchargeable</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition">
                    <input
                      type="file"
                      disabled={uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 100 * 1024 * 1024) {
                            toast({ title: 'Erreur', description: 'Le fichier ne doit pas dépasser 100MB', variant: 'destructive' });
                            return;
                          }
                          const fileName = await uploadProductFile(file, selectedProduct?.id);
                          if (fileName) {
                            setFilePreview(file.name);
                          }
                        }
                      }}
                      className="hidden"
                      id="edit-product-file-input"
                    />
                    <label htmlFor="edit-product-file-input" className="cursor-pointer">
                      {filePreview ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">✓ {filePreview}</p>
                          <p className="text-xs text-muted-foreground">Cliquez pour changer</p>
                        </div>
                      ) : (
                        <div className="py-4">
                          <p className="text-sm text-muted-foreground">Cliquez pour ajouter un fichier</p>
                          <p className="text-xs text-muted-foreground mt-1">PDF, ZIP, etc. jusqu'à 100MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              <div>
                <Label>Lien de paiement (optionnel)</Label>
                <Input
                  value={productData.payment_link}
                  onChange={(e) => setProductData({ ...productData, payment_link: e.target.value })}
                />
              </div>

              <Button onClick={updateProduct} className="w-full" disabled={uploading}>
                {uploading ? 'Téléchargement...' : 'Mettre à jour'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
