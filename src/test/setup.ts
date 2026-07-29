import "@testing-library/jest-dom/vitest";
// jsdom has no IndexedDB; Dexie needs one for any persistence-touching test.
import "fake-indexeddb/auto";
