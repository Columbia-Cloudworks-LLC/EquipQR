"""Regression checks for export failure handling; no database credentials needed."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent


class ExportBaselineTest(unittest.TestCase):
    def run_export(self, failure):
        with tempfile.TemporaryDirectory() as directory:
            tmp = Path(directory)
            bins = tmp / 'bin'
            bins.mkdir()
            output = tmp / 'output'
            output.mkdir()
            for name in ('schema.sql', 'rls-policies.sql'):
                (output / name).write_text('original')
            commands = {
                'supabase': '#!/bin/bash\nwhile [[ "$1" != --file ]]; do shift; done\necho schema > "$2"\n',
                'psql': '''#!/usr/bin/env python3
import json, os, sys
sql = sys.stdin.read()
assert os.environ['PGOPTIONS'] == '-c default_transaction_read_only=on'
assert 'ON_ERROR_STOP=1' in sys.argv
if os.environ['FAIL_EXPORT'] == 'query':
    print('catalog query failed', file=sys.stderr)
    sys.exit(7)
if os.environ['FAIL_EXPORT'] == 'json':
    print('not json')
else:
    rows = ([dict(schema_name='public', table_name='equipment', rls_enabled=True, rls_forced=False)]
            if 'pg_class' in sql else
            [dict(schemaname='public', tablename='equipment', policyname='read',
                  roles=['authenticated'], permissive='PERMISSIVE', cmd='SELECT',
                  qual='owner = auth.uid()', with_check=None)])
    print(json.dumps({'rows': rows}))
''',
            }
            for name, content in commands.items():
                path = bins / name
                path.write_text(content)
                path.chmod(0o755)
            env = dict(os.environ, PATH=f'{bins}:{os.environ["PATH"]}',
                       DATABASE_URL='postgresql://test', FAIL_EXPORT=failure,
                       SCHEMA_EXPORT_OUTPUT_DIR=str(output), TMPDIR=str(tmp))
            result = subprocess.run(['bash', str(ROOT / 'dev/export-schema-baseline.sh')],
                                    env=env, capture_output=True, text=True)
            if failure:
                self.assertNotEqual(result.returncode, 0)
                for name in ('schema.sql', 'rls-policies.sql'):
                    self.assertEqual((output / name).read_text(), 'original')
                if failure == 'query':
                    self.assertIn('catalog query failed', result.stderr)
                    self.assertNotIn('JSONDecodeError', result.stderr)
            else:
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual((output / 'schema.sql').read_text(), 'schema\n')
                rls = (output / 'rls-policies.sql').read_text()
                self.assertIn('public | equipment | true | false', rls)
                self.assertIn('roles=[authenticated]', rls)
                self.assertIn('owner = auth.uid()', rls)
            self.assertEqual(sorted(p.name for p in tmp.iterdir()), ['bin', 'output'])

    def test_success(self):
        self.run_export('')

    def test_query_failure_preserves_existing_references(self):
        self.run_export('query')

    def test_invalid_json_preserves_existing_references(self):
        self.run_export('json')


if __name__ == '__main__':
    unittest.main()
