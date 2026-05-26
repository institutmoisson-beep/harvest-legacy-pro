import { newDoc, drawHeader, drawFooter, drawDGSignature, section, kv, paragraph, nowDateFR } from './pdfBase';
import type { DocBuyer } from './types';

export function generateMembershipContract(buyer: DocBuyer, memberCode?: string) {
  const doc = newDoc();
  const ref = memberCode || 'MEM-' + Math.random().toString(36).slice(2, 10).toUpperCase();

  drawHeader(doc, "CONTRAT D'ADHÉSION", `Membre ${ref}`);

  let y = 30;
  y = section(doc, y, 'Adhérent');
  y = kv(doc, y, 'Nom complet', buyer.full_name || '—');
  y = kv(doc, y, 'Téléphone', buyer.phone || '—');
  y = kv(doc, y, 'Email', buyer.email || '—');
  y = kv(doc, y, "Date d'adhésion", nowDateFR());

  y += 2;
  y = section(doc, y, 'Préambule');
  y = paragraph(doc, y,
    "La communauté Moissonneur est un mouvement coopératif œuvrant pour la richesse collective et " +
    "l'entraide mutuelle entre ses membres. En signant le présent contrat, l'adhérent reconnaît " +
    "souscrire pleinement à la vision, aux valeurs et aux activités de la communauté."
  );

  y += 2;
  y = section(doc, y, 'Engagements du membre');
  y = paragraph(doc, y,
    "1. Participer activement aux activités, réunions et formations organisées par la communauté.\n" +
    "2. Respecter les autres membres, la confidentialité des échanges et la charte éthique.\n" +
    "3. Honorer les engagements financiers liés aux packs, tontines et cagnottes auxquels il/elle souscrit.\n" +
    "4. Promouvoir la communauté de bonne foi et contribuer à son rayonnement.\n" +
    "5. Ne pas utiliser la plateforme à des fins frauduleuses, illégales ou contraires aux bonnes mœurs."
  );

  y += 2;
  y = section(doc, y, 'Droits du membre');
  y = paragraph(doc, y,
    "• Accès à tous les services de la plateforme (portefeuille, packs, marketplace, transport, immobilier).\n" +
    "• Participation aux commissions multi-niveaux selon le plan en vigueur.\n" +
    "• Assistance via le centre d'appel et l'équipe locale (représentants pays/ville).\n" +
    "• Information transparente sur les opérations financières et communautaires."
  );

  y += 2;
  y = section(doc, y, 'Durée & Résiliation');
  y = paragraph(doc, y,
    "Le présent contrat est conclu pour une durée indéterminée. Chacune des parties peut y mettre fin " +
    "à tout moment moyennant un préavis écrit de 30 jours, sans préjudice des obligations en cours."
  );

  drawDGSignature(doc, 118, 235, ref);

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, 235, 80, 35, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Signature de l'adhérent", 16, 241);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(buyer.full_name || '—', 16, 266);
  doc.text('« Lu et approuvé »', 16, 270);

  drawFooter(doc);
  doc.save(`adhesion-${ref}.pdf`);
}
