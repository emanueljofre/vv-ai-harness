#!/usr/bin/env node
/**
 * Derive a platform-build timeline from a project's artifacts.
 *
 * Reads every JSON artifact under a project that carries a `buildContext`
 * (regression runs, environment snapshots, etc.), groups by build fingerprint,
 * and prints a chronological view of which build was observed when — so you
 * can correlate test-behavior changes with platform rollouts without
 * maintaining a separate timeline file.
 *
 * Usage:
 *   node tools/analysis/build-timeline.js --project EmanuelJofre-vv5dev
 *   node tools/analysis/build-timeline.js --project WADNR --tc TC-1-A-BRT
 *   node tools/analysis/build-timeline.js --project X --json          # raw JSON
 *
 * The timeline is a *derived view* — no state is stored. Each observation
 * lives with the artifact that captured it (regression-results JSON,
 * environment.json, etc.). Delete an artifact, lose an observation — simple.
 */
const fs = require('fs');
const path = require('path');
const { fingerprint, extractFields, FINGERPRINT_FIELDS } = require('../helpers/build-fingerprint');

const PROJECTS_DIR = path.resolve(__dirname, '..', '..', 'projects');

// --- CLI ---
const args = process.argv.slice(2);
function getArg(flag) {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}
const PROJECT = getArg('--project');
const TC_FILTER = getArg('--tc');
const JSON_OUTPUT = args.includes('--json');

if (!PROJECT) {
    console.error('Usage: node tools/analysis/build-timeline.js --project <name> [--tc <id>] [--json]');
    process.exit(1);
}

const projectDir = path.join(PROJECTS_DIR, PROJECT.toLowerCase());
if (!fs.existsSync(projectDir)) {
    console.error(`Project not found: ${projectDir}`);
    process.exit(1);
}

// --- Walk project for artifacts with buildContext ---
function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p, out);
        else if (entry.isFile() && entry.name.endsWith('.json')) out.push(p);
    }
    return out;
}

const jsonFiles = walk(projectDir);

/**
 * Extract build observations from a JSON file.
 * An observation is `{ fingerprint, buildFields, timestamp, source, results? }`.
 * Returns zero or more observations per file (most files have one).
 */
function readObservations(file) {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return [];
    }
    const rel = path.relative(PROJECTS_DIR, file);
    const obs = [];

    // Pattern 1: regression-results JSON — has `buildContext` + `results`
    if (data.buildContext && data.results) {
        const ctx = data.buildContext;
        const fp = ctx.fingerprint || fingerprint(ctx);
        obs.push({
            fingerprint: fp,
            buildFields: extractFields(ctx),
            timestamp: ctx.timestamp || data.timestamp || data.completed,
            source: rel,
            kind: 'regression',
            summary: data.summary,
            results: data.results,
        });
    }
    // Pattern 2: environment.json — has `platform` + `formViewer` + `environment`
    else if (data.platform && data.environment) {
        const ctx = {
            environment: data.environment.baseUrl,
            progVersion: data.platform.progVersion,
            dbVersion: data.platform.dbVersion,
            formViewerBuild: data.formViewer?.buildNumber,
        };
        obs.push({
            fingerprint: fingerprint(ctx),
            buildFields: ctx,
            timestamp: data.generatedAt,
            source: rel,
            kind: 'env-profile',
        });
    }
    // Pattern 3: manual run-metadata stubs — has `buildContext` without `results`
    else if (data.buildContext) {
        const ctx = data.buildContext;
        obs.push({
            fingerprint: ctx.fingerprint || fingerprint(ctx),
            buildFields: extractFields(ctx),
            timestamp: ctx.timestamp || data.timestamp,
            source: rel,
            kind: data.kind || 'metadata',
            summary: data.summary,
        });
    }
    return obs;
}

const allObservations = jsonFiles.flatMap(readObservations).filter((o) => o.timestamp);
allObservations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

