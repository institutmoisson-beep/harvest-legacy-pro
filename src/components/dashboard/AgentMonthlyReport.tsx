import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Calendar, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AgentMonthlyReportProps {
  agentId: string;
}

interface MonthlyReport {
  report_month: string;
  total_transactions: number;
  deposit_count: number;
  withdrawal_count: number;
  total_volume: number;
  total_commission: number;
  avg_commission_rate: number;
  current_tier: string;
}

export default function AgentMonthlyReport({ agentId }: AgentMonthlyReportProps) {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [currentReport, setCurrentReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agentId) {
      fetchReports();
    }
  }, [agentId]);

  useEffect(() => {
    if (selectedMonth && reports.length > 0) {
      const report = reports.find(r => r.report_month === selectedMonth);
      setCurrentReport(report || null);
    }
  }, [selectedMonth, reports]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_monthly_commission_report')
        .select('*')
        .eq('agent_id', agentId)
        .order('report_month', { ascending: false })
        .limit(12);

      if (error) throw error;

      setReports(data || []);
      
      // Auto-select most recent month
      if (data && data.length > 0) {
        setSelectedMonth(data[0].report_month);
      }
    } catch (error) {
      console.error('Error fetching monthly reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReportPDF = async () => {
    if (!currentReport) return;

    const reportDate = format(new Date(currentReport.report_month), 'MMMM yyyy', { locale: fr });
    
    // Fetch detailed transactions for this month
    const startOfMonth = new Date(currentReport.report_month);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const { data: transactions } = await supabase
      .from('agent_commission_earnings')
      .select('*')
      .eq('agent_id', agentId)
      .gte('created_at', startOfMonth.toISOString())
      .lt('created_at', endOfMonth.toISOString())
      .order('created_at', { ascending: false });

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(139, 92, 246); // primary color
    doc.text('Rapport Mensuel Agent', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(reportDate, 105, 30, { align: 'center' });
    
    // Summary Statistics
    doc.setFontSize(14);
    doc.setTextColor(139, 92, 246);
    doc.text('Résumé des Performances', 14, 45);
    
    const summaryData = [
      ['Total Transactions', currentReport.total_transactions.toString()],
      ['Dépôts', currentReport.deposit_count.toString()],
      ['Retraits', currentReport.withdrawal_count.toString()],
      ['Volume Total', `${Number(currentReport.total_volume).toFixed(2)} MSN`],
      ['Total Commissions', `${Number(currentReport.total_commission).toFixed(2)} MSN`],
      ['Taux Moyen', `${Number(currentReport.avg_commission_rate).toFixed(2)}%`],
      ['Palier Actuel', currentReport.current_tier || 'N/A'],
    ];

    autoTable(doc, {
      startY: 50,
      head: [['Indicateur', 'Valeur']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
    });

    // Detailed Transactions
    if (transactions && transactions.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(139, 92, 246);
      doc.text('Détail des Commissions', 14, 20);

      const transactionData = transactions.map(t => [
        format(new Date(t.created_at), 'dd/MM/yyyy', { locale: fr }),
        t.transaction_type === 'deposit' ? 'Dépôt' : 'Retrait',
        `${Number(t.transaction_amount).toFixed(2)} MSN`,
        `${Number(t.commission_rate).toFixed(2)}%`,
        `${Number(t.commission_amount).toFixed(2)} MSN`,
        t.tier_name || '-'
      ]);

      autoTable(doc, {
        startY: 25,
        head: [['Date', 'Type', 'Montant', 'Taux', 'Commission', 'Palier']],
        body: transactionData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] },
        styles: { fontSize: 8 },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} sur ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`rapport-agent-${format(new Date(currentReport.report_month), 'yyyy-MM')}.pdf`);
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Rapport Mensuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Aucun rapport disponible pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Rapport Mensuel des Commissions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reports.map((report) => (
                  <SelectItem key={report.report_month} value={report.report_month}>
                    {format(new Date(report.report_month), 'MMMM yyyy', { locale: fr })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={downloadReportPDF} variant="default" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentReport && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">Transactions</p>
                </div>
                <p className="text-2xl font-bold">{currentReport.total_transactions}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentReport.deposit_count} dépôts, {currentReport.withdrawal_count} retraits
                </p>
              </div>

              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-muted-foreground">Volume Total</p>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {Number(currentReport.total_volume).toFixed(2)} MSN
                </p>
              </div>

              <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-orange-500" />
                  <p className="text-sm text-muted-foreground">Total Commissions</p>
                </div>
                <p className="text-2xl font-bold text-orange-500">
                  {Number(currentReport.total_commission).toFixed(2)} MSN
                </p>
              </div>

              <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  <p className="text-sm text-muted-foreground">Taux Moyen</p>
                </div>
                <p className="text-2xl font-bold text-purple-500">
                  {Number(currentReport.avg_commission_rate).toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Palier: {currentReport.current_tier || 'N/A'}
                </p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="border border-border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg mb-4">Détails du Rapport</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Période</p>
                  <p className="font-medium">
                    {format(new Date(currentReport.report_month), 'MMMM yyyy', { locale: fr })}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Palier de Commission</p>
                  <p className="font-medium">{currentReport.current_tier || 'Bronze'}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Nombre de Dépôts</p>
                  <p className="font-medium">{currentReport.deposit_count} transactions</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Nombre de Retraits</p>
                  <p className="font-medium">{currentReport.withdrawal_count} transactions</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Commission Moyenne par Transaction</p>
                  <p className="font-medium">
                    {(Number(currentReport.total_commission) / currentReport.total_transactions).toFixed(2)} MSN
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Taux de Commission Effectif</p>
                  <p className="font-medium">{Number(currentReport.avg_commission_rate).toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
