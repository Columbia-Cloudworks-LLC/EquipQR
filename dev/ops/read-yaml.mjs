// CLI adapter used by github-secrets.sh; parsing YAML is delegated to the library.
import fs from 'node:fs';
import yaml from 'js-yaml';
console.log(JSON.stringify(yaml.load(fs.readFileSync(process.argv[2], 'utf8'))));
