---
date: 2026-05-05
topic: Deepening Accessibility Knowledge
target_audience: Frontend Developers, UX Designers
---

Hello World! Something I've been focused on lately is improving accessibility across my portfolio, and what I've learned is that accessibility is not a checklist. It is a design constraint that improves UX for everyone when applied thoughtfully.

One area where this became clear: voice controls for my AI chat agent. I initially built them for accessibility (helping users who can't type), but discovered they benefit everyone. During mobile testing, I found myself using voice input by default because typing on a small screen while scrolling is awkward. The accessibility feature became the preferred interaction method.

The technical approach that worked well: motion reduction preferences. I added `motion-reduce:animate-none` Tailwind utilities to all animated elements (pulsing microphone buttons, loading spinners). This respects the user's `prefers-reduced-motion` system setting without requiring JavaScript. When I tested it with motion settings enabled on macOS, animations disappeared instantly. No flicker, no layout shift [1].

Another pattern I found valuable: ARIA live regions for dynamic content. My AI agent streams responses character-by-character, which looks smooth visually but creates chaos for screen readers (they announce every character). By wrapping the response in an `aria-live="polite"` region and updating it at sentence boundaries instead of per-character, screen readers announce complete thoughts rather than fragmented letters [2].

What surprised me most: semantic HTML still matters more than ARIA attributes. I spent time adding elaborate ARIA labels before realizing my form lacked a proper `<label>` element. Screen readers were confused because I'd built custom styling without maintaining the underlying HTML structure. Once I fixed the markup, most of my ARIA additions became redundant.

At this time, I am actively interviewing for AI/ML Engineering roles as my longitudinal career. I believe the opportunity cost is better spent reinforcing fundamentals of machine learning, deep learning, and system design. If I pass initial screenings, I'm preparing for interviews which include takehome assignments, LeetCode-style questions, and system design discussions.

For developers working on interactive UIs: test with keyboard navigation and screen readers before adding animations or voice features. The foundational accessibility work (focus management, semantic HTML, ARIA) provides the most value, and everything else builds on that base.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Tailwind CSS Accessibility Features - https://tailwindcss.com/docs/animation#prefers-reduced-motion
[2] ARIA Live Regions - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
