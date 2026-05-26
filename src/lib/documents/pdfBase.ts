import jsPDF from 'jspdf';

export const BRAND = {
  green: '#00A859',
  violet: '#7C3AED',
  dark: '#0F172A',
  muted: '#64748B',
};

export function newDoc(): jsPDF {
  return new jsPDF({ unit: 'mm', format: 'a4' });
}

export function drawHeader(doc: jsPDF, title: string, subtitle?: string) {
  // Bandeau dégradé Moov
  doc.setFillColor(0, 168, 89); // vert
  doc.rect(0, 0, 210, 22, 'F');
  doc.setFillColor(124, 58, 237); // violet
  doc.rect(150, 0, 60, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MOISSONNEUR', 12, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Communauté MSN — Richesse collective', 12, 17);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 200, 12, { align: 'right' });
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(subtitle, 200, 17, { align: 'right' });
  }
  doc.setTextColor(15, 23, 42);
}

export function drawFooter(doc: jsPDF) {
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(0, 168, 89);
  doc.setLineWidth(0.5);
  doc.line(12, pageHeight - 18, 198, pageHeight - 18);

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Moissonneur SAS — contact@moissonneur.com — Document généré automatiquement, valeur probante.',
    105,
    pageHeight - 12,
    { align: 'center' }
  );
  doc.text(
    `Page 1 — ${new Date().toLocaleString('fr-FR')}`,
    105,
    pageHeight - 8,
    { align: 'center' }
  );
  doc.setTextColor(15, 23, 42);
}

/**
 * Bloc signature numérique du Directeur Général.
 * Trace le nom en italique cursive + paraphe stylisé.
 */
export function drawDGSignature(doc: jsPDF, x: number, y: number, trackingCode?: string) {
  // Cadre signature
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, 80, 35, 2, 2, 'S');

  // Signature stylisée
  doc.setFont('times', 'italic');
  doc.setFontSize(22);
  doc.setTextColor(124, 58, 237);
  doc.text('Oniel Celvus', x + 6, y + 14);

  // Paraphe (trait dynamique sous la signature)
  doc.setDrawColor(0, 168, 89);
  doc.setLineWidth(0.8);
  doc.line(x + 4, y + 17, x + 60, y + 22);
  doc.setLineWidth(0.3);
  doc.line(x + 30, y + 22, x + 70, y + 16);

  // Identité
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Oniel Celvus', x + 6, y + 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Directeur Général — Moissonneur', x + 6, y + 31);
  if (trackingCode) {
    doc.setFontSize(7);
    doc.text(`Réf: ${trackingCode}`, x + 6, y + 34);
  }
  doc.setTextColor(15, 23, 42);
}

export function section(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(0, 168, 89);
  doc.rect(12, y, 3, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 18, y + 4.5);
  return y + 10;
}

export function kv(doc: jsPDF, y: number, label: string, value: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(label, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const lines = doc.splitTextToSize(value || '—', 130);
  doc.text(lines, 60, y);
  return y + 5 * Math.max(1, lines.length);
}

export function paragraph(doc: jsPDF, y: number, text: string, maxW = 186): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, 12, y);
  return y + 4.5 * lines.length + 2;
}

export function nowDateFR(): string {
  return new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function plusDaysFR(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}
