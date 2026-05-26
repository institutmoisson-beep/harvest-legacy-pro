import { newDoc, drawHeader, drawFooter, drawDGSignature, section, kv, nowDateFR } from './pdfBase';
import { formatFCFA, fcfaToMsn, formatMSN } from '@/lib/currency';
import type { DocBuyer, DocPack, DocPurchase } from './types';

export function generateReceipt(purchase: DocPurchase, buyer: DocBuyer, pack: DocPack) {
  const doc = newDoc();
  const ref = purchase.tracking_code || purchase.pickup_code || purchase.id.slice(0, 8);

  drawHeader(doc, 'REÇU DE PAIEMENT', `N° ${ref}`);

  let y = 32;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Émis le ${nowDateFR()}`, 12, y);
  y += 8;

  y = section(doc, y, 'Client');
  y = kv(doc, y, 'Nom complet', buyer.full_name || '—');
  y = kv(doc, y, 'Téléphone', buyer.phone || '—');
  y = kv(doc, y, 'Email', buyer.email || '—');
  y = kv(doc, y, 'Pièce', buyer.id_number || '—');

  y += 4;
  y = section(doc, y, 'Détail de la commande');
  y = kv(doc, y, 'Pack', pack.name);
  y = kv(doc, y, 'Montant payé', `${formatFCFA(pack.price)}  (${formatMSN(fcfaToMsn(pack.price))})`);
  y = kv(doc, y, 'Mode', 'Portefeuille MSN (Wallet)');
  y = kv(doc, y, 'Statut', 'Payé — Confirmé');
  y = kv(doc, y, 'Code unique', ref);

  y += 6;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(12, y, 186, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 168, 89);
  doc.text('TOTAL ENCAISSÉ', 16, y + 9);
  doc.setFontSize(16);
  doc.text(formatFCFA(pack.price), 194, y + 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(formatMSN(fcfaToMsn(pack.price)), 194, y + 18, { align: 'right' });

  drawDGSignature(doc, 118, 235, ref);
  drawFooter(doc);

  doc.save(`recu-${ref}.pdf`);
}
