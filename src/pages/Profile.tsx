import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Lock, FileText, Download, ShieldCheck, Scroll, Lock as LockIcon } from "lucide-react";
import JobDomainSelector from "@/components/dashboard/JobDomainSelector";
import { generateMembershipContract } from "@/lib/documents/membershipContract";
import { generateStatutes } from "@/lib/documents/statutes";
import { generateInternalRules } from "@/lib/documents/internalRules";

export default function Profile() {
  const { user, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    id_number: "",
  });
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [activePack, setActivePack] = useState<{
    pack_name: string;
    purchased_at: string;
    tracking_code: string | null;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadProfile();
    loadActivePack();
  }, [user, navigate]);

  const loadActivePack = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("mlm_pack_purchases")
      .select("created_at, tracking_code, mlm_packs(name)")
      .eq("buyer_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) {
      setActivePack({
        pack_name: data.mlm_packs?.name || "Pack MLM",
        purchased_at: data.created_at,
        tracking_code: data.tracking_code || null,
      });
    }
  };

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, id_number")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          phone: data.phone || "",
          id_number: data.id_number || "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          id_number: profile.id_number,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Profil mis à jour !",
        description: "Vos informations ont été modifiées avec succès.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await updatePassword(passwords.newPassword);
      setPasswords({ newPassword: "", confirmPassword: "" });
    } catch (error) {
      // Error handled in useAuth
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>

        <div className="space-y-6">
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Contrat d'adhésion communautaire</CardTitle>
              <CardDescription>
                Téléchargez votre contrat d'adhésion à la communauté Moissonneur, pré-signé par le Directeur Général.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => generateMembershipContract({
                  full_name: profile.full_name,
                  phone: profile.phone,
                  email: user?.email,
                  id_number: profile.id_number,
                })}
                style={{ background: 'linear-gradient(135deg,#00A859,#7C3AED)' }}
                className="text-white"
              >
                <Download className="w-4 h-4 mr-2" /> Télécharger mon contrat d'adhésion (PDF)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Modifiez vos informations de profil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  placeholder="Votre nom complet"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  placeholder="Votre numéro de téléphone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              <Button onClick={handleUpdateProfile} disabled={loading}>
                {loading ? "Mise à jour..." : "Enregistrer les modifications"}
              </Button>
            </CardContent>
          </Card>

          <JobDomainSelector />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pièce d'identité
              </CardTitle>
              <CardDescription>
                Ajoutez votre numéro de pièce d'identité pour vérification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id_number">Numéro de pièce d'identité</Label>
                <Input
                  id="id_number"
                  value={profile.id_number}
                  onChange={(e) =>
                    setProfile({ ...profile, id_number: e.target.value })
                  }
                  placeholder="Entrez votre numéro de pièce d'identité"
                />
              </div>

              <Button onClick={handleUpdateProfile} disabled={loading}>
                {loading ? "Mise à jour..." : "Enregistrer le numéro"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Modifier le mot de passe
              </CardTitle>
              <CardDescription>
                Changez votre mot de passe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, newPassword: e.target.value })
                  }
                  placeholder="Minimum 6 caractères"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirmer le mot de passe
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) =>
                    setPasswords({
                      ...passwords,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Répétez le mot de passe"
                />
              </div>

              <Button onClick={handleUpdatePassword} disabled={loading}>
                {loading ? "Mise à jour..." : "Changer le mot de passe"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
