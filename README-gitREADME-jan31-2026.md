# Thomas To Portfolio

> A fullstack engineering portfolio with an embedded AI chat agent, demonstrating "Show, Don't Tell" through live, interactive technology.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python)](https://python.org/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000?logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Features

- **AI Chat Agent** - Live streaming chat powered by Google Gemini with RAG (Retrieval Augmented Generation) context
- **Interactive Portfolio** - Project deep-dives with architecture visualizations and animated system flows
- **ROI Calculator** - Interactive calculator demonstrating business value and impact metrics
- **ML Salary Prediction** - Backend models using Random Forest (scikit-learn) and Deep Learning (TensorFlow)
- **LinkedIn Automation** - Scheduled posting via GitHub Actions with content management workflow
- **Claude Code Plugins** - 15 specialized agent plugins for AI-assisted development workflows
- **Dark Mode Support** - Automatic theme switching with system preferences
- **Mobile Responsive** - Optimized UI with touch-friendly navigation

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Framer Motion |
| **AI/ML** | Google Gemini API, TensorFlow, scikit-learn, NumPy, Pandas |
| **Backend** | Python 3.8+, Node.js |
| **Infrastructure** | Vercel (Edge Functions), GitHub Actions (CI/CD), AWS SDK |
| **Data** | AWS DynamoDB, S3, Vercel Edge Config, Vercel Blob |
| **Quality** | ESLint 9, TypeScript strict mode, Zod validation |

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** 9+ or **yarn** 1.22+
- **Python** 3.8+ (for ML backend)
- **Git** 2.30+

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/thomas-to-bcheme/thomas-to-bcheme.git
cd thomas-to-bcheme
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies (optional, for ML models)

```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```bash
cp .env .env.local
```

Add your API keys (see [Configuration](#configuration) section).

---

## Usage

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

### LinkedIn CLI Tools

```bash
# List available LinkedIn posts
npm run linkedin:list

# Post to LinkedIn
npm run linkedin:post
```

### ML Salary Prediction Models

```bash
cd backend
python main.py                    # Run with sample data
python main.py --data-path data.csv  # Run with custom data
python main.py --no-plots         # Run without visualizations
```

### Resume PDF Generation

```bash
npm run resume:pdf
```

---

## Project Structure

```
thomas-to-bcheme/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/
│   │   │   ├── chat/route.ts     # Gemini streaming chat endpoint
│   │   │   └── linkedin/         # LinkedIn API endpoints
│   │   │       ├── content/route.ts  # List posts
│   │   │       └── post/route.ts     # Publish posts
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Homepage
│   │   └── globals.css           # Global styles
│   ├── components/               # React components (18 total)
│   │   ├── AiGenerator.tsx       # Streaming AI chat interface
│   │   ├── HeroSection.tsx       # Landing section
│   │   ├── ProjectDeepDive.tsx   # Project showcases
│   │   ├── ROICalculation.tsx    # Interactive ROI calculator
│   │   ├── ArchitectureDiagram.tsx # Animated system diagrams
│   │   ├── Roadmap.tsx           # Development timeline
│   │   └── ...                   # Additional components
│   ├── data/
│   │   └── AiSystemInformation.tsx # RAG context for AI agent
│   ├── lib/                      # Utility libraries
│   ├── hooks/                    # Custom React hooks
│   └── types/                    # TypeScript type definitions
├── backend/                      # Python ML models
│   ├── main.py                   # Entry point
│   ├── data_preprocessing.py     # Data cleaning & feature engineering
│   ├── ml_model.py               # Random Forest model
│   ├── dl_model.py               # TensorFlow deep learning model
│   ├── evaluation.py             # Model evaluation utilities
│   └── requirements.txt          # Python dependencies
├── plugins/                      # Claude Code agent plugins
│   ├── git-push/                 # Interactive git push workflow
│   ├── git-push-agentic/         # Autonomous git workflow
│   ├── git-commit/               # Commit message generator
│   ├── git-README/               # Multi-agent README generator
│   ├── tto-agent-orchestrator/   # Lead coordination agent
│   ├── tto-agent-frontend/       # Frontend specialist
│   ├── tto-agent-backend/        # Backend specialist
│   ├── tto-agent-api/            # API design specialist
│   ├── tto-agent-ai-ml/          # AI/ML specialist
│   ├── tto-agent-qa/             # Quality assurance agent
│   ├── tto-agent-uiux/           # UI/UX specialist
│   ├── tto-agent-ops/            # DevOps specialist
│   ├── tto-agent-linkedin/       # LinkedIn content agent
│   ├── tto-agent-swe/            # Meta-agent coordinator
│   └── tto-init/                 # Project initialization
├── system_design_docs/           # Architecture documentation
│   ├── architecture.md           # System architecture
│   ├── api.md                    # API documentation
│   ├── database.md               # Database schema
│   ├── deployment.md             # Deployment guide
│   ├── frontend.md               # Frontend architecture
│   ├── ml-models.md              # ML model documentation
│   └── roadmap.md                # Feature roadmap
├── genAI/                        # Generated AI content
│   └── linkedin-posts/           # LinkedIn post drafts
├── .github/
│   └── workflows/
│       └── linkedin-scheduler.yml # Automated LinkedIn posting
├── CLAUDE.md                     # AI assistant instructions
├── package.json
└── tsconfig.json
```

---

## Configuration

### Environment Variables

| Variable | Required | Description | Setup Guide |
|----------|----------|-------------|-------------|
| `GOOGLE_API_KEY` | Yes | Google Gemini API key for AI chat | [API Docs](system_design_docs/api.md#environment-variables) |
| `LINKEDIN_ACCESS_TOKEN` | No | LinkedIn OAuth access token | [OAuth Guide](system_design_docs/linkedin-api.md#oauth-20-setup-walkthrough) |
| `LINKEDIN_PERSON_URN` | No | LinkedIn URN (format: `urn:li:person:<id>`) | [Extract URN](system_design_docs/linkedin-api.md#step-4-extract-member-id-from-id_token) |
| `LINKEDIN_DRY_RUN` | No | Set to `true` for testing without posting | [Dry Run](system_design_docs/linkedin-api.md#dry-run-mode) |
| `AWS_ACCESS_KEY_ID` | No | AWS credentials for DynamoDB/S3 | [Database](system_design_docs/database.md) |
| `AWS_SECRET_ACCESS_KEY` | No | AWS secret key | [Database](system_design_docs/database.md) |
| `AWS_REGION` | No | AWS region (default: us-east-1) | [Database](system_design_docs/database.md) |

### Example `.env.local`

```env
# Required
GOOGLE_API_KEY=your_gemini_api_key_here

# Optional - LinkedIn Integration
LINKEDIN_ACCESS_TOKEN=your_linkedin_token
LINKEDIN_PERSON_URN=urn:li:person:your_id
LINKEDIN_DRY_RUN=false

# Optional - AWS
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
```

---

## API Reference

### Chat API

**POST** `/api/chat`

Stream a conversation with the AI agent.

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Tell me about Thomas's experience" }
  ]
}
```

**Response:** Text stream (Content-Type: text/plain)

**Headers:**
- `X-Correlation-ID` - Request tracking ID

---

### LinkedIn Content API

**GET** `/api/linkedin/content`

List available pre-written LinkedIn posts.

**Response:**
```json
{
  "posts": [
    {
      "filename": "2025-01-28-ai-agents",
      "date": "2025-01-28",
      "topic": "AI Agents",
      "target_audience": "Engineering Leaders",
      "contentPreview": "...",
      "characterCount": 1234
    }
  ],
  "count": 5,
  "correlationId": "uuid"
}
```

---

**POST** `/api/linkedin/post`

Publish content to LinkedIn.

**Request Body (from file):**
```json
{
  "source": "file",
  "filename": "2025-01-28-ai-agents",
  "visibility": "PUBLIC"
}
```

**Request Body (custom content):**
```json
{
  "source": "custom",
  "content": "Your LinkedIn post content here...",
  "visibility": "CONNECTIONS"
}
```

**Response:**
```json
{
  "success": true,
  "postId": "urn:li:share:123456",
  "dryRun": false,
  "correlationId": "uuid"
}
```

---

## Testing

### Code Quality

```bash
# Run ESLint
npm run lint

# TypeScript type checking
npx tsc --noEmit
```

### ML Model Evaluation

The backend models include comprehensive evaluation metrics:

- Mean Absolute Error (MAE)
- Root Mean Squared Error (RMSE)
- R-squared (R2)
- Mean Absolute Percentage Error (MAPE)

```bash
cd backend
python main.py
```

---

## CI/CD

### GitHub Actions

| Workflow | Schedule | Description |
|----------|----------|-------------|
| `linkedin-scheduler.yml` | Tuesdays 10:07 AM PST | Automated LinkedIn posting |

### Vercel Deployment

- Automatic deployments on push to `main`
- Preview deployments for pull requests
- Edge Functions for API routes

**Platform Limits:** Safe zone is 24 deployments/day (24% capacity). See [Architecture](system_design_docs/architecture.md) for details.

**Workflow Configuration:** For CRON patterns, secrets management, and cross-platform integration, see [GitHub API](system_design_docs/github-api.md).

---

## Documentation

For detailed technical specifications, see the [System Design Documentation](system_design_docs/README.md).

### Architecture & Infrastructure

| Document | Description |
|----------|-------------|
| [Architecture](system_design_docs/architecture.md) | Platform KPIs, deployment limits, zero-cost infrastructure pattern |
| [Deployment](system_design_docs/deployment.md) | CI/CD pipeline, Vercel configuration, rollback procedures |
| [Database](system_design_docs/database.md) | GitHub-as-warehouse pattern, 3-tier ETL (Sandbox → Quality → Production) |

### API & Integration

| Document | Description |
|----------|-------------|
| [API Design](system_design_docs/api.md) | Chat API streaming, RAG context, request/response schemas |
| [LinkedIn API](system_design_docs/linkedin-api.md) | OAuth 2.0 setup, posting workflow, rate limits, troubleshooting |
| [GitHub API](system_design_docs/github-api.md) | CRON scheduling, secrets management, workflow patterns |

### Frontend & ML

| Document | Description |
|----------|-------------|
| [Frontend](system_design_docs/frontend.md) | Component architecture, state management, Tailwind CSS, accessibility |
| [ML Models](system_design_docs/ml-models.md) | Random Forest + TensorFlow models, evaluation metrics, training pipeline |
| [Roadmap](system_design_docs/roadmap.md) | Development timeline, planned features, Edge AI vision |

### Development Standards

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | 5 Development Directives, engineering standards, testing strategy |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the coding standards in `CLAUDE.md`
4. Run linting (`npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow the 5 Development Directives in `CLAUDE.md`
- Use TypeScript strict mode
- Write structured logs with correlation IDs
- Use Zod for request validation
- Follow the Arrange-Act-Assert pattern for tests

---

## License

This project is licensed under the MIT License.

---

## Author

**Thomas To**
- Email: thomas.to.bcheme@gmail.com
- GitHub: [@thomas-to-bcheme](https://github.com/thomas-to-bcheme)
- Portfolio: [thomas-to-bcheme.vercel.app](https://thomas-to-bcheme.vercel.app)
