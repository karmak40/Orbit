// Global jest setup for component/screen tests. Runs once per test file,
// before the test framework itself, so `jest.mock` calls here apply across
// every test that imports the mocked module.

// Real `useSafeAreaInsets`/`SafeAreaProvider` need a native measurement that
// doesn't exist under react-test-renderer — the package ships its own jest
// mock for exactly this (fixed 320x640 frame, zero insets).
jest.mock('react-native-safe-area-context', () => {
  // The package ships this mock as a TS default export — babel-jest compiles
  // it to `{ default: {...} }`, so the flat shape RN code expects is one level in.
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});
