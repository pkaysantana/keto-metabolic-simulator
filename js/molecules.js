/**
 * =============================================================================
 * Keto Metabolic Simulator — 2D Molecular Renderer (molecules.js)
 * =============================================================================
 *
 * PURPOSE:
 *   Renders 2D structural formulae of keto acid metabolites onto an HTML5
 *   Canvas element using hardcoded "Node-Link" sprite data. No SMILES parser.
 *
 * INPUT CONTRACT:
 *   render(canvasId, state) expects:
 *     state.identity.name   → "Pyruvate" | "Acetoacetate" | etc.
 *     state.physics.protonated   → 0.0–1.0 (fraction protonated)
 *     state.physics.deprotonated → 0.0–1.0 (fraction deprotonated)
 *     state.physics.pH           → 0.0–14.0
 *
 * CRITICAL FEATURE — "Proton Fader":
 *   The carboxylic acid H atom opacity = state.physics.protonated
 *   When pH >> pKa:  H fades out (opacity → 0), negative charge (⁻) fades in
 *   When pH << pKa:  H is fully visible (opacity → 1), charge disappears
 *
 * VISUAL STYLE — "Neon Lab Mode":
 *   Background: Transparent (CSS handles panel bg)
 *   Bonds:      White (#e2e8f0) with shadowBlur glow
 *   Oxygen:     Cyan (#06b6d4)
 *   Hydrogen:   Magenta (#d946ef)
 *   Carbon:     Slate (#94a3b8)
 *   Charge (⁻): Red (#ef4444) with glow
 *
 * =============================================================================
 */

class MoleculeRenderer {

    // ─── Colour Palette ─────────────────────────────────────────────
    static COLORS = {
        C: '#94a3b8',   // Carbon — slate
        O: '#06b6d4',   // Oxygen — cyan
        H: '#d946ef',   // Hydrogen — magenta
        N: '#22c55e',   // Nitrogen — green (future use)
        bond: '#e2e8f0',   // Bond lines — light slate
        charge: '#ef4444',   // Negative charge indicator — red
        glow: '#06b6d4',   // Default glow colour — cyan
        doubleBondOffset: 4  // Pixel offset for parallel double bonds
    };

    // ─── Molecule Sprite Database ───────────────────────────────────
    // Coordinates are on a NORMALISED grid [-1, 1].
    // Scaling to canvas pixels happens in render().
    //
    // Each molecule defines:
    //   atoms:  [{ id, label, element, x, y, role }]
    //   bonds:  [{ from, to, type: "single"|"double" }]
    //   protonH: id of the carboxylic acid H (for Proton Fader)
    //   chargeTarget: id of the O atom that gains the (⁻) label
    // ────────────────────────────────────────────────────────────────

