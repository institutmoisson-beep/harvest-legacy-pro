import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, PiggyBank, Plus, QrCode, TrendingUp, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import QRCode from "qrcode";

export default function MySavings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savings, setSavings] = useState<any[]>([]);
  const [selectedSaving, setSelectedSaving] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState("fcfa");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  
  const MSN_TO_FCFA_RATE = 200; // 1 MSN = 200 FCFA

  useEffect(() => {
    if (user) {
      fetchSavings();
    } else if (user === null) {
      // User is explicitly not logged in
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedSaving?.withdrawal_code) {
      generateQRCode(selectedSaving.withdrawal_code);
    }
  }, [selectedSaving]);

  const fetchSavings = async () => {
    try {
      const { data, error } = await supabase
        .from("savings_purchases")
        .select(`
          *,
          withdrawal_partners(company_name, address, phone)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavings(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (savingsId: string) => {
    try {
      const { data, error } = await supabase
        .from("savings_payments")
        .select("*")
        .eq("savings_id", savingsId)
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

  const handleMakePayment = async () => {
    if (!selectedSaving || !paymentAmount) {
      toast.error("Veuillez entrer un montant");
      return;
    }

    try {
      let amount = parseFloat(paymentAmount);
      if (amount <= 0) {
        toast.error("Le montant doit être positif");
        return;
      }

      // Convert MSN to FCFA if needed
      if (paymentCurrency === "msn") {
        amount = amount * MSN_TO_FCFA_RATE;
      }

      const { error } = await supabase.from("savings_payments").insert({
        savings_id: selectedSaving.id,
        user_id: user!.id,
        amount,
        payment_method: paymentCurrency === "msn" ? "MSN" : "FCFA"
      });

      if (error) throw error;

      toast.success(`Paiement de ${paymentAmount} ${paymentCurrency.toUpperCase()} effectué avec succès`);
      setPaymentAmount("");
      setPaymentCurrency("fcfa");
      setShowPaymentDialog(false);
      fetchSavings();
      fetchPayments(selectedSaving.id);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const generateQRCode = async (code: string) => {
    try {
      const url = await QRCode.toDataURL(code, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF"
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
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

  const calculateProgress = (saving: any) => {
    return (saving.amount_saved / saving.total_price) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="glass-card max-w-md">
          <CardContent className="text-center py-12">
            <PiggyBank className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Vous devez être connecté pour accéder à vos achats progressifs
            </p>
            <Button onClick={() => navigate("/auth")}>
              Se connecter
            </Button>
          </CardContent>
        </Card>
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
            Nouvel achat
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Liste des achats */}
          <div className="md:col-span-1">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Mes achats progressifs</CardTitle>
                <CardDescription>
                  {savings.length} achat{savings.length > 1 ? 's' : ''} en cours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {savings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucun achat pour le moment
                  </p>
                ) : (
                  savings.map((saving) => (
                    <Card
                      key={saving.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedSaving?.id === saving.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleSelectSaving(saving)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{saving.product_name}</h4>
                          {getStatusBadge(saving.status)}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Progression</span>
                            <span className="font-semibold">{Math.round(calculateProgress(saving))}%</span>
                          </div>
                          <Progress value={calculateProgress(saving)} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{saving.amount_saved?.toLocaleString()} FCFA</span>
                            <span>{saving.total_price?.toLocaleString()} FCFA</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Détails de l'achat sélectionné */}
          <div className="md:col-span-2">
            {!selectedSaving ? (
              <Card className="glass-card h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <PiggyBank className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Sélectionnez un achat pour voir les détails
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Info achat */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>{selectedSaving.product_name}</CardTitle>
                    <CardDescription>
                      Achat progressif - Petit à petit
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedSaving.product_image && (
                      <img
                        src={selectedSaving.product_image}
                        alt={selectedSaving.product_name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Prix total</p>
                        <p className="font-semibold">{selectedSaving.total_price?.toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Montant payé</p>
                        <p className="font-semibold">{selectedSaving.amount_saved?.toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reste à payer</p>
                        <p className="font-semibold text-primary text-lg">{(selectedSaving.total_price - selectedSaving.amount_saved)?.toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Partenaire</p>
                        <p className="font-semibold">{selectedSaving.withdrawal_partners?.company_name || "Non défini"}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="font-semibold">{Math.round(calculateProgress(selectedSaving))}%</span>
                      </div>
                      <Progress value={calculateProgress(selectedSaving)} />
                    </div>

                    {selectedSaving.status === 'in_progress' && (
                      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Continuer le paiement
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Effectuer un paiement</DialogTitle>
                            <DialogDescription>
                              Ajoutez un montant pour réduire le reste à payer
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="currency">Devise</Label>
                              <Select value={paymentCurrency} onValueChange={setPaymentCurrency}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fcfa">FCFA</SelectItem>
                                  <SelectItem value="msn">MSN (1 MSN = 200 FCFA)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="amount">Montant</Label>
                              <Input
                                id="amount"
                                type="number"
                                min="0"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="0"
                              />
                              {paymentCurrency === "msn" && paymentAmount && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <ArrowRight className="h-3 w-3" />
                                  Équivalent: {(parseFloat(paymentAmount) * MSN_TO_FCFA_RATE).toLocaleString()} FCFA
                                </p>
                              )}
                            </div>
                            <Button onClick={handleMakePayment} className="w-full">
                              Confirmer le paiement
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {selectedSaving.status === 'completed' && selectedSaving.withdrawal_code && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="text-center">
                          <Badge variant="default" className="mb-2">Objectif atteint! 🎉</Badge>
                          <p className="text-sm text-muted-foreground mb-4">
                            Présentez ce code au partenaire pour retirer votre produit
                          </p>
                          {qrCodeUrl && (
                            <img src={qrCodeUrl} alt="QR Code" className="mx-auto mb-2" />
                          )}
                          <p className="font-mono text-lg font-bold">{selectedSaving.withdrawal_code}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Historique des paiements */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Historique des versements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {payments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Aucun versement pour le moment
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {payments.map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <p className="font-semibold">{payment.amount?.toLocaleString()} FCFA</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(payment.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                              </p>
                            </div>
                            <Badge variant="outline">{payment.payment_method || "FCFA"}</Badge>
                          </div>
                        ))}
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
