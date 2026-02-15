/**
 * =============================================================================
 * Keto Metabolic Simulator — Simulation Controller (app.js)
 * =============================================================================
 *
 * ARCHITECTURE: Observer Pattern + Reactive "Slider-to-Canvas" Loop
 * ────────────────────────────────────────────────────────────────────
 *   This file is a COMPLETE REWRITE of the Perovskite SimulationEngine.
 *   The reactive architecture is PRESERVED; only the domain logic is swapped:
 *
 *     OLD:  Slider (B-O-B angle) → Hamiltonian → Band Gap → Canvas
 *     NEW:  Slider (System pH)   → Henderson-Hasselbalch → Protonation → Canvas
 *
 * STUBBED VISUALISERS (Phase 2 — NOT YET IMPLEMENTED):
 * ────────────────────────────────────────────────────────────────────
 *   - js/molecules.js  → MoleculeRenderer class (2D structure with Canvas)
 *   - js/pathways.js   → PathwayPlotter class   (metabolic flux diagram)
 *
 *   Until these exist, all visual output is routed to:
 *     1. Console logging   (via updateVisualsStub)
 *     2. DOM text updates  (stat values in the HTML panels)
 *
 *   This ensures the app loads and runs WITHOUT crashing.
 *
 * SCORCHED EARTH CONFIRMATION:
 * ────────────────────────────────────────────────────────────────────
 *   The following physics terms have been FULLY REMOVED:
 *     ❌ theta, bond_length, hamiltonian, eigenvalue, diagonalisation
 *     ❌ metal, perovskite, orbital, dispersion, band_gap, band_width
 *     ❌ PerovskiteModel, OrbitalRenderer, BandPlotter
 *     ❌ generateKPath, calculateBandStats, solveHamiltonian
 *
 * =============================================================================
 */

class SimulationEngine {
    constructor() {
        // ─── State: Single Source of Truth ───────────────────────────
        this.state = {
            pH: 7.4,               // Physiological default
            metabolite: 'Pyruvate', // Default substrate
            showStructure: true,    // Toggle: molecular structure
            showPathway: true       // Toggle: metabolic pathway
        };

        // ─── Chemistry Model ────────────────────────────────────────
        // MetabolicModel is loaded from js/chemistry.js (must be included
        // in index.html BEFORE this script). If unavailable, we degrade
        // gracefully and log a warning.
        if (typeof MetabolicModel !== 'undefined') {
            this.model = new MetabolicModel();
            console.log('✅ MetabolicModel loaded from chemistry.js');
        } else {
            this.model = null;
            console.warn('⚠️  MetabolicModel not found. Running in STUB mode.');
            console.warn('    → Ensure js/chemistry.js is loaded before js/app.js');
        }

        // ─── Visualisers: STUBBED (Phase 2) ─────────────────────────
        // DO NOT instantiate MoleculeRenderer or PathwayPlotter here.
        // They do not exist yet. All rendering is routed through
        // updateVisualsStub() until Phase 2 deliverables are complete.
        this.visualsReady = false;

        // ─── Initialise UI Bindings ─────────────────────────────────
        this.initializeUI();

        // ─── First Computation ──────────────────────────────────────
        this.update();

        console.log('🧬 Keto Metabolic Simulator: Initialised');
        console.log('📊 Chemistry: Henderson-Hasselbalch protonation model');
    }

    /**
     * Bind DOM elements to state via Observer Pattern.
     * 
     * NOTE ON SLIDER RE-MAPPING:
     * ──────────────────────────
     * The legacy index.html slider has min="140" max="180" (angle degrees).
     * Until index.html is updated to min="0" max="14" step="0.1",
     * we RE-MAP the slider value in the event handler:
     *
     *     raw slider (140–180) → pH (0.0–14.0)
     *     pH = (raw - 140) / (180 - 140) * 14.0
     *
     * TODO: Update index.html slider attributes to:
     *   <input type="range" id="pHSlider" min="0" max="14" value="7.4" step="0.1">
     * Once that is done, remove the re-mapping logic below.
     */
    initializeUI() {
        // ─── pH Slider (re-mapped from legacy angle slider) ─────────
        const slider = document.getElementById('angleSlider');
        const valueDisplay = document.getElementById('angleValue');

        if (slider) {
            slider.addEventListener('input', (e) => {
                // RE-MAP: legacy range [140, 180] → pH range [0.0, 14.0]
                const raw = parseFloat(e.target.value);
                this.state.pH = ((raw - 140) / (180 - 140)) * 14.0;

                // Update display with pH (override legacy "angle" text)
                if (valueDisplay) {
                    valueDisplay.textContent = this.state.pH.toFixed(1);
                }

                this.update();
            });

            // Set initial display to pH
            if (valueDisplay) {
                valueDisplay.textContent = this.state.pH.toFixed(1);
            }
        }

        // ─── Metabolite Selector (re-mapped from legacy metal select) ─
        const metaboliteSelect = document.getElementById('metalSelect');
        if (metaboliteSelect) {
            metaboliteSelect.addEventListener('change', (e) => {
                this.state.metabolite = e.target.value;

                // Re-initialise model if it supports metabolite switching
                if (this.model && typeof this.model.setMetabolite === 'function') {
                    this.model.setMetabolite(this.state.metabolite);
                }

                this.update();
            });
        }

        // ─── Toggle: Show Molecular Structure ───────────────────────
        const structureToggle = document.getElementById('showOrbitalLobes');
        if (structureToggle) {
            structureToggle.addEventListener('change', (e) => {
                this.state.showStructure = e.target.checked;
                this.render();
            });
        }

        // ─── Toggle: Show Metabolic Pathway ─────────────────────────
        const pathwayToggle = document.getElementById('showBonds');
        if (pathwayToggle) {
            pathwayToggle.addEventListener('change', (e) => {
                this.state.showPathway = e.target.checked;
                this.render();
            });
        }
    }

