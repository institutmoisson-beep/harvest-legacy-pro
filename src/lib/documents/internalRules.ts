import { newDoc, drawHeader, drawFooter, drawDGSignature, section, paragraph } from './pdfBase';

export function generateInternalRules(memberRef?: string) {
  const doc = newDoc();
  const ref = memberRef || '—';

  drawHeader(doc, "RÈGLEMENT INTÉRIEUR", "Institut Moisson");

  let y = 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("RÈGLEMENT INTÉRIEUR DE L'INSTITUT MOISSON", 105, y, { align: 'center' });
  y += 8;

  y = section(doc, y, "Chapitre I — Discipline, maîtrise de soi et code d'honneur");
  y = paragraph(doc, y,
    "Article 1 — Discipline communautaire. L'Institut Moisson n'est pas qu'une plateforme " +
    "d'apprentissage ou de commerce ; c'est une famille d'honneur. Chaque membre doit traiter ses pairs " +
    "avec le respect, la loyauté et la bienveillance dus à un membre de sa propre famille. La calomnie, " +
    "la trahison et la division au sein du réseau sont sévèrement sanctionnées."
  );
  y = paragraph(doc, y,
    "Article 2 — Maîtrise de soi et ordre public. Les membres formés par l'Institut, notamment au sein " +
    "du Pôle Security Vanguard, pôle d'élite et pôle de solidarité, doivent faire preuve d'une maîtrise " +
    "de soi absolue. L'usage de la force, de la provocation, de l'intimidation ou l'implication dans " +
    "des troubles à l'ordre public est strictement interdit. Le Moissonneur est un bâtisseur de paix " +
    "et de sécurité au service de l'État et de la communauté."
  );

  y = section(doc, y, 'Chapitre II — Commerce en gros et régulation des marchés');
  y = paragraph(doc, y,
    "Article 3 — Statut de Membre Distributeur. Tout membre ayant validé son profil a accès au " +
    "catalogue de gros de l'Institut. Il est autorisé à revendre les produits de consommation " +
    "(agroalimentaire, cosmétiques, technologies) en appliquant des marges conformes aux grilles de " +
    "prix indicatives fixées par l'application pour éviter toute concurrence déloyale."
  );
  y = paragraph(doc, y,
    "Article 4 — Gestion des Points Valeurs (PV). Les achats de produits de gros effectués par un " +
    "membre ou par sa lignée descendante (downline) génèrent des Points Valeurs (PV). Ces PV sont " +
    "accumulés mensuellement et convertis automatiquement en bonus financiers sur le portefeuille " +
    "intégré. Toute manipulation frauduleuse entraîne le blocage immédiat du compte."
  );

  doc.addPage();
  drawHeader(doc, "RÈGLEMENT INTÉRIEUR", "Institut Moisson");
  y = 30;

  y = section(doc, y, 'Chapitre III — Wallet MSN et marketing relationnel');
  y = paragraph(doc, y,
    "Article 5 — Transparence du réseau MLM. Le parrainage doit être basé sur l'explication honnête de " +
    "la vision de l'Institut. Il est interdit de présenter l'application comme un système de placement " +
    "d'argent passif (Ponzi). Les gains proviennent exclusivement du travail réel : vente de produits " +
    "de gros et distribution de packs de formation."
  );
  y = paragraph(doc, y,
    "Article 6 — Règles de retrait et de sécurité du Wallet. Le Wallet MSN est strictement personnel. " +
    "L'utilisateur est responsable de la confidentialité de ses codes d'accès. Les commissions MLM et " +
    "marges de gros créditées sont retirables selon les paliers techniques configurés dans " +
    "l'application, après déduction automatique de la quote-part obligatoire destinée au Fonds " +
    "Communautaire de Solidarité."
  );

  y = section(doc, y, 'Chapitre IV — Diplômes et insignes officiels');
  y = paragraph(doc, y,
    "Article 7 — Accomplissement du cursus académique. L'acquisition d'un pack de formation ne vaut pas " +
    "obtention du diplôme. Le membre doit obligatoirement suivre l'intégralité des modules en ligne et " +
    "sur le terrain, et obtenir la moyenne requise aux examens supervisés par le consortium."
  );
  y = paragraph(doc, y,
    "Article 8 — Port de l'uniforme et insignes protégés. L'uniforme d'apparat officiel (la veste " +
    "d'honneur varoise rose clair kaki) et l'Insigne officiel des Moissonneurs sont des marques " +
    "déposées et protégées auprès de l'OAPI. Le port de l'uniforme complet est strictement réservé aux " +
    "cérémonies officielles. Tout usage abusif entraînera l'exclusion immédiate et des poursuites pénales."
  );

  y = section(doc, y, 'Chapitre V — Sanctions et exclusions');
  y = paragraph(doc, y,
    "Article 9 — Échelle des sanctions :\n" +
    "1. Avertissement numérique avec notification dans l'application.\n" +
    "2. Suspension temporaire du Wallet MSN et blocage des liens de parrainage.\n" +
    "3. Révocation des droits de distribution de gros.\n" +
    "4. Exclusion définitive de la Communauté avec suppression du compte et perte totale des droits sur " +
    "le réseau constitué."
  );
  y = paragraph(doc, y,
    "Article 10 — Signature et acceptation. L'acceptation du présent Règlement Intérieur est " +
    "obligatoire lors de la première connexion à l'application. Elle est matérialisée par une case à " +
    "cocher électronique qui lie juridiquement le membre à l'Institut Moisson, avec la même valeur " +
    "qu'une signature manuscrite."
  );

  drawDGSignature(doc, 118, 235, ref);
  drawFooter(doc);
  doc.save(`reglement-interieur-${ref}.pdf`);
}
