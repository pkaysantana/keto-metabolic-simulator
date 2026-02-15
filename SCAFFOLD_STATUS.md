# Keto Metabolic Simulator - Scaffolding Status

## ✅ "Clone & Gut" Complete

### Retained (The Shell)

- ✅ `index.html` - UI structure (will be modified for chemistry)
- ✅ `index.css` - Dark-mode styling (reusable)
- ✅ `js/app.js` - SimulationEngine (Observer pattern, state management)

### Deleted (Physics-Specific)

- ❌ `js/physics.js` → Will become `js/chemistry.js`
- ❌ `js/orbitals.js` → Will become `js/molecules.js`
- ❌ `js/plotter.js` → Will become `js/pathways.js`
- ❌ All perovskite documentation files

### Current Directory Structure

```
keto-metabolic-simulator/
├── .git/              (fresh repo)
├── index.html         (shell - needs chemistry adaptation)
├── index.css          (styling - reusable)
├── js/
│   └── app.js         (SimulationEngine - reusable)
└── [empty placeholder files]
```

## 🎯 Next Steps

**Ready for:**

1. `js/chemistry.js` - pH-dependent protonation model for pyruvate
2. `js/molecules.js` - 2D molecular structure renderer
3. `js/pathways.js` - Metabolic flux visualization

**Awaiting your code for `js/chemistry.js`** to simulate pyruvate protonation states.
