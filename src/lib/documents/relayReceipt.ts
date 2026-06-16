import { newDoc, drawHeader, drawFooter, section, kv, nowDateFR } from './pdfBase';
import { formatFCFA } from '@/lib/currency';

export function generateRelayReceipt(order: any, product: any, partner: any, buyer: { full_name: string; email?: string; phone?: string }) {
  const doc = newDoc();
  drawHeader(doc, 'REÇU POINT RELAIS', `Code: ${order.pickup_code}`);

  let y = 32;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Émis le ${nowDateFR()}`, 12, y);
  y += 8;

  y = section(doc, y, 'Client');
  y = kv(doc, y, 'Nom', buyer.full_name || '—');
  y = kv(doc, y, 'Email', buyer.email || '—');

  y += 2;
  y = section(doc, y, 'Partenaire');
  y = kv(doc, y, 'Nom', partner.name);
  y = kv(doc, y, 'Type', partner.partner_type);
  y = kv(doc, y, 'Adresse', partner.address || partner.city || '—');
  y = kv(doc, y, 'Téléphone', partner.phone || '—');

  y += 2;
  y = section(doc, y, 'Commande');
  y = kv(doc, y, 'Produit / Service', product.name);
  y = kv(doc, y, 'Catégorie', product.category);
  y = kv(doc, y, 'Quantité', String(order.quantity));
  y = kv(doc, y, 'Prix unitaire', formatFCFA(Number(order.unit_price)));
  y = kv(doc, y, 'Total payé', formatFCFA(Number(order.total_price)));
  y = kv(doc, y, 'Statut', order.status);
  y = kv(doc, y, 'Code QR (token)', order.qr_token.slice(0, 24) + '…');
  y = kv(doc, y, 'Code de retrait', order.pickup_code);

  y += 6;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(12, y, 186, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 168, 89);
  doc.text('PAIEMENT VIA PORTEFEUILLE MSN', 16, y + 11);
  doc.setFontSize(13);
  doc.text(formatFCFA(Number(order.total_price)), 194, y + 11, { align: 'right' });

  drawFooter(doc);
  doc.save(`recu-relais-${order.pickup_code}.pdf`);
}
