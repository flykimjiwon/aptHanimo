import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const prototype = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['tests/run.mjs', 'tests/golden.json', 'src/02_world.js', 'src/04_route.js', 'data/cell_data.json', 'tools/complexes.json'];

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apthanimo-harness-'));
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.copyFileSync(path.join(prototype, file), path.join(dir, file));
  }
  t.after(() => {
    for (const file of files) if (fs.existsSync(path.join(dir, file))) fs.unlinkSync(path.join(dir, file));
    for (const folder of ['tests', 'src', 'data', 'tools']) fs.rmdirSync(path.join(dir, folder));
    fs.rmdirSync(dir);
  });
  return {
    golden: path.join(dir, 'tests/golden.json'),
    data: path.join(dir, 'data/cell_data.json'),
    run: (...args) => spawnSync(process.execPath, [path.join(dir, 'tests/run.mjs'), ...args], { encoding: 'utf8' }),
  };
}

test('committed fixtures pass without modifying the golden file', (t) => {
  const f = fixture(t), before = fs.readFileSync(f.golden, 'utf8'), result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(fs.readFileSync(f.golden, 'utf8'), before);
});

test('missing golden fails without silently creating a new baseline', (t) => {
  const f = fixture(t);
  fs.unlinkSync(f.golden);
  assert.equal(f.run().status, 1);
  assert.equal(fs.existsSync(f.golden), false);
});

for (const [name, value] of [['invalid JSON', '{'], ['empty metrics', '{"metrics":{}}'], ['missing metric', null]]) {
  test(`${name} golden fails without overwriting it`, (t) => {
    const f = fixture(t);
    const golden = JSON.parse(fs.readFileSync(f.golden, 'utf8'));
    delete golden.metrics.HYBER.exitStroller;
    const before = value ?? JSON.stringify(golden);
    fs.writeFileSync(f.golden, before);
    const result = f.run();
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.equal(fs.readFileSync(f.golden, 'utf8'), before);
  });
}

for (const fault of ['missing odir', 'missing oneway', 'short odir', 'invalid direction']) {
  test(`${fault} fails even with --update and preserves the golden`, (t) => {
    const f = fixture(t), before = fs.readFileSync(f.golden, 'utf8');
    const data = JSON.parse(fs.readFileSync(f.data, 'utf8'));
    if (fault === 'missing odir') delete data.odir;
    if (fault === 'missing oneway') delete data.oneway;
    if (fault === 'short odir') data.odir.pop();
    if (fault === 'invalid direction') data.odir[data.oneway.findIndex(Boolean)] = 8;
    fs.writeFileSync(f.data, JSON.stringify(data));
    const result = f.run('--update');
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.equal(fs.readFileSync(f.golden, 'utf8'), before);
  });
}

test('--update does not write a golden when another validation fails', (t) => {
  const f = fixture(t), before = fs.readFileSync(f.golden, 'utf8');
  const data = JSON.parse(fs.readFileSync(f.data, 'utf8'));
  data.complexes[0].facts = [];
  fs.writeFileSync(f.data, JSON.stringify(data));
  assert.equal(f.run('--update').status, 1);
  assert.equal(fs.readFileSync(f.golden, 'utf8'), before);
});

test('explicit --update can create a baseline after valid input passes', (t) => {
  const f = fixture(t);
  fs.unlinkSync(f.golden);
  const result = f.run('--update');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(f.golden, 'utf8')).metrics.HYBER.exitStroller.min, 11);
  assert.equal(f.run().status, 0);
});
