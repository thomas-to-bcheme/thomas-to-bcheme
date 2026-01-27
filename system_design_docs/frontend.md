<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&height=300&color=gradient&text=Thomas%20To&reversal=true&desc=Fullstack%20Software,%20Biomanufacturing,%20Protein%20Design&descAlignY=65&descSize=30&section=footer" width="100%"/>

  <br />

  <a href="https://thomas-to-bcheme-github-io.vercel.app/">
    <img src="https://img.shields.io/badge/Portfolio-Visit%20Live%20Site-2ea44f?style=for-the-badge&logo=vercel&logoColor=white" alt="Portfolio" />
  </a>
  <a href="src/docs/Thomas_To_Resume.pdf?raw=true">
    <img src="https://img.shields.io/badge/Resume-Download%20PDF-0078D4?style=for-the-badge&logo=adobeacrobatreader&logoColor=white" alt="Resume" />
  </a>
  <a href="https://www.linkedin.com/in/thomas-to-ucdavis/">
    <img src="https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
</div>

# Frontend Documentation

**Component Architecture, State Management, and Styling System**

---

## 1. Overview

The frontend is a server-rendered Next.js 16 application using the **App Router** with React 19. It demonstrates fullstack engineering capabilities through a component-based architecture, streaming AI chat interface, and zero-CLS (Cumulative Layout Shift) performance optimizations.

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Server-side rendering, routing, API routes |
| **UI Library** | React 19 | Component rendering with concurrent features |
| **Language** | TypeScript 5 | Type-safe development |
| **Styling** | Tailwind CSS v4 | Utility-first CSS with PostCSS |
| **Animation** | Framer Motion | Declarative animations respecting reduced motion |
| **Markdown** | react-markdown | Rendering streaming AI responses |
| **Icons** | lucide-react | Consistent icon system |

### Design Principles

- **Component Isolation**: All components use explicit props, no global state dependencies
- **Server-First**: Default to Server Components unless client interactivity is required
- **Accessibility**: WCAG 2.1 AA compliant with semantic HTML and ARIA labels
- **Performance**: Zero-cost abstractions, font optimization, lazy loading strategies

---

## 2. Component Hierarchy

```
page.tsx (Client Component - 'use client')
├── SkipLink
├── <header> (Sticky Navigation)
│   ├── Logo (scroll to top)
│   ├── <nav> (Live Agent, About Me, Solutions, Lifecycle)
│   └── Contact Button
│
├── <main id="main-content">
│   ├── <section id="about-me">
│   │   ├── HeroSection
│   │   │   ├── SystemStatusTicker
│   │   │   ├── Badge (status + location)
│   │   │   ├── TrustBadge[] (Profit, Risk, R&D, ICH, GxP, HIPAA)
│   │   │   ├── CTA Buttons (GitHub, Resume)
│   │   │   └── AiGenerator (Desktop + Mobile Collapsible)
│   │   │       └── ReactMarkdown (streaming responses)
│   │   ├── AboutMeSection
│   │   └── Connect
│   │
│   ├── <section id="impact">
│   │   └── BentoGrid
│   │       ├── BentoCard #1
│   │       │   └── ProjectDeepDive (Agentic Revenue Optimization)
│   │       └── BentoCard #2
│   │           └── ProjectDeepDive (Agentic Onboarding)
│   │
│   ├── <section id="projects">
│   │   ├── ArchitectureDiagram
│   │   └── ROICalculation
│   │
│   └── Roadmap
│
└── <footer>
    ├── Brand Identity
    ├── Navigation Sitemap
    └── System Status (All Systems Nominal)
```

---

## 3. Component Inventory

