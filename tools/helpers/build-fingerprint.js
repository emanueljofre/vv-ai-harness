/**
 * Compute a short, stable fingerprint from build metadata.
 *
 * The fingerprint identifies a unique combination of VV platform state that
 * affects test behavior: the code running (formViewerBuild, progVersion),
 * the data layer (dbVersion), and the environment (base URL). Two runs with
 * the same fingerprint observed the same platform version; different
 * fingerprints mean something changed.
 *
 * Usage:
 *   const { fingerprint } = require('tools/helpers/build-fingerprint');
 *   const fp = fingerprint({ formViewerBuild, progVersion, dbVersion, environment });
 *
 * Design: minimal fields, short hash (SHA-8), stable input order — so the same
 * inputs always yield the same fingerprint regardless of object key order.
 */
const crypto = require('crypto');

// Fields that define the behavior-relevant identity of the platform.
// Order matters: must be stable to produce identical fingerprints.
const FINGERPRINT_FIELDS = ['environment', 'progVersion', 'dbVersion', 'formViewerBuild'];

/**
 * Compute a SHA-8 fingerprint from build metadata.
 *
 * @param {Object} ctx - Object with one or more FINGERPRINT_FIELDS
 * @returns {string} 8-char hex (e.g., "a1b2c3d4"), or "00000000" if no usable fields
 */
function fingerprint(ctx) {
    if (!ctx || typeof ctx !== 'object') return '00000000';
    const parts = FINGERPRINT_FIELDS.map((f) => {
        const v = ctx[f];
        return v == null ? '' : String(v);
    });
    // If every field is empty, return zero fingerprint (no identity)
    if (parts.every((p) => p === '')) return '00000000';
    const input = parts.join('|');
    return crypto.createHash('sha256').update(input).digest('hex').slice(0, 8);
}

/**
 * Extract the fingerprint-relevant subset from a larger build-context object.
 *
 * @param {Object} ctx - build context (e.g., from captureBuildContext or environment.json)
 * @returns {Object} subset with only fingerprint fields
 */
function extractFields(ctx) {
    const out = {};
    for (const f of FINGERPRINT_FIELDS) {
        if (ctx && ctx[f] != null) out[f] = ctx[f];
    }
    return out;
}

module.exports = { fingerprint, extractFields, FINGERPRINT_FIELDS };
