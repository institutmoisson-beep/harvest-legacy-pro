import { newDoc, drawHeader, drawFooter, drawDGSignature, section, kv, nowDateFR } from './pdfBase';

const formatFCFA = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)) + ' FCFA';

export interface GrenierInvestment {
  id: string;
  shares_purchased: number;
  total_amount_invested: number;
  investment_date?: string | null;
  created_at?: string | null;
  payment_method?: string | null;
}

export interface GrenierProject {
  id: string;
  title: string;
  category?: string | null;
  description?: string | null;
  share_price: number;
  total_shares: number;
  shares_sold: number;
  estimated_roi: number;
  global_target: number;
  end_date?: string | null;
  status?: string | null;
}

export interface GrenierBuyer {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  id_moissonneur?: string | null;
}

export function generateGrenierReceipt(
  inv: GrenierInvestment,
  project: GrenierProject,
  buyer: GrenierBuyer,
) {
  const doc = newDoc();
  const ref = `GR-${inv.id.slice(0, 8).toUpperCase()}`;
  const dateStr = new Date(inv.investment_date || inv.created_at || Date.now()).toLocaleString('fr-FR');
  const estimatedGain = Number(inv.total_amount_invested) * (Number(project.estimated_roi) / 100);

  drawHeader(doc, 'REÇU D\'INVESTISSEMENT', `Le Grenier — Réf ${ref}`);

  let y = 32;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Émis le ${nowDateFR()} — Transaction du ${dateStr}`, 12, y);
  y += 8;

  y = section(doc, y, 'Investisseur (Moissonneur)');
  y = kv(doc, y, 'Nom complet', buyer.full_name || '—');
  y = kv(doc, y, 'Identifiant MSN', buyer.id_moissonneur || '—');
  y = kv(doc, y, 'Email', buyer.email || '—');
  y = kv(doc, y, 'Téléphone', buyer.phone || '—');

  y += 4;
  y = section(doc, y, 'Projet financé');
  y = kv(doc, y, 'Titre', project.title);
  y = kv(doc, y, 'Catégorie', project.category || '—');
  y = kv(doc, y, 'Statut', project.status || '—');
  y = kv(doc, y, 'Objectif global', formatFCFA(project.global_target));
  y = kv(doc, y, 'ROI estimé', `+${project.estimated_roi}%`);
  y = kv(doc, y, 'Clôture collecte', project.end_date ? new Date(project.end_date).toLocaleDateString('fr-FR') : '—');
  if (project.description) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const lines = doc.splitTextToSize(project.description.slice(0, 360), 186);
    doc.text(lines, 12, y);
    y += 4.2 * lines.length + 2;
    doc.setTextColor(15, 23, 42);
  }

  y += 4;
  y = section(doc, y, 'Détail de l\'achat de parts');
  y = kv(doc, y, 'Parts acquises', String(inv.shares_purchased));
  y = kv(doc, y, 'Prix par part', formatFCFA(project.share_price));
  y = kv(doc, y, 'Gain estimé', `+${formatFCFA(estimatedGain)}`);
  y = kv(doc, y, 'Retour total estimé', formatFCFA(Number(inv.total_amount_invested) + estimatedGain));
  y = kv(doc, y, 'Mode de paiement', 'Portefeuille MSN (Wallet)');
  y = kv(doc, y, 'Statut', 'Payé — Confirmé');
  y = kv(doc, y, 'Référence', ref);

  y += 4;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(12, y, 186, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 168, 89);
  doc.text('MONTANT INVESTI', 16, y + 9);
  doc.setFontSize(16);
  doc.text(formatFCFA(inv.total_amount_invested), 194, y + 13, { align: 'right' });
  y += 28;

  drawDGSignature(doc, 118, Math.min(y, 235), ref);
  drawFooter(doc);

  doc.save(`recu-grenier-${ref}.pdf`);
}
