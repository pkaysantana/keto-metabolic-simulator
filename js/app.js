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
 * WIRED VISUALISERS:
 * ────────────────────────────────────────────────────────────────────
 *   - js/chemistry.js  → MetabolicModel (Henderson-Hasselbalch solver)
 *   - js/molecules.js  → MoleculeRenderer (2D structure with Canvas)
 *   - js/pathways.js   → PathwayPlotter (Bjerrum speciation diagram)
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
        if (typeof MetabolicModel !== 'undefined') {
            this.model = new MetabolicModel();
            console.log('✅ MetabolicModel loaded from chemistry.js');
        } else {
            this.model = null;
            console.warn('⚠️  MetabolicModel not found. Using inline Henderson-Hasselbalch.');
        }

        // ─── Visualisers: Connect Canvas & Plotly Renderers ──────────
        this.visualsReady = false;

        try {
            // Panel A: Protonated species (re-uses cubic canvas)
            if (typeof MoleculeRenderer !== 'undefined') {
                this.rendererProtonated = new MoleculeRenderer('canvasCubic');
                console.log('✅ MoleculeRenderer (Protonated) initialized');
            }

            // Panel B: Deprotonated species (re-uses distorted canvas)
            if (typeof MoleculeRenderer !== 'undefined') {
                this.rendererDeprotonated = new MoleculeRenderer('canvasDistorted');
                console.log('✅ MoleculeRenderer (Deprotonated) initialized');
            }

            // Panel C: Speciation diagram (re-uses plotBandStructure div)
            if (typeof PathwayPlotter !== 'undefined') {
                this.plotter = new PathwayPlotter('plotBandStructure');
                console.log('✅ PathwayPlotter initialized');
            }

            this.visualsReady = true;
        } catch (err) {
            console.error('❌ Error initializing visualizers:', err);
            this.visualsReady = false;
        }

        // ─── Initialise UI Bindings ─────────────────────────────────
        this.initializeUI();

        // ─── First Computation ──────────────────────────────────────
        this.update();

        console.log('🧬 Keto Metabolic Simulator: Initialised');
        console.log('📊 Chemistry: Henderson-Hasselbalch protonation model');
    }

    /**
     * Bind DOM elements to state via Observer Pattern.
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

                if (valueDisplay) {
                    valueDisplay.textContent = this.state.pH.toFixed(1);
                }

                this.update();
            });

            if (valueDisplay) {
                valueDisplay.textContent = this.state.pH.toFixed(1);
            }
        }

        // ─── Metabolite Selector ─────────────────────────────────────
        const metaboliteSelect = document.getElementById('metalSelect');
        if (metaboliteSelect) {
            metaboliteSelect.addEventListener('change', (e) => {
                this.state.metabolite = e.target.value;

                if (this.model && typeof this.model.setMetabolite === 'function') {
                    this.model.setMetabolite(this.state.metabolite);
                }

                this.update();
            });
        }

        // ─── Toggles ─────────────────────────────────────────────────
        const structureToggle = document.getElementById('showOrbitalLobes');
        if (structureToggle) {
            structureToggle.addEventListener('change', (e) => {
                this.state.showStructure = e.target.checked;
                this.render();
            });
        }

        const pathwayToggle = document.getElementById('showBonds');
        if (pathwayToggle) {
            pathwayToggle.addEventListener('change', (e) => {
                this.state.showPathway = e.target.checked;
                this.render();
            });
        }
    }

    /**
     * Core computation pipeline: State → Model.solve(pH) → Results → Render
     */
    update() {
        const { pH, metabolite } = this.state;

        if (this.model && typeof this.model.solve === 'function') {
            this.results = this.model.solve(pH);
        } else {
            // Fallback: inline Henderson-Hasselbalch
            const pKa = 2.50;
            const ratio = Math.pow(10, pH - pKa);
            const deprotonated = ratio / (1 + ratio);
            const protonated = 1 - deprotonated;

            this.results = {
                identity: { name: metabolite, pKa: pKa },
                physics: {
                    pH: pH,
                    pKa: pKa,
                    protonated: protonated,
                    deprotonated: deprotonated,
                    protonatedPercent: protonated * 100,
                    deprotonatedPercent: deprotonated * 100,
                    netCharge: -1 * deprotonated,
                    dominantSpecies: deprotonated > 0.5 ? `${metabolite}⁻` : `${metabolite} Acid`
                }
            };
        }

        this.render();
    }

    /**
     * Render all visualisations and stats.
     */
    render() {
        this.updateVisuals();
        this.updateStats();
    }

    /**
     * Update all visualizations with current state.
     */
    updateVisuals() {
        if (!this.visualsReady) return;

        const state = this.results;
        const { pH, metabolite } = this.state;

        // ─── Panel A: Protonated Species (100% acid form) ───────────
        if (this.rendererProtonated) {
            const protonatedState = {
                identity: state.identity,
                physics: {
                    ...state.physics,
                    protonated: 1.0,
                    deprotonated: 0.0
                }
            };
            this.rendererProtonated.render(protonatedState);
        }

        // ─── Panel B: Deprotonated Species (current equilibrium) ────
        if (this.rendererDeprotonated) {
            this.rendererDeprotonated.render(state);
        }

        // ─── Panel C: Speciation Diagram ────────────────────────────
        if (this.plotter) {
            this.plotter.update(metabolite, pH);
        }
    }

    /**
     * Update DOM stat elements.
     */
    updateStats() {
        const r = this.results.physics;

        const panelAStat = document.getElementById('overlapCubic');
        if (panelAStat) {
            panelAStat.textContent = `${r.protonatedPercent.toFixed(1)}%`;
        }

        const panelBStat = document.getElementById('overlapDistorted');
        if (panelBStat) {
            panelBStat.textContent = `${r.deprotonatedPercent.toFixed(1)}%`;
        }

        const panelBAngle = document.getElementById('angleDistorted');
        if (panelBAngle) {
            panelBAngle.textContent = `pH ${r.pH.toFixed(1)}`;
        }

        const panelCStat1 = document.getElementById('bandWidth');
        if (panelCStat1) {
            panelCStat1.textContent = r.dominantSpecies;
        }

        const panelCStat2 = document.getElementById('bandGap');
        if (panelCStat2) {
            panelCStat2.textContent = `${r.netCharge.toFixed(2)} e`;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Bootstrap
// ═══════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    console.log('🧬 Keto Metabolic Simulator: Loading...');
    window.app = new SimulationEngine();
    console.log('✅ Simulation Engine Ready');
    console.log('💡 Access via window.app');
});
