import { expect, test } from 'bun:test';
import type { Catalog, SpecialVariety } from '../types/catalog';
import {
  formatMoney,
  formatPrice,
  getPriceUnit,
  getSections,
  getSpecialsColumns,
  getVarietyRows,
  getVarietyRowsForWhatsApp,
  hasWholesale,
  loadCatalog,
  normalizePrice,
  sentence,
} from './catalog';

const variety = (overrides: Partial<SpecialVariety> = {}): SpecialVariety => ({
  id: 'custom-1',
  region: 'TEST',
  farm: 'Finca',
  tastingNotes: [],
  prices: { retail: 100, wholesale: null, unit: 'kg' },
  ...overrides,
});

test('normalizePrice defaults empty unit to kg and undefined wholesale to null', () => {
  expect(normalizePrice({ retail: 420, wholesale: undefined, unit: '' })).toEqual({
    retail: 420,
    wholesale: null,
    unit: 'kg',
  });
});

test('normalizePrice preserves explicit wholesale note', () => {
  const out = normalizePrice({ retail: 420, wholesale: 340, unit: 'kg', wholesaleNote: '+10kg' });
  expect(out.wholesale).toBe(340);
  expect(out.wholesaleNote).toBe('+10kg');
});

test('hasWholesale and getPriceUnit handle null and blank units', () => {
  expect(hasWholesale({ retail: 1, wholesale: null })).toBe(false);
  expect(hasWholesale({ retail: 1, wholesale: 2 })).toBe(true);
  expect(getPriceUnit({ retail: 1, wholesale: null, unit: '' })).toBe('kg');
  expect(getPriceUnit({ retail: 1, wholesale: null, unit: ' g ' })).toBe('g');
});

test('formatPrice and formatMoney use USD-style decimals', () => {
  expect(formatPrice(420)).toBe('$420.00');
  expect(formatMoney(420)).toBe('$420.00 MXN');
});

test('getVarietyRows combines process and score without ID branches', () => {
  expect(
    getVarietyRows(variety({ process: 'Lavado', score: '80–82 puntos' })),
  ).toContain('Lavado: 80–82 puntos');
});

test('getVarietyRows prefixes lone process and normalizes mesh label', () => {
  const rows = getVarietyRows(variety({ process: 'Lavado', mesh: '15/16' }));
  expect(rows).toContain('Proceso: Lavado');
  expect(rows).toContain('Zaranda: 15/16');
});

test('getVarietyRows orders attributes canonically and joins acidity/body', () => {
  const rows = getVarietyRows(
    variety({ variety: 'Bourbon', altitude: '1200 msnm', acidity: 'Cítrica', body: 'Sedoso' }),
  );
  expect(rows).toEqual([
    'Variedad: Bourbon',
    'Altura: 1200 msnm',
    'Acidez: Cítrica / Cuerpo: Sedoso',
  ]);
});

test('getVarietyRowsForWhatsApp only changes the acidity separator', () => {
  const rows = getVarietyRowsForWhatsApp(variety({ acidity: 'Cítrica', body: 'Sedoso' }));
  expect(rows).toEqual(['Acidez: Cítrica · Cuerpo: Sedoso']);
});

test('getSpecialsColumns splits by metadata and sorts by order', () => {
  const specials = [
    variety({ id: 'b', column: 'right', order: 1 }),
    variety({ id: 'a', column: 'left', order: 0 }),
    variety({ id: 'c', column: 'right', order: 0 }),
  ];
  const { left, right } = getSpecialsColumns(specials);
  expect(left.map((s) => s.id)).toEqual(['a']);
  expect(right.map((s) => s.id)).toEqual(['c', 'b']);
});

test('getSpecialsColumns falls back to balanced data order for N products', () => {
  const specials = [variety({ id: '1' }), variety({ id: '2' }), variety({ id: '3' })];
  const { left, right } = getSpecialsColumns(specials);
  expect(left.map((s) => s.id)).toEqual(['1', '2']);
  expect(right.map((s) => s.id)).toEqual(['3']);
});

test('getSections derives hrefs from catalog ids', () => {
  const catalog = loadCatalog({
    meta: { title: 'T', brand: 'B', motto: 'M', edition: '2026', tagline: 'X', instagram: { handle: '@b', url: 'https://x' }, storiesHeading: 'H' },
    traditional: { id: 'trad', title: 'A', subtitle: 'B', description: 'd', prices: { retail: 1, wholesale: null } },
    gourmet: { id: 'gour', title: 'A', subtitle: 'B', intro: 'i', legend: 'l', profiles: [], prices: { retail: 1, wholesale: null } },
    specialsTitle: { id: 'esp', title: 'A', subtitle: 'B' },
    specials: [],
    microlot: { id: 'micro', title: 'A', subtitle: 'B', description: 'd', priceRange: { min: 1, max: 2, unit: 'KG' } },
    stories: [],
  } as unknown as Catalog);
  const hrefs = getSections(catalog).map((s) => s.href);
  expect(hrefs).toEqual(['#portada', '#trad', '#gour', '#esp', '#micro', '#historias']);
});

test('loadCatalog throws on missing sections and normalizes valid input', () => {
  expect(() => loadCatalog(null)).toThrow();
  expect(() => loadCatalog({})).toThrow();
  const catalog = loadCatalog({
    meta: { title: 'T', brand: 'B', motto: 'M', edition: '2026', tagline: 'X', instagram: { handle: '@b', url: 'https://x' }, storiesHeading: 'H' },
    traditional: { id: 't', title: 'A', subtitle: 'B', description: 'd', prices: { retail: 1, wholesale: undefined, unit: '' } },
    gourmet: { id: 'g', title: 'A', subtitle: 'B', intro: 'i', legend: 'l', profiles: [], prices: { retail: 1, wholesale: null } },
    specialsTitle: { title: 'A', subtitle: 'B' },
    specials: [variety({ tastingNotes: undefined as unknown as [] })],
    microlot: { id: 'm', title: 'A', subtitle: 'B', description: 'd', priceRange: { min: 1, max: 2, unit: 'KG' } },
    stories: [],
  } as unknown as Catalog);
  expect(catalog.traditional.prices.unit).toBe('kg');
  expect(catalog.specialsTitle.id).toBe('mezclas-especiales');
  expect(catalog.meta.established).toBe('EST. 2017');
});

test('sentence capitalizes first letter and lowercases the rest', () => {
  expect(sentence('LEGADO QUE SE CULTIVA')).toBe('Legado que se cultiva');
});
