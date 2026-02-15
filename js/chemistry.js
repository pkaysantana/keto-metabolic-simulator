/**
 * =============================================================================
 * Keto Metabolic Simulator — Chemistry Engine (chemistry.js)
 * =============================================================================
 *
 * PURPOSE:
 *   Implements Henderson-Hasselbalch equilibrium calculations for keto acid
 *   metabolites. This is the "physics engine" equivalent for biochemistry.
 *
 * CHEMISTRY MODEL:
 *   Monoprotic weak acid dissociation:
 *     HA ⇌ H⁺ + A⁻
 *   
 *   Henderson-Hasselbalch equation:
 *     pH = pKa + log([A⁻]/[HA])
 *   
 *   Rearranging for species fractions:
 *     [A⁻]/([HA] + [A⁻]) = 1 / (1 + 10^(pKa - pH))
 *     [HA]/([HA] + [A⁻]) = 1 / (1 + 10^(pH - pKa))
 *
 * OUTPUT CONTRACT:
 *   solve(pH) returns:
 *     {
 *       identity: { name, formula, pKa },
 *       physics: { pH, protonated, deprotonated, netCharge, dominantSpecies }
 *     }
 *
 * =============================================================================
 */

class MetabolicModel {

    // ─── Metabolite Database ────────────────────────────────────────
    static METABOLITES = {
        'Pyruvate': {
            name: 'Pyruvate',
            formula: 'CH₃-CO-COO⁻',
            pKa: 2.50,
            class: 'α-keto acid',
            pathway: 'Glycolysis → Krebs Cycle'
        },
        'Acetoacetate': {
            name: 'Acetoacetate',
            formula: 'CH₃-CO-CH₂-COO⁻',
            pKa: 3.58,
            class: 'β-keto acid',
            pathway: 'Ketone Body Synthesis'
        },
        'α-Ketoglutarate': {
            name: 'α-Ketoglutarate',
            formula: '⁻OOC-CO-CH₂-CH₂-COO⁻',
            pKa: 2.47,    // First carboxyl pKa
            class: 'α-keto acid',
            pathway: 'Krebs Cycle'
        },
        'Oxaloacetate': {
            name: 'Oxaloacetate',
            formula: '⁻OOC-CO-CH₂-COO⁻',
            pKa: 2.22,    // First carboxyl pKa
            class: 'α-keto acid',
            pathway: 'Krebs Cycle / Gluconeogenesis'
        }
    };

    // ═════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═════════════════════════════════════════════════════════════════

    /**
     * @param {string} metabolite - Initial metabolite (default: Pyruvate)
     */
    constructor(metabolite = 'Pyruvate') {
        this.setMetabolite(metabolite);
        console.log('✅ MetabolicModel initialized:', this.active.name);
    }

    // ═════════════════════════════════════════════════════════════════
    // METABOLITE SETTER
    // ═════════════════════════════════════════════════════════════════

    /**
     * Change the active metabolite.
     * @param {string} name - Metabolite name
     */
    setMetabolite(name) {
        const data = MetabolicModel.METABOLITES[name];
        if (!data) {
            console.warn(`Unknown metabolite "${name}", falling back to Pyruvate`);
            this.active = MetabolicModel.METABOLITES['Pyruvate'];
        } else {
            this.active = data;
        }
    }

    // ═════════════════════════════════════════════════════════════════
    // HENDERSON-HASSELBALCH SOLVER
    // ═════════════════════════════════════════════════════════════════

    /**
     * Calculate protonation state at a given pH.
     *
     * @param {number} pH - System pH (0.0 – 14.0)
     * @returns {Object} State object with identity and physics
     */
    solve(pH) {
        const pKa = this.active.pKa;

        // ─── Henderson-Hasselbalch fractions ────────────────────────
        const ratio = Math.pow(10, pH - pKa);
        const deprotonated = ratio / (1 + ratio);      // [A⁻] fraction
        const protonated = 1 - deprotonated;          // [HA] fraction

        // ─── Net charge ─────────────────────────────────────────────
        // Assumes monoprotic acid with -1 charge when deprotonated
        // (Ignores additional carboxyl groups for simplicity)
        const netCharge = -1 * deprotonated;

        // ─── Dominant species ───────────────────────────────────────
        let dominantSpecies;
        if (deprotonated > 0.9) {
            dominantSpecies = `${this.active.name}⁻ (>90% deprotonated)`;
        } else if (protonated > 0.9) {
            dominantSpecies = `${this.active.name} Acid (>90% protonated)`;
        } else if (deprotonated > protonated) {
            dominantSpecies = `${this.active.name}⁻ (conjugate base)`;
        } else {
            dominantSpecies = `${this.active.name} Acid`;
        }

        // ─── Construct state object ────────────────────────────────
        return {
            identity: {
                name: this.active.name,
                formula: this.active.formula,
                pKa: pKa,
                class: this.active.class,
                pathway: this.active.pathway
            },
            physics: {
                pH: pH,
                pKa: pKa,
                protonated: protonated,
                deprotonated: deprotonated,
                protonatedPercent: protonated * 100,
                deprotonatedPercent: deprotonated * 100,
                netCharge: netCharge,
                dominantSpecies: dominantSpecies
            }
        };
    }

    // ═════════════════════════════════════════════════════════════════
    // UTILITY: Get Metabolite List
    // ═════════════════════════════════════════════════════════════════

    /**
     * Get array of available metabolite names.
     * @returns {string[]} Metabolite names
     */
    static getMetaboliteList() {
        return Object.keys(MetabolicModel.METABOLITES);
    }

    // ═════════════════════════════════════════════════════════════════
    // UTILITY: Get pKa for Metabolite
    // ═════════════════════════════════════════════════════════════════

    /**
     * Lookup pKa for a given metabolite.
     * @param {string} name - Metabolite name
     * @returns {number} pKa value
     */
    static getPKa(name) {
        const data = MetabolicModel.METABOLITES[name];
        return data ? data.pKa : 2.50;
    }
}
