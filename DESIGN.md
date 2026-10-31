# Reham portfolio

Selected source: [Webflow-inspired DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/webflow/DESIGN.md) from VoltAgent/awesome-design-md. Adapted, not a Webflow clone.

Blue #1458dd; gray canvas #f2f3f5; ink #24282f; secondary text #626975; white editor surfaces. Dark theme uses the same family inverted: ground #111318, surface #1b1e24, ink #f2f3f5, muted #a0a6b1. Brand blue stays #1458dd for fills and display type in both themes; small accent text on dark uses --accent-text #8ab0f7 because the brand blue only reaches 3:1 there. Fraunces with a Georgia fallback, tight display tracking, restrained weights. Full-width personal wordmark, compact navigation, generous spacing, precise rectangular controls. Four original code-drawn concept covers, not representations of client commissions.

Idea: Reham's name becomes the central typographic object, with individual letters arriving in sequence. The hero background is a precise dot grid where every dot is a small spring. The name lands like a stone in water: its shockwave draws the grid on, then slow currents of blue drift through it and stray drops fall. The cursor drags a wake that stretches the dots before they wobble home, a click or tap sends out a ripple, and scrolling pushes the currents along. The glow is held back behind the copy. The Motion button eases it flat. Work filters and project dialogs allow visitors to explore the sample projects.

Motion: GSAP ScrollTrigger with Lenis smooth scroll (src/motion.ts). The hero holds while its copy clears and the name rises, then the work section slides over it; project cards stack and recede; the two about lines pass each other and the statement inks in word by word; the contact panel opens from an inset card to full bleed into the blue footer, where the name returns in white in both themes. All of it sits on top of complete CSS, so the page is whole with reduced motion or JavaScript off. Theme: follows the system until a choice is saved (src/theme.ts). Switching to light pours the page out of the toggle; switching to dark plays that backwards, drawing the light back in.

Section argument: hero introduces the person and discipline; selected work demonstrates sample visual directions; about describes the approach; contact provides a direct email action. Admin supports editing these fields and adding/removing projects.

Skill direction: name-as-monument. Deviations: no portrait, project photographs, or video were supplied, so no stock person is presented as Reham. Original concept artwork replaces photographic previews. The user's requested subtle particles replace the dealt shutter motion. The chosen repository design and blue/gray brief govern tokens.

Sample content to replace: role, biography, email, project titles/descriptions/years and artwork. No invented clients, metrics, testimonials, or professional achievements.
