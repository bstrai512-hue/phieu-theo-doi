import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';

// Run interface tests using Node 22.15+ without an additional test dependency.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
      if (specifier.startsWith('.')) return nextResolve(`${specifier}.ts`, context);
      if (specifier.startsWith('dayjs/')) return nextResolve(`${specifier}.js`, context);
      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (!url.endsWith('.ts')) return nextLoad(url, context);
    return {
      format: 'module',
      source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8')),
      shortCircuit: true,
    };
  },
});
