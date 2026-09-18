import rawCatalog from '../src/data/catalog.json';
import type { Price } from '../src/types/catalog';
import {
  formatMoney,
  formatMoneyRange,
  getPriceUnit,
  getVarietyRowsForWhatsApp,
  hasWholesale,
  loadCatalog,
  sentence,
} from '../src/lib/catalog';

declare const Bun: { write(path: string, data: string): Promise<number> };

const data = loadCatalog(rawCatalog);

const money = (value: number) => formatMoney(value);

function priceLines(prices: Price): string[] {
  const unit = getPriceUnit(prices);
  const lines = [`• Menudeo: ${money(prices.retail)} / ${unit}`];
  if (hasWholesale(prices)) {
    const note = prices.wholesaleNote ? ` ${prices.wholesaleNote}` : '';
    lines.push(`• Mayoreo${note}: ${money(prices.wholesale as number)} / ${unit}`);
  }
  return lines;
}

function metaRows(item: Parameters<typeof getVarietyRowsForWhatsApp>[0]): string[] {
  const processLine = item.process
    ? [item.score ? `${item.process} · ${item.score}` : item.process]
    : [];
  // Canonical attribute order from shared lib, without duplicating process/score.
  const rest = getVarietyRowsForWhatsApp(item).filter(
    (row) => !row.startsWith(`${item.process}: `) && row !== `Proceso: ${item.process}`,
  );
  return [...processLine, ...rest];
}

const lines: string[] = [
  `*${data.meta.brand.toUpperCase()} — ${data.meta.motto.toUpperCase()}*`,
  `_Catálogo ${data.meta.edition} · ${sentence(data.meta.tagline)}_`,
  '',
  `☕ *${data.traditional.title} ${data.traditional.subtitle} · GAIA*`,
  data.traditional.description,
  ...priceLines(data.traditional.prices),
  ...(data.traditional.status ? [`⚠️ ${sentence(data.traditional.status)}`] : []),
  '',
  `☕ *${data.gourmet.title} ${data.gourmet.subtitle} · AURA*`,
  `_${data.gourmet.intro}_`,
  ...data.gourmet.profiles.map(
    (profile) => `• ${profile.name} — A: ${profile.acidity} · D: ${profile.sweetness} · C: ${profile.body}`,
  ),
  `_${data.gourmet.legend}_`,
  ...priceLines(data.gourmet.prices),
  '',
  `☕ *${data.specialsTitle.title} ${data.specialsTitle.subtitle} · HELIOS*`,
  ...data.specials.flatMap((item) => [
    '',
    `*${item.region} · ${item.farm}*`,
    ...metaRows(item),
    ...item.tastingNotes,
    ...priceLines(item.prices),
  ]),
  '',
  `☕ *${data.microlot.title} ${data.microlot.subtitle} · AETHER*`,
  data.microlot.description,
  'Pregunta por existencias',
  `• Rango por ${data.microlot.priceRange.unit}: ${formatMoneyRange(data.microlot.priceRange.min, data.microlot.priceRange.max)}`,
  '',
  '── ✎ PARA AGREGAR O CAMBIAR UN CAFÉ ──',
  'GAIA · Tradicional: descripción, menudeo, mayoreo',
  'AURA · Gourmet: nombre/región, A (acidez), D (dulzor), C (cuerpo), menudeo, mayoreo',
  'HELIOS · Especiales: región, finca, proceso, puntaje, variedad, altura, notas de cata, menudeo, mayoreo',
  'AETHER · Microlotes: región, finca, proceso, puntaje, variedad, notas de cata, menudeo, mayoreo',
];

const message = lines.join('\n').replace(/\n{3,}/g, '\n\n');

await Bun.write('whatsapp/catalogo.txt', `${message}\n`);
console.log(message);
console.log('\nGuardado en whatsapp/catalogo.txt');
