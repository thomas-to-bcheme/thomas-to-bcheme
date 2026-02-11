---
date: 2026-05-12
topic: Responsive Design Experiences
target_audience: Frontend Developers, Product Designers
---

Hello World! I've been working on making my portfolio work well across mobile, tablet, and desktop devices, and the most valuable lesson I learned is that responsive design is not about breakpoints. It is about understanding how interaction patterns change across form factors.

The specific problem: my AI chat interface felt cramped on mobile. The input field, send button, and voice controls competed for limited horizontal space while the chat history consumed the entire viewport. On desktop, the same layout felt sparse because I had room for two columns but was only using one.

My solution used Tailwind's `lg:grid-cols-2` pattern to create a two-column layout on large screens (chat on right, profile on left) while stacking them vertically on mobile. What made this work was treating mobile as the collapsed state by default. On small screens, the chat agent starts minimized with a toggle button. Users explicitly choose to expand it, which feels natural on mobile where screen space is precious [1].

One pattern that helped: container-based scrolling instead of viewport scrolling. Instead of letting the chat push the page height to extreme values, I gave the chat container a fixed `max-h-96` with `overflow-y-auto`. This keeps the chat self-contained. Scrolling inside it doesn't affect the rest of the page. On mobile, this prevents the "infinite scroll" problem where users lose their place in the portfolio content.

What surprised me was how breakpoint choices affect perceived performance. I initially used `md:` (768px) for my two-column layout, but tablet users in portrait mode got the desktop layout crammed into a narrow space. Switching to `lg:` (1024px) meant tablets defaulted to the mobile-optimized stack. The layout only splits into columns when there's genuinely enough room, which improved the experience on iPad and Surface devices significantly [2].

The detail I'm most satisfied with: touch target sizing. I increased button padding to `p-2` minimum and ensured interactive elements have at least 44×44px hit areas (Apple's recommended minimum). This seems obvious, but I only caught undersized targets after testing on my iPhone and finding myself constantly missing the microphone button.

At this time, I am actively interviewing for AI/ML Engineering roles as my longitudinal career. I believe the opportunity cost is better spent reinforcing fundamentals of machine learning, deep learning, and system design. If I pass initial screenings, I'm preparing for interviews with takehome assignments, LeetCode-style questions, and system design discussions.

For developers building interactive UIs: test on actual devices early. Emulators approximate layouts well, but you won't discover touch interaction issues or scrolling conflicts until you use the real hardware.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Tailwind Responsive Design - https://tailwindcss.com/docs/responsive-design
[2] Touch Target Accessibility - https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
