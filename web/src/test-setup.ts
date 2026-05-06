// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

// ── Node 25 localStorage polyfill ────────────────────────────────────────────
// Node 25 ships a native `localStorage` global backed by --localstorage-file.
// When no valid file path is provided the native getter returns a broken object
// whose methods all throw "not a function".  This runs before any test code so
// we replace it with a clean in-memory implementation that tests can rely on.
;(function installLocalStorage() {
  function makeStorage(): Storage {
    const store = new Map<string, string>()
    return {
      get length() { return store.size },
      key(index: number): string | null {
        return [...store.keys()][index] ?? null
      },
      getItem(key: string): string | null {
        return store.has(key) ? store.get(key)! : null
      },
      setItem(key: string, value: string): void {
        store.set(key, String(value))
      },
      removeItem(key: string): void {
        store.delete(key)
      },
      clear(): void {
        store.clear()
      },
    } as unknown as Storage
  }

  // Detect the broken native implementation: methods that are not real functions
  let needsPolyfill = false
  try {
    if (typeof localStorage === 'undefined') {
      needsPolyfill = true
    } else {
      // Try calling a method — if it throws or isn't a function, polyfill
      if (typeof localStorage.setItem !== 'function') needsPolyfill = true
    }
  } catch {
    needsPolyfill = true
  }

  if (needsPolyfill) {
    const storage = makeStorage()
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      writable: true,
      configurable: true,
      enumerable: true,
    })
  }
})()

import '@testing-library/jest-dom'
