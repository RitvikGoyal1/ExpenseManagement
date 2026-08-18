module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      // zustand/middleware bundles its `devtools` chunk (Vite-style `import.meta.env` check)
      // even though this app only uses `persist`/`createJSONStorage` from it. Metro's web output
      // doesn't transform that syntax on its own, so left disabled the raw `import.meta` reaches
      // the browser as a classic (non-module) script and throws a SyntaxError before anything
      // renders. This rewrites it to `globalThis.__ExpoImportMetaRegistry`, which Expo's own
      // runtime already polyfills (node_modules/expo/src/winter/runtime.ts).
      ['babel-preset-expo', { web: { unstable_transformImportMeta: true } }],
    ],

    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],

          alias: {
            '@': './',
          },
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};
