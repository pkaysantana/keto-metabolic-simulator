/**
 * =============================================================================
 * Keto Metabolic Simulator — Speciation Diagram Plotter (pathways.js)
 * =============================================================================
 *
 * PURPOSE:
 *   Renders a dynamic Bjerrum (speciation) plot showing the pH-dependent
 *   protonation equilibrium for keto acid metabolites using Plotly.js.
 *
 * VISUALIZATION:
 *   X-axis: pH (0.0 → 14.0)
 *   Y-axis: Species Fraction (0% → 100%)
 *   Trace 1: Protonated form (R-COOH) — Magenta sigmoidal curve
 *   Trace 2: Deprotonated form (R-COO⁻) — Cyan sigmoidal curve
 *   Live Marker: Vertical line tracking current system pH from slider
 *
 * CHEMISTRY:
 *   Henderson-Hasselbalch equation:
 *     [A⁻]/[HA] = 10^(pH - pKa)
 *
 *   Protonated %  = 1 / (1 + 10^(pH - pKa))
 *   Deprotonated % = 1 / (1 + 10^(pKa - pH))
 *
 * STYLING:
 *   "Neon Lab Mode" — Dark theme with glowing accent colors:
 *     Acid (HA):  Magenta #d946ef
 *     Base (A⁻):  Cyan #06b6d4
 *     pH marker:  Yellow #fbbf24
 *     Background: Transparent (for glassmorphism panel)
 *     Grid:       Dark slate #334155
 *     Font:       Inter, slate #94a3b8
 *
 * =============================================================================
 */

class PathwayPlotter {

    // ─── Metabolite pKa Database ────────────────────────────────────
    static PKA_VALUES = {
        'Pyruvate': 2.50,
        'Acetoacetate': 3.58,
        'α-Ketoglutarate': 2.47,
        'Oxaloacetate': 2.22
    };

    // ─── Color Palette (Neon Lab Mode) ──────────────────────────────
    static COLORS = {
        acid: '#d946ef',   // Magenta — protonated form
        base: '#06b6d4',   // Cyan — deprotonated form
        marker: '#fbbf24',   // Yellow — current pH indicator
        grid: '#334155',   // Dark slate
        text: '#94a3b8',   // Light slate
        bg: 'rgba(0,0,0,0)'  // Transparent
    };

    // ═════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═════════════════════════════════════════════════════════════════

    /**
     * @param {string} divId - DOM id of the target <div> container
     */
    constructor(divId) {
        this.container = document.getElementById(divId);
        if (!this.container) {
            console.error(`PathwayPlotter: Container #${divId} not found`);
            return;
        }

        this.divId = divId;
        this.currentMetabolite = null;
        this.currentPH = 7.4;
        this.plotInitialized = false;

        // Plotly layout configuration
        this.layout = {
            title: {
                text: 'pH-Dependent Speciation',
                font: {
                    family: 'Inter, sans-serif',
                    size: 16,
                    color: PathwayPlotter.COLORS.text
                }
            },
            xaxis: {
                title: {
                    text: 'pH',
                    font: {
                        family: 'Inter, sans-serif',
                        size: 14,
                        color: PathwayPlotter.COLORS.text
                    }
                },
                range: [0, 14],
                gridcolor: PathwayPlotter.COLORS.grid,
                zerolinecolor: PathwayPlotter.COLORS.grid,
                color: PathwayPlotter.COLORS.text
            },
            yaxis: {
                title: {
                    text: 'Species Fraction (%)',
                    font: {
                        family: 'Inter, sans-serif',
                        size: 14,
                        color: PathwayPlotter.COLORS.text
                    }
                },
                range: [0, 100],
                gridcolor: PathwayPlotter.COLORS.grid,
                zerolinecolor: PathwayPlotter.COLORS.grid,
                color: PathwayPlotter.COLORS.text
            },
            paper_bgcolor: PathwayPlotter.COLORS.bg,
            plot_bgcolor: PathwayPlotter.COLORS.bg,
            font: {
                family: 'Inter, sans-serif',
                color: PathwayPlotter.COLORS.text
            },
            hovermode: 'x unified',
            showlegend: true,
            legend: {
                x: 0.02,
                y: 0.98,
                bgcolor: 'rgba(15, 23, 42, 0.85)',
                bordercolor: PathwayPlotter.COLORS.grid,
                borderwidth: 1,
                font: {
                    family: 'Inter, sans-serif',
                    size: 12,
                    color: PathwayPlotter.COLORS.text
                }
            },
            margin: { t: 50, r: 30, b: 50, l: 60 }
        };

        // Plotly config (disable logo, enable responsive)
        this.config = {
            responsive: true,
            displayModeBar: false,
            displaylogo: false
        };

        console.log('✅ PathwayPlotter initialized');
    }

    // ═════════════════════════════════════════════════════════════════
    // SPECIATION CURVE GENERATOR
    // ═════════════════════════════════════════════════════════════════

    /**
     * Generate pH vs. species fraction data for a given pKa.
     * Uses Henderson-Hasselbalch equation.
     *
     * @param {number} pKa - Acid dissociation constant (log scale)
     * @returns {Object} { pH: [...], acidPercent: [...], basePercent: [...] }
     */
    generateSpeciationCurve(pKa) {
        const pH = [];
        const acidPercent = [];
        const basePercent = [];

        // Generate data points from pH 0.0 to 14.0 (step 0.1)
        for (let p = 0.0; p <= 14.0; p += 0.1) {
            pH.push(p);

            // Henderson-Hasselbalch fractions
            const ratio = Math.pow(10, p - pKa);
            const fBase = ratio / (1 + ratio);      // Deprotonated fraction
            const fAcid = 1 / (1 + ratio);          // Protonated fraction

            acidPercent.push(fAcid * 100);
            basePercent.push(fBase * 100);
        }

        return { pH, acidPercent, basePercent };
    }

