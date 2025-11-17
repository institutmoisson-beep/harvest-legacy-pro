import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Download, Loader2, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ExportPeriod = 'day' | 'week' | 'month';

interface Order {
  id: string;
  product_name: string;
  customer_name: string;
  quantity: number;
  purchase_price: number;
  profit: number;
  status: string;
  country: string | null;
  city: string | null;
  created_at: string;
  broker_name?: string;
}

export default function AdminOrdersExport() {
  const [exporting, setExporting] = useState<ExportPeriod | null>(null);

  const getDateRange = (period: ExportPeriod): { start: Date; end: Date; label: string } => {
    const now = new Date();
    let start: Date;
    let label: string;

    switch (period) {
      case 'day':
        start = startOfDay(now);
        label = format(now, 'dd MMMM yyyy', { locale: fr });
        break;
      case 'week':
        start = startOfWeek(now, { locale: fr });
        label = `Semaine du ${format(start, 'dd MMM', { locale: fr })} au ${format(now, 'dd MMM yyyy', { locale: fr })}`;
        break;
      case 'month':
        start = startOfMonth(now);
        label = format(now, 'MMMM yyyy', { locale: fr });
        break;
    }

    return { start, end: endOfDay(now), label };
  };

  const fetchOrders = async (startDate: Date, endDate: Date): Promise<Order[]> => {
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch broker names
    const ordersWithNames = await Promise.all(
      ((ordersData || []) as any[]).map(async (order: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', order.broker_id)
          .single();
        
        return { 
          ...order, 
          broker_name: profile?.full_name,
          country: order.country || 'N/A',
          city: order.city || 'N/A',
        };
      })
    );

    return ordersWithNames as Order[];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'validated': return 'Validée';
      case 'completed': return 'Complétée';
      case 'rejected': return 'Rejetée';
      default: return status;
    }
  };

  const exportToPDF = async (period: ExportPeriod) => {
    setExporting(period);
    try {
      const { start, end, label } = getDateRange(period);
      const orders = await fetchOrders(start, end);

      if (orders.length === 0) {
        toast({
          title: "Aucune commande",
          description: `Aucune commande trouvée pour ${label.toLowerCase()}`,
          variant: "default",
        });
        return;
      }

      // Calculate totals
      const totalOrders = orders.length;
      const totalValue = orders.reduce((sum, o) => sum + (o.purchase_price * o.quantity), 0);
      const totalProfit = orders.reduce((sum, o) => sum + o.profit, 0);
      const validatedCount = orders.filter(o => o.status === 'validated' || o.status === 'completed').length;
      const pendingCount = orders.filter(o => o.status === 'pending').length;
      const rejectedCount = orders.filter(o => o.status === 'rejected').length;

      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246); // primary color
      doc.text('RAPPORT DES COMMANDES', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(label.toUpperCase(), pageWidth / 2, 28, { align: 'center' });

      // Summary section
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const summaryY = 40;
      doc.text('RÉSUMÉ', 14, summaryY);
      
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total commandes: ${totalOrders}`, 14, summaryY + 8);
      doc.text(`Validées: ${validatedCount}`, 14, summaryY + 14);
      doc.text(`En attente: ${pendingCount}`, 14, summaryY + 20);
      doc.text(`Rejetées: ${rejectedCount}`, 14, summaryY + 26);
      
      doc.text(`Valeur totale: ${formatCurrency(totalValue)}`, 110, summaryY + 8);
      doc.text(`Profit total: ${formatCurrency(totalProfit)}`, 110, summaryY + 14);

      // Orders table
      const tableData = orders.map(order => [
        format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
        order.broker_name || 'N/A',
        order.product_name,
        order.customer_name,
        `${order.city}, ${order.country}`,
        order.quantity.toString(),
        formatCurrency(order.purchase_price),
        formatCurrency(order.profit),
        getStatusLabel(order.status)
      ]);

      autoTable(doc, {
        startY: summaryY + 35,
        head: [['Date', 'Broker', 'Produit', 'Client', 'Lieu', 'Qté', 'Prix', 'Profit', 'Statut']],
        body: tableData,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 22 },
          2: { cellWidth: 25 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 10 },
          6: { cellWidth: 20 },
          7: { cellWidth: 20 },
          8: { cellWidth: 20 },
        },
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} sur ${pageCount} - Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const fileName = `commandes_${period}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
      doc.save(fileName);

      toast({
        title: "Export réussi",
        description: `${totalOrders} commande(s) exportée(s) pour ${label.toLowerCase()}`,
      });
    } catch (error: any) {
      console.error('Error exporting orders:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les commandes",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export des Commandes
        </CardTitle>
        <CardDescription>
          Exportez les commandes en PDF par période
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => exportToPDF('day')}
            disabled={exporting !== null}
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
          >
            {exporting === 'day' ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Calendar className="h-6 w-6" />
            )}
            <div className="text-sm font-semibold">Aujourd'hui</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
            </div>
          </Button>

          <Button
            onClick={() => exportToPDF('week')}
            disabled={exporting !== null}
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
          >
            {exporting === 'week' ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <CalendarDays className="h-6 w-6" />
            )}
            <div className="text-sm font-semibold">Cette Semaine</div>
            <div className="text-xs text-muted-foreground">
              Depuis le {format(startOfWeek(new Date(), { locale: fr }), 'dd MMM', { locale: fr })}
            </div>
          </Button>

          <Button
            onClick={() => exportToPDF('month')}
            disabled={exporting !== null}
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
          >
            {exporting === 'month' ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <CalendarRange className="h-6 w-6" />
            )}
            <div className="text-sm font-semibold">Ce Mois</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(), 'MMMM yyyy', { locale: fr })}
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
