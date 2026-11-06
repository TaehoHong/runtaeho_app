// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { native: { unstable_transformProfile: 'hermes-v0' } }]],
    plugins: [
      ['module-resolver', {
        alias: {
          '@': './app',
          '~': './src',
          '#': './',
          assets: './assets',
        }
      }],
      'react-native-reanimated/plugin'
    ]
  };
};
