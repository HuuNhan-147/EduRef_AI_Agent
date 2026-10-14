import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import config from '../tailwind.config.js';

test('custom UI tokens generate CSS with the installed Tailwind version', async () => {
  const classes = ['shadow-xs', 'shadow-2xs', 'backdrop-blur-xs', 'focus:ring-1.5',
    'z-60', 'animate-fade-in', 'animate-slide-in'];
  const result = await postcss([tailwind({ ...config, content: [{ raw: classes.join(' '), extension: 'html' }] })])
    .process('@tailwind utilities;', { from: undefined });
  const selectors = [];
  result.root.walkRules((rule) => selectors.push(rule.selector));
  for (const name of classes) {
    const escaped = `.${name.replace(/[:.]/g, (match) => `\\${match}`)}`;
    assert.ok(selectors.some((selector) => selector.startsWith(escaped)), `${name} must have a CSS rule`);
  }
});