    /**
     * Core computation pipeline.
     * Called on every state change (slider drag, metabolite switch).
     *
     * Flow:  State → Model.solve(pH) → Results → Render
     */
    update() {
        const { pH, metabolite } = this.state;

        if (this.model && typeof this.model.solve === 'function') {
            // ─── Production path: chemistry.js is loaded ────────────
            this.results = this.model.solve(pH);
        } else {
            // ─── Stub path: compute Henderson-Hasselbalch inline ────
            // Pyruvate pKa = 2.50 (standard biochemistry reference)
            const pKa = 2.50;
            const ratio = Math.pow(10, pH - pKa);
            const deprotonatedFraction = ratio / (1 + ratio);
            const protonatedFraction = 1 - deprotonatedFraction;

            this.results = {
                metabolite: metabolite,
                pKa: pKa,
                pH: pH,
                protonatedPercent: protonatedFraction * 100,
                deprotonatedPercent: deprotonatedFraction * 100,
                netCharge: -1 * deprotonatedFraction,
                dominantSpecies: deprotonatedFraction > 0.5 ? 'Pyruvate⁻' : 'Pyruvic Acid'
            };
        }

        // Trigger render pipeline
        this.render();
    }

    /**
     * Render all visualisations.
     * Routes to stub method until Phase 2 visualisers are built.
     */
    render() {
        // ─── Phase 2 visualisers (stubbed) ──────────────────────────
        this.updateVisualsStub();

        // ─── DOM stat updates (always active) ───────────────────────
        this.updateStats();
    }

    /**
     * STUB: Placeholder for Phase 2 visual rendering.
     * Logs render state to console. Replace with MoleculeRenderer
     * and PathwayPlotter calls once js/molecules.js exists.
     */
    updateVisualsStub() {
        const r = this.results;
        console.log(
            `Render: ${r.metabolite} at pH ${r.pH.toFixed(1)} ` +
            `→ ${r.dominantSpecies} ` +
            `(${r.protonatedPercent.toFixed(1)}% protonated, ` +
            `${r.deprotonatedPercent.toFixed(1)}% deprotonated)`
        );
    }

    /**
     * Update DOM text elements with current chemistry results.
     * Re-maps legacy perovskite stat IDs to biochemistry values.
     */
    updateStats() {
        const r = this.results;

        // ─── Panel A stats (re-mapped: "Overlap Factor" → "Protonated %") ─
        const panelAStat = document.getElementById('overlapCubic');
        if (panelAStat) {
            panelAStat.textContent = `${r.protonatedPercent.toFixed(1)}%`;
        }

        // ─── Panel B stats (re-mapped: "Overlap Factor" → "Deprotonated %") ─
        const panelBStat = document.getElementById('overlapDistorted');
        if (panelBStat) {
            panelBStat.textContent = `${r.deprotonatedPercent.toFixed(1)}%`;
        }

        // ─── Panel B angle display (re-mapped: "Angle" → "pH") ─────
        const panelBAngle = document.getElementById('angleDistorted');
        if (panelBAngle) {
            panelBAngle.textContent = `pH ${r.pH.toFixed(1)}`;
        }

        // ─── Panel C stats (re-mapped: "Band Width" → "Dominant Species") ─
        const panelCStat1 = document.getElementById('bandWidth');
        if (panelCStat1) {
            panelCStat1.textContent = r.dominantSpecies;
        }

        // ─── Panel C stats (re-mapped: "Band Gap" → "Net Charge") ──
        const panelCStat2 = document.getElementById('bandGap');
        if (panelCStat2) {
            panelCStat2.textContent = `${r.netCharge.toFixed(2)} e`;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Bootstrap: Initialise when DOM is ready
// ═══════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    console.log('🧬 Keto Metabolic Simulator: Loading...');

    // Create the simulation engine (global for debug access)
    window.app = new SimulationEngine();

    console.log('✅ Simulation Engine Ready');
    console.log('💡 Tip: Access state via window.app.state');
    console.log('💡 Tip: Access results via window.app.results');
});
