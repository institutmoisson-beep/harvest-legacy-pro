import { newDoc, drawHeader, drawFooter, drawDGSignature, section, paragraph } from './pdfBase';

export function generateStatutes(memberRef?: string) {
  const doc = newDoc();
  const ref = memberRef || '—';

  drawHeader(doc, "STATUTS DE L'ORGANISATION", "Institut Moisson");

  let y = 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("STATUTS DE L'ORGANISATION INTERNATIONALE", 105, y, { align: 'center' });
  y += 5;
  doc.text("« INSTITUT MOISSON »", 105, y, { align: 'center' });
  y += 8;

  y = section(doc, y, 'Titre I — Constitution, dénomination, siège, durée');
  y = paragraph(doc, y,
    "Article 1 — Constitution et forme juridique. Il est constitué entre les adhérents aux présents " +
    "statuts et tous ceux qui y adhéreront ultérieurement, une Organisation Non Gouvernementale (ONG) " +
    "Internationale à vocation de Fondation par Actions Participatives et Groupement d'Intérêt " +
    "Communautaire, régie par les lois nationales en vigueur et les dispositions du droit international " +
    "des associations."
  );
  y = paragraph(doc, y,
    "Article 2 — Dénomination. L'organisation prend la dénomination officielle de : INSTITUT MOISSON " +
    "(abrégé « IM » ou « La Communauté »)."
  );
  y = paragraph(doc, y,
    "Article 3 — Siège social. Le siège international de l'Institut Moisson est établi à " +
    "Bendèkouassikro/Bouaké, République de Côte d'Ivoire. Il peut être transféré dans toute autre ville " +
    "ou pays par décision du Haut Conseil d'Éthique. Des antennes nationales (chapitres) peuvent être " +
    "créées librement à l'étranger pour encadrer les membres locaux."
  );
  y = paragraph(doc, y,
    "Article 4 — Durée. La durée de l'Institut Moisson est illimitée, sauf dissolution anticipée " +
    "prononcée conformément aux présents statuts."
  );

  doc.addPage();
  drawHeader(doc, "STATUTS DE L'ORGANISATION", "Institut Moisson");
  y = 30;

  y = section(doc, y, "Titre II — Buts, objectifs, moyens d'action");
  y = paragraph(doc, y,
    "Article 5 — But et doctrine. L'Institut Moisson est une communauté internationale bâtie sur les " +
    "principes d'une famille solidaire, visant l'élévation morale, technique, financière et " +
    "professionnelle de ses membres par la mutualisation des compétences et des ressources. Sa doctrine " +
    "repose sur la droiture, la discipline collective et la maîtrise absolue de soi."
  );
  y = paragraph(doc, y,
    "Article 6 — Objectifs stratégiques.\n" +
    "1. La formation professionnelle d'élite dans les secteurs régaliens et technologiques (Sécurité " +
    "opérationnelle, Cyber-sécurité, Droit, Ingénierie, spiritualité et formation technique).\n" +
    "2. Le développement d'un écosystème commercial et financier participatif permettant " +
    "l'autonomisation de ses membres.\n" +
    "3. Le financement de projets entrepreneuriaux portés par ses jeunes diplômés afin de lutter contre " +
    "le chômage.\n" +
    "4. L'assistance sociale, l'entraide mutuelle et la protection financière de la famille communautaire."
  );
  y = paragraph(doc, y,
    "Article 7 — Moyens d'action et modèle économique hybride. L'Institut utilise un modèle " +
    "d'actionnariat participatif global structuré autour d'une application numérique officielle " +
    "combinant : cycles de formation d'excellence ; réseau d'expansion basé sur le marketing relationnel " +
    "(MLM) géré par des algorithmes ; centrale d'achat et commerce de gros ; portefeuille électronique " +
    "sécurisé (Wallet MSN)."
  );

  y = section(doc, y, 'Titre III — Composition, adhésion, ressources financières');
  y = paragraph(doc, y,
    "Article 8 — Qualité de membre et contrat d'adhésion. L'adhésion s'effectue obligatoirement par voie " +
    "numérique via l'application officielle par la validation du Contrat d'Adhésion Communautaire. " +
    "L'adhérent prend alors le titre de « Membre Moissonneur » ou « Membre Distributeur »."
  );
  y = paragraph(doc, y,
    "Article 9 — Acquisition de multi-packs. Chaque membre a la faculté de souscrire à un ou plusieurs " +
    "Packs d'Activité et de Formation au sein de l'application."
  );
  y = paragraph(doc, y,
    "Article 10 — Ressources de l'organisation : contributions participatives liées à la souscription " +
    "des packs ; cotisations et fonds d'adhésion ; marges générées par la centrale d'achat ; prélèvement " +
    "algorithmique fixe sur chaque transaction alimentant le Fonds Communautaire de Solidarité."
  );

  doc.addPage();
  drawHeader(doc, "STATUTS DE L'ORGANISATION", "Institut Moisson");
  y = 30;

  y = section(doc, y, 'Titre IV — Gouvernance et administration');
  y = paragraph(doc, y,
    "Article 11 — Le Haut Conseil d'Éthique. L'Institut Moisson est placé sous l'autorité suprême du " +
    "Haut Conseil d'Éthique. Ce conseil est le garant de la doctrine, de la discipline, de la légalité " +
    "républicaine et de l'éthique de la communauté. Il détient le pouvoir de veto sur toutes les " +
    "décisions financières, pédagogiques et administratives."
  );
  y = paragraph(doc, y,
    "Article 12 — Le Comité Exécutif et de pilotage assure la gestion quotidienne, supervise " +
    "l'ingénierie technique de l'application, valide le catalogue des produits en gros et ordonnance " +
    "les investissements de développement validés par le Haut Conseil."
  );

  y = section(doc, y, 'Titre V — Fonds de Solidarité et dissolution');
  y = paragraph(doc, y,
    "Article 13 — Affectation du Fonds de Solidarité. Le Fonds Communautaire de Solidarité, géré de " +
    "manière transparente, ne peut être redistribué à des fins d'enrichissement personnel des " +
    "dirigeants. Il est exclusivement mobilisé pour financer à taux zéro ou sous forme de bourses les " +
    "projets d'entreprise des jeunes diplômés méritants, et soutenir les familles des membres en cas " +
    "de coup dur."
  );
  y = paragraph(doc, y,
    "Article 14 — Dissolution. En cas de dissolution, l'ensemble des actifs technologiques, financiers " +
    "et physiques de l'Institut Moisson sera intégralement transféré à des œuvres caritatives ou à des " +
    "fondations sœurs poursuivant des buts similaires, sous la supervision d'un liquidateur nommé par " +
    "le Haut Conseil d'Éthique."
  );

  drawDGSignature(doc, 118, 230, ref);
  drawFooter(doc);
  doc.save(`statuts-institut-moisson-${ref}.pdf`);
}
