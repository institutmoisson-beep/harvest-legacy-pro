import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface BucketStatus {
  name: string;
  exists: boolean;
  public: boolean;
}

export default function StorageSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<BucketStatus[]>([]);
  const [initializing, setInitializing] = useState(false);

  const requiredBuckets = [
    { name: 'order-images', description: 'Images des produits pour les commandes' },
    { name: 'product-images', description: 'Images des produits en vente' },
  ];

  useEffect(() => {
    checkBuckets();
  }, []);

  const checkBuckets = async () => {
    try {
      setLoading(true);
      const { data: bucketsList, error } = await supabase.storage.listBuckets();

      if (error) {
        throw error;
      }

      const statuses = requiredBuckets.map(required => ({
        name: required.name,
        exists: !!bucketsList?.find(b => b.name === required.name),
        public: !!bucketsList?.find(b => b.name === required.name && b.public),
      }));

      setBuckets(statuses);
    } catch (error: any) {
      console.error('Error checking buckets:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de vérifier les buckets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeStorage = async () => {
    try {
      setInitializing(true);

      for (const bucket of requiredBuckets) {
        // Check if bucket exists
        const { data: bucketsList } = await supabase.storage.listBuckets();
        const bucketExists = bucketsList?.find(b => b.name === bucket.name);

        if (!bucketExists) {
          const { error } = await supabase.storage.createBucket(bucket.name, {
            public: true,
            fileSizeLimit: 5242880, // 5MB
          });

          if (error && !error.message?.includes('already exists')) {
            throw error;
          }
        }
      }

      toast({
        title: 'Succès!',
        description: 'Buckets de stockage initialisés avec succès',
      });

      // Recheck buckets
      await checkBuckets();
    } catch (error: any) {
      console.error('Initialization error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'initialiser les buckets',
        variant: 'destructive',
      });
    } finally {
      setInitializing(false);
    }
  };

  const allReady = buckets.every(b => b.exists && b.public);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Button 
          variant="outline" 
          onClick={() => navigate('/orders-dashboard')}
          className="mb-6"
        >
          ← Retour au Tableau de Bord
        </Button>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Configuration du Stockage
            </CardTitle>
            <CardDescription>
              Vérifiez et initialisez les buckets de stockage Supabase
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Bucket Status */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">État des Buckets:</h3>
                  <div className="space-y-2">
                    {requiredBuckets.map((bucket, idx) => {
                      const status = buckets[idx];
                      return (
                        <div
                          key={bucket.name}
                          className="flex items-center justify-between p-3 border rounded-lg bg-secondary/50"
                        >
                          <div>
                            <p className="font-medium">{bucket.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {bucket.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {status?.exists ? (
                              <>
                                <Badge variant="default">Créé</Badge>
                                {status.public && (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                              </>
                            ) : (
                              <Badge variant="destructive">Manquant</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status Info */}
                {allReady ? (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-700 dark:text-green-400 font-medium">
                      ✓ Tous les buckets sont prêts! Vous pouvez télécharger des images.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                        ⚠ Certains buckets ne sont pas configurés. Cliquez sur "Initialiser" pour les créer automatiquement.
                      </p>
                    </div>

                    <Button
                      onClick={initializeStorage}
                      disabled={initializing}
                      size="lg"
                      className="w-full"
                    >
                      {initializing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Initialisation en cours...
                        </>
                      ) : (
                        'Initialiser les Buckets'
                      )}
                    </Button>
                  </div>
                )}

                {/* Manual Instructions */}
                {!allReady && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-semibold text-sm">Alternative - Configuration Manuelle:</h4>
                    <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                      <li>Allez sur <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Supabase Dashboard</a></li>
                      <li>Sélectionnez votre projet</li>
                      <li>Cliquez sur "Storage" dans la barre latérale</li>
                      <li>Cliquez sur "Create a new bucket"</li>
                      <li>Créez les deux buckets:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li><code className="bg-secondary px-2 py-1 rounded text-xs">order-images</code> (Public)</li>
                          <li><code className="bg-secondary px-2 py-1 rounded text-xs">product-images</code> (Public)</li>
                        </ul>
                      </li>
                    </ol>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
