module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // zod 4 ships `export * as core from …`, which the React Native preset leaves alone.
  plugins: ['@babel/plugin-transform-export-namespace-from'],
};