    // ═════════════════════════════════════════════════════════════════
    // INITIAL PLOT CREATION
    // ═════════════════════════════════════════════════════════════════

    /**
     * Create the initial Plotly plot with speciation curves.
     * Called once on first render.
     *
     * @param {string} metabolite - Name of the metabolite
     * @param {number} currentPH  - Current system pH (for marker)
     */
    plot(metabolite, currentPH) {
        const pKa = PathwayPlotter.PKA_VALUES[metabolite] || 2.50;
        const data = this.generateSpeciationCurve(pKa);

        // ─── Trace 1: Protonated Form (R-COOH) ──────────────────────
        const traceAcid = {
            x: data.pH,
            y: data.acidPercent,
            type: 'scatter',
            mode: 'lines',
            name: `${metabolite} (Acid)`,
            line: {
                color: PathwayPlotter.COLORS.acid,
                width: 3,
                shape: 'spline',
                smoothing: 1.0
            },
            hovertemplate: 'pH: %{x:.1f}<br>Protonated: %{y:.1f}%<extra></extra>'
        };

        // ─── Trace 2: Deprotonated Form (R-COO⁻) ────────────────────
        const traceBase = {
            x: data.pH,
            y: data.basePercent,
            type: 'scatter',
            mode: 'lines',
            name: `${metabolite}⁻ (Base)`,
            line: {
                color: PathwayPlotter.COLORS.base,
                width: 3,
                shape: 'spline',
                smoothing: 1.0
            },
            hovertemplate: 'pH: %{x:.1f}<br>Deprotonated: %{y:.1f}%<extra></extra>'
        };

        // ─── Trace 3: Current pH Marker (Vertical Line) ─────────────
        const tracePH = {
            x: [currentPH, currentPH],
            y: [0, 100],
            type: 'scatter',
            mode: 'lines',
            name: `Current pH: ${currentPH.toFixed(1)}`,
            line: {
                color: PathwayPlotter.COLORS.marker,
                width: 3,
                dash: 'dash'
            },
            hoverinfo: 'skip',
            showlegend: true
        };

        // ─── Trace 4: pKa Reference Line (Vertical) ──────────────────
        const tracePKa = {
            x: [pKa, pKa],
            y: [0, 100],
            type: 'scatter',
            mode: 'lines',
            name: `pKa: ${pKa.toFixed(2)}`,
            line: {
                color: PathwayPlotter.COLORS.text,
                width: 2,
                dash: 'dot'
            },
            hoverinfo: 'skip',
            showlegend: true
        };

        // ─── Render the plot ─────────────────────────────────────────
        const traces = [traceAcid, traceBase, tracePKa, tracePH];

        Plotly.newPlot(this.divId, traces, this.layout, this.config);

        this.plotInitialized = true;
        this.currentMetabolite = metabolite;
        this.currentPH = currentPH;

        console.log(`📊 Speciation plot created: ${metabolite} (pKa ${pKa})`);
    }

    // ═════════════════════════════════════════════════════════════════
    // UPDATE EXISTING PLOT
    // ═════════════════════════════════════════════════════════════════

    /**
     * Update the plot when pH slider moves or metabolite changes.
     * Uses Plotly.react() for smooth transitions.
     *
     * @param {string} metabolite - Name of the metabolite
     * @param {number} currentPH  - Current system pH
     */
    update(metabolite, currentPH) {
        // If not initialized, create the plot
        if (!this.plotInitialized) {
            this.plot(metabolite, currentPH);
            return;
        }

        const pKa = PathwayPlotter.PKA_VALUES[metabolite] || 2.50;

        // Check if metabolite changed (requires full re-plot)
        if (metabolite !== this.currentMetabolite) {
            this.plot(metabolite, currentPH);
            return;
        }

        // ─── Update only the pH marker (fast path) ──────────────────
        // Trace indices: [0: acid, 1: base, 2: pKa, 3: pH marker]
        const updatedMarker = {
            x: [[currentPH, currentPH]],
            y: [[0, 100]]
        };

        const updatedName = {
            name: [`Current pH: ${currentPH.toFixed(1)}`]
        };

        // Update trace 3 (pH marker) with animation
        Plotly.update(
            this.divId,
            updatedMarker,
            {},
            [3]  // Trace index for pH marker
        );

        // Update legend name for pH marker
        Plotly.restyle(
            this.divId,
            updatedName,
            [3]
        );

        this.currentPH = currentPH;
    }

    // ═════════════════════════════════════════════════════════════════
    // UTILITY: Get pKa for Metabolite
    // ═════════════════════════════════════════════════════════════════

    /**
     * Lookup pKa value for a given metabolite.
     * @param {string} metabolite - Name
     * @returns {number} pKa value
     */
    static getPKa(metabolite) {
        return PathwayPlotter.PKA_VALUES[metabolite] || 2.50;
    }

    // ═════════════════════════════════════════════════════════════════
    // UTILITY: Calculate Species Fractions at Given pH
    // ═════════════════════════════════════════════════════════════════

    /**
     * Calculate protonated/deprotonated fractions at a specific pH.
     * Useful for app.js to get current state without re-rendering.
     *
     * @param {string} metabolite - Name
     * @param {number} pH         - System pH
     * @returns {Object} { protonated, deprotonated, pKa }
     */
    static calculateFractions(metabolite, pH) {
        const pKa = PathwayPlotter.getPKa(metabolite);
        const ratio = Math.pow(10, pH - pKa);
        const deprotonated = ratio / (1 + ratio);
        const protonated = 1 - deprotonated;

        return {
            protonated: protonated,
            deprotonated: deprotonated,
            pKa: pKa
        };
    }
}