| Component | Type | Purpose | Props | State |
|-----------|------|---------|-------|-------|
| **AiGenerator** | Stateful | Streaming chat interface consuming `/api/chat` | `collapsed?`, `onToggleCollapse?` | `messages`, `input`, `isLoading` |
| **HeroSection** | Composition | Landing section orchestrating badge grid + AI chat | None | `isMobileChatCollapsed` |
| **AboutMeSection** | Layout | Displays biography and key qualifications | None | None |
| **Projects** | Layout | Wrapper for multiple project cards | None | None |
| **ProjectDeepDive** | Presentational | Detailed project showcase with KPIs | `title`, `role`, `problem`, `solution`, `parameters`, `tags`, `kpis` | None |
| **ArchitectureDiagram** | Presentational | Visual system architecture with Mermaid-like diagram | None | None |
| **Roadmap** | Presentational | Development timeline with phase indicators | None | None |
| **ROICalculation** | Stateful | Interactive calculator for business impact | None | Calculator values |
| **BentoGrid** | Wrapper | Responsive grid layout container | `children`, `className`, `id` | None |
| **BentoCard** | Wrapper | Grid cell with hover animations | `colSpan`, `rowSpan`, `title`, `icon`, `href`, `noFade` | None |
| **Badge** | Presentational | Color-coded label with variants | `color`, `variant`, `icon`, `href`, `pulse` | None |
| **TrustBadge** | Presentational | Icon + label for trust signals | `label`, `icon`, `variant` | None |
| **ImpactMetric** | Presentational | Numeric KPI display with icon | `value`, `label`, `icon`, `trend` | None |
| **SystemStatusTicker** | Presentational | Real-time status bar with animated pulse | None | None |
| **Connect** | Layout | Social links and contact CTA section | None | None |
| **SkipLink** | Accessibility | Hidden link for keyboard navigation to main content | None | None |

---

## 4. Key Components

### 4.1 AiGenerator (Streaming Chat Interface)

**File**: `src/components/AiGenerator.tsx`

**Purpose**: Consumes the `/api/chat` streaming endpoint to provide a conversational interface for the RAG-powered AI agent.

**Architecture**:
```typescript
type Message = { role: 'user' | 'assistant'; content: string };

// State Management
const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [hasError, setHasError] = useState(false);

// Streaming Logic
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });

  // Update last message incrementally
  setMessages(prev => {
    const last = prev[prev.length - 1];
    return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
  });
}
```

**Key Features**:
- **Suggested Questions**: Pre-populated starter prompts for new users
- **Retry Mechanism**: Error state with retry button after API failures
- **Timeout Indicator**: Loading message shows "(taking longer than usual)" after 10s
- **Mobile Responsive**: Collapsible view on small screens to save viewport space
- **Auto-Scroll**: Automatically scrolls chat container (not window) as messages arrive
- **ReactMarkdown Integration**: Renders streaming responses with code syntax highlighting

**User Experience Enhancements**:
- Sticky input footer ensures always-visible message submission
- Loading spinner with accessible `aria-live="polite"` status
- Motion-safe animations respect `prefers-reduced-motion`

---

### 4.2 HeroSection (Composition Pattern)

**File**: `src/components/HeroSection.tsx`

**Purpose**: Landing section demonstrating composition over inheritance. Orchestrates trust signals, CTAs, and the AI chat interface.

**Composition Strategy**:
```typescript
<HeroSection>
  <SystemStatusTicker />      {/* Real-time status bar */}
  <Badge pulse>AVAILABLE</Badge>  {/* Status indicator */}
  <TrustBadge[] />            {/* Profit, Risk, Compliance signals */}
  <CTA Buttons />             {/* GitHub + Resume download */}
  <AiGenerator />             {/* Desktop: always visible */}
  <AiGenerator collapsed />   {/* Mobile: collapsible variant */}
</HeroSection>
```

**Layout Technique**:
- Uses CSS Grid (`lg:grid-cols-2`) to create a two-column layout
- Left column: Value proposition with trust signals
- Right column: AI chat interface with glow effect
- Mobile: Stacks vertically with collapsible chat card

**Glow Effect**:
```tsx
<div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-2xl blur opacity-20 animate-pulse" />
```
Creates a pulsing gradient border effect for visual prominence.

---

