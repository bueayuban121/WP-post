# Design System Strategy: High-End Editorial

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Architectural Monolith."** 

This system moves beyond traditional e-commerce templates to treat the digital screen as a physical gallery space. Inspired by the brutalist yet refined interiors of high-end flagship stores, the design prioritizes structural integrity over decorative flair. We achieve an "expensive" feel by embracing **intentional asymmetry** and **tonal depth**. Rather than centering everything, we use a sophisticated 12-column grid where elements are often offset, creating a rhythmic, cinematic flow that mimics the layout of a luxury fashion magazine. Negative space is not "empty"—it is a premium asset that provides the breathing room necessary for high-contrast typography and monochrome textures to command attention.

## 2. Colors
Our palette is a disciplined study in monochrome luxury. It is designed to be felt, not just seen.

*   **Primary Palette:** 
    *   `primary`: #ffffff (Pure light for critical focus)
    *   `surface`: #131313 (The deep, velvet-black foundation)
    *   `on_surface`: #e2e2e2 (Muted stone for readability)
*   **The "No-Line" Rule:** To maintain a seamless, immersive aesthetic, **1px solid borders are strictly prohibited** for sectioning. We do not use "lines" to separate content. Boundaries must be defined through tonal shifts. For instance, a `surface_container_low` (#1B1B1B) section should sit against a `surface` (#131313) background to create a felt but unseen transition.
*   **Surface Hierarchy & Nesting:** Treat the UI as layers of fine material. Use the `surface_container` tiers to create depth. A product card should not have a border; it should be a `surface_container_highest` (#353535) block nested within a `surface_container` (#1F1F1F) layout.
*   **The "Glass & Gradient" Rule:** For floating elements like navigation bars or quick-buy overlays, utilize Glassmorphism. Use semi-transparent variants of `surface_container` with a `backdrop-blur` of 20px. 
*   **Signature Textures:** For main CTAs, apply a subtle linear gradient from `primary` (#FFFFFF) to `primary_container` (#D4D4D4). This adds a "metallic" or "satin" sheen that elevates the button from a flat shape to a high-end object.

## 3. Typography
Typography is the voice of this design system. It is sharp, disciplined, and editorial.

*   **Display & Headlines (Newsreader):** We use high-contrast serifs for all editorial moments. This communicates heritage and sophistication. 
    *   `display-lg`: 3.5rem. Use for hero statements with tight letter-spacing (-0.02em).
    *   `headline-md`: 1.75rem. Use for section titles, always in sentence case to avoid a "shouting" tone.
*   **Body & UI (Inter):** For functional data, we use a sharp sans-serif. It provides a technical, modern counterpoint to the romantic serif headlines.
    *   `body-md`: 0.875rem. The workhorse for product descriptions and navigation.
    *   `label-sm`: 0.6875rem. All-caps with increased letter-spacing (+0.1em) for a "technical spec" look on tags and labels.

## 4. Elevation & Depth
Depth is achieved through atmospheric layering, mimicking the soft, ambient lighting found in the referenced store interiors.

*   **The Layering Principle:** Stacking surface tiers is the primary method of elevation. 
    *   *Base:* `surface` (#131313)
    *   *Level 1:* `surface_container_low` (#1B1B1B)
    *   *Level 2:* `surface_container_high` (#2A2A2A)
*   **Ambient Shadows:** Traditional drop shadows are too "digital." Use ultra-diffused shadows for floating modals: `box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5)`. The shadow should feel like a soft glow of darkness rather than a hard edge.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` (#474747) at **15% opacity**. It should be barely perceptible—a "ghost" of a line.
*   **Glassmorphism:** Navigation menus should use `surface_container` with 80% opacity and a heavy blur. This allows the movement of monochrome imagery behind the UI to feel integrated and cinematic.

## 5. Components

*   **Buttons:** 
    *   *Primary:* `primary` (#FFFFFF) background with `on_primary` (#1A1C1C) text. Square corners (`0px`). High-padding: `1.2rem 2.75rem`.
    *   *Secondary:* `surface_container_highest` background. No border.
*   **Input Fields:** 
    *   Use a `surface_container_lowest` background. 
    *   No visible border until `focus` state, where a 1px `primary` bottom-border appears. Labels use `label-sm` above the field.
*   **Cards & Lists:** 
    *   **Prohibition:** No divider lines between list items. 
    *   Use `spacing-8` (2.75rem) to separate items. Separation is achieved through white space or a subtle background shift to `surface_container_low` on hover.
*   **Chips:** 
    *   `0px` radius. Use `outline_variant` for the container. On selection, fill with `primary` and switch text to `on_primary`.
*   **Bespoke Component - The "Lookbook Masonry":**
    *   Instead of a standard grid, use an asymmetric masonry layout for product displays. Images should vary in aspect ratio (4:5 and 2:3) to create a rhythmic, magazine-style browsing experience.

## 6. Do's and Don'ts

### Do
*   **DO** use extreme vertical spacing (`spacing-20` or `spacing-24`) between sections to create a sense of "luxury volume."
*   **DO** use `newsreader` for numbers in pricing to make them feel like a curated detail.
*   **DO** keep all corners at `0px`. Roundness is "friendly"; we are "authoritative."

### Don't
*   **DON'T** use any color outside the monochrome scale. No "success green" or "warning orange"—use `error` (#FFB4AB) sparingly for critical errors only.
*   **DON'T** center-align long blocks of text. Stick to disciplined left-aligned or asymmetric "staggered" editorial layouts.
*   **DON'T** use icons for everything. Use text labels (`label-md`) whenever possible to maintain a minimalist, sophisticated interface.