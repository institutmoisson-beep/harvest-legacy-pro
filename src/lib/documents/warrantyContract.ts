import { newDoc, drawHeader, drawFooter, drawDGSignature, section, kv, paragraph, nowDateFR } from './pdfBase';
import type { DocBuyer, DocPack, DocPurchase } from './types';

export function generateWarrantyContract(purchase: DocPurchase, buyer: DocBuyer, pack: DocPack) {
  const doc = newDoc();
  const ref = purchase.tracking_code || purchase.pickup_code || purchase.id.slice(0, 8);

  drawHeader(doc, 'CONTRAT DE GARANTIE', `N° ${ref}`);

  let y = 30;
  y = section(doc, y, 'Parties');
  y = kv(doc, y, 'Vendeur', 'Moissonneur SAS — Communauté MSN');
  y = kv(doc, y, 'Client', `${buyer.full_name || '—'}  (${buyer.phone || '—'})`);
  y = kv(doc, y, 'Référence', ref);
  y = kv(doc, y, 'Date', nowDateFR());

  y += 3;
  y = section(doc, y, 'Objet de la garantie');
  y = paragraph(
    doc, y,
    `Le présent contrat couvre le pack "${pack.name}" acquis par le client auprès de Moissonneur. ` +
    `Moissonneur garantit la conformité du produit livré et le bon fonctionnement des bénéfices associés ` +
    `(bonus, commissions multi-niveaux) selon les termes commerciaux affichés au moment de l'achat.`
  );

  y += 2;
  y = section(doc, y, 'Étendue & Durée');
  y = paragraph(doc, y,
    '• Durée : 12 mois à compter de la date de livraison effective.\n' +
    '• Vices cachés : remplacement ou remboursement intégral en cas de défaut avéré non causé par le client.\n' +
    '• Commissions MLM : les bénéfices et commissions sont garantis tant que le compte demeure actif.\n' +
    '• Exclusions : dommages dus à une utilisation contraire aux conditions, force majeure, intervention non autorisée.'
  );

  y += 2;
  y = section(doc, y, 'Procédure de réclamation');
  y = paragraph(doc, y,
    'Toute réclamation doit être adressée au centre d\'appel Moissonneur (MSN 9191 — Réclamations) ' +
    'en présentant le code unique de la commande. Le délai de traitement est de 7 jours ouvrés maximum.'
  );

  drawDGSignature(doc, 118, 235, ref);

  // Cadre client
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, 235, 80, 35, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Signature du Client', 16, 241);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${buyer.full_name || '—'}`, 16, 266);
  doc.text('(Bon pour accord)', 16, 270);

  drawFooter(doc);
  doc.save(`garantie-${ref}.pdf`);
}
