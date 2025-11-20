import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminCredits() {
  const [credits, setCredits] = useState<any[]>([]);
  const [selectedCredit, setSelectedCredit] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const { data, error } = await supabase
        .from("credits")
        .select(`
          *,
          profiles:user_id (full_name, phone, referral_code)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCredits(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRepaymentSchedule = async (credit: any) => {
    const startDate = new Date();
    const { payment_frequency, duration_months, installment_amount } = credit;
    
    let totalInstallments = 0;
    switch (payment_frequency) {
      case 'daily':
        totalInstallments = duration_months * 30;
        break;
      case 'every_2_days':
        totalInstallments = duration_months * 15;
        break;
      case 'weekly':
        totalInstallments = duration_months * 4;
        break;
      case 'monthly':
        totalInstallments = duration_months;
        break;
    }

    const repayments = [];
    for (let i = 0; i < totalInstallments; i++) {
      let dueDate;
      switch (payment_frequency) {
        case 'daily':
          dueDate = addDays(startDate, i);
          break;
        case 'every_2_days':
          dueDate = addDays(startDate, i * 2);
          break;
        case 'weekly':
          dueDate = addWeeks(startDate, i);
          break;
        case 'monthly':
          dueDate = addMonths(startDate, i);
          break;
      }

      repayments.push({
        credit_id: credit.id,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        amount_due: installment_amount,
        status: 'pending'
      });
    }

    const { error } = await supabase.from("credit_repayments").insert(repayments);
    if (error) throw error;
  };

  const handleApprove = async (credit: any) => {
    try {
      const endDate = addMonths(new Date(), credit.duration_months);
      
      const { error: updateError } = await supabase
        .from("credits")
        .update({
          status: 'active',
          approved_at: new Date().toISOString(),
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          admin_notes: adminNotes
        })
        .eq("id", credit.id);

      if (updateError) throw updateError;

      await generateRepaymentSchedule(credit);

      // Update user credit profile
      const { data: profile } = await supabase
        .from("user_credit_profiles")
        .select("*")
        .eq("user_id", credit.user_id)
        .single();

      if (profile) {
        await supabase
          .from("user_credit_profiles")
          .update({
            total_credits: profile.total_credits + 1,
            active_credits: profile.active_credits + 1
          })
          .eq("user_id", credit.user_id);
      } else {
        await supabase.from("user_credit_profiles").insert({
          user_id: credit.user_id,
          total_credits: 1,
          active_credits: 1
        });
      }

      toast.success("Crédit approuvé avec succès");
      setSelectedCredit(null);
      fetchCredits();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReject = async (credit: any) => {
    try {
      const { error } = await supabase
        .from("credits")
        .update({
          status: 'rejected',
          admin_notes: adminNotes
        })
        .eq("id", credit.id);

      if (error) throw error;

      toast.success("Crédit rejeté");
      setSelectedCredit(null);
      fetchCredits();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", label: "En attente" },
      approved: { variant: "default", label: "Approuvé" },
      rejected: { variant: "destructive", label: "Rejeté" },
      active: { variant: "default", label: "Actif" },
      completed: { variant: "outline", label: "Terminé" },
      defaulted: { variant: "destructive", label: "Défaut" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Gestion des crédits</CardTitle>
            <CardDescription>
              {credits.length} demande{credits.length > 1 ? 's' : ''} de crédit
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
                    <TableHead>Type</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credits.map((credit) => (
                    <TableRow key={credit.id}>
                      <TableCell>
                        {format(new Date(credit.created_at), "d MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{credit.profiles?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{credit.profiles?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{credit.product_name}</TableCell>
                      <TableCell>
                        {credit.product_type === 'object' ? 'Objet' : credit.product_type === 'land' ? 'Terrain' : 'Service'}
                      </TableCell>
                      <TableCell>{credit.total_price?.toLocaleString()} FCFA</TableCell>
                      <TableCell>{credit.duration_months} mois</TableCell>
                      <TableCell>{getStatusBadge(credit.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCredit(credit);
                            setAdminNotes(credit.admin_notes || "");
                          }}
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

        <Dialog open={!!selectedCredit} onOpenChange={() => setSelectedCredit(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails de la demande</DialogTitle>
              <DialogDescription>
                Examinez la demande et prenez une décision
              </DialogDescription>
            </DialogHeader>

            {selectedCredit && (
              <div className="space-y-4">
                {selectedCredit.product_image && (
                  <img
                    src={selectedCredit.product_image}
                    alt={selectedCredit.product_name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Produit</Label>
                    <p className="font-semibold">{selectedCredit.product_name}</p>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <p className="font-semibold">
                      {selectedCredit.product_type === 'object' ? 'Objet' : selectedCredit.product_type === 'land' ? 'Terrain' : 'Service'}
                    </p>
                  </div>
                  <div>
                    <Label>Prix total</Label>
                    <p className="font-semibold">{selectedCredit.total_price?.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <Label>Acompte</Label>
                    <p className="font-semibold">{selectedCredit.down_payment?.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <Label>Reste à payer</Label>
                    <p className="font-semibold text-primary">{selectedCredit.remaining_amount?.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <Label>Fréquence</Label>
                    <p className="font-semibold">
                      {selectedCredit.payment_frequency === 'daily' ? 'Quotidien' :
                       selectedCredit.payment_frequency === 'every_2_days' ? 'Tous les 2 jours' :
                       selectedCredit.payment_frequency === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}
                    </p>
                  </div>
                  <div>
                    <Label>Durée</Label>
                    <p className="font-semibold">{selectedCredit.duration_months} mois</p>
                  </div>
                  <div>
                    <Label>Mensualité</Label>
                    <p className="font-semibold">{selectedCredit.installment_amount?.toLocaleString()} FCFA</p>
                  </div>
                </div>

                {selectedCredit.delivery_address && (
                  <div>
                    <Label>Adresse de livraison</Label>
                    <p className="text-sm">{selectedCredit.delivery_address}</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="admin_notes">Notes administratives</Label>
                  <Textarea
                    id="admin_notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Ajoutez des notes sur cette demande..."
                    rows={4}
                  />
                </div>

                {selectedCredit.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleApprove(selectedCredit)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approuver
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleReject(selectedCredit)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rejeter
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}