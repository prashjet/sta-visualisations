# STA visualisations

Interactive companions to Statistics and Data for Astrophysicists (2026W).

Website: https://prashjet.github.io/sta-visualisations/

## Lecture 3

Gaussian likelihood, prior and posterior, following slide 46 of the lecture 3–5 notes. Independent normal observations with known population standard deviation, and a conjugate normal prior for the unknown mean. Sliders control the simulated population mean μ, sample size n, population standard deviation σ, prior mean η and prior standard deviation λ. The likelihood is rescaled to unit area for display. The posterior is computed analytically.

Static HTML, CSS and JavaScript, without external dependencies. Serve this directory with `python3 -m http.server 8000` for local preview. GitHub Pages serves the repository root on the main branch.
