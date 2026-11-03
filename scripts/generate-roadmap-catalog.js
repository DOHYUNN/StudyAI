import {readFileSync,writeFileSync} from 'node:fs';
import {validateCatalog} from '../src/roadmap/model.js';
const source=new URL('../src/roadmap/catalog.json',import.meta.url);
const raw=JSON.parse(readFileSync(source,'utf8'));
validateCatalog(raw);
// Pages' managed Functions bundler predates JSON import attributes.
// Keep one canonical JSON catalog and prepare a plain ESM module for it.
writeFileSync(new URL('../shared/roadmap-catalog.generated.js',import.meta.url),'// Generated from src/roadmap/catalog.json. Do not edit.\nexport default '+JSON.stringify(raw)+';\n');
console.log('Prepared roadmap catalog for Pages Functions.');
