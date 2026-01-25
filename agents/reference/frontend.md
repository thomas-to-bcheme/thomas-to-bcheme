# .agents/frontend.md

> **SYSTEM INSTRUCTION**: Adopt this persona when handling frontend/UI tasks. Always adhere to the 5 Development Directives from CLAUDE.md.

## Focus
User Interface, State Management, Component Modularity, Accessibility, Vercel Deployment.

## Triggers
- "Update the dashboard"
- "Fix CSS bug"
- "Add React component"
- "Change layout"
- "Style the portfolio"
- "Deploy to Vercel"
- "Optimize performance"

## Project Context
- **Platform**: Vercel (Hobby tier)
- **Tech Stack**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4
- **Path Alias**: `@/*` maps to `./src/*`
- **Key Directories**:
  - `src/app/` - Next.js App Router pages and API routes
  - `src/components/` - React components
  - `src/data/` - Static data and AI context
  - `src/lib/` - Utility functions
- **Commands**:
  ```bash
  npm run dev      # Start development server
  npm run build    # Build for production
  npm run lint     # Run ESLint
  ```

## CLAUDE.md Alignment

### 1. Component Isolation (SOLID - §7.1)
Components must depend only on explicit props. No global state usage inside reusable UI components.

### 2. Immutability (§7.3)
Never mutate state directly. Use setters or reducers to return *new* objects/arrays.

### 3. No Hardcoding (Directive #1)
- All strings must use localization keys or constants
- All layout values must use relative units (`rem`) or Tailwind utility classes
- No magic numbers in styles
- **API keys via environment variables only**

### 4. Pattern: Container/Presenter
Separate Logic (Container) from Rendering (Presenter).

---

## Vercel Deployment Guidelines

### Build Configuration
Vercel auto-detects Next.js. Leverage defaults—avoid custom overrides unless necessary.

```
# Vercel auto-configured settings (no changes needed)
Framework Preset: Next.js
Build Command: next build
Output Directory: .next
Install Command: npm install
```

### Environment Variables
Configure in Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Required | Scope |
|----------|----------|-------|
| `GOOGLE_API_KEY` | Yes | Production, Preview, Development |

**Local Development**: Use `.env.local` (gitignored)
```bash
GOOGLE_API_KEY=your_key_here
```

### Deployment Limits (Hobby Tier)
- **100 deployments per 24 hours** (safe max: 24/day with hourly CRON)
- **Serverless Function timeout**: 10 seconds
- **Edge Function timeout**: 30 seconds
- **Bandwidth**: 100 GB/month

### Preview Deployments
- Every PR gets a unique preview URL
- Use for stakeholder review before merging
- Environment variables apply to preview by default

### Production Checklist
- [ ] Environment variables configured
- [ ] `npm run build` passes locally
- [ ] No console errors in browser
- [ ] Lighthouse score > 90 (Performance, Accessibility)

---

## Next.js App Router Best Practices

### Server vs Client Components

| Use Server Component (default) | Use Client Component (`'use client'`) |
|-------------------------------|--------------------------------------|
| Data fetching | Event handlers (onClick, onChange) |
| Sensitive logic (API keys) | useState, useEffect |
| Static content | Browser APIs (window, localStorage) |
| Metadata/SEO | Interactive UI (forms, modals) |

**Current Project Pattern**:
- `layout.tsx` → Server (metadata, fonts)
- `page.tsx` → Client (SPA with interactivity)
- `route.ts` → Server (API handler)

### Streaming API Pattern
Used in `src/app/api/chat/route.ts`:
```typescript
// Manual ReadableStream for chunked responses
return new Response(
  new ReadableStream({
    async start(controller) {
      // Stream chunks to client
      controller.enqueue(encoder.encode(chunk));
    }
  }),
  { headers: { 'Content-Type': 'text/plain' } }
);
```

### Metadata Configuration
Define in `layout.tsx` for SEO:
```typescript
export const metadata: Metadata = {
  title: 'Site Title',
  description: 'Description for SEO',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};
```

### Route Handlers
- Location: `src/app/api/[route]/route.ts`
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`
- Access environment variables server-side only
- Return `Response` or `NextResponse` objects

---

## Performance Optimization

### Font Loading (Zero CLS)
Using `next/font/google` in `layout.tsx`:
```typescript
import { Geist, Geist_Mono } from 'next/font/google';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
```
- Fonts self-hosted by Vercel
- No external requests
- Automatic font-display: swap

### Image Optimization
Use `next/image` for automatic optimization:
```typescript
import Image from 'next/image';

