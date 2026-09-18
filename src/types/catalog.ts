export interface Price {
  retail: number;
  wholesale: number | null;
  unit?: string;
  wholesaleNote?: string;
}

export interface GourmetProfile {
  name: string;
  acidity: string;
  sweetness: string;
  body: string;
}

export interface TraditionalBlend {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  prices: Price;
  status?: string;
}

export interface GourmetSection {
  id: string;
  title: string;
  subtitle: string;
  intro: string;
  legend: string;
  profiles: GourmetProfile[];
  prices: Price;
  status?: string;
}

export interface SpecialVariety {
  id: string;
  region: string;
  farm: string;
  process?: string;
  score?: string;
  variety?: string;
  // score acompaña a process en "Lavado: 80–82 puntos" / "Natural: 83-85"
  altitude?: string;
  harvest?: string;
  mesh?: string;
  defects?: string;
  aroma?: string;
  notes?: string;
  acidity?: string;
  body?: string;
  species?: string;
  varieties?: string;
  origin?: string;
  fermentation?: string;
  preparation?: string;
  tastingNotes: string[];
  prices: Price;
  emblem?: string;
  status?: string;
  /** Data-driven layout: replaces hard-coded ID lists in SpecialsSection. */
  column?: 'left' | 'right';
  order?: number;
}

export interface Microlot {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  priceRange: { min: number; max: number; unit: string };
}

export interface Story {
  id: string;
  name: string;
  title: string;
  tagline: string;
  description: string;
}

export interface CatalogMeta {
  title: string;
  brand: string;
  motto: string;
  edition: string;
  tagline: string;
  instagram: { handle: string; url: string };
  storiesHeading: string;
  established?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface SpecialsTitle {
  id: string;
  title: string;
  subtitle: string;
}

export interface Catalog {
  meta: CatalogMeta;
  traditional: TraditionalBlend;
  gourmet: GourmetSection;
  specialsTitle: SpecialsTitle;
  specials: SpecialVariety[];
  microlot: Microlot;
  stories: Story[];
}

// Price formatting lives in src/lib/catalog.ts (single source).
// This file stays types-only.
