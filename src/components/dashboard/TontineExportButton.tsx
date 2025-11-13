import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TontineExportButtonProps {
  userId: string;
}

export default function TontineExportButton({ userId }: TontineExportButtonProps) {
  const exportToPDF = async () => {
    try {
      // Fetch user's tontine data
      const { data: participations } = await supabase
        .from('tontine_participants')
        .select('tontine_id')
        .eq('user_id', userId);

      if (!participations || participations.length === 0) {
        toast({ title: 'Aucune donnée', description: 'Vous ne participez à aucune tontine', variant: 'destructive' });
        return;
      }

      const tontineIds = participations.map(p => p.tontine_id);

      const { data: tontines } = await supabase
        .from('tontines')
        .select('*')
        .in('id', tontineIds);

      const { data: payments } = await supabase
        .from('tontine_payments')
        .select('*')
        .eq('user_id', userId);

      // Generate HTML for PDF
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Rapport Tontines</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #8b5cf6; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #8b5cf6; color: white; }
          </style>
        </head>
        <body>
          <h1>Rapport Tontines - ${new Date().toLocaleDateString('fr-FR')}</h1>
          <h2>Mes Tontines</h2>
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Montant</th>
                <th>Fréquence</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${tontines?.map(t => `
                <tr>
                  <td>${t.name}</td>
                  <td>${t.amount} FCFA</td>
                  <td>${t.frequency}</td>
                  <td>${t.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <h2>Mes Paiements</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${payments?.map(p => `
                <tr>
                  <td>${new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>${p.amount} FCFA</td>
                  <td>${p.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      // Create a Blob and download
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_tontines_${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Succès', description: 'Rapport HTML téléchargé (ouvrir dans un navigateur et imprimer en PDF)' });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Button variant="outline" onClick={exportToPDF} className="gap-2">
      <Download className="h-4 w-4" />
      Exporter Rapport
    </Button>
  );
}
