import { newDoc, drawHeader, drawFooter, drawDGSignature, section, kv, paragraph, nowDateFR, plusDaysFR } from './pdfBase';
import type { DocBuyer, DocPack, DocPurchase, DocRelay } from './types';

export function generateDeliveryContract(
  purchase: DocPurchase,
  buyer: DocBuyer,
  pack: DocPack,
  relay?: DocRelay | null
) {
  const doc = newDoc();
  const ref = purchase.tracking_code || purchase.pickup_code || purchase.id.slice(0, 8);
  const isRelay = purchase.delivery_mode === 'relay';

  drawHeader(doc, 'CONTRAT DE LIVRAISON', `N° ${ref}`);

  let y = 30;
  y = section(doc, y, 'Engagement de livraison');
  y = paragraph(doc, y,
    `Moissonneur s'engage à livrer le pack "${pack.name}" au client ci-dessous identifié, ` +
    `dans un délai maximum de 15 jours calendaires à compter de la confirmation du paiement.`
  );

  y += 2;
  y = section(doc, y, 'Calendrier');
  y = kv(doc, y, 'Date de commande', nowDateFR());
  y = kv(doc, y, 'Livraison au plus tard le', plusDaysFR(15));
  y = kv(doc, y, 'Référence commande', ref);

  y += 2;
  y = section(doc, y, 'Client');
  y = kv(doc, y, 'Nom', buyer.full_name || '—');
  y = kv(doc, y, 'Téléphone', purchase.delivery_phone || buyer.phone || '—');

  y += 2;
  y = section(doc, y, isRelay ? 'Point de retrait' : 'Adresse de livraison');
  if (isRelay && relay) {
    y = kv(doc, y, 'Point relais', relay.name);
    y = kv(doc, y, 'Adresse', `${relay.address}, ${relay.city}, ${relay.country}`);
    y = kv(doc, y, 'Téléphone relais', relay.phone || '—');
    y = kv(doc, y, 'Code de retrait', purchase.pickup_code || ref);
    y += 2;
    y = paragraph(doc, y,
      'Le client devra présenter le code de retrait ci-dessus, accompagné d\'une pièce d\'identité, ' +
      'au point relais sélectionné pour récupérer son colis.'
    );
  } else {
    y = kv(doc, y, 'Adresse', purchase.delivery_address || '—');
    y = kv(doc, y, 'Ville', purchase.delivery_city || '—');
    if (purchase.delivery_notes) y = kv(doc, y, 'Notes', purchase.delivery_notes);
  }

  y += 2;
  y = section(doc, y, 'Clauses');
  y = paragraph(doc, y,
    '• En cas de retard supérieur à 15 jours, le client peut demander le remboursement intégral.\n' +
    '• La responsabilité du transporteur cesse au moment du retrait par le client ou son mandataire.\n' +
    '• Tout litige sera traité prioritairement via le centre d\'appel Moissonneur (MSN 9191).'
  );

  drawDGSignature(doc, 118, 235, ref);
  drawFooter(doc);
  doc.save(`livraison-${ref}.pdf`);
}
