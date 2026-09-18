import type { BadgeTone, Catalog, Price, SpecialVariety } from '../types/catalog';

/**
 * Canonical catalog helpers.
 * Single source of truth for price + variety formatting.
 * Web (VarietyCard/PriceList) and WhatsApp script must use these,
 * keeping only markup/WhatsApp-syntax adapters locally.
 */

// --- Prices ---

export function normalizePrice(raw: Partial<Price> & { retail: number }): Price {
  const wholesale =
    raw.wholesale === undefined || raw.wholesale === null ? null : raw.wholesale;
  const rawUnit = (raw.unit ?? '').trim();
  const unit = rawUnit === '' ? 'kg' : rawUnit;
  return {
    retail: raw.retail,
    wholesale,
    unit,
    ...(raw.wholesaleNote ? { wholesaleNote: raw.wholesaleNote } : {}),
  };
}

export function hasWholesale(prices: Price): prices is Price & { wholesale: number } {
  return prices.wholesale !== null && prices.wholesale !== undefined;
}

export function getPriceUnit(prices: Price): string {
  const unit = (prices.unit ?? '').trim();
  return unit === '' ? 'kg' : unit;
}

export function formatPrice(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMoney(value: number): string {
  return `${formatPrice(value)} MXN`;
}

export function formatPriceRange(min: number, max: number): string {
  return `${formatPrice(min)} — ${formatPrice(max)}`;
}

export function formatMoneyRange(min: number, max: number): string {
  return `${formatMoney(min)} – ${formatMoney(max)}`;
}

export function getRetailLine(prices: Price): string {
  return `${formatPrice(prices.retail)} ${getPriceUnit(prices)}`.trim();
}

export function getWholesaleLine(prices: Price): string | null {
  if (!hasWholesale(prices)) return null;
  const note = prices.wholesaleNote ? ` ${prices.wholesaleNote}` : '';
  return `${formatPrice(prices.wholesale)} ${getPriceUnit(prices)}${note}`.trim();
}

// --- Variety details (canonical, no product-ID branches) ---

export function getVarietyRows(item: SpecialVariety): string[] {
  const out: string[] = [];

  if (item.process && item.score) {
    out.push(`${item.process}: ${item.score}`);
  } else if (item.process) {
    out.push(`Proceso: ${item.process}`);
  }
  if (item.variety) out.push(`Variedad: ${item.variety}`);
  if (item.varieties) out.push(`Variedades: ${item.varieties}`);
  if (item.mesh) out.push(`Zaranda: ${item.mesh}`);
  if (item.altitude) out.push(`Altura: ${item.altitude}`);
  if (item.harvest) out.push(`Cosecha: ${item.harvest}`);
  if (item.defects) out.push(`Defectos: ${item.defects}`);
  if (item.aroma) out.push(`Aroma: ${item.aroma}`);
  if (item.notes) out.push(`Notas: ${item.notes}`);
  if (item.acidity)
    out.push(`Acidez: ${item.acidity}${item.body ? ` / Cuerpo: ${item.body}` : ''}`);
  else if (item.body) out.push(`Cuerpo: ${item.body}`);
  if (item.species) out.push(`Especie: ${item.species}`);
  if (item.origin) out.push(`Origen: ${item.origin}`);
  if (item.fermentation) out.push(`Fermentación: ${item.fermentation}`);
  if (item.preparation) out.push(`Preparación: ${item.preparation}`);
  return out;
}

// WhatsApp uses same canonical rows, only acidity/body separator differs historically.
// Keep one canonical source; adapter converts " / " -> " · " for WhatsApp parity.
export function getVarietyRowsForWhatsApp(item: SpecialVariety): string[] {
  return getVarietyRows(item).map((row) =>
    row.startsWith('Acidez: ') ? row.replace(' / Cuerpo: ', ' · Cuerpo: ') : row,
  );
}

export function getProcessScoreLine(item: SpecialVariety): string | null {
  if (item.process && item.score) return `${item.process} · ${item.score}`;
  if (item.process) return item.process;
  return null;
}

// --- Layout: data-driven columns, no hard-coded IDs ---

export type SpecialColumn = 'left' | 'right';

export function getSpecialsColumns(specials: SpecialVariety[]): {
  left: SpecialVariety[];
  right: SpecialVariety[];
} {
  const withMeta = specials.filter((s) => s.column === 'left' || s.column === 'right');
  if (withMeta.length === 0) {
    // Fallback: preserve data order, balanced split. Supports N products.
    const mid = Math.ceil(specials.length / 2);
    return {
      left: specials.slice(0, mid),
      right: specials.slice(mid),
    };
  }
  // Place annotated items first, then deal unassigned ones to the shorter
  // column so partially-annotated catalogs still render every product.
  const sortByOrder = (a: SpecialVariety, b: SpecialVariety) =>
    (a.order ?? 0) - (b.order ?? 0);
  const left = withMeta.filter((s) => s.column === 'left').sort(sortByOrder);
  const right = withMeta.filter((s) => s.column === 'right').sort(sortByOrder);
  for (const item of specials) {
    if (item.column === 'left' || item.column === 'right') continue;
    if (left.length <= right.length) left.push(item);
    else right.push(item);
  }
  return { left, right };
}

// --- Sections / nav: single descriptor source ---

export interface SectionDescriptor {
  id: string;
  href: string;
  label: string;
}

export function getSections(catalog: Catalog): SectionDescriptor[] {
  return [
    { id: 'portada', href: '#portada', label: 'Portada' },
    { id: catalog.traditional.id, href: `#${catalog.traditional.id}`, label: 'Tradicional' },
    { id: catalog.gourmet.id, href: `#${catalog.gourmet.id}`, label: 'Gourmet' },
    {
      id: catalog.specialsTitle.id,
      href: `#${catalog.specialsTitle.id}`,
      label: 'Especiales',
    },
    { id: catalog.microlot.id, href: `#${catalog.microlot.id}`, label: 'Microlotes' },
    { id: 'historias', href: '#historias', label: 'Historias' },
  ];
}

// --- Validation: fail fast with paths, so hand-edited JSON mistakes surface at build ---

const TONES: BadgeTone[] = ['gaia', 'aura', 'helios', 'aether'];

function fail(path: string, message: string): never {
  throw new Error(`Invalid catalog at ${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function reqString(obj: Record<string, unknown>, key: string, path: string): void {
  if (typeof obj[key] !== 'string' || (obj[key] as string).trim() === '') {
    fail(`${path}.${key}`, 'expected non-empty string');
  }
}

function reqNumber(obj: Record<string, unknown>, key: string, path: string): void {
  const value = obj[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    fail(`${path}.${key}`, 'expected finite number >= 0');
  }
}

function checkPrice(raw: unknown, path: string): void {
  if (!isRecord(raw)) fail(path, 'expected price object');
  reqNumber(raw, 'retail', path);
  const wholesale = raw.wholesale;
  if (wholesale !== null && wholesale !== undefined) {
    if (typeof wholesale !== 'number' || !Number.isFinite(wholesale) || wholesale < 0) {
      fail(`${path}.wholesale`, 'expected finite number >= 0 or null');
    }
  }
  for (const key of ['unit', 'wholesaleNote']) {
    if (raw[key] !== undefined && typeof raw[key] !== 'string') {
      fail(`${path}.${key}`, 'expected string');
    }
  }
}

const OPTIONAL_TEXT_KEYS = [
  'process',
  'score',
  'variety',
  'varieties',
  'altitude',
  'harvest',
  'mesh',
  'defects',
  'aroma',
  'notes',
  'acidity',
  'body',
  'species',
  'origin',
  'fermentation',
  'preparation',
  'emblem',
  'status',
];

function checkSpecial(raw: unknown, path: string, seenIds: Set<string>): void {
  if (!isRecord(raw)) fail(path, 'expected product object');
  reqString(raw, 'id', path);
  const id = raw.id as string;
  if (seenIds.has(id)) fail(`${path}.id`, `duplicate product id "${id}"`);
  seenIds.add(id);
  reqString(raw, 'region', path);
  reqString(raw, 'farm', path);
  checkPrice(raw.prices, `${path}.prices`);
  if (raw.column !== undefined && raw.column !== 'left' && raw.column !== 'right') {
    fail(`${path}.column`, 'expected "left" or "right"');
  }
  if (raw.order !== undefined && typeof raw.order !== 'number') {
    fail(`${path}.order`, 'expected number');
  }
  if (raw.tastingNotes !== undefined && !Array.isArray(raw.tastingNotes)) {
    fail(`${path}.tastingNotes`, 'expected array');
  }
  for (const key of OPTIONAL_TEXT_KEYS) {
    if (raw[key] !== undefined && typeof raw[key] !== 'string') {
      fail(`${path}.${key}`, 'expected string');
    }
  }
}

function checkStory(raw: unknown, path: string): void {
  if (!isRecord(raw)) fail(path, 'expected story object');
  for (const key of ['id', 'name', 'title', 'tagline', 'description']) {
    reqString(raw, key, path);
  }
  // Missing tone is allowed (normalizeCatalog defaults it); wrong values are not.
  if (raw.tone !== undefined && !TONES.includes(raw.tone as BadgeTone)) {
    fail(`${path}.tone`, `expected one of ${TONES.join(', ')}`);
  }
}

export function validateCatalog(raw: unknown): asserts raw is Catalog {
  if (!isRecord(raw)) fail('catalog', 'expected object');

  const meta = raw.meta;
  if (!isRecord(meta)) fail('meta', 'expected object');
  for (const key of ['title', 'brand', 'motto', 'edition', 'tagline', 'storiesHeading']) {
    reqString(meta, key, 'meta');
  }
  const instagram = meta.instagram;
  if (!isRecord(instagram)) fail('meta.instagram', 'expected object');
  reqString(instagram, 'handle', 'meta.instagram');
  reqString(instagram, 'url', 'meta.instagram');

  const traditional = raw.traditional;
  if (!isRecord(traditional)) fail('traditional', 'expected object');
  for (const key of ['id', 'title', 'subtitle', 'description']) {
    reqString(traditional, key, 'traditional');
  }
  checkPrice(traditional.prices, 'traditional.prices');

  const gourmet = raw.gourmet;
  if (!isRecord(gourmet)) fail('gourmet', 'expected object');
  for (const key of ['id', 'title', 'subtitle', 'intro', 'legend']) {
    reqString(gourmet, key, 'gourmet');
  }
  if (!Array.isArray(gourmet.profiles)) fail('gourmet.profiles', 'expected array');
  gourmet.profiles.forEach((profile: unknown, i: number) => {
    if (!isRecord(profile)) fail(`gourmet.profiles[${i}]`, 'expected object');
    for (const key of ['name', 'acidity', 'sweetness', 'body']) {
      reqString(profile, key, `gourmet.profiles[${i}]`);
    }
  });
  checkPrice(gourmet.prices, 'gourmet.prices');

  const specialsTitle = raw.specialsTitle;
  if (!isRecord(specialsTitle)) fail('specialsTitle', 'expected object');
  for (const key of ['title', 'subtitle']) {
    reqString(specialsTitle, key, 'specialsTitle');
  }
  if (specialsTitle.id !== undefined && typeof specialsTitle.id !== 'string') {
    fail('specialsTitle.id', 'expected string');
  }

  if (!Array.isArray(raw.specials)) fail('specials', 'expected array');
  const seenIds = new Set<string>();
  raw.specials.forEach((item: unknown, i: number) => checkSpecial(item, `specials[${i}]`, seenIds));

  const microlot = raw.microlot;
  if (!isRecord(microlot)) fail('microlot', 'expected object');
  for (const key of ['id', 'title', 'subtitle', 'description']) {
    reqString(microlot, key, 'microlot');
  }
  const priceRange = microlot.priceRange;
  if (!isRecord(priceRange)) fail('microlot.priceRange', 'expected object');
  reqNumber(priceRange, 'min', 'microlot.priceRange');
  reqNumber(priceRange, 'max', 'microlot.priceRange');
  if ((priceRange.min as number) > (priceRange.max as number)) {
    fail('microlot.priceRange', 'expected min <= max');
  }

  if (!Array.isArray(raw.stories)) fail('stories', 'expected array');
  raw.stories.forEach((story: unknown, i: number) => checkStory(story, `stories[${i}]`));
}

// --- Normalization boundary (runs after validation, so shapes are trusted) ---

export function normalizeSpecial(raw: SpecialVariety): SpecialVariety {
  return {
    ...raw,
    tastingNotes: Array.isArray(raw.tastingNotes) ? raw.tastingNotes : [],
    prices: normalizePrice(raw.prices),
  };
}

export function normalizeCatalog(raw: Catalog): Catalog {
  return {
    ...raw,
    meta: {
      established: 'EST. 2017',
      ...raw.meta,
    },
    traditional: {
      ...raw.traditional,
      prices: normalizePrice(raw.traditional.prices),
    },
    gourmet: {
      ...raw.gourmet,
      prices: normalizePrice(raw.gourmet.prices),
    },
    specialsTitle: {
      ...raw.specialsTitle,
      id: (raw.specialsTitle as { id?: string }).id ?? 'mezclas-especiales',
    },
    specials: raw.specials.map(normalizeSpecial),
    stories: (raw.stories ?? []).map((story) => ({
      ...story,
      tone: (story as { tone?: BadgeTone }).tone ?? 'gaia',
    })),
  };
}

export function loadCatalog(raw: unknown): Catalog {
  validateCatalog(raw);
  return normalizeCatalog(raw);
}

export function sentence(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
