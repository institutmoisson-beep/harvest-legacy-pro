import { newDoc, drawHeader, drawFooter, drawDGSignature, section, kv, paragraph, nowDateFR } from './pdfBase';
import type { DocBuyer } from './types';

interface MembershipExtra {
  user_id?: string | null;
  pack_name?: string | null;
  registration_date?: string | null;
}

export function generateMembershipContract(buyer: DocBuyer, memberCode?: string, extra?: MembershipExtra) {
  const doc = newDoc();
  const ref = memberCode || 'MEM-' + Math.random().toString(36).slice(2, 10).toUpperCase();

  drawHeader(doc, "CONTRAT D'ADHÉSION COMMUNAUTAIRE", `Membre ${ref}`);

  let y = 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("CONTRAT D'ADHÉSION COMMUNAUTAIRE D'ASSOCIATION INTERNATIONALE & GIE", 105, y, { align: 'center' });
  y += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text("Écosystème Participatif Global de l'Institut Moisson (ONG Internationale)", 105, y, { align: 'center' });
  y += 8;

  y = section(doc, y, 'Entre les soussignés');
  y = paragraph(doc, y,
    "L'INSTITUT MOISSON, Organisation Non Gouvernementale (ONG) Internationale à gouvernance " +
    "participative et Groupement d'Intérêt Communautaire, dont le siège mondial est établi à Abidjan, " +
    "Côte d'Ivoire, représenté par son Président de Conseil d'Éthique, ci-après dénommé « L'Institut » " +
    "ou « La Communauté », d'une part ;"
  );
  y = paragraph(doc, y,
    "ET L'ADHÉRENT NUMÉRIQUE, utilisateur inscrit via l'application officielle de l'Institut Moisson, " +
    "dont les informations d'identité électronique sont extraites dynamiquement de son profil utilisateur :"
  );

  y = kv(doc, y, 'Nom complet', buyer.full_name || '—');
  y = kv(doc, y, 'Identifiant Unique', extra?.user_id || '—');
  y = kv(doc, y, 'Adresse e-mail', buyer.email || '—');
  y = kv(doc, y, 'Téléphone', buyer.phone || '—');
  y = kv(doc, y, 'Pack Initial Souscrit', extra?.pack_name || '—');
  y = kv(doc, y, "Date et Heure d'Adhésion", extra?.registration_date || nowDateFR());

  y += 2;
  y = paragraph(doc, y,
    "Ci-après dénommé(e) « L'Adhérent », « Le Membre Distributeur » ou « Le Moissonneur », d'autre part."
  );

  // Page 2
  doc.addPage();
  drawHeader(doc, "CONTRAT D'ADHÉSION COMMUNAUTAIRE", `Membre ${ref}`);
  y = 30;

  y = section(doc, y, 'Préambule');
  y = paragraph(doc, y,
    "L'Institut Moisson constitue une communauté internationale unie par des principes de solidarité, " +
    "de mutualisation des ressources et d'élévation professionnelle, formant une véritable famille " +
    "collective. Le présent accord scelle l'intégration de l'Adhérent au sein de ce modèle " +
    "d'actionnariat participatif global. Ce contrat de groupement fusionne la formation d'élite, le " +
    "financement de projets, le commerce en gros et le marketing relationnel de réseau, le tout opéré " +
    "de manière transparente à travers l'écosystème numérique et le portefeuille intégré de l'application."
  );

  y = section(doc, y, 'Article 1 — Statut du membre, formations et multi-packs');
  y = paragraph(doc, y,
    "En validant son adhésion, l'Adhérent acquiert le statut de Membre de la communauté internationale " +
    "de l'Institut Moisson. L'Adhérent a le droit et l'opportunité de souscrire à un ou plusieurs autres " +
    "packs de formation et d'activité (Pôles Security Vanguard, Cyber-Vanguard, Juristes, formation, ou " +
    "autres packs sectoriels) directement depuis son interface. L'achat de chaque pack débloque l'accès " +
    "aux cycles de formation d'excellence correspondants, co-dispensés et légitimés conjointement par " +
    "des structures privées agréées et des institutions étatiques nationales et internationales " +
    "partenaires de l'Institut."
  );

  y = section(doc, y, 'Article 2 — Écosystème MLM et commissions relationnelles');
  y = paragraph(doc, y,
    "L'Institut Moisson structure son expansion internationale sur un modèle de marketing relationnel " +
    "(MLM / Marketing Multi-Niveaux). L'Adhérent est libre de développer son propre réseau de " +
    "recommandation. À ce titre, il perçoit des commissions algorithmiques directes et indirectes basées " +
    "sur les taux contractuels affectés à chaque pack lors de l'inscription de nouveaux membres au sein " +
    "de son réseau de parrainage. Le calcul et la distribution de ces commissions de réseau sont " +
    "entièrement automatisés par les scripts informatiques sécurisés du système."
  );

  y = section(doc, y, 'Article 3 — Le portefeuille intégré (Wallet MSN)');
  y = paragraph(doc, y,
    "L'application fournit à l'Adhérent un portefeuille électronique sécurisé intégré (Wallet MSN). Ce " +
    "portefeuille enregistre en temps réel les contributions financières participatives pour l'acquisition " +
    "de nouveaux packs ou produits, les commissions de marketing de réseau (MLM) acquises, et les revenus " +
    "générés par les ventes en gros. L'Adhérent peut utiliser le solde disponible dans son portefeuille " +
    "pour réinvestir dans l'écosystème ou en demander le retrait selon les conditions financières définies " +
    "par la communauté."
  );

  // Page 3
  doc.addPage();
  drawHeader(doc, "CONTRAT D'ADHÉSION COMMUNAUTAIRE", `Membre ${ref}`);
  y = 30;

  y = section(doc, y, 'Article 4 — Commerce de gros, distribution et rémunération');
  y = paragraph(doc, y,
    "L'Institut Moisson met à disposition de sa communauté une centrale d'achat et un catalogue de " +
    "produits de grande consommation (produits alimentaires de base, cosmétiques, savons, équipements " +
    "spécialisés). L'Adhérent bénéficie du statut de Membre Distributeur Agréé :\n" +
    "1. Il est habilité à acheter ces denrées et articles en gros à des prix communautaires préférentiels.\n" +
    "2. Il génère des marges commerciales directes lors de la revente de ces produits sur le marché.\n" +
    "3. Le volume d'achat de produits de sa lignée (downline) génère des points valeurs (PV) " +
    "convertibles en bonus financiers mensuels crédités sur son portefeuille intégré."
  );

  y = section(doc, y, 'Article 5 — Fonds Communautaire de Solidarité et de Financement');
  y = paragraph(doc, y,
    "Chaque acquisition de pack, chaque transaction commerciale et chaque mouvement réseau au sein de " +
    "l'application alimente à hauteur d'un pourcentage défini le Fonds Communautaire de Solidarité de " +
    "l'Institut Moisson. Ce fonds d'actionnariat participatif est exclusivement destiné à accorder des " +
    "bourses d'études, soutenir les membres en situation de vulnérabilité, et financer de manière " +
    "participative des projets entrepreneuriaux et d'ingénierie soumis par les jeunes diplômés et " +
    "membres de la communauté, après validation par le comité de pilotage."
  );

  y = section(doc, y, "Article 6 — Code d'honneur, éthique et validation électronique");
  y = paragraph(doc, y,
    "Le Membre s'engage à respecter le Code d'Honneur de l'organisation, basé sur la loyauté, la droiture " +
    "et la maîtrise de soi apprise lors du tronc commun. Les uniformes d'apparat (la veste varoise " +
    "d'honneur rose clair kaki) et insignes officiels sont protégés auprès de l'OAPI. Ce contrat est " +
    "réputé signé et exécutoire dès la validation de l'inscription de l'utilisateur sur l'application. " +
    "La génération automatique du présent PDF, comprenant l'identifiant de sécurité unique et l'empreinte " +
    "de la transaction, fait foi de consentement mutuel parfait."
  );

  // Signatures
  drawDGSignature(doc, 118, 215, ref);

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, 215, 80, 35, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Signature de l'adhérent", 16, 221);
  doc.setFont('times', 'italic');
  doc.setFontSize(14);
  doc.setTextColor(0, 168, 89);
  doc.text(buyer.full_name || '—', 16, 235);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('« Lu et approuvé — Approuvé via l\'application »', 16, 244);
  if (extra?.user_id) doc.text(`ID unique : ${extra.user_id.slice(0, 18)}…`, 16, 248);

  drawFooter(doc);
  doc.save(`contrat-adhesion-${ref}.pdf`);
}