### 4.3 BentoGrid (Layout System)

**File**: `src/components/BentoGrid.tsx`

**Purpose**: Responsive grid layout inspired by Bento UI pattern. Allows flexible card spanning with minimal markup.

**Grid Configuration**:
```typescript
// Grid: 1 col (mobile) → 2 cols (tablet) → 4 cols (desktop)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(180px,auto)]">
```

**Card Spanning**:
```tsx
<BentoCard colSpan={2} rowSpan={1}>  {/* Spans 2 columns */}
  <ProjectDeepDive />
</BentoCard>
```

**Animation Logic**:
```typescript
// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

<motion.div
  initial={noFade || prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
  whileInView={noFade || prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-50px" }}  {/* Trigger 50px before scroll */}
  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
/>
```

**Accessibility**:
- Cards with `href` render as `<a>` tags with `rel="noopener noreferrer"`
- Hover indicators (arrow icons) only appear on interactive cards
- All animations can be disabled via `noFade` prop

---

### 4.4 Badge (Variant Pattern)

**File**: `src/components/Badge.tsx`

**Purpose**: Reusable label component demonstrating the **Variant Pattern** for type-safe styling.

**Variant Types**:
```typescript
type BadgeProps = {
  color?: "gradient" | "blue" | "green" | "zinc" | "amber" | "purple" | "red" | "rose";
  variant?: "solid" | "outline" | "glass";
  pulse?: boolean;  // Animated pulse indicator
  icon?: React.ElementType;  // Dynamic icon component
  href?: string;  // Renders as <a> if provided
};
```

**Style Mapping**:
```typescript
const solidColors = {
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  // ...
};

const outlineColors = {
  green: "bg-transparent text-emerald-700 dark:text-emerald-400 border-emerald-600/50",
  // ...
};
```

**Usage Examples**:
```tsx
<Badge color="green" pulse>AVAILABLE FOR HIRE</Badge>
<Badge color="zinc">California, United States</Badge>
<Badge color="blue" variant="outline" icon={Github} href="...">Open Source</Badge>
```

**Pulse Animation** (for status indicators):
```tsx
<span className="relative flex h-1.5 w-1.5">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
</span>
```

---

## 5. State Management

### 5.1 Client Component Directive

All interactive components require the `'use client'` directive at the top of the file:

```typescript
'use client';

import { useState } from 'react';
```

**Server vs Client Decision Matrix**:

| Scenario | Use Server Component | Use Client Component |
|----------|---------------------|---------------------|
| Static content (text, images) | ✅ | ❌ |
| Data fetching (no user input) | ✅ | ❌ |
| Event handlers (onClick, onChange) | ❌ | ✅ |
| `useState`, `useEffect` | ❌ | ✅ |
| Browser APIs (window, localStorage) | ❌ | ✅ |
| API routes (`route.ts`) | ✅ | N/A |

**Current Project Pattern**:
- `layout.tsx` → Server Component (metadata, fonts)
- `page.tsx` → Client Component (entire SPA with state)
- `AiGenerator.tsx` → Client Component (streaming chat)
- `api/chat/route.ts` → Server Route Handler

---

### 5.2 State Patterns

**Local State (useState)**:
```typescript
// AiGenerator.tsx
const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
```

**Refs for Non-Rendering Data**:
```typescript
// Store last prompt for retry without re-rendering
const lastPromptRef = useRef<string>('');
const chatContainerRef = useRef<HTMLDivElement>(null);
```

**Side Effects (useEffect)**:
```typescript
// Auto-scroll on new messages
useEffect(() => {
  scrollToBottom();
}, [messages, isLoading]);

// Track loading duration
useEffect(() => {
  let interval: NodeJS.Timeout;
  if (isLoading) {
    interval = setInterval(() => {
      setLoadingDuration(prev => prev + 1);
    }, 1000);
  }
  return () => clearInterval(interval);  // Cleanup
}, [isLoading]);
```

