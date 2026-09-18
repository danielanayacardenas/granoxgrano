// Minimal ambient types for `bun:test` so `astro check` (tsc) passes
// without adding a dependency. Bun provides the real module at runtime.
declare module 'bun:test' {
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(actual: unknown): {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toContain(expected: unknown): void;
    toThrow(expected?: unknown): void;
  };
}
