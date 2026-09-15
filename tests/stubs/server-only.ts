// `server-only` throws by design when imported outside a React Server
// Component, which is exactly what a plain Node test run looks like. Modules
// under test import it as a guard, not for behaviour, so the test run swaps in
// this empty module. The guard still holds everywhere it matters — the real
// package is untouched in the app build.
export {};
