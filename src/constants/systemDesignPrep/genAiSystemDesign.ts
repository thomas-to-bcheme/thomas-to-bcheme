import type { FrameworkStep } from '@/components/ui/FrameworkStepList';
import type { ComponentCrossLink } from '@/constants/systemDesignPrep/componentsOfSystemDesign';

// The GenAI-specific delta on top of mlSystemDesignFramework.ts's 6 steps —
// same FrameworkStep shape, same shared FrameworkStepList component. Where
// the ML framework's steps are the layer a discriminative model in
// production adds on top of general system design, these steps are the
// further layer a *generative* model adds on top of that: it doesn't just
// predict, it has to generate, and it needs a subsystem (retrieval, safety
// filtering, post-processing) chained around it that a discriminative model
// never needed. Weighted per the site's own goal statement — GenAI as a
// subsystem inside a larger SWE system, not standalone ML theory — so RAG
// and Overall GenAI System Design get real depth; Transformer internals and
// large-scale-training efficiency get one acknowledging line each, not a
// step of their own.
export const GENAI_FRAMEWORK_STEPS: FrameworkStep[] = [
  {
    id: 'genai-discriminative-vs-generative',
    marker: '1',
    label: 'Discriminative vs. Generative Models',
    description:
      "Before anything else: is this even a generative task? Discriminative models learn P(Y|X) to classify or predict — that's everything the ML framework above already covers. Generative models learn P(X) or P(X,Y) to sample new content instead.",
    detail: [
      'Classical generative approaches (Naive Bayes, Hidden Markov Models) exist but struggle with unstructured data; modern GenAI is dominated by VAEs (encode → latent space → decode), GANs (generator vs. discriminator adversarial training), diffusion models (reverse denoising — dominant for image/video), and autoregressive models (predict the next token from what came before — dominant for text, and every production LLM)',
      "This fork decides whether the rest of this section even applies: a fraud classifier or a ranking model stays a discriminative problem and belongs entirely in the framework above; a chatbot or image generator is generative, and everything below is the delta on top of that framework",
    ],
  },
  {
    id: 'genai-risks',
    marker: '2',
    label: 'GenAI Risks — Raise Them Unprompted',
    description:
      'A strong candidate surfaces these before the interviewer asks — the same "raise it unprompted" instinct as security in the general framework, because a generative system has failure modes a discriminative one doesn\'t.',
    detail: [
      'Hallucination: a confident, fluent, and wrong output with no ground-truth check at generation time — the single most-probed GenAI risk, and the reason grounding (see RAG below) is a mitigation pattern, not a nice-to-have',
      'Deepfakes and adversarial misuse: synthetic media used for blackmail, political manipulation, or automated phishing — a risk that only exists once a model can generate convincing output, not just classify it',
      'Environmental cost: training frontier models at scale is a real line item (GPT-4-class training runs are reported in the hundreds of millions of dollars), and a legitimate trade-off to name alongside retraining cadence',
      "IP, misinformation, and training-data bias: outputs can reproduce copyrighted material, confidently state wrong facts, or reflect bias baked into the training corpus — distinct from the model-accuracy bias discussion in the ML framework's Evaluation step, because here the training data itself is the risk surface, not just the decision boundary",
    ],
  },
  {
    id: 'genai-rag-as-subsystem',
    marker: '3',
    label: 'RAG as a Subsystem, Not a Single Model Call',
    description:
      "Retrieval-Augmented Generation is the highest-leverage GenAI pattern to know cold: a retriever, a generator, and a grounding step composed together. This page's own AI chat already runs this shape — src/app/api/chat/route.ts and src/data/AiSystemInformation.ts.",
    detail: [
      "Retriever: the chat route builds Gemini's systemInstruction by reading the résumé markdown straight off disk (fs.readFileSync in AiSystemInformation.ts) and injecting the whole document on every request — full-document injection instead of chunk-embed-search, because the corpus is one file. A larger corpus (a multi-tenant support bot, a codebase-wide assistant) needs the vector-store half of RAG instead of this.",
      'Generator: a single Gemini call (model.startChat → sendMessageStream) streams the response back to the client — the language-model half of RAG, and the only half a bare "call an LLM" implementation would have',
      "Grounding: the system instruction explicitly tells the model to answer from the injected résumé/portfolio context rather than free-associate — the reason RAG reduces hallucination isn't magic, it's that the model is answering an open-book question instead of an open-ended one",
      'The retriever changes with scale (static context injection here vs. embed-once/nearest-neighbor search in a larger system) — the generator + grounding contract stays the same either way',
    ],
  },
  {
    id: 'genai-overall-system-design',
    marker: '4',
    label: 'Overall GenAI System Design — The Missing Step',
    description:
      "The classical framework folds this into the ML framework's High-Level Architecture step above. GenAI earns it as a separate step because a generative core model is rarely deployed alone — content filtering, post-processing, and (for image/video) upscaling chain around it.",
    detail: [
      'A generative core model chains together with content filtering (NSFW / harmful-content filters running pre- and post-generation), post-processing, and — for image or video output — upscaling / quality-enhancement models; the core model is one block in the pipeline, not the whole system',
      'Scalability is the same lever as anywhere else on this page: load balancers and distributed inference in front of the model-serving tier, not a new concept — see the cross-reference block below',
      'Security is the same lever too: privacy of personalized-generation inputs, adversarial-prompt attacks, model tampering, and data leakage through the generated output itself — see the cross-reference block below',
      "User feedback loops and a retraining cadence close the pipeline — the same monitoring instinct as the ML framework's step above, with content-quality signals added to the drift signals already covered there",
    ],
  },
  {
    id: 'genai-training-and-sampling',
    marker: '5',
    label: 'Training & Sampling — Compact Reference',
    description:
      'Two more terms worth naming precisely if asked, kept intentionally brief — deep Transformer-internals and large-scale-training-efficiency questions are a different interview than "GenAI as part of a SWE system," and are only worth acknowledging here, not building out.',
    detail: [
      'Multi-stage LLM training: pretraining (general language patterns from large public corpora, e.g. Common Crawl) → supervised fine-tuning (adapting to a specific task) → alignment (RLHF-style — aligning outputs to human preferences), each a distinct stage with its own data and objective',
      'Sampling at inference time: greedy search (always the top token — fast, repetitive) vs. beam search (tracks multiple candidate sequences) vs. top-k / top-p (nucleus) sampling (samples from a truncated probability distribution) — the trade-off in every case is coherence vs. diversity',
      "Explicitly out of scope here: Transformer self-attention math (Q/K/V, multi-head attention) and large-scale training efficiency (gradient checkpointing, mixed precision, ZeRO/FSDP) — real interview topics, but pure ML-theory/training-infra depth with the least connection to this page's SWE-system framing",
    ],
  },
];

// Closing "how this plugs into the rest of the page" index — deliberately
// not a third Similarities/Differences grid (the ML section directly above
// this one already uses that device once; repeating it here would read
// templated). Mirrors componentsOfSystemDesign.ts's ComponentCrossLink shape
// and the site's established `tag-blue` pill link style.
export const GENAI_CROSS_REFERENCES: ComponentCrossLink[] = [
  { label: 'ML High-Level Architecture →', href: '#ml-high-level-architecture' },
  { label: 'Vector databases (the retrieval half of RAG) →', href: '#vector-databases' },
  { label: 'Load balancing →', href: '#load-balancing' },
  { label: 'Security by design →', href: '#security-by-design' },
  { label: 'Offline vs. online metrics →', href: '#offline-vs-online-metrics' },
];
