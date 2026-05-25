// Devises - tout est stocké en FCFA (XOF) en base.
// L'utilisateur choisit une devise d'affichage ; on convertit à la volée.

export const MSN_TO_FCFA = 750;

export const fcfaToMsn = (fcfa: number): number => (fcfa || 0) / MSN_TO_FCFA;
export const msnToFcfa = (msn: number): number => (msn || 0) * MSN_TO_FCFA;

export const formatFCFA = (fcfa: number): string =>
  `${Math.round(fcfa || 0).toLocaleString('fr-FR')} FCFA`;

export const formatMSN = (msn: number): string =>
  `${(msn || 0).toFixed(2)} MSN`;

export const formatPriceWithMSN = (fcfa: number): string =>
  `${formatFCFA(fcfa)} · ${formatMSN(fcfaToMsn(fcfa))}`;

export interface CurrencyRate {
  code: string;
  name: string;
  symbol: string;
  rate_to_fcfa: number;
}

// Convertit un montant FCFA vers la devise cible (rate_to_fcfa = 1 unité de la devise = X FCFA)
export const convertFromFCFA = (fcfa: number, rate: CurrencyRate | null | undefined): number => {
  if (!rate || !rate.rate_to_fcfa) return fcfa || 0;
  return (fcfa || 0) / rate.rate_to_fcfa;
};

export const formatInCurrency = (fcfa: number, rate: CurrencyRate | null | undefined): string => {
  if (!rate || rate.code === 'XOF' || rate.code === 'XAF') return formatFCFA(fcfa);
  const v = convertFromFCFA(fcfa, rate);
  const decimals = v < 10 ? 2 : 0;
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${rate.symbol}`;
};
