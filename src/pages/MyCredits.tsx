import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Calendar, CreditCard, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function MyCredits() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [credits, setCredits] = useState<any[]>([]);
  const [selectedCredit, setSelectedCredit] = useState<any>(null);
  const [repayments, setRepayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user]);

  const fetchCredits = async () => {
    try {
      const { data, error } = await supabase
        .from("credits")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCredits(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRepayments = async (creditId: string) => {
    try {
      const { data, error } = await supabase
        .from("credit_repayments")
        .select("*")
        .eq("credit_id", creditId)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setRepayments(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSelectCredit = (credit: any) => {
    setSelectedCredit(credit);
    fetchRepayments(credit.id);
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

  const getRepaymentStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", label: "En attente" },
      paid: { variant: "default", label: "Payé" },
      overdue: { variant: "destructive", label: "En retard" },
      partial: { variant: "secondary", label: "Partiel" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateProgress = (credit: any) => {
    const paid = repayments.filter(r => r.status === 'paid').length;
    const total = repayments.length;
    return total > 0 ? (paid / total) * 100 : 0;
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
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button onClick={() => navigate("/credit-request")}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle demande
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Liste des crédits */}
          <div className="md:col-span-1">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Mes crédits</CardTitle>
                <CardDescription>
                  {credits.length} crédit{credits.length > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {credits.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucun crédit pour le moment
                  </p>
                ) : (
                  credits.map((credit) => (
                    <Card
                      key={credit.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedCredit?.id === credit.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleSelectCredit(credit)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{credit.product_name}</h4>
                          {getStatusBadge(credit.status)}
                        </div>
                        <div className="text-xs space-y-1 text-muted-foreground">
                          <p>Prix: {credit.total_price?.toLocaleString()} FCFA</p>
                          <p>Reste: {credit.remaining_amount?.toLocaleString()} FCFA</p>
                          <p className="text-xs">
                            {format(new Date(credit.created_at), "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Détails du crédit sélectionné */}
          <div className="md:col-span-2">
            {!selectedCredit ? (
              <Card className="glass-card h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Sélectionnez un crédit pour voir les détails
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Info crédit */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>{selectedCredit.product_name}</CardTitle>
                    <CardDescription>
                      Crédit {selectedCredit.product_type === 'object' ? "d'objet" : selectedCredit.product_type === 'land' ? 'de terrain' : 'de service'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedCredit.product_image && (
                      <img
                        src={selectedCredit.product_image}
                        alt={selectedCredit.product_name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Prix total</p>
                        <p className="font-semibold">{selectedCredit.total_price?.toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Acompte</p>
                        <p className="font-semibold">{selectedCredit.down_payment?.toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reste à payer</p>
                        <p className="font-semibold text-primary">{selectedCredit.remaining_amount?.toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Mensualité</p>
                        <p className="font-semibold">{selectedCredit.installment_amount?.toLocaleString()} FCFA</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="font-semibold">{Math.round(calculateProgress(selectedCredit))}%</span>
                      </div>
                      <Progress value={calculateProgress(selectedCredit)} />
                    </div>
                  </CardContent>
                </Card>

                {/* Échéancier */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="mr-2 h-5 w-5" />
                      Échéancier de paiement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {repayments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Échéancier en cours de création
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Montant</TableHead>
                              <TableHead>Payé</TableHead>
                              <TableHead>Pénalité</TableHead>
                              <TableHead>Statut</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {repayments.map((repayment) => (
                              <TableRow key={repayment.id}>
                                <TableCell>
                                  {format(new Date(repayment.due_date), "d MMM yyyy", { locale: fr })}
                                </TableCell>
                                <TableCell>{repayment.amount_due?.toLocaleString()} FCFA</TableCell>
                                <TableCell>{repayment.amount_paid?.toLocaleString()} FCFA</TableCell>
                                <TableCell className="text-destructive">
                                  {repayment.penalty_amount > 0 ? `${repayment.penalty_amount?.toLocaleString()} FCFA` : '-'}
                                </TableCell>
                                <TableCell>{getRepaymentStatusBadge(repayment.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}