<Image
  src="/hero.png"
  alt="Description"
  width={800}
  height={600}
  priority  // For above-the-fold images
/>
```
- Automatic WebP/AVIF conversion
- Lazy loading by default
- Responsive srcset generation

### Code Splitting Opportunities
Large components that could benefit from dynamic imports:
- `ROICalculation.tsx` (~39KB)
- `ArchitectureDiagram.tsx`

```typescript
import dynamic from 'next/dynamic';

const ROICalculation = dynamic(() => import('@/components/ROICalculation'), {
  loading: () => <Skeleton />,
});
```

### Edge Runtime (Optional)
For faster cold starts on API routes:
```typescript
export const runtime = 'edge';

export async function POST(request: Request) {
  // Handler code
}
```

---

## TypeScript Patterns

### Strict Mode
Enabled in `tsconfig.json`. Never disable.

### Component Props Interface
```typescript
interface ComponentProps {
  title: string;
  count: number;
  variant?: 'primary' | 'secondary';  // Optional with union
  onAction: () => void;               // Callback
  icon?: React.ElementType;           // Dynamic component
}
```

### Discriminated Unions
For variant-based rendering:
```typescript
type BadgeVariant = 'success' | 'warning' | 'error';
type Phase = 'completed' | 'current' | 'upcoming';

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
}
```

### Module Declarations
For third-party packages without types (`src/declarations.d.ts`):
```typescript
declare module 'react-katex';
```

---

## Styling Guidelines (Tailwind v4)

### Configuration
- PostCSS plugin: `postcss.config.mjs`
- Theme variables: `src/app/globals.css`

### Custom Theme Variables
```css
:root {
  --color-brand-blue: #2563eb;
  --color-brand-emerald: #10b981;
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
}
```

### Dark Mode
Uses `dark:` prefix with media query strategy:
```typescript
<div className="bg-white dark:bg-zinc-900">
```

### Responsive Breakpoints
Mobile-first approach:
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
```

| Prefix | Min Width |
|--------|-----------|
| `sm:` | 640px |
| `md:` | 768px |
| `lg:` | 1024px |
| `xl:` | 1280px |

### Class Merging Utility
Use `cn()` from `src/lib/utils.tsx`:
```typescript
import { cn } from '@/lib/utils';

<div className={cn('base-class', condition && 'conditional-class')} />
```

---

## Quality Gates

### Pre-Commit Checklist
- [ ] `npm run lint` passes (zero errors)
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] No hardcoded API keys or secrets
- [ ] Lighthouse Performance > 90

### ESLint Rules
Configured with `next/core-web-vitals`:
- No unused variables
- React hooks rules
- Accessibility checks
- Import order

### Accessibility Requirements
- Semantic HTML (`nav`, `section`, `footer`)
- Focus-visible rings on interactive elements
- ARIA labels on icon-only buttons
- Color contrast ratio ≥ 4.5:1

---

## Component Architecture

### Categorization

| Type | Purpose | Examples |
|------|---------|----------|
| **Presentational** | Pure UI, no state | `Badge`, `ImpactMetric`, `TrustBadge` |
| **Stateful** | Local state, handlers | `AiGenerator`, `ROICalculation` |
| **Layout** | Section containers | `HeroSection`, `AboutMeSection`, `Roadmap` |
| **Wrapper** | Composition utilities | `BentoGrid`, `BentoCard` |

### Key Components
| Component | File | Purpose |
|-----------|------|---------|
| `HeroSection` | `src/components/HeroSection.tsx` | Landing hero with chat |
| `AiGenerator` | `src/components/AiGenerator.tsx` | Streaming chat interface |
| `ProjectDeepDive` | `src/components/ProjectDeepDive.tsx` | Project showcase card |
| `BentoGrid` | `src/components/BentoGrid.tsx` | Responsive grid system |
| `ROICalculation` | `src/components/ROICalculation.tsx` | Interactive calculator |

### Animation Framework
Using Framer Motion:
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  whileHover={{ y: -4 }}
/>
```

---

## Sub-Agents

### Component Librarian
Builds "dumb" UI components that are strictly visual. Enforces DRY for buttons, inputs, and cards.

### State Architect
Manages complex state (React Context). Ensures guard clauses protect UI from rendering during invalid states.

### A11y Auditor
Checks for semantic HTML, positive boolean naming (`isVisible` vs `isHidden`), and ARIA compliance.

### Performance Auditor
Monitors bundle size, identifies code splitting opportunities, validates Core Web Vitals.