    static MOLECULES = {

        // ═══════════════════════════════════════════════════════════
        // PYRUVATE  (CH₃-CO-COO⁻)   pKa = 2.50
        // ═══════════════════════════════════════════════════════════
        'Pyruvate': {
            atoms: [
                // Methyl group (CH₃)
                { id: 'C1', label: 'CH₃', element: 'C', x: -0.65, y: 0.0 },

                // α-Carbonyl (C=O)
                { id: 'C2', label: 'C', element: 'C', x: -0.15, y: 0.0 },
                { id: 'O1', label: 'O', element: 'O', x: -0.15, y: -0.45 },

                // Carboxyl group (COO⁻ / COOH)
                { id: 'C3', label: 'C', element: 'C', x: 0.35, y: 0.0 },
                { id: 'O2', label: 'O', element: 'O', x: 0.35, y: -0.45 },
                { id: 'O3', label: 'O', element: 'O', x: 0.75, y: 0.25 },

                // Labile proton (Proton Fader target)
                { id: 'H1', label: 'H', element: 'H', x: 0.92, y: 0.45, role: 'labile' }
            ],
            bonds: [
                { from: 'C1', to: 'C2', type: 'single' },
                { from: 'C2', to: 'O1', type: 'double' },
                { from: 'C2', to: 'C3', type: 'single' },
                { from: 'C3', to: 'O2', type: 'double' },
                { from: 'C3', to: 'O3', type: 'single' },
                { from: 'O3', to: 'H1', type: 'single' }
            ],
            protonH: 'H1',
            chargeTarget: 'O3'
        },

        // ═══════════════════════════════════════════════════════════
        // OXALOACETATE  (⁻OOC-CO-CH₂-COO⁻)   pKa₁ = 2.22
        // ═══════════════════════════════════════════════════════════
        'Oxaloacetate': {
            atoms: [
                // Carboxyl 1 (left)
                { id: 'C1', label: 'C', element: 'C', x: -0.75, y: 0.0 },
                { id: 'O1', label: 'O', element: 'O', x: -0.75, y: -0.45 },
                { id: 'O2', label: 'O', element: 'O', x: -0.95, y: 0.35 },

                // α-Carbonyl (C=O)
                { id: 'C2', label: 'C', element: 'C', x: -0.25, y: 0.0 },
                { id: 'O3', label: 'O', element: 'O', x: -0.25, y: -0.45 },

                // Methylene (CH₂)
                { id: 'C3', label: 'CH₂', element: 'C', x: 0.25, y: 0.0 },

                // Carboxyl 2 (right)
                { id: 'C4', label: 'C', element: 'C', x: 0.70, y: 0.0 },
                { id: 'O4', label: 'O', element: 'O', x: 0.70, y: -0.45 },
                { id: 'O5', label: 'O', element: 'O', x: 0.92, y: 0.30 },

                // Labile proton
                { id: 'H1', label: 'H', element: 'H', x: -0.95, y: 0.60, role: 'labile' }
            ],
            bonds: [
                { from: 'C1', to: 'O1', type: 'double' },
                { from: 'C1', to: 'O2', type: 'single' },
                { from: 'C1', to: 'C2', type: 'single' },
                { from: 'C2', to: 'O3', type: 'double' },
                { from: 'C2', to: 'C3', type: 'single' },
                { from: 'C3', to: 'C4', type: 'single' },
                { from: 'C4', to: 'O4', type: 'double' },
                { from: 'C4', to: 'O5', type: 'single' },
                { from: 'O2', to: 'H1', type: 'single' }
            ],
            protonH: 'H1',
            chargeTarget: 'O2'
        },

        // ═══════════════════════════════════════════════════════════
        // α-KETOGLUTARATE  (⁻OOC-CO-CH₂-CH₂-COO⁻)   pKa₁ = 2.47
        // ═══════════════════════════════════════════════════════════
        'α-Ketoglutarate': {
            atoms: [
                // Carboxyl 1 (left)
                { id: 'C1', label: 'C', element: 'C', x: -0.85, y: 0.0 },
                { id: 'O1', label: 'O', element: 'O', x: -0.85, y: -0.45 },
                { id: 'O2', label: 'O', element: 'O', x: -0.98, y: 0.35 },

                // α-Carbonyl (C=O)
                { id: 'C2', label: 'C', element: 'C', x: -0.42, y: 0.0 },
                { id: 'O3', label: 'O', element: 'O', x: -0.42, y: -0.45 },

                // CH₂ - CH₂ chain
                { id: 'C3', label: 'CH₂', element: 'C', x: 0.0, y: 0.0 },
                { id: 'C4', label: 'CH₂', element: 'C', x: 0.40, y: 0.0 },

                // Carboxyl 2 (right)
                { id: 'C5', label: 'C', element: 'C', x: 0.78, y: 0.0 },
                { id: 'O4', label: 'O', element: 'O', x: 0.78, y: -0.45 },
                { id: 'O5', label: 'O', element: 'O', x: 0.95, y: 0.30 },

                // Labile proton
                { id: 'H1', label: 'H', element: 'H', x: -0.98, y: 0.60, role: 'labile' }
            ],
            bonds: [
                { from: 'C1', to: 'O1', type: 'double' },
                { from: 'C1', to: 'O2', type: 'single' },
                { from: 'C1', to: 'C2', type: 'single' },
                { from: 'C2', to: 'O3', type: 'double' },
                { from: 'C2', to: 'C3', type: 'single' },
                { from: 'C3', to: 'C4', type: 'single' },
                { from: 'C4', to: 'C5', type: 'single' },
                { from: 'C5', to: 'O4', type: 'double' },
                { from: 'C5', to: 'O5', type: 'single' },
                { from: 'O2', to: 'H1', type: 'single' }
            ],
            protonH: 'H1',
            chargeTarget: 'O2'
        },

        // ═══════════════════════════════════════════════════════════
        // ACETOACETATE  (CH₃-CO-CH₂-COO⁻)   pKa = 3.58
        // ═══════════════════════════════════════════════════════════
        'Acetoacetate': {
            atoms: [
                // Methyl group (CH₃)
                { id: 'C1', label: 'CH₃', element: 'C', x: -0.70, y: 0.0 },

                // β-Carbonyl (C=O)
                { id: 'C2', label: 'C', element: 'C', x: -0.25, y: 0.0 },
                { id: 'O1', label: 'O', element: 'O', x: -0.25, y: -0.45 },

                // Methylene (CH₂)
                { id: 'C3', label: 'CH₂', element: 'C', x: 0.20, y: 0.0 },

                // Carboxyl group (COO⁻ / COOH)
                { id: 'C4', label: 'C', element: 'C', x: 0.60, y: 0.0 },
                { id: 'O2', label: 'O', element: 'O', x: 0.60, y: -0.45 },
                { id: 'O3', label: 'O', element: 'O', x: 0.85, y: 0.30 },

                // Labile proton
                { id: 'H1', label: 'H', element: 'H', x: 0.95, y: 0.52, role: 'labile' }
            ],
            bonds: [
                { from: 'C1', to: 'C2', type: 'single' },
                { from: 'C2', to: 'O1', type: 'double' },
                { from: 'C2', to: 'C3', type: 'single' },
                { from: 'C3', to: 'C4', type: 'single' },
                { from: 'C4', to: 'O2', type: 'double' },
                { from: 'C4', to: 'O3', type: 'single' },
                { from: 'O3', to: 'H1', type: 'single' }
            ],
            protonH: 'H1',
            chargeTarget: 'O3'
        }
    };

