import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Download, Upload, PiggyBank, CreditCard } from "lucide-react";
import jsPDF from "jspdf";

export default function CreditRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [purchaseType, setPurchaseType] = useState<"credit" | "savings">("credit");
  const [formData, setFormData] = useState({
    product_name: "",
    product_image: "",
    product_type: "object",
    total_price: "",
    down_payment: "",
    payment_frequency: "weekly",
    duration_months: "",
    delivery_address: "",
    contract_pdf_url: ""
  });

  const [savingsData, setSavingsData] = useState({
    product_name: "",
    product_image: "",
    total_price: "",
    partner_id: ""
  });

  const generateContract = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRAT DE VENTE À CRÉDIT", pageWidth / 2, 20, { align: "center" });
    
    // Parties
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Entre :", 20, 35);
    doc.setFont("helvetica", "normal");
    doc.text("- Moisson (le Vendeur/Plateforme)", 20, 42);
    doc.text(`- Nom du Moissonneur : ${user?.email || '...'}`, 20, 49);
    doc.text("- Code Moissonneur : .....................", 20, 56);
    
    // Object
    doc.setFont("helvetica", "bold");
    doc.text("Objet :", 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text("Vente à crédit d'un bien ou service référencé sur la plateforme Moisson.", 20, 77);
    
    // Product details
    doc.setFont("helvetica", "bold");
    doc.text("Détails du produit :", 20, 91);
    doc.setFont("helvetica", "normal");
    const downPayment = parseFloat(formData.down_payment) || 0;
    const totalPrice = parseFloat(formData.total_price) || 0;
    const remaining = totalPrice - downPayment;
    
    doc.text(`- Désignation : ${formData.product_name || '...'}`, 20, 98);
    doc.text(`- Prix total : ${totalPrice.toLocaleString()} FCFA`, 20, 105);
    doc.text(`- Acompte versé : ${downPayment.toLocaleString()} FCFA`, 20, 112);
    doc.text(`- Reste à payer : ${remaining.toLocaleString()} FCFA`, 20, 119);
    
    const frequencyMap: Record<string, string> = {
      daily: "tous les jours",
      every_2_days: "tous les 2 jours",
      weekly: "tous les 7 jours",
      monthly: "mensuel"
    };
    doc.text(`- Modalité de paiement : ${frequencyMap[formData.payment_frequency]}`, 20, 126);
    
    // Duration
    doc.setFont("helvetica", "bold");
    doc.text(`Durée de remboursement : ${formData.duration_months || '...'} mois`, 20, 140);
    
    // Penalties
    doc.text("Pénalités de retard :", 20, 154);
    doc.setFont("helvetica", "normal");
    doc.text("500 FCFA par jour de retard après 3 jours de dépassement.", 20, 161);
    
    // Engagement
    doc.setFont("helvetica", "bold");
    doc.text("Engagement :", 20, 175);
    doc.setFont("helvetica", "normal");
    const engagement = "Le Moissonneur s'engage à honorer les paiements selon l'échéancier convenu.\nMoisson se réserve le droit de suspendre le compte en cas de non-respect.";
    const lines = doc.splitTextToSize(engagement, pageWidth - 40);
    doc.text(lines, 20, 182);
    
    // Signatures
    doc.setFont("helvetica", "bold");
    doc.text("Signatures :", 20, 210);
    doc.setFont("helvetica", "normal");
    doc.text("Le Moissonneur : _______________", 20, 230);
    doc.text("Moisson : _______________", 120, 230);
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 20, 250);
    
    // Download
    doc.save(`contrat-credit-${Date.now()}.pdf`);
    toast.success("Contrat téléchargé avec succès");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setLoading(true);
    try {
      const downPayment = parseFloat(formData.down_payment) || 0;
      const totalPrice = parseFloat(formData.total_price);
      const remaining = totalPrice - downPayment;
      const durationMonths = parseInt(formData.duration_months);
      
      // Calculate installment amount based on frequency
      let totalInstallments = 0;
      switch (formData.payment_frequency) {
        case 'daily':
          totalInstallments = durationMonths * 30;
          break;
        case 'every_2_days':
          totalInstallments = durationMonths * 15;
          break;
        case 'weekly':
          totalInstallments = durationMonths * 4;
          break;
        case 'monthly':
          totalInstallments = durationMonths;
          break;
      }
      
      const installmentAmount = remaining / totalInstallments;

      const { error } = await supabase.from("credits").insert({
        user_id: user.id,
        product_name: formData.product_name,
        product_image: formData.product_image,
        product_type: formData.product_type,
        total_price: totalPrice,
        down_payment: downPayment,
        remaining_amount: remaining,
        payment_frequency: formData.payment_frequency,
        duration_months: durationMonths,
        installment_amount: installmentAmount,
        delivery_address: formData.delivery_address,
        contract_pdf_url: formData.contract_pdf_url,
        status: 'pending'
      });

      if (error) throw error;

      toast.success("Demande de crédit envoyée avec succès");
      navigate("/my-credits");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("savings_purchases").insert({
        user_id: user.id,
        product_name: savingsData.product_name,
        product_image: savingsData.product_image,
        total_price: parseFloat(savingsData.total_price),
        partner_id: savingsData.partner_id || null,
        amount_saved: 0,
        status: 'in_progress'
      });

      if (error) throw error;

      toast.success("Épargne créée avec succès");
      navigate("/my-savings");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-2xl">Achat à crédit ou épargne</CardTitle>
            <CardDescription>
              Choisissez votre mode d'achat : crédit avec échéancier ou épargne progressive
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={purchaseType} onValueChange={(v) => setPurchaseType(v as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="credit" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Crédit
                </TabsTrigger>
                <TabsTrigger value="savings" className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Épargne
                </TabsTrigger>
              </TabsList>

              <TabsContent value="credit">
                <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product_name">Nom du produit *</Label>
                  <Input
                    id="product_name"
                    required
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    placeholder="Ex: iPhone 15 Pro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product_type">Type de produit *</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value) => setFormData({ ...formData, product_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="object">Objet</SelectItem>
                      <SelectItem value="land">Terrain</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_price">Prix total (FCFA) *</Label>
                  <Input
                    id="total_price"
                    type="number"
                    required
                    min="0"
                    value={formData.total_price}
                    onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
                    placeholder="500000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="down_payment">Acompte (FCFA)</Label>
                  <Input
                    id="down_payment"
                    type="number"
                    min="0"
                    value={formData.down_payment}
                    onChange={(e) => setFormData({ ...formData, down_payment: e.target.value })}
                    placeholder="50000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_frequency">Fréquence de paiement *</Label>
                  <Select
                    value={formData.payment_frequency}
                    onValueChange={(value) => setFormData({ ...formData, payment_frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">1x/jour</SelectItem>
                      <SelectItem value="every_2_days">1x/2 jours</SelectItem>
                      <SelectItem value="weekly">1x/semaine</SelectItem>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_months">Durée (mois) *</Label>
                  <Input
                    id="duration_months"
                    type="number"
                    required
                    min="1"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                    placeholder="12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_image">URL de l'image du produit</Label>
                <Input
                  id="product_image"
                  type="url"
                  value={formData.product_image}
                  onChange={(e) => setFormData({ ...formData, product_image: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_address">Adresse de livraison</Label>
                <Textarea
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                  placeholder="Votre adresse complète..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Contrat</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={generateContract} className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger le contrat
                  </Button>
                  <Button type="button" variant="outline" className="flex-1">
                    <Upload className="mr-2 h-4 w-4" />
                    Joindre le contrat signé
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Téléchargez, remplissez et signez le contrat, puis joignez-le à votre demande
                </p>
              </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Envoi en cours..." : "Soumettre la demande de crédit"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="savings">
                <form onSubmit={handleSavingsSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="savings_product_name">Nom du produit *</Label>
                    <Input
                      id="savings_product_name"
                      required
                      value={savingsData.product_name}
                      onChange={(e) => setSavingsData({ ...savingsData, product_name: e.target.value })}
                      placeholder="Ex: iPhone 15 Pro"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="savings_total_price">Prix total (FCFA) *</Label>
                    <Input
                      id="savings_total_price"
                      type="number"
                      required
                      min="0"
                      value={savingsData.total_price}
                      onChange={(e) => setSavingsData({ ...savingsData, total_price: e.target.value })}
                      placeholder="500000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="savings_product_image">URL de l'image du produit</Label>
                    <Input
                      id="savings_product_image"
                      type="url"
                      value={savingsData.product_image}
                      onChange={(e) => setSavingsData({ ...savingsData, product_image: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="partner_id">Partenaire de retrait (optionnel)</Label>
                    <Select
                      value={savingsData.partner_id}
                      onValueChange={(value) => setSavingsData({ ...savingsData, partner_id: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un partenaire" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun pour le moment</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Vous pourrez sélectionner un partenaire plus tard
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <h4 className="font-semibold mb-2">Comment ça marche ?</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Versez des montants à votre rythme</li>
                      <li>• Suivez votre progression en temps réel</li>
                      <li>• À 100%, recevez un code QR pour retirer le produit</li>
                      <li>• Retirez chez le partenaire de votre choix</li>
                    </ul>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Création en cours..." : "Créer mon épargne"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}