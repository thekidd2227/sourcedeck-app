'use strict';

const fs = require('fs');
const path = require('path');
const { looksLikeAppShellText } = require('./sam-body-classifier');

const MAX_VALIDATION_BYTES = 256 * 1024;

function packageRoot(userDataPath) {
  return path.join(String(userDataPath || ''), 'govcon', 'solicitations');
}

async function resolvedInsideRoot(root, filePath) {
  let approvedRoot;
  let target;
  try { approvedRoot = await fs.promises.realpath(root); }
  catch (_) { approvedRoot = path.resolve(root); }
  try { target = await fs.promises.realpath(filePath); }
  catch (_) { target = path.resolve(filePath); }
  const rel = path.relative(approvedRoot, target);
  return {
    ok: !!target && !rel.startsWith('..') && !path.isAbsolute(rel),
    target,
    approvedRoot
  };
}

async function readSample(filePath, size) {
  const length = Math.min(MAX_VALIDATION_BYTES, Math.max(0, Number(size) || 0));
  if (!length) return Buffer.alloc(0);
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const out = Buffer.alloc(length);
    const read = await handle.read(out, 0, length, 0);
    return out.slice(0, read.bytesRead);
  } finally {
    await handle.close();
  }
}

async function validatePackageFiles(manifest, userDataPath) {
  manifest = manifest || {};
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const root = packageRoot(userDataPath);
  const results = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index] || {};
    const localPath = String(file.localPath || '');
    const base = { id: file.id, index, localPath };
    if (!localPath) {
      results.push({ ...base, ok: false, reason: 'no_path' });
      continue;
    }
    try {
      const allowed = await resolvedInsideRoot(root, localPath);
      if (!allowed.ok) {
        results.push({ ...base, ok: false, reason: 'path_outside_root' });
        continue;
      }
      const stat = await fs.promises.stat(allowed.target).catch(() => null);
      if (!stat || !stat.isFile()) {
        results.push({ ...base, ok: false, reason: 'file_missing' });
        continue;
      }
      const sample = await readSample(allowed.target, stat.size);
      if (looksLikeAppShellText(sample.toString('utf8'))) {
        results.push({ ...base, ok: false, reason: 'app_shell_content' });
      } else {
        results.push({ ...base, ok: true });
      }
    } catch (_) {
      results.push({ ...base, ok: false, reason: 'read_error' });
    }
  }

  return { ok: true, results };
}

async function sanitizeManifestPaths(manifest, userDataPath) {
  manifest = manifest || {};
  const root = packageRoot(userDataPath);
  const files = Array.isArray(manifest.files) ? manifest.files : [];

  async function sanitizeEntry(entry, topLevel) {
    if (!entry || !entry.localPath) return;
    try {
      const allowed = await resolvedInsideRoot(root, String(entry.localPath));
      if (allowed.ok) return;
    } catch (_) {}
    entry.localPath = '';
    if (topLevel) entry.status = 'rejected_invalid_path';
  }

  for (const file of files) {
    await sanitizeEntry(file, true);
    const extracted = Array.isArray(file && file.extractedFiles) ? file.extractedFiles : [];
    for (const child of extracted) await sanitizeEntry(child, false);
  }
  return manifest;
}

module.exports = {
  MAX_VALIDATION_BYTES,
  packageRoot,
  validatePackageFiles,
  sanitizeManifestPaths,
  _resolvedInsideRoot: resolvedInsideRoot
};
