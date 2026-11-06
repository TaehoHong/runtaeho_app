/* global __dirname */
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { resolvePath } = require('babel-plugin-module-resolver');

const config = require('../babel.config.js')({ cache() {} });
const options = config.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'module-resolver')[1];
const navigationFile = require.resolve('expo-router/build/navigationEvents/navigation.js');

function resolveFromNavigation(request) {
  const rewritten = resolvePath(request, navigationFile, options) ?? request;
  return require.resolve(path.resolve(path.dirname(navigationFile), rewritten));
}

test('Router relative index imports resolve to its own event emitter', () => {
  assert.equal(resolveFromNavigation('.'), require.resolve('expo-router/build/navigationEvents/index.js'));
});

test('app asset imports remain resolvable from dependencies and app files', () => {
  assert.equal(resolveFromNavigation('assets/images/icon.png'), path.resolve(__dirname, '../assets/images/icon.png'));
});
