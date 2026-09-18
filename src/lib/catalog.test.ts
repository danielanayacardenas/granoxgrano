import { expect, test } from 'bun:test';
import type { Catalog, SpecialVariety } from '../types/catalog';
import rawCatalog from '../data/catalog.json';
import {
  formatMoney,
  formatMoneyRange,
  formatPrice,
  formatPriceRange,
  getPriceUnit,
  getSections,
  getSpecialsColumns,
  getVarietyRows,
  getVarietyRowsForWhatsApp,
  getWholesaleLine,
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

test('getSpecialsColumns deals unassigned items to the shorter column', () => {
  const specials = [
    variety({ id: 'a', column: 'left', order: 0 }),
    variety({ id: 'b' }),
    variety({ id: 'c', column: 'right', order: 0 }),
  ];
  const { left, right } = getSpecialsColumns(specials);
  expect(left.map((s) => s.id)).toEqual(['a', 'b']);
  expect(right.map((s) => s.id)).toEqual(['c']);
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

test('formatPriceRange and formatMoneyRange join min and max', () => {
  expect(formatPriceRange(600, 1200)).toBe('$600.00 — $1,200.00');
  expect(formatMoneyRange(600, 1200)).toBe('$600.00 MXN – $1,200.00 MXN');
});

test('getWholesaleLine returns null without wholesale', () => {
  expect(getWholesaleLine({ retail: 100, wholesale: null })).toBeNull();
  expect(
    getWholesaleLine({ retail: 100, wholesale: 340, unit: 'kg', wholesaleNote: '+10kg' }),
  ).toBe('$340.00 kg +10kg');
});

test('loadCatalog defaults missing story tones to gaia', () => {
  const catalog = loadCatalog({
    meta: { title: 'T', brand: 'B', motto: 'M', edition: '2026', tagline: 'X', instagram: { handle: '@b', url: 'https://x' }, storiesHeading: 'H' },
    traditional: { id: 't', title: 'A', subtitle: 'B', description: 'd', prices: { retail: 1, wholesale: null } },
    gourmet: { id: 'g', title: 'A', subtitle: 'B', intro: 'i', legend: 'l', profiles: [], prices: { retail: 1, wholesale: null } },
    specialsTitle: { id: 'esp', title: 'A', subtitle: 'B' },
    specials: [],
    microlot: { id: 'm', title: 'A', subtitle: 'B', description: 'd', priceRange: { min: 1, max: 2, unit: 'KG' } },
    stories: [{ id: 'x', name: 'X', title: 'T', tagline: 't', description: 'd' }],
  } as unknown as Catalog);
  expect(catalog.stories[0].tone).toBe('gaia');
});

test('real catalog.json validates and normalizes', () => {
  const catalog = loadCatalog(rawCatalog);
  expect(catalog.specials.length).toBe(4);
  expect(catalog.stories.map((s) => s.tone)).toEqual(['gaia', 'aura', 'helios', 'aether']);
});

test('loadCatalog reports the offending path', () => {
  expect(() => loadCatalog({})).toThrow('meta');
  expect(() =>
    loadCatalog({
      ...(rawCatalog as unknown as Record<string, unknown>),
      traditional: { ...(rawCatalog as unknown as { traditional: Record<string, unknown> }).traditional, description: '' },
    }),
  ).toThrow('traditional.description');
  expect(() =>
    loadCatalog({
      ...(rawCatalog as unknown as Record<string, unknown>),
      specials: [
        ...(rawCatalog as unknown as { specials: unknown[] }).specials,
        (rawCatalog as unknown as { specials: Record<string, unknown>[] }).specials[0],
      ],
    }),
  ).toThrow('duplicate product id');
  expect(() =>
    loadCatalog({
      ...(rawCatalog as unknown as Record<string, unknown>),
      stories: [{ id: 'x', name: 'X', title: 'T', tagline: 't', description: 'd', tone: 'fuego' }],
    }),
  ).toThrow('stories[0].tone');
  expect(() =>
    loadCatalog({
      ...(rawCatalog as unknown as Record<string, unknown>),
      microlot: { ...(rawCatalog as unknown as { microlot: Record<string, unknown> }).microlot, priceRange: { min: 5, max: 2, unit: 'KG' } },
    }),
  ).toThrow('microlot.priceRange');
});
