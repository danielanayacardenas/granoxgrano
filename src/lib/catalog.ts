import type { Catalog, Price, SpecialVariety } from '../types/catalog';

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
  const unit = (raw.unit ?? '').trim() === '' ? 'kg' : (raw.unit as string).trim();
  return {
    retail: raw.retail,
    wholesale,
    unit,
    ...(raw.wholesaleNote ? { wholesaleNote: raw.wholesaleNote } : {}),
  };
}

export function hasWholesale(prices: Price): boolean {
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

export function getRetailLine(prices: Price): string {
  return `${formatPrice(prices.retail)} ${getPriceUnit(prices)}`.trim();
}

export function getWholesaleLine(prices: Price): string | null {
  if (!hasWholesale(prices)) return null;
  const note = prices.wholesaleNote ? ` ${prices.wholesaleNote}` : '';
  return `${formatPrice(prices.wholesale as number)} ${getPriceUnit(prices)}${note}`.trim();
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
  if (withMeta.length === specials.length && specials.length > 0) {
    const sortByOrder = (a: SpecialVariety, b: SpecialVariety) =>
      (a.order ?? 0) - (b.order ?? 0);
    return {
      left: withMeta.filter((s) => s.column === 'left').sort(sortByOrder),
      right: withMeta.filter((s) => s.column === 'right').sort(sortByOrder),
    };
  }
  // Fallback: preserve data order, balanced split. Supports N products.
  const mid = Math.ceil(specials.length / 2);
  return {
    left: specials.slice(0, mid),
    right: specials.slice(mid),
  };
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

// --- Normalization / validation boundary ---

export function normalizeSpecial(raw: SpecialVariety): SpecialVariety {
  return {
    ...raw,
    tastingNotes: Array.isArray(raw.tastingNotes) ? raw.tastingNotes : [],
    prices: normalizePrice(raw.prices as Price),
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
      id: 'mezclas-especiales',
      ...(raw.specialsTitle as { id?: string }),
    } as Catalog['specialsTitle'],
    specials: raw.specials.map(normalizeSpecial),
    stories: raw.stories ?? [],
  };
}

export function loadCatalog(raw: unknown): Catalog {
  const data = raw as Catalog;
  if (!data || typeof data !== 'object') throw new Error('Invalid catalog data');
  if (!data.meta || !data.traditional || !data.gourmet || !Array.isArray(data.specials)) {
    throw new Error('Catalog missing required sections');
  }
  return normalizeCatalog(data);
}

export function sentence(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