    // ═════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═════════════════════════════════════════════════════════════════

    /**
     * @param {string} canvasId - DOM id of the target <canvas> element
     */
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`MoleculeRenderer: Canvas #${canvasId} not found`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Rendering constants
        this.padding = 50;          // px from canvas edges
        this.atomFontSize = 18;     // px
        this.glowRadius = 12;       // px shadowBlur
        this.bondWidth = 2.5;       // px line width
    }

    // ═════════════════════════════════════════════════════════════════
    // COORDINATE TRANSFORM
    // ═════════════════════════════════════════════════════════════════

    /**
     * Map normalised [-1, 1] coordinates to canvas pixel coordinates.
     * Centres the molecule and applies padding.
     */
    toPixel(nx, ny) {
        const usableW = this.width - 2 * this.padding;
        const usableH = this.height - 2 * this.padding;
        const px = this.padding + (nx + 1) / 2 * usableW;
        const py = this.padding + (ny + 1) / 2 * usableH;
        return { x: px, y: py };
    }

    // ═════════════════════════════════════════════════════════════════
    // BOND RENDERER
    // ═════════════════════════════════════════════════════════════════

    /**
     * Draw a bond line between two pixel coordinates.
     * @param {number} x1, y1 - Start point (px)
     * @param {number} x2, y2 - End point (px)
     * @param {string} type   - "single" or "double"
     * @param {number} alpha  - Opacity (0–1), used to fade labile H bond
     */
    drawBond(x1, y1, x2, y2, type = 'single', alpha = 1.0) {
        const ctx = this.ctx;
        const offset = MoleculeRenderer.COLORS.doubleBondOffset;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = MoleculeRenderer.COLORS.bond;
        ctx.lineWidth = this.bondWidth;
        ctx.lineCap = 'round';

        // Neon glow on bonds
        ctx.shadowColor = MoleculeRenderer.COLORS.glow;
        ctx.shadowBlur = 6;

        if (type === 'single') {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        } else if (type === 'double') {
            // Compute perpendicular offset for parallel lines
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / len * offset;
            const ny = dx / len * offset;

            // Line 1
            ctx.beginPath();
            ctx.moveTo(x1 + nx, y1 + ny);
            ctx.lineTo(x2 + nx, y2 + ny);
            ctx.stroke();

            // Line 2
            ctx.beginPath();
            ctx.moveTo(x1 - nx, y1 - ny);
            ctx.lineTo(x2 - nx, y2 - ny);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ═════════════════════════════════════════════════════════════════
    // ATOM RENDERER
    // ═════════════════════════════════════════════════════════════════

    /**
     * Draw an atom label at pixel coordinates with neon glow.
     * @param {number} x, y   - Centre position (px)
     * @param {string} label  - Text to render (e.g. "CH₃", "O", "H")
     * @param {string} color  - Hex colour for the label
     * @param {number} alpha  - Opacity (0–1)
     */
    drawAtom(x, y, label, color, alpha = 1.0) {
        if (alpha < 0.01) return; // Skip invisible atoms

        const ctx = this.ctx;
        ctx.save();

        ctx.globalAlpha = alpha;
        ctx.font = `bold ${this.atomFontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Neon glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = this.glowRadius;

        // Background knockout (dark circle behind text for readability)
        const metrics = ctx.measureText(label);
        const textW = metrics.width + 12;
        const textH = this.atomFontSize + 8;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; // near-black with slight transparency
        ctx.shadowBlur = 0; // no glow on background
        ctx.beginPath();
        ctx.roundRect(x - textW / 2, y - textH / 2, textW, textH, 6);
        ctx.fill();

        // Draw the label text
        ctx.shadowBlur = this.glowRadius;
        ctx.fillStyle = color;
        ctx.fillText(label, x, y);

        ctx.restore();
    }

    // ═════════════════════════════════════════════════════════════════
    // CHARGE INDICATOR
    // ═════════════════════════════════════════════════════════════════

    /**
     * Draw a negative charge superscript ( ⁻ ) near a target atom.
     * Opacity is inversely proportional to protonation fraction.
     * @param {number} x, y    - Atom position (px)
     * @param {number} deprot  - Deprotonated fraction (0–1)
     */
    drawCharge(x, y, deprot) {
        if (deprot < 0.01) return;

        const ctx = this.ctx;
        ctx.save();

        ctx.globalAlpha = deprot;
        ctx.font = `bold ${this.atomFontSize + 4}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Red glow for charge
        ctx.shadowColor = MoleculeRenderer.COLORS.charge;
        ctx.shadowBlur = this.glowRadius + 4;
        ctx.fillStyle = MoleculeRenderer.COLORS.charge;

        // Position the charge slightly above and right of the target atom
        ctx.fillText('⁻', x + 18, y - 14);

        ctx.restore();
    }

    // ═════════════════════════════════════════════════════════════════
    // MAIN RENDER PIPELINE
    // ═════════════════════════════════════════════════════════════════

    /**
     * Clear canvas and render the active molecule at the current
     * protonation state.
     *
     * @param {Object} state - From chemistry.js / app.js:
     *   state.identity.name         → molecule key
     *   state.physics.protonated    → 0.0–1.0
     *   state.physics.deprotonated  → 0.0–1.0
     *   state.physics.pH            → 0.0–14.0
     */
    render(state) {
        if (!this.ctx) return;

        const moleculeName = state.identity?.name || 'Pyruvate';
        const protonated = state.physics?.protonated ?? 1.0;
        const deprotonated = state.physics?.deprotonated ?? 0.0;

        // Lookup molecule sprite data
        const mol = MoleculeRenderer.MOLECULES[moleculeName];
        if (!mol) {
            console.warn(`MoleculeRenderer: Unknown molecule "${moleculeName}"`);
            this.renderFallback(moleculeName);
            return;
        }

        // ─── Step 1: Clear canvas ───────────────────────────────────
        this.ctx.clearRect(0, 0, this.width, this.height);

        // ─── Step 2: Build pixel-coordinate lookup ──────────────────
        const atomMap = {};
        for (const atom of mol.atoms) {
            const pos = this.toPixel(atom.x, atom.y);
            atomMap[atom.id] = { ...atom, px: pos.x, py: pos.y };
        }

        // ─── Step 3: Draw bonds ─────────────────────────────────────
        for (const bond of mol.bonds) {
            const a = atomMap[bond.from];
            const b = atomMap[bond.to];
            if (!a || !b) continue;

            // Fade the bond to/from the labile H along with the proton
            let bondAlpha = 1.0;
            if (bond.from === mol.protonH || bond.to === mol.protonH) {
                bondAlpha = protonated;
            }

            this.drawBond(a.px, a.py, b.px, b.py, bond.type, bondAlpha);
        }

        // ─── Step 4: Draw atoms ─────────────────────────────────────
        for (const id in atomMap) {
            const atom = atomMap[id];
            const color = MoleculeRenderer.COLORS[atom.element] || MoleculeRenderer.COLORS.C;

            // THE PROTON FADER:
            // Labile H opacity = protonated fraction
            let alpha = 1.0;
            if (id === mol.protonH) {
                alpha = protonated;
            }

            this.drawAtom(atom.px, atom.py, atom.label, color, alpha);
        }

        // ─── Step 5: Draw charge indicator (⁻) on chargeTarget ─────
        if (mol.chargeTarget && atomMap[mol.chargeTarget]) {
            const target = atomMap[mol.chargeTarget];
            this.drawCharge(target.px, target.py, deprotonated);
        }

        // ─── Step 6: Draw molecule title ────────────────────────────
        this.drawTitle(moleculeName, protonated);
    }

    // ═════════════════════════════════════════════════════════════════
    // TITLE LABEL
    // ═════════════════════════════════════════════════════════════════

    /**
 * Draw the molecule name and protonation stats overlay.
 */
    drawTitle(name, protonated) {
        const ctx = this.ctx;
        ctx.save();

        const species = protonated > 0.5
            ? `${name} (Acid Form)`
            : `${name}⁻ (Conjugate Base)`;

        // ─── Title ──────────────────────────────────────────────────
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#94a3b8';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 4;
        ctx.fillText(species, this.width / 2, 12);

        // ─── Protonation Stats Overlay ──────────────────────────────
        ctx.shadowBlur = 0;
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        const pctProt = (protonated * 100).toFixed(1);
        const pctDeprot = ((1 - protonated) * 100).toFixed(1);

        // α_HA bar (magenta)
        ctx.fillStyle = '#d946ef';
        ctx.fillText(`α(HA) = ${pctProt}%`, 8, this.height - 20);

        // α_A⁻ bar (cyan)
        ctx.fillStyle = '#06b6d4';
        ctx.fillText(`α(A⁻) = ${pctDeprot}%`, 8, this.height - 6);

        // Visual mini-bar
        const barX = 120, barY = this.height - 30, barW = this.width - 136, barH = 6;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(barX, barY, barW, barH);          // background
        ctx.fillStyle = '#d946ef';
        ctx.fillRect(barX, barY, barW * protonated, barH);  // protonated fill

        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(barX, barY + 14, barW, barH);     // background
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(barX, barY + 14, barW * (1 - protonated), barH); // deprotonated fill

        ctx.restore();
    }

    // ═════════════════════════════════════════════════════════════════
    // FALLBACK RENDERER
    // ═════════════════════════════════════════════════════════════════

    /**
     * Simple text fallback for unknown molecules.
     */
    renderFallback(name) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.save();

        this.ctx.font = 'bold 16px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.shadowColor = '#06b6d4';
        this.ctx.shadowBlur = 8;
        this.ctx.fillText(`Structure: ${name}`, this.width / 2, this.height / 2);
        this.ctx.fillText('(Geometry not defined)', this.width / 2, this.height / 2 + 24);

        this.ctx.restore();
    }
}

