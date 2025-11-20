import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

export default function AdminSavingsManager() {
  const [savings, setSavings] = useState<any[]>([]);
  const [selectedSaving, setSelectedSaving] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavings();
  }, []);

  const fetchSavings = async () => {
    try {
      const { data, error } = await supabase
        .from("savings_purchases")
        .select(`
          *,
          profiles:user_id (full_name, phone, referral_code),
          withdrawal_partners:partner_id (company_name, contact_name, phone)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavings(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (savingId: string) => {
    try {
      const { data, error } = await supabase
        .from("savings_payments")
        .select("*")
        .eq("savings_id", savingId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSelectSaving = (saving: any) => {
    setSelectedSaving(saving);
    fetchPayments(saving.id);
  };

  const calculateProgress = (saving: any) => {
    if (!saving.total_price || saving.total_price === 0) return 0;
    return (saving.amount_saved / saving.total_price) * 100;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      in_progress: { variant: "secondary", label: "En cours" },
      completed: { variant: "default", label: "Complété" },
      withdrawn: { variant: "outline", label: "Retiré" },
      cancelled: { variant: "destructive", label: "Annulé" }
    };
    const config = variants[status] || variants.in_progress;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Gestion des achats "Petit à petit"</CardTitle>
          <CardDescription>
            {savings.length} achat{savings.length > 1 ? 's' : ''} progressif{savings.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Prix total</TableHead>
                  <TableHead>Montant payé</TableHead>
                  <TableHead>Reste</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Partenaire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savings.map((saving) => (
                  <TableRow key={saving.id}>
                    <TableCell>
                      {format(new Date(saving.created_at), "d MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{saving.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{saving.profiles?.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>{saving.product_name}</TableCell>
                    <TableCell>{saving.total_price?.toLocaleString()} FCFA</TableCell>
                    <TableCell className="font-semibold">{saving.amount_saved?.toLocaleString()} FCFA</TableCell>
                    <TableCell className="text-primary font-semibold">
                      {(saving.total_price - saving.amount_saved).toLocaleString()} FCFA
                    </TableCell>
                    <TableCell>
                      <div className="w-20">
                        <Progress value={calculateProgress(saving)} className="h-2" />
                        <p className="text-xs text-center mt-1">{calculateProgress(saving).toFixed(0)}%</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {saving.withdrawal_partners ? (
                        <div>
                          <p className="text-sm">{saving.withdrawal_partners.company_name}</p>
                          <p className="text-xs text-muted-foreground">{saving.withdrawal_partners.contact_name}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(saving.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectSaving(saving)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedSaving} onOpenChange={() => setSelectedSaving(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de l'achat progressif</DialogTitle>
            <DialogDescription>
              Informations détaillées et historique des paiements
            </DialogDescription>
          </DialogHeader>

          {selectedSaving && (
            <div className="space-y-4">
              {selectedSaving.product_image && (
                <img
                  src={selectedSaving.product_image}
                  alt={selectedSaving.product_name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Produit</p>
                  <p className="font-semibold">{selectedSaving.product_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prix total</p>
                  <p className="font-semibold">{selectedSaving.total_price?.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Montant payé</p>
                  <p className="font-semibold">{selectedSaving.amount_saved?.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reste à payer</p>
                  <p className="font-semibold text-primary text-lg">
                    {(selectedSaving.total_price - selectedSaving.amount_saved).toLocaleString()} FCFA
                  </p>
                </div>
                {selectedSaving.withdrawal_code && (
                  <div>
                    <p className="text-sm text-muted-foreground">Code de retrait</p>
                    <p className="font-mono font-bold text-lg">{selectedSaving.withdrawal_code}</p>
                  </div>
                )}
              </div>

              <div>
                <Progress value={calculateProgress(selectedSaving)} className="h-3 mb-2" />
                <p className="text-center font-medium">{calculateProgress(selectedSaving).toFixed(1)}% payé</p>
              </div>

              {payments.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Historique des paiements</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <div>
                          <p className="text-sm font-medium">{payment.amount?.toLocaleString()} FCFA</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                          </p>
                        </div>
                        {payment.payment_method && (
                          <Badge variant="outline">{payment.payment_method}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