// --- Group by fingerprint, compute windows ---
const byFp = new Map();
for (const o of allObservations) {
    if (!byFp.has(o.fingerprint)) {
        byFp.set(o.fingerprint, { fingerprint: o.fingerprint, buildFields: o.buildFields, observations: [] });
    }
    byFp.get(o.fingerprint).observations.push(o);
}
for (const b of byFp.values()) {
    b.observations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    b.firstSeen = b.observations[0].timestamp;
    b.lastSeen = b.observations[b.observations.length - 1].timestamp;
    b.sources = b.observations.map((o) => o.source);
    b.kinds = [...new Set(b.observations.map((o) => o.kind))];
}
const builds = [...byFp.values()].sort((a, b) => new Date(a.firstSeen) - new Date(b.firstSeen));

// --- Per-TC history (optional) ---
let tcHistory = null;
if (TC_FILTER) {
    // Normalize: reporter stores tcId as the capture after "TC-" (e.g., "1-D-BRT"),
    // while users usually type "TC-1-D-BRT". Match either form.
    const normalized = TC_FILTER.replace(/^TC-/i, '').toLowerCase();
    tcHistory = [];
    for (const o of allObservations) {
        if (!o.results) continue;
        const matches = o.results.filter((r) => {
            const tc = String(r.tcId || '').toLowerCase();
            return tc === normalized || tc === TC_FILTER.toLowerCase();
        });
        for (const r of matches) {
            tcHistory.push({
                timestamp: o.timestamp,
                fingerprint: o.fingerprint,
                project: r.project,
                status: r.status,
                actualRaw: r.actualRaw,
                actualApi: r.actualApi,
                source: o.source,
            });
        }
    }
    tcHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// --- Output ---
if (JSON_OUTPUT) {
    console.log(JSON.stringify({ project: PROJECT, builds, tcHistory }, null, 2));
    process.exit(0);
}

function fmtTs(ts) {
    if (!ts) return '?';
    return ts
        .replace('T', ' ')
        .replace(/\.\d+Z$/, 'Z')
        .slice(0, 19);
}

console.log(`\n# Build timeline — ${PROJECT}`);
console.log(
    `\nArtifacts scanned: ${jsonFiles.length} · observations with build context: ${allObservations.length} · distinct builds: ${builds.length}`
);
console.log(`Fingerprint fields: ${FINGERPRINT_FIELDS.join(', ')}\n`);

for (const b of builds) {
    console.log(`## Build ${b.fingerprint}`);
    for (const f of FINGERPRINT_FIELDS) {
        if (b.buildFields[f] != null) console.log(`  ${f.padEnd(16)} ${b.buildFields[f]}`);
    }
    console.log(`  firstSeen        ${fmtTs(b.firstSeen)}`);
    console.log(`  lastSeen         ${fmtTs(b.lastSeen)}`);
    console.log(`  observations     ${b.observations.length} (${b.kinds.join(', ')})`);

    for (const o of b.observations) {
        const summary = o.summary
            ? ` · P:${o.summary.passed} F:${o.summary.failed} T:${o.summary.timedOut} S:${o.summary.skipped}`
            : '';
        console.log(`    ${fmtTs(o.timestamp)} · ${o.kind.padEnd(12)} ${o.source}${summary}`);
    }
    console.log();
}

if (tcHistory) {
    console.log(`# History for ${TC_FILTER} (${tcHistory.length} entries)\n`);
    console.log(
        '| Timestamp           | Build    | Project        | Status   | actualRaw                        | actualApi                        |'
    );
    console.log(
        '| ------------------- | -------- | -------------- | -------- | -------------------------------- | -------------------------------- |'
    );
    for (const h of tcHistory) {
        const raw = (h.actualRaw ?? '').toString().slice(0, 32);
        const api = (h.actualApi ?? '').toString().slice(0, 32);
        console.log(
            `| ${fmtTs(h.timestamp).padEnd(19)} | ${h.fingerprint.padEnd(8)} | ${h.project.padEnd(14)} | ${h.status.padEnd(8)} | ${raw.padEnd(32)} | ${api.padEnd(32)} |`
        );
    }
    console.log();
}

if (builds.length <= 1) {
    console.log(
        '_Only one distinct build observed — timeline becomes useful after a platform rollout changes the fingerprint._'
    );
}
