# VerdictIQ - Full Lifecycle Court Judgment Intelligence System

## 🎯 Mission

**Transform judicial compliance from manual interpretation to verified, structured intelligence.**

VerdictIQ is a full-lifecycle court judgment intelligence system for government legal compliance. It automates the extraction, analysis, and verification of judicial directives from High Court judgment PDFs, generating department-ready action plans with complete audit trails. 

Zero critical orders missed. Every action item source-cited. Every extraction human-verified before dashboard display.

---
## Link to the PPT
[(Link)](https://canva.link/d4rhc3xidwbdyrh)

---
## Link to the demo video
[(Link)](https://drive.google.com/file/d/16AM6G0766v_ENI_2XywtQM_MyAeGK0i8/view?usp=drive_link)

---

## 📋 The Problem VerdictIQ Solves

**Current Manual Process:**
- A legal officer receives a 20-60 page judgment PDF
- Takes 2-3 hours to read, interpret, and extract action items
- Creates a noting file with extracted directives (no structured format)
- Communicates with departments via email (no centralized tracking)
- Compliance deadlines slip because directives are buried in obiter text
- Appeals time-bar because limitation periods are inferred but never verified
- No audit trail of who decided what was mandatory vs. advisory

**VerdictIQ's Approach:**
- Judgment PDF lands in system via CCMS API
- AI extracts every material directive, classifies by type/urgency, identifies responsible departments
- Generates structured action plan with:
  - Exact source citations (page number, directive text)
  - Confidence scores for each extraction
  - Inferred deadlines from statutory limitation periods
  - Mandatory vs. advisory classification
- Human reviewer verifies every field, sees exact source highlights, approves/edits/rejects before display
- Only verified action plans appear on decision-maker dashboard
- Complete audit trail: model version, extraction, reviewer decision, edits, reasoning

**Result:** Verified action plan delivered in under 20 minutes. Zero ambiguity. Defensible compliance record.

---

## 🏗️ Architecture

### Four-Step Judgment Lifecycle

```
1. JUDGMENT UNDERSTANDING
   └─ PDF Ingestion → Case Registration → Directive Extraction
   └─ AI identifies: case metadata, parties, directives, deadlines, responsible authorities
   └─ Classification: compliance order | stay | direction | limitation trigger | appeal consideration
   └─ Flags: mandatory vs. advisory | confidence scores | source page

2. ACTION PLAN GENERATION
   └─ Structured conversion of directives → department-ready action items
   └─ Timeline population: explicit dates OR inferred from statutory periods
   └─ Department assignment from parties and directive nature
   └─ Flagged items requiring expert legal review (novel/ambiguous directives)

3. HUMAN VERIFICATION (Architectural Gate)
   └─ Reviewer sees: extracted value + exact source highlight + page number + confidence
   └─ Actions: approve as-is | edit + record reason | reject entirely
   └─ Only fully verified records pass to dashboard
   └─ Nothing silently promoted

4. DASHBOARD & COMPLIANCE VIEW
   └─ Decision-makers see verified action plans structured by department
   └─ Pending actions | upcoming deadlines | compliance nature | case reference
   └─ Overdue items surfaced prominently
   └─ Complete audit trail accessible
```

### System Components

| Component | Purpose | Tech Stack |
|---|---|---|
| **Frontend (VerdictIQ)** | Dashboard, case management, human verification UI | React 19 + Vite + Tailwind v4 + Radix UI + shadcn/ui |
| **API Server** | RESTful backend for all operations | Express 5 + TypeScript + Zod validation |
| **Database** | Persistent storage for cases, directives, audit logs | PostgreSQL + Drizzle ORM |
| **Auth** | User identity and role-based access | Clerk (Replit-managed, whitelabeled) |
| **API Code Generation** | Type-safe client from OpenAPI spec | Orval |
| **Validation Layer** | Schema validation across frontend/backend | Zod + Drizzle Zod |

### Monorepo Structure

```
verdict-iq/
├─ artifacts/
│  ├─ api-server/              # Express backend (port :5000 via /api)
│  │  └─ routes/               # Case, directive, verification endpoints
│  ├─ verdictiq/               # React frontend (Vite, port :5173)
│  │  └─ pages/                # Dashboard, case detail, verification UI
│  └─ mockup-sandbox/          # Component preview / prototyping
├─ lib/
│  ├─ api-spec/                # OpenAPI spec (Orval codegen source)
│  ├─ api-client-react/        # Generated API client (Orval output)
│  ├─ api-zod/                 # Generated Zod schemas
│  ├─ db/                       # Drizzle schema definitions
│  └─ integrations-openai-ai-* # AI model integrations
├─ scripts/                    # Utility scripts
└─ pnpm-workspace.yaml         # Monorepo workspace config
```

---

## 🔐 The Four Non-Negotiables

### 1. **Every Action Item Has a Source**
Not "compliance required." The reviewer sees:
- Exact directive text from the judgment
- Page number where it appears
- Extracted deadline (explicit or inferred)
- Identified responsible department
- Why the system classified it as mandatory or advisory

*This is what "legally defensible action record" means in government compliance.*

### 2. **Mandatory vs. Advisory is a Legal Distinction**
- Acting on an advisory as if it were mandatory → consequential error
- Missing a mandatory order buried in obiter → consequential error
- The system classifies these from the judgment's own language, not guesses
- Reviewers see the classification basis and can override with reasoning

### 3. **Nothing Reaches the Dashboard Unverified**
The human-in-the-loop is not an optional review step appended at the end. It is the **architectural gate** between AI output and administrative action.

No field, no timeline, no department assignment is displayed to a decision-maker unless a human reviewer has:
- Explicitly approved it as extracted, OR
- Edited it with a corrected value and stated reason, OR
- Rejected it entirely

### 4. **The Audit Trail Must Survive Legal Scrutiny**
Every extraction logs:
- Model version used
- Source PDF hash
- Extracted value
- AI confidence score
- Reviewer decision (approve/edit/reject)
- If edited: original value + correction + reviewer's stated reason
- Timestamp and reviewer identity

This audit trail is the foundation of administrative and legal accountability.

---

## 🎯 Domain Depth: Edge Cases That Matter

The difference between a demo and a production system deployed by a Centre for e-Governance officer is entirely in handling edge cases:

| Edge Case | Impact | VerdictIQ Approach |
|---|---|---|
| **Scanned judgment OCR** | Low-quality scans misread silently | Confidence scoring at page level; low-quality flags bubble up for human review |
| **Multi-directional orders** | Single judgment issues directives to 3+ departments with different timelines | Extracts each directional thread separately with department-specific deadlines |
| **Inferred limitation periods** | Judgment omits appeal deadline; applicable statute determines one | Maps statute to case type; calculates deadline; flags as inferred for verification |
| **Operative vs. obiter** | Judicial observations carry no compliance obligation; can't distinguish from orders | NLP classification of directive force + reviewer visual confirmation via source highlight |
| **Government as petitioner vs. respondent** | Action requirements structurally different depending on government's role | Case party classification determines action response template and mandatory items |
| **Coordinate vs. division bench** | Single or multiple judges affects weight and appellate path of order | Extracted from judgment header; classified for escalation routing |
| **Multi-case consolidated judgments** | Directives apply selectively to individual case numbers within batch | Parses case-specific directives; assigns action items to correct case; flags cross-case dependencies |

These are the exact failure modes that produce missed compliance deadlines and time-barred appeals in manual processing workflows.

---

## 👥 Role-Based Access Control (RBAC)

Three roles: `admin`, `reviewer`, `viewer`

| Feature | Viewer | Reviewer | Admin |
|---|---|---|---|
| View cases & dashboard | ✓ | ✓ | ✓ |
| Register new case | — | — | ✓ |
| Verify directives / Edit | — | ✓ | ✓ |
| Delete cases / Replace PDF | — | — | ✓ |
| Manage user roles | — | — | ✓ |

**User Lifecycle:**
- First signup: auto-becomes `admin`
- Subsequent signups: default to `viewer`
- Admins can promote viewers to reviewers or other reviewers to admins
- Every role change is logged immutably in `role_change_log` table

---

## 🖥️ Key Pages & Flows

### Authenticated User
- **Sign-in/Sign-up** — Clerk-powered auth with VerdictIQ branding
- **Dashboard** — Command center showing:
  - Urgent pending actions across departments
  - Case statistics (total, pending verification, verified)
  - Department workload heatmap
  - Recent activity feed
- **Cases** — Searchable, filterable case list with quick status view
- **Case Detail** — Five tabs:
  - **Directives** — AI-extracted directives with confidence, deadline, department
  - **Action Plan** — Human-reviewed action items, CSV export for reviewers/admins
  - **Compliance Timeline** — Gantt-style deadline view
  - **Audit Trail** — Extraction version, reviewer decision, edits, reasoning
  - **Comments** — Thread-style collaboration on case

### Verification Flow (Reviewers/Admins)
1. Navigate to `/cases/:id/verify`
2. Left panel: judgment text with directive source highlighted and auto-scrolled into view
3. Right panel: AI extraction (case metadata, directive details, deadline, department, confidence score)
4. Actions per field: **Approve** | **Edit** (with reason) | **Reject**
5. On verification complete: case status auto-transitions `processing` → `verified`

### Admin Workflows
- **Register New Case** — Upload judgment PDF, trigger AI extraction (CCMS integration point)
- **User Management** (`/admin/users`) — View all users, change roles, view immutable role-change history
- **Case Deletion** — Remove case (careful: audit trail persists in `deleted_cases` shadow table)

---

## 🚀 Tech Stack & Dependencies

### Frontend
- **React 19** + **Vite 5** — Fast dev, optimized production build
- **TypeScript 5.9** — Type safety across codebase
- **Tailwind CSS v4** — Utility-first styling with VerdictIQ amber theme
- **Radix UI** + **shadcn/ui** — Accessible, composable component system
- **React Query** — Server state management, caching, sync
- **React Hook Form** — Efficient form handling
- **Framer Motion** — Smooth animations
- **Clerk** — Authentication (Replit-managed, whitelabeled)
- **Lucide React** — Icon library

### Backend
- **Express 5** — Lightweight HTTP server
- **TypeScript 5.9** — Type-safe backend
- **Zod** — Runtime schema validation (API contract)
- **Drizzle ORM** — Type-safe database queries
- **PostgreSQL** — Relational database
- **Clerk Express** — Auth middleware integration

### Build & Tooling
- **pnpm** — Package manager (monorepo-friendly)
- **esbuild** — Fast JavaScript bundler
- **Orval** — OpenAPI spec → type-safe API client generation
- **Drizzle Zod** — Zod schema generation from DB schema

### DevOps
- **Node.js 24** — Runtime
- **Replit** — Hosting platform with Clerk whitelabeling support

---

## 📦 Project Setup

### Prerequisites
```bash
Node.js 24+
pnpm 9+
PostgreSQL 15+
```

### Installation
```bash
# Clone repository
git clone https://github.com/your-org/verdict-iq.git
cd verdict-iq

# Install dependencies (pnpm enforced)
pnpm install

# Set environment variables
cp .env.example .env
# Fill in: DATABASE_URL, CLERK_SECRET_KEY, etc.

# Database migrations
pnpm run db:migrate

# Build all packages
pnpm run build
```

### Development
```bash
# Terminal 1: Backend (Express server at http://localhost:5000)
pnpm --filter @workspace/api-server run dev

# Terminal 2: Frontend (Vite dev server at http://localhost:5173)
pnpm --filter @workspace/verdictiq run dev

# Browser: http://localhost:5173
```

### Deployment
```bash
# Type check all packages
pnpm run typecheck

# Build production
pnpm run build

# Deploy to Replit (configured in .replit)
# or deploy artifacts/api-server + artifacts/verdictiq to your host
```

---

## 📊 Database Schema Highlights

### Core Tables
- `users` — Identity, role (admin/reviewer/viewer), created_at
- `cases` — Case registration, PDF storage, status (processing/verified), timestamps
- `judgments` — Full judgment text, OCR confidence, page count
- `directives` — Extracted directives, type, deadline, responsible department, confidence
- `action_items` — Human-verified action plan items, status, priority
- `directives_verification` — Each directive verification log (approved/edited/rejected)
- `case_comments` — Thread comments on cases (author, role, content, timestamp)
- `audit_log` — All system events (extraction, verification, deletion) with model version and PDF hash
- `role_change_log` — Immutable log of user role changes (actor, target, old/new role, reason)

### Enums
- `caseStatus` — `'pending'` | `'processing'` | `'verified'` | `'archived'`
- `directiveType` — `'compliance_order'` | `'stay'` | `'direction'` | `'limitation_trigger'` | `'appeal_consideration'`
- `directiveUrgency` — `'critical'` | `'high'` | `'medium'` | `'low'`
- `userRole` — `'admin'` | `'reviewer'` | `'viewer'`
- `verificationDecision` — `'approved'` | `'edited'` | `'rejected'`

---

## 🔌 API Endpoints

### Cases
```
POST   /api/cases                 # Register new case (admin only)
GET    /api/cases                 # List cases (with filters, search)
GET    /api/cases/:id             # Case detail with directives + action plan
GET    /api/cases/:id/judgment-text  # Full judgment text for verification panel
PATCH  /api/cases/:id             # Update case (admin/reviewer)
DELETE /api/cases/:id             # Delete case (admin only)
POST   /api/cases/:id/upload      # Replace judgment PDF (admin only)
```

### Directives
```
GET    /api/directives/:id        # Directive detail
PATCH  /api/directives/:id/verify # Mark directive as verified (approve/edit/reject)
GET    /api/directives?caseId=:id # List directives for case
```

### Action Plans
```
GET    /api/action-plan/:caseId   # Verified action plan (CSV export available)
```

### Users & Auth
```
GET    /api/me                    # Current user profile
GET    /api/users                 # List all users (admin only)
PATCH  /api/users/:clerkId/role   # Change user role (admin only)
GET    /api/users/role-change-log # Audit log of role changes (admin only)
```

### Comments
```
GET    /api/cases/:id/comments    # Case comments thread
POST   /api/cases/:id/comments    # Add comment to case
```

### Health & Admin
```
GET    /api/health                # System health (no auth required)
GET    /api/audit                 # Full audit log (admin only)
```

---

## 🎓 Key Features (v1.1)

### ✅ Implemented
1. **Four-Step Lifecycle** — Judgment understanding, action plan generation, human verification, dashboard
2. **Human Verification UI** — Source highlights with full judgment text panel
3. **Auto-Status Transitions** — Case auto-verifies when all directives verified
4. **Case Comments** — Thread-style collaboration
5. **CSV Export** — Action plans exportable for offline use
6. **Audit Trail** — Immutable log of all decisions (extraction → verification → action)
7. **Role-Based Access Control** — Admin/reviewer/viewer with fine-grained permissions
8. **Role Change Audit** — Track who changed what role and when
9. **User Provisioning** — Auto-create users on first API request
10. **CCMS Integration Point** — API endpoint for judgment PDF ingestion

### 🚧 Planned (v1.2+)
- **Multi-language judgment support** — Hindi, regional languages
- **OCR improvement** — Confidence scoring per page, auto-flag low-quality scans
- **Limitation period calculator** — Statutory period inference engine
- **Bench classification** — Single vs. division bench detection
- **Department directory integration** — Auto-suggest departments by statute
- **Email notifications** — Alert reviewers of pending verifications, admins of overdue actions
- **Batch processing** — Multiple judgments in single upload
- **API rate limiting** — Protect against abuse
- **Webhooks** — Real-time updates to external systems
- **Export formats** — PDF, JSON, XML in addition to CSV

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make changes, commit with clear messages
3. Open pull request with description of changes
4. Code review required; all checks must pass
5. Merge to `main` after approval

### Development Standards
- **TypeScript strict mode** — All new code must pass `tsc --strict`
- **Prettier formatting** — Run `pnpm run format` before commit
- **Component stories** — New UI components should have Storybook entries
- **Test coverage** — 80%+ for critical paths (auth, verification, audit)

---

## 📜 License

MIT License — See [LICENSE](./LICENSE) file for details.

---

## 🏛️ Deployment & Governance

### Target Deployments
1. **Karnataka High Court (Phase 1)** — CCMS integration, pilot with 5-10 case types
2. **State Government Legal Cells (Phase 2)** — Multi-departmental compliance tracking
3. **Central Government Ministries (Phase 3)** — High Court and Supreme Court litigation tracking

### Compliance & Audit
- **Administrative compliance** — Every action plan audit trail defensible under RTI
- **Legal compliance** — Evidence of human review and reasoning for every decision
- **Data security** — User auth, role-based access, no PII logging
- **Accessibility** — WCAG 2.1 AA for all UI components

---

## 📞 Support & Feedback

- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Feature requests and design discussions in GitHub Discussions
- **Security**: Report vulnerabilities to security@verdict-iq.gov.in (confidential)

---

## 📚 Resources

- [System Architecture Deep Dive](./docs/architecture.md)
- [AI Extraction Pipeline](./docs/ai-pipeline.md)
- [Human Verification UX](./docs/verification-ui.md)
- [Database Schema](./lib/db/src/schema/)
- [API OpenAPI Spec](./lib/api-spec/openapi.yaml)
- [Component Library](./artifacts/mockup-sandbox/)

---

**VerdictIQ: Where AI meets accountability in judicial compliance.**