**Mount Detection** (Hydration Safety):
```typescript
// page.tsx - Prevent hydration mismatches
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);
if (!mounted) return null;
```

---

### 5.3 No Global State

**Architectural Decision**: This project intentionally avoids global state management (Redux, Zustand, Context) to demonstrate:
1. Component isolation principles
2. Prop drilling as explicit dependency graph
3. Lightweight state for portfolio use case

**If scaling to production**, consider:
- React Context for theme/auth
- Zustand for complex multi-component state
- TanStack Query for server state caching

---

## 6. Styling Architecture

### 6.1 Tailwind CSS v4

**Configuration**: `postcss.config.mjs`
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

**Theme Variables**: `src/app/globals.css`
```css
@theme inline {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --color-brand-blue: #2563eb;
  --color-brand-emerald: #10b981;
}
```

**Root Variables**:
```css
:root {
  --background: #ffffff;
  --foreground: #171717;
  --grid-color: rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #050505;
    --foreground: #ededed;
    --grid-color: rgba(255, 255, 255, 0.05);
  }
}
```

---

### 6.2 cn() Utility (Class Name Merging)

**File**: `src/lib/utils.tsx`

```typescript
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Purpose**: Merges Tailwind classes while resolving conflicts (e.g., `bg-red-500` overrides `bg-blue-500`).

**Usage**:
```tsx
<div className={cn(
  'base-class',
  condition && 'conditional-class',
  variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500'
)} />
```

---

### 6.3 Dark Mode

Uses **media query strategy** (respects system preferences):

```tsx
<div className="bg-white dark:bg-zinc-900">
  <p className="text-zinc-900 dark:text-zinc-100">Content</p>
</div>
```

**No manual toggle**: Portfolio automatically matches user's OS theme preference.

---

### 6.4 Responsive Breakpoints

Mobile-first approach with standard Tailwind breakpoints:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
```

| Prefix | Min Width | Typical Device |
|--------|-----------|----------------|
| (none) | 0px | Mobile (default) |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |

---

### 6.5 Custom Utilities

**Grid Pattern Background**:
```css
.bg-grid-pattern {
  background-size: 40px 40px;
  background-image: linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
                    linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px);
}
```

**Custom Scrollbar** (for chat containers):
```css
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(161, 161, 170, 0.3);
  border-radius: 99px;
}
```

**Hide Scrollbar** (for horizontal scrollers):
```css
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

---

## 7. Data Flow

### 7.1 AI Chat Flow

```
User Input → AiGenerator (handleSubmit)
    ↓
POST /api/chat (with message history)
    ↓
route.ts → Google Gemini API (streaming)
    ↓
ReadableStream chunks → TextDecoder
    ↓
setMessages (incremental updates)
    ↓
