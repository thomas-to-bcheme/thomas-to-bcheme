---
date: 2026-04-28
topic: Adding Voice to AI Agent
target_audience: Frontend Developers, AI Engineers
---

Hello World! I've been exploring how to add voice controls to my portfolio's AI agent, and the experience of coordinating browser APIs with streaming responses taught me more about async state management than I expected.

The architecture uses two separate Web APIs running concurrently: the Web Speech API for recognition (speech-to-text) and the Speech Synthesis API for output (text-to-speech). What made this interesting was synchronizing them with the Gemini streaming chat API. When a response streams in character-by-character, I needed to decide: buffer the entire response and speak it once complete, or speak incrementally as chunks arrive?

I chose incremental streaming for two reasons. First, it reduces perceived latency—users hear the first sentence while the model generates the rest. Second, it matches the visual UX where text appears progressively. The implementation splits streaming chunks on sentence boundaries using a simple regex pattern, queues them, and speaks each sentence as it completes [1].

One discovery that caught me off-guard: mobile Safari handles speech synthesis differently than desktop Chrome. Safari cancels queued utterances when the page loses focus, so I added visibility detection to pause/resume speech based on tab state. This wasn't in any tutorial I found—I only discovered it by testing on my iPhone and noticing responses cutting off mid-sentence.

The technical pattern I'm most satisfied with: using custom React hooks (useSpeechRecognition, useSpeechSynthesis) to encapsulate browser API complexity. This keeps the component logic focused on UX concerns like when to enable voice, while the hooks handle feature detection, error states, and cleanup. It's a clean separation that makes testing and debugging significantly easier [2].

At this time, I am actively interviewing for AI/ML Engineering roles as my longitudinal career. I believe the opportunity cost is better spent reinforcing fundamentals of machine learning, deep learning, and system design. If I pass initial screenings, I'm preparing for interviews and next steps which may include takehome assignments, LeetCode-style questions, and system design discussions.

For frontend developers working with streaming AI: voice adds a dimension of complexity worth exploring. It forces you to think about state transitions (listening → processing → responding → speaking) in ways that pure text interfaces don't require.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Web Speech API Documentation - https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
[2] React Hooks Patterns - https://www.patterns.dev/react/hooks-pattern

#MachineLearning #OpenToWork #Frontend #WebDevelopment
