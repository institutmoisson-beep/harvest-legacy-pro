import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, ScanLine, CheckCircle2, Package, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { formatFCFA } from '@/lib/currency';

export default function PartnerRelaisDashboard() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const [partner, setPartner] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [scanCode, setScanCode] = useState('');
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    (async () => {
      const sb: any = supabase;
      const { data: pts } = await sb.from('relay_partners').select('*').eq('owner_id', user.id);
      const p = pts?.[0];
      if (!p) return;
      setPartner(p);
      const [{ data: prods }, { data: sts }, { data: ords }] = await Promise.all([
        sb.from('relay_products').select('*').eq('partner_id', p.id),
        sb.from('relay_stocks').select('*').eq('partner_id', p.id),
        sb.from('relay_orders').select('*').eq('partner_id', p.id).order('created_at', { ascending: false }).limit(50),
      ]);
      setProducts(prods || []);
      const sMap: Record<string, number> = {};
      (sts || []).forEach((s: any) => (sMap[s.product_id] = s.quantity));
      setStocks(sMap);
      setOrders(ords || []);
    })();
  }, [user, authLoading, navigate]);

  const startScan = async () => {
    setScanning(true);
    setTimeout(async () => {
      try {
        const el = document.getElementById('qr-reader');
        if (!el) return;
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          async (decoded) => {
            await scanner.stop().catch(() => {});
            setScanning(false);
            handleValidate(decoded);
          },
          () => {}
        );
      } catch (e: any) {
        toast.error('Caméra inaccessible : ' + e.message);
        setScanning(false);
      }
    }, 100);
  };

  const stopScan = async () => {
    if (scannerRef.current) await scannerRef.current.stop().catch(() => {});
    setScanning(false);
  };

  const handleValidate = async (code: string) => {
    if (!code) return;
    setBusy(true);
    try {
      const sb: any = supabase;
      const { data, error } = await sb.rpc('relay_scan_serve', { p_code: code.trim() });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      toast.success(`✅ ${row.product_name} (x${row.quantity}) servi !`);
      setScanCode('');
      const { data: ords } = await sb.from('relay_orders').select('*').eq('partner_id', partner.id)
        .order('created_at', { ascending: false }).limit(50);
      setOrders(ords || []);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  if (!partner) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-muted-foreground">Vous n'avez pas encore de boutique Point Relais.</p>
        <Button onClick={() => navigate('/dashboard')}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{partner.name}</h1>
          <p className="text-sm text-muted-foreground">{partner.partner_type} · Commission {partner.commission_rate}%</p>
        </div>

        <Tabs defaultValue="scanner">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="scanner"><ScanLine className="h-4 w-4 mr-1" /> Scanner</TabsTrigger>
            <TabsTrigger value="orders"><ListChecks className="h-4 w-4 mr-1" /> Commandes</TabsTrigger>
            <TabsTrigger value="stocks"><Package className="h-4 w-4 mr-1" /> Stocks</TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                {!scanning ? (
                  <Button onClick={startScan} className="w-full h-14">
                    <ScanLine className="h-5 w-5 mr-2" /> Ouvrir la caméra
                  </Button>
                ) : (
                  <>
                    <div id="qr-reader" className="w-full max-w-sm mx-auto" />
                    <Button variant="outline" onClick={stopScan} className="w-full">Annuler</Button>
                  </>
                )}
                <div className="flex gap-2 items-center pt-2 border-t border-border">
                  <Input placeholder="Ou saisir le code (RLP-XXXXXX)" value={scanCode}
                    onChange={(e) => setScanCode(e.target.value.toUpperCase())} />
                  <Button onClick={() => handleValidate(scanCode)} disabled={busy || !scanCode}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Valider
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Commandes récentes</CardTitle></CardHeader>
              <CardContent className="p-3 space-y-2">
                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucune commande</p>
                ) : orders.map((o) => (
                  <div key={o.id} className="flex justify-between items-center text-sm p-2 rounded border border-border">
                    <div>
                      <p className="font-mono text-xs">{o.pickup_code}</p>
                      <p className="text-xs text-muted-foreground">x{o.quantity} · {formatFCFA(Number(o.total_price))}</p>
                    </div>
                    <Badge variant={o.status === 'served' ? 'secondary' : o.status === 'paid_pending' ? 'default' : 'outline'}>
                      {o.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stocks" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Inventaire</CardTitle></CardHeader>
              <CardContent className="p-3 space-y-2">
                {products.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun produit</p>
                ) : products.map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded border border-border">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFCFA(Number(p.price_fcfa))}</p>
                    </div>
                    {!p.is_service ? (
                      <Badge variant={(stocks[p.id] ?? 0) < partner.low_stock_threshold ? 'destructive' : 'secondary'}>
                        Stock : {stocks[p.id] ?? 0}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Service</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