ReactMarkdown renders formatted response
```

**Streaming Implementation**:
```typescript
// AiGenerator.tsx
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages: newHistory }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });

  setMessages(prev => {
    const last = prev[prev.length - 1];
    return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
  });
}
```

---

### 7.2 Static Data Flow

```
markdown/*.md → Manual updates → GitHub commit
    ↓
Vercel Build → Next.js static generation
    ↓
Components import markdown content
    ↓
Rendered on page load (no API calls)
```

**Example**:
```tsx
// ProjectDeepDive receives static props from page.tsx
<ProjectDeepDive
  title="Agentic Revenue Optimization"
  problem="High biological variability..."
  solution="Architected a predictive model..."
  parameters={['Weight', 'Height', 'Age']}
  tags={['Python', 'Snowflake', 'SQL']}
  kpis={['Querying from hours to minutes']}
/>
```

---

## 8. Performance Optimizations

### 8.1 Font Loading (Zero CLS)

**File**: `src/app/layout.tsx`

```typescript
import { Geist, Geist_Mono } from 'next/font/google';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

// CSS variables injected into <html> tag
<html className={`${geistSans.variable} ${geistMono.variable}`}>
```

**Benefits**:
- Fonts self-hosted by Vercel (no external requests)
- Automatic `font-display: swap`
- Zero Cumulative Layout Shift (CLS)

---

### 8.2 Code Splitting Opportunities

**Current Bundle Sizes**:
- `AiGenerator.tsx`: ~8KB (streaming logic + ReactMarkdown)
- `ROICalculation.tsx`: ~39KB (interactive calculator with state)

**Potential Optimization**:
```typescript
import dynamic from 'next/dynamic';

const ROICalculation = dynamic(() => import('@/components/ROICalculation'), {
  loading: () => <Skeleton />,
  ssr: false,  // Skip SSR if component is below fold
});
```

---

### 8.3 Image Optimization

Use `next/image` for automatic optimization (currently project uses minimal images):

```tsx
import Image from 'next/image';

<Image
  src="/architecture.png"
  alt="System Architecture Diagram"
  width={1200}
  height={800}
  priority  // For above-the-fold images
/>
```

**Features**:
- Automatic WebP/AVIF conversion
- Responsive srcset generation
- Lazy loading by default (disable with `priority`)

---

### 8.4 Animation Performance

**Framer Motion Best Practices**:
```typescript
// Only animate transform and opacity (GPU-accelerated)
<motion.div
  initial={{ opacity: 0, y: 20 }}  // ✅ Good
  animate={{ opacity: 1, y: 0 }}
/>

// Avoid animating width/height (causes layout recalculation)
<motion.div
  animate={{ width: '100%' }}  // ❌ Avoid
/>
```

**Reduced Motion Support**:
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

<motion.div
  animate={prefersReducedMotion ? undefined : { y: -4 }}
/>
```

---

## 9. Accessibility

### 9.1 Semantic HTML

```tsx
<header>  {/* Sticky navigation */}
  <nav>   {/* Link list */}
    <a href="#agent">Live Agent</a>
  </nav>
</header>

<main id="main-content" role="main">
  <section id="about-me">
    <h1>Fullstack AI/ML Engineer</h1>
  </section>
</main>

<footer>
  {/* Copyright and legal */}
</footer>
```

---

### 9.2 Keyboard Navigation

**Skip Link** (`src/components/SkipLink.tsx`):
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white"
>
  Skip to main content
</a>
```

**Focus Indicators**:
```tsx
<a className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm">
```

---

### 9.3 ARIA Labels

```tsx
<button aria-label="Send message" type="submit">
  <Send size={18} />
</button>

<div role="status" aria-live="polite">
  Thinking...
</div>

<a
  href="https://github.com/..."
  aria-label="GitHub Profile"
  target="_blank"
  rel="noopener noreferrer"
>
  <Github size={18} />
</a>
```

---

### 9.4 Motion Safety

All animations respect `prefers-reduced-motion`:

```css
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-pulse {
    animation: none;
  }
}
```

---

## 10. Related Documentation

| Document | Purpose |
|----------|---------|
| **[api.md](./api.md)** | API routes, Gemini integration, streaming responses |
| **[database.md](./database.md)** | GitHub Actions CRON, DynamoDB schema, S3 storage |
| **[architecture.md](./architecture.md)** | System design, data warehouse, deployment pipeline |
| **[roadmap.md](./roadmap.md)** | Development timeline, feature roadmap |
| **[CLAUDE.md](../CLAUDE.md)** | Development directives, engineering standards |

---

## 11. Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build for production
npm run build
```

**Environment Variables**:
Create `.env.local` in project root:
```
GOOGLE_API_KEY=your_gemini_api_key_here
```

---

## 12. Deployment Checklist

- [ ] `npm run build` passes locally
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] No console errors in browser
- [ ] Lighthouse Performance > 90
- [ ] Lighthouse Accessibility > 95
- [ ] All links functional (no 404s)
- [ ] Environment variables configured in Vercel
- [ ] Mobile responsive (test at 375px, 768px, 1024px)

---

**Last Updated**: 2026-01-26
**Maintainer**: Thomas To
**Version**: 2.4.0
