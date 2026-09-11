# Visual direction

Reference review completed on Dribbble before UI implementation, 2026-09-11.

## References inspected

- [Synthex by Sohan Talukder / Olack](https://dribbble.com/shots/27380455-AI-Workflow-Automation-SaaS-Dashboard-UI-Design-Synthex): primary reference. Its light workspace, compact left navigation, central workflow and contextual right inspector create a clear operational hierarchy. Adopt the composition and restrained separators, with larger, higher-contrast text.
- [Cybersecurity Operations by Nazrul Islam Raihan](https://dribbble.com/shots/27669546-Cybersecurity-Operations-Dashboard-UI-UX-Design): secondary reference for warm neutral surfaces, concentrated status information and a clear overview. Its decorative radial visualization is unsuitable for our task; the live application needs that space.
- [SaaS Admin Dashboard by Abdullah Mamun](https://dribbble.com/shots/26905392-SaaS-Admin-Dashboard-Home-Screen-UI): inspected as a comparison. The density and persistent navigation are useful; the dark purple palette and chart-heavy composition are not the chosen direction.

These are composition references, not licensed assets. The implementation uses original markup, styles and icons. No reference images or copied branding ship in the product.

## Product direction: Praxis Loom

Renamed from Relay on 2026-09-11 at the owner’s request for a more distinctive identity. “Praxis” reflects intent put into practice; “Loom” reflects composing observed actions into a reusable workflow. The original woven-line mark makes that connection without changing the interaction model. The name is a product identity, not a claim of exclusive rights. Repository paths and immutable execution evidence retain their existing identifiers.

A calm operations workspace. Charcoal navigation, a warm paper canvas, white work surfaces, restrained burnt-orange actions, and precise tabular typography. The signature element is a vertical execution timeline paired with the live session, not a decorative hero or a grid of fabricated statistics.

Primary user questions: What is running? What needs my attention? What happened? Can I safely continue? Make the answers visible in that order. Show only counts and timings derived from actual runs. Empty states explain the first action. Errors explain the stopped step and next available action.

## Tokens and layout

- Canvas `#f6f5f1`; surface `#ffffff`; text `#232522`; secondary `#656963`; border `#dedfd8`.
- Navigation `#222824`; accent `#b84c28`; accent tint `#fff0e8`; positive `#27684a`; warning `#8b5819`; critical `#a43131`.
- System sans-serif for offline portability; a system monospace for durations, step IDs and outputs. Body 14-16px, page titles 28-32px, labels 11-12px with restrained spacing.
- Desktop: 216px navigation, flexible central workspace, 300-340px context inspector. Avoid nested borders where whitespace communicates grouping.
- Corners 6-10px, no pill-shaped main panels. Shadows only for raised overlays. No gradients, glass effects or decorative glow.
- At narrow widths, navigation becomes a compact top row and panels stack in reading order. Controls stay usable without horizontal scrolling.

## Interaction standards

All controls have real behavior, labels and keyboard focus. Disabled controls explain why. Taking control and returning control are visibly distinct states, with an explicit owner and current session. Do not make a row of unlabeled icon buttons the only route to important actions.

Honor reduced motion. Short transitions may clarify state changes; polling must not move focus or replace a partially completed operator form. Use an accessible dialog for starting a run, visible validation, proper status announcements, and text as well as color for outcomes. Test keyboard operation, narrow viewports and empty/error/paused/success states in a real browser.

The legacy target has its own restrained banking visual identity and intentionally old markup. Its imperfect DOM is a test condition, not permission to make the operator experience visually careless.
