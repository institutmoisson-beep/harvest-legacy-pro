import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, Package, QrCode, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [partner, setPartner] = useState<any>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState("");
  const [verifiedOrder, setVerifiedOrder] = useState<any>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPartnerData();
    }
  }, [user]);

  const fetchPartnerData = async () => {
    try {
      // Get partner profile
      const { data: partnerData, error: partnerError } = await supabase
        .from("withdrawal_partners")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (partnerError) {
        if (partnerError.code === 'PGRST116') {
          toast.error("Vous n'êtes pas enregistré comme partenaire");
          navigate("/dashboard");
          return;
        }
        throw partnerError;
      }

      setPartner(partnerData);

      // Get pending orders
      const { data: pendingData, error: pendingError } = await supabase
        .from("savings_purchases")
        .select("*, profiles(full_name, phone)")
        .eq("partner_id", partnerData.id)
        .eq("status", "completed")
        .order("updated_at", { ascending: false });

      if (pendingError) throw pendingError;
      setPendingOrders(pendingData || []);

      // Get completed orders
      const { data: completedData, error: completedError } = await supabase
        .from("savings_purchases")
        .select("*, profiles(full_name, phone)")
        .eq("partner_id", partnerData.id)
        .eq("status", "withdrawn")
        .order("withdrawn_at", { ascending: false });

      if (completedError) throw completedError;
      setCompletedOrders(completedData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!searchCode.trim()) {
      toast.error("Entrez un code de retrait");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("savings_purchases")
        .select("*, profiles(full_name, phone)")
        .eq("withdrawal_code", searchCode.toUpperCase())
        .eq("status", "completed")
        .single();

      if (error || !data) {
        toast.error("Code invalide ou produit déjà retiré");
        return;
      }

      setVerifiedOrder(data);
      setShowVerifyDialog(true);
    } catch (error: any) {
      toast.error("Code invalide");
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (!verifiedOrder) return;

    try {
      const { error } = await supabase
        .from("savings_purchases")
        .update({
          status: "withdrawn",
          withdrawn_at: new Date().toISOString()
        })
        .eq("id", verifiedOrder.id);

      if (error) throw error;

      // Calculate and credit commission to partner
      const commission = (verifiedOrder.total_price * partner.commission_rate) / 100;
      
      // Update partner wallet balance
      await supabase.rpc('increment_wallet_balance', {
        p_user_id: partner.user_id,
        p_amount: commission
      });
      
      // Create notification for commission
      await supabase.from("notifications").insert({
        user_id: partner.user_id,
        title: "Commission reçue",
        message: `Vous avez reçu ${commission.toLocaleString()} FCFA pour le retrait de ${verifiedOrder.product_name}`,
        type: "general"
      });

      toast.success("Retrait confirmé avec succès");
      setShowVerifyDialog(false);
      setVerifiedOrder(null);
      setSearchCode("");
      fetchPartnerData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="grid gap-6 mb-6 md:grid-cols-3">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOrders.length}</div>
              <p className="text-xs text-muted-foreground">Produits à retirer</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retirés</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedOrders.length}</div>
              <p className="text-xs text-muted-foreground">Ce mois-ci</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission</CardTitle>
              <span className="text-primary font-bold">{partner?.commission_rate}%</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(pendingOrders.reduce((sum, o) => sum + (o.total_price * partner?.commission_rate / 100), 0)).toLocaleString()} FCFA
              </div>
              <p className="text-xs text-muted-foreground">Potentiel</p>
            </CardContent>
          </Card>
        </div>

        {/* Vérification de code */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <QrCode className="mr-2 h-5 w-5" />
              Vérifier un code de retrait
            </CardTitle>
            <CardDescription>
              Scannez le QR code ou entrez manuellement le code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                placeholder="Ex: WD123456"
                className="font-mono"
              />
              <Button onClick={handleVerifyCode}>
                <Search className="mr-2 h-4 w-4" />
                Vérifier
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des commandes en attente */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Produits à retirer</CardTitle>
            <CardDescription>Commandes complètes en attente de retrait</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune commande en attente
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-bold">{order.withdrawal_code}</TableCell>
                        <TableCell>{order.product_name}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.profiles?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{order.profiles?.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{order.total_price?.toLocaleString()} FCFA</TableCell>
                        <TableCell>{format(new Date(order.updated_at), "d MMM yyyy", { locale: fr })}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Prêt</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liste des commandes complétées */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Historique des retraits</CardTitle>
            <CardDescription>Produits déjà remis aux clients</CardDescription>
          </CardHeader>
          <CardContent>
            {completedOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun retrait effectué
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Date de retrait</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.product_name}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.profiles?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{order.profiles?.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{order.total_price?.toLocaleString()} FCFA</TableCell>
                        <TableCell className="text-primary font-medium">
                          {Math.round((order.total_price * partner?.commission_rate) / 100).toLocaleString()} FCFA
                        </TableCell>
                        <TableCell>{format(new Date(order.withdrawn_at), "d MMM yyyy à HH:mm", { locale: fr })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de vérification */}
        <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer le retrait</DialogTitle>
            </DialogHeader>
            {verifiedOrder && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="font-mono font-bold">{verifiedOrder.withdrawal_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Produit:</span>
                    <span className="font-semibold">{verifiedOrder.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span>{verifiedOrder.profiles?.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Téléphone:</span>
                    <span>{verifiedOrder.profiles?.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant:</span>
                    <span className="font-bold">{verifiedOrder.total_price?.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Votre commission:</span>
                    <span className="font-bold text-primary">
                      {Math.round((verifiedOrder.total_price * partner?.commission_rate) / 100).toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
                <Button onClick={handleConfirmWithdrawal} className="w-full">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmer la remise du produit
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
