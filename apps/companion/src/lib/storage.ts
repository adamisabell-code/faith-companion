// On web, the browser's own localStorage (guarded for server rendering).
export const sessionStorage: Storage | undefined =
  typeof window !== "undefined" ? window.localStorage : undefined;
