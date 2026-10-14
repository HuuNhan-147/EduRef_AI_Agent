// Parse local JS/JSX and reject unused imports without importing application code.
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const root = path.resolve(__dirname, '../../..');
const ignored = new Set(['node_modules', 'dist', '.git', '.npm-cache', 'scratch']);
let files = 0;
let errors = 0;
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignored.has(entry.name)) visit(file);
    } else if (/\.(?:js|jsx|mjs|cjs)$/.test(entry.name)) {
      files++;
      try {
        const ast = parse(fs.readFileSync(file, 'utf8'), { sourceType: 'unambiguous', plugins: ['jsx'] });
        traverse(ast, { ImportDeclaration(importPath) {
          for (const specifier of importPath.node.specifiers) {
            if (!importPath.scope.getBinding(specifier.local.name)?.referenced) {
              errors++;
              console.error(`${path.relative(root, file)}:${specifier.loc.start.line}: unused import ${specifier.local.name}`);
            }
          }
        } });
      } catch (error) {
        errors++;
        console.error(`${path.relative(root, file)}: ${error.message}`);
      }
    }
  }
}
visit(path.join(root, 'EDUREF_AI/backend'));
visit(path.join(root, 'EDUREF_AI/frontend/src'));
visit(path.join(root, 'EDUREF_AI/frontend/scripts'));
visit(path.join(root, 'EDUREF_AI/frontend/test'));
console.log(`Checked ${files} JS/JSX files; ${errors} syntax/unused-import errors.`);
process.exitCode = errors ? 1 : 0;
