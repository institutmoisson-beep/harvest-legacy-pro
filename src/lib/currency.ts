// Parité fixe : 1 MSN = 750 FCFA
export const MSN_TO_FCFA = 750;

export const fcfaToMsn = (fcfa: number): number => (fcfa || 0) / MSN_TO_FCFA;
export const msnToFcfa = (msn: number): number => (msn || 0) * MSN_TO_FCFA;

export const formatFCFA = (fcfa: number): string =>
  `${Math.round(fcfa || 0).toLocaleString('fr-FR')} FCFA`;

export const formatMSN = (msn: number): string =>
  `${(msn || 0).toFixed(2)} MSN`;

/** Affiche un prix FCFA avec son équivalent MSN. Ex: "10 000 FCFA · 13.33 MSN" */
export const formatPriceWithMSN = (fcfa: number): string =>
  `${formatFCFA(fcfa)} · ${formatMSN(fcfaToMsn(fcfa))}`;
