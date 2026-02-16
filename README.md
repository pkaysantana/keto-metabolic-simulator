# Interactive Keto-Acid Metabolic Simulator

![Status](https://img.shields.io/badge/Status-Stable-success) ![License](https://img.shields.io/badge/License-MIT-blue) ![Domain](https://img.shields.io/badge/Domain-Medical_Biochemistry-purple)

> **A reactive biochemical engine visualizing the pKa-dependent protonation states of metabolic intermediates.**

## 🎯 Overview

The Keto-Acid Metabolic Simulator is a client-side web application that demonstrates the pH-dependent ionization equilibria of key Krebs cycle intermediates. Built with vanilla JavaScript, HTML5 Canvas, and Plotly.js, it provides real-time visualization of Henderson-Hasselbalch equilibrium dynamics.

## ✨ Key Features

### 🔬 The Proton Fader

A novel rendering technique where the **opacity of hydrogen atoms** on carboxylic acid groups (-COOH) dynamically maps to the dissociation fraction (α), creating an intuitive visualization of acid-base equilibrium:

$$\alpha = \frac{1}{1 + 10^{(pK_a - pH)}}$$

As pH increases past pKa, hydrogen atoms **fade out** while negative charge indicators **fade in**, demonstrating Le Chatelier's principle in real-time.

### 📊 Dynamic Speciation Diagrams

Interactive Bjerrum plots showing:

- **Acid form (HA)** concentration vs pH (magenta)
- **Conjugate base (A⁻)** concentration vs pH (cyan)  
- **Live pH marker** tracking slider position (yellow)
- **pKa reference line** for immediate equilibrium assessment

### 🧪 Metabolic Context Switching

Explore four key keto-acid metabolites:

- **Pyruvate** (pKa 2.50) — Glycolysis → Krebs Cycle
- **Acetoacetate** (pKa 3.58) — Ketone body synthesis
- **α-Ketoglutarate** (pKa 2.47) — Krebs Cycle intermediate
- **Oxaloacetate** (pKa 2.22) — Gluconeogenesis substrate

### 🏥 Physiological Compartments

Pre-set pH contexts for medical relevance:

- **Blood Plasma** (pH 7.4) — Normal physiological conditions
- **Cytosol** (pH 7.2) — Intracellular environment
- **Lysosome** (pH 4.5) — Acidic organelle
- **Stomach Lumen** (pH 1.5) — Gastric acid conditions

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/yourusername/keto-metabolic-simulator.git
cd keto-metabolic-simulator
```

### Usage

1. Open `index.html` in a modern browser (Chrome 99+, Firefox 94+, Edge 99+)
2. Drag the **pH slider** to observe:
   - Proton opacity changes on molecular structures
   - Live equilibrium curves updating
   - Statistical readouts (protonation %, net charge)
3. Switch **metabolites** to explore different pKa values

**No build step required** — runs entirely client-side.

## 🎓 Educational Applications

### Medical Biochemistry

- **Metabolic Acidosis**: Visualize how decreased pH affects pyruvate/lactate equilibrium
- **Ketoacidosis**: Understand acetoacetate protonation in diabetic ketoacidosis (DKA)
- **Compartmental Chemistry**: Compare metabolite ionization states across cellular environments

### Physical Chemistry

- Demonstrates **Henderson-Hasselbalch equation** interactively
- Shows **buffer capacity** near pKa (50% protonated)
- Illustrates **Le Chatelier's principle** via visual feedback

## 🏗️ Architecture

```
index.html          → UI shell (dark-mode glassmorphism)
js/
  ├── chemistry.js  → MetabolicModel (Henderson-Hasselbalch solver)
  ├── molecules.js  → MoleculeRenderer (Canvas 2D with Proton Fader)
  ├── pathways.js   → PathwayPlotter (Plotly.js speciation curves)
  └── app.js        → SimulationEngine (reactive controller)
```

**Design Pattern**: Observable State  
`slider.input` → `model.solve(pH)` → `renderer.update(α)` → Canvas/Plotly refresh

## 🧬 Scientific Foundation

The simulator implements the **Henderson-Hasselbalch equation** for monoprotic weak acids:

$$pH = pK_a + \log\frac{[A^-]}{[HA]}$$

Rearranging for the deprotonated fraction:

$$\alpha_{A^-} = \frac{1}{1 + 10^{(pK_a - pH)}}$$

The **Proton Fader** maps this mathematical abstraction to a visual metaphor: hydrogen atom opacity = α<sub>HA</sub>, charge opacity = α<sub>A⁻</sub>.

## 📚 References

1. **Berg, J. M., Tymoczko, J. L., & Stryer, L. (2012).** *Biochemistry* (7th ed.). W.H. Freeman.  
   Chapter 2: Water — Henderson-Hasselbalch derivation.

2. **Nelson, D. L., & Cox, M. M. (2017).** *Lehninger Principles of Biochemistry* (7th ed.). Macmillan.  
   Chapter 16: The Citric Acid Cycle — Metabolite pKa values.

3. **Voet, D., & Voet, J. G. (2011).** *Biochemistry* (4th ed.). Wiley.  
   Chapter 4: Amino Acids — Acid-base equilibria in biological systems.

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

## 🤝 Contributing

This simulator was built as an educational tool. Contributions welcome:

- Additional metabolites (β-hydroxybutyrate, citrate, malate)
- Polyprotic acid support (multi-stage ionization)
- Export functionality (save speciation curves as PNG/CSV)

## 🙏 Acknowledgments

- **Plotly.js** for interactive graphing
- **Inter font** by Rasmus Andersson
- Metabolite pKa values from CRC Handbook of Chemistry and Physics (105th ed.)

---

**Built with biochemistry, rendered with JavaScript.**
