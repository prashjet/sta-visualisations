# STA visualisations

Interactive companions to Statistics and Data for Astrophysicists (2026W).

Website: https://prashjet.github.io/sta-visualisations/

## Lecture 3

The [Lecture 3 index](https://prashjet.github.io/sta-visualisations/lecture-3/) links to separate visualisation pages. Posterior curves start hidden and can be revealed with a checkbox.

### Gaussian update

Gaussian likelihood, prior and posterior, following slide 46 of the lecture 3–5 notes. Independent normal observations with known population standard deviation, and a conjugate normal prior for the unknown mean. Sliders control the simulated population mean μ, sample size n, population standard deviation σ, prior mean η and prior standard deviation λ. The likelihood is rescaled to unit area for display. The posterior is computed analytically.

Static HTML, CSS and JavaScript, without external dependencies. Serve this directory with `python3 -m http.server 8000` for local preview. GitHub Pages serves the repository root on the main branch.

### Parallax to distance

Slides 49–53: Gaussian parallax measurement likelihood with a uniform distance prior. The upper bound slider ends at infinity, switching to an improper prior and posterior; no finite-window normalisation or posterior moments are reported in that case. Finite priors use log-scaled numerical quadrature. Distance axes remain fixed at 0–5000 pc.
