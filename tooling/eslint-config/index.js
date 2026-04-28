// @indiepilot/eslint-config — Phase 1 Plan 03 wires the no-raw-log rule.
// Phase 1 Plan 01 ships an empty-but-valid flat-config so `eslint .` exits 0 on the bare scaffold.
// Exporting `[{}]` (vs `[]`) silences ESLint 9's "empty config" warning.
module.exports = [{}];
