# Community Voice - Civic Intelligence Platform
## Comprehensive System Architecture & Design Specification

---

### 1. System Architecture Diagram

Below is the high-level system architecture of the **Community Voice** platform, showcasing the end-to-end flow from client applications to the storage, processing, caching, and AI orchestration layers.

```mermaid
graph TD
    %% Clients
    subgraph Clients [Client Layer]
        WebClient[Next.js 15 Web App]
        MobileClient[Mobile Web / Future App]
    end

    %% Edge / Ingress
    subgraph Ingress [Ingress & Security]
        Cloudflare[Cloudflare WAF / CDN]
        K8sIngress[Kubernetes Ingress Controller / NGINX]
    end

    %% Application Layer
    subgraph ApplicationLayer [Application Layer]
        NestGateway[NestJS API Gateway]
        NextServer[Next.js Server Side Runtime / RSC]
    end

    %% Asynchronous Processing
    subgraph AsyncProcessing [Event & Queue Management]
        Redis[(Redis Cluster)]
        BullMQ[BullMQ Worker Pool]
    end

    %% Data & Storage Layer
    subgraph DataStorage [Data & Search Storage]
        PostgreSQL[(PostgreSQL + PostGIS)]
        Elasticsearch[Elasticsearch Cluster]
        S3Bucket[[AWS S3 / Cloudflare R2]]
    end

    %% AI & External Integrations
    subgraph AIExternal [AI & Third-Party APIs]
        GeminiAPI[Google Gemini Pro / Vision]
        OpenAIAPI[OpenAI API GPT-4o]
        MapboxAPI[Mapbox Vector Tiles API]
        Auth0Service[Auth0 / OIDC Identity Provider]
    end

    %% Flow Connections
    WebClient -->|HTTPS / WSS| Cloudflare
    MobileClient -->|HTTPS / WSS| Cloudflare
    Cloudflare --> K8sIngress
    K8sIngress --> NextServer
    K8sIngress --> NestGateway

    NextServer -->|GraphQL / REST| NestGateway
    NestGateway -->|Authenticate| Auth0Service
    
    NestGateway -->|Read/Write| PostgreSQL
    NestGateway -->|Search/Filter| Elasticsearch
    NestGateway -->|Produce Jobs| Redis
    Redis <--> BullMQ
    
    NestGateway -->|Presigned URLs| S3Bucket
    BullMQ -->|Process Media| S3Bucket
    
    BullMQ -->|Analyze Content/Video| GeminiAPI
    BullMQ -->|Embedding/Analysis| OpenAIAPI
    NestGateway -->|Geocoding / Tiles| MapboxAPI
    
    PostgreSQL -->|CDC / Debezium| Elasticsearch
```

---

### 2. Detailed Database Design & Partitioning Strategy

The core relational database is **PostgreSQL** enhanced with the **PostGIS** extension for spatial analytics. Given the potential scale of municipal civic data, the following design strategies are instituted:

#### 2.1 Spatial Capabilities (PostGIS)
All geographic coordinates are stored using the `geometry(Point, 4326)` type. This enables optimized geospatial queries such as finding all reports within a specific city council district or computing heatmaps of civic issues.

#### 2.2 Table Partitioning Strategy
- **`CivicReport` Table Partitioning:** Partitioned by `createdAt` on a quarterly basis (`RANGE (createdAt)`). This keeps the active index sizes small and allows archival of multi-year legacy data to cold storage or read-only tablespaces.
- **`SurveyResponse` Table Partitioning:** Partitioned by `surveyId` via `HASH (surveyId)` to evenly distribute massive influxes of community responses across separate physical disks.

#### 2.3 Indexing Matrix
- **GIST Index:** Applied to all geography columns (`location`) for fast spatial querying.
- **B-Tree Indexes:** On foreign keys (`userId`, `organizationId`), status enums, and timestamps (`createdAt`).
- **Composite Indexes:** On (`status`, `createdAt` DESC) to optimize dashboard feeds.

---

### 3. Complete Prisma Schema

The following schema defines the core data model. It includes spatial mappings via raw SQL or Prisma extensions where supported, alongside complete relations, indexes, and soft-delete states.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  binaryTargets   = ["native", "linux-musl-arm64-openssl-3.0.x"]
}

enum Role {
  CITIZEN
  MODERATOR
  MUNICIPAL_ADMIN
  SUPER_ADMIN
}

enum ReportStatus {
  SUBMITTED
  UNDER_REVIEW
  FLAGGED
  ACCEPTED
  IN_PROGRESS
  RESOLVED
  REJECTED
}

enum ModerationAction {
  APPROVE
  REJECT
  ESCALATE
}

model User {
  id               String           @id @default(uuid())
  email            String           @unique
  passwordHash     String? // Nullable if using OIDC/OAuth
  firstName        String
  lastName         String
  role             Role             @default(CITIZEN)
  isActive         Boolean          @default(true)
  isPiiRedacted    Boolean          @default(false)
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  reports          CivicReport[]
  comments         Comment[]
  votes            Vote[]
  surveyResponses  SurveyResponse[]
  auditLogs        AuditLog[]

  @@index([email])
  @@index([role])
}

model CivicReport {
  id             String           @id @default(uuid())
  userId         String
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  title          String
  description    String
  category       String
  status         ReportStatus     @default(SUBMITTED)
  priorityScore  Float            @default(0.0)
  
  // Geospatial data (handled via PostGIS raw queries in app code, primitive tracking here)
  latitude       Float
  longitude      Float
  
  attachments    MediaAttachment[]
  comments       Comment[]
  votes          Vote[]
  moderationLogs ModerationQueue[]
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@index([status, createdAt(sort: Desc)])
  @@index([category])
  @@index([userId])
}

model MediaAttachment {
  id            String       @id @default(uuid())
  reportId      String?
  report        CivicReport? @relation(fields: [reportId], references: [id], onDelete: Cascade)
  s3Key         String
  url           String
  mimeType      String
  fileSize      Int
  aiTranscription String?    @db.Text
  isFlagged     Boolean      @default(false)
  createdAt     DateTime     @default(now())

  @@index([reportId])
}

model Comment {
  id         String       @id @default(uuid())
  reportId   String
  report     CivicReport  @relation(fields: [reportId], references: [id], onDelete: Cascade)
  userId     String
  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  content    String       @db.Text
  isReported Boolean      @default(false)
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  @@index([reportId])
  @@index([userId])
}

model Vote {
  id         String       @id @default(uuid())
  reportId   String
  report     CivicReport  @relation(fields: [reportId], references: [id], onDelete: Cascade)
  userId     String
  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  direction  Int          // 1 for Upvote, -1 for Downvote
  createdAt  DateTime     @default(now())

  @@unique([userId, reportId])
  @@index([reportId])
}

model ModerationQueue {
  id             String            @id @default(uuid())
  reportId       String
  report         CivicReport       @relation(fields: [reportId], references: [id], onDelete: Cascade)
  aiFlagged      Boolean           @default(false)
  aiConfidence   Float             @default(0.0)
  aiReasoning    String?           @db.Text
  assignedToRole Role              @default(MODERATOR)
  actionTaken    String?
  reviewedAt     DateTime?
  createdAt      DateTime          @default(now())

  @@index([aiFlagged])
  @@index([reportId])
}

model Survey {
  id             String           @id @default(uuid())
  title          String
  description    String
  schemaJson     Json             // Defines dynamic fields, validation, conditions
  isActive       Boolean          @default(true)
  expiresAt      DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  responses      SurveyResponse[]
}

model SurveyResponse {
  id         String   @id @default(uuid())
  surveyId   String
  survey     Survey   @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  userId     String?  // Nullable for anonymous participation
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  answers    Json     // Key-value store of responses matching dynamic schema
  submittedAt DateTime @default(now())

  @@index([surveyId])
  @@index([userId])
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action    String
  details   Json
  ipAddress String
  createdAt DateTime @default(now())

  @@index([action])
  @@index([createdAt])
}
```

---

### 4. GraphQL Schema (SDL)

The platform exposes unified data manipulation through a highly structured GraphQL interface using NestJS code-first/schema configurations. Below is the parsed Schema Definition Language (SDL) representation.

```graphql
scalar DateTime
scalar JSON

enum Role {
  CITIZEN
  MODERATOR
  MUNICIPAL_ADMIN
  SUPER_ADMIN
}

enum ReportStatus {
  SUBMITTED
  UNDER_REVIEW
  FLAGGED
  ACCEPTED
  IN_PROGRESS
  RESOLVED
  REJECTED
}

type User {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  role: Role!
  isActive: Boolean!
  createdAt: DateTime!
}

type MediaAttachment {
  id: ID!
  url: String!
  mimeType: String!
  fileSize: Int!
  aiTranscription: String
  isFlagged: Boolean!
}

type CivicReport {
  id: ID!
  title: String!
  description: String!
  category: String!
  status: ReportStatus!
  priorityScore: Float!
  latitude: Float!
  longitude: Float!
  user: User!
  attachments: [MediaAttachment!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Survey {
  id: ID!
  title: String!
  description: String!
  schemaJson: JSON!
  isActive: Boolean!
  expiresAt: DateTime
  createdAt: DateTime!
}

type AIInsightSummary {
  topicCluster: String!
  summaryText: String!
  sentimentScore: Float!
  impactMetric: Int!
}

input CreateCivicReportInput {
  title: String!
  description: String!
  category: String!
  latitude: Float!
  longitude: Float!
  s3Keys: [String!]!
}

input SubmitSurveyResponseInput {
  surveyId: ID!
  answers: JSON!
}

type Query {
  getCivicReport(id: ID!): CivicReport
  listCivicReports(
    status: ReportStatus
    category: String
    latMin: Float
    latMax: Float
    lngMin: Float
    lngMax: Float
    limit: Int!
    offset: Int!
  ): [CivicReport!]!
  getActiveSurveys: [Survey!]!
  getAIInsights(category: String!): AIInsightSummary!
}

type Mutation {
  createCivicReport(input: CreateCivicReportInput!): CivicReport!
  submitSurveyResponse(input: SubmitSurveyResponseInput!): Boolean!
  updateReportStatus(id: ID!, status: ReportStatus!): CivicReport!
}

type Subscription {
  reportStatusChanged(id: ID!): CivicReport!
  newReportInArea(latitude: Float!, longitude: Float!, radiusKm: Float!): CivicReport!
}
```

---

### 5. REST API Design

While GraphQL powers structural data consumption, REST endpoints are highly optimized for file operations, heavy processing webhooks, public geometric spatial tiles, and administrative ingest.

#### 5.1 Media Optimization & Upload Flow
1. **`GET /api/v1/media/presigned-url`**
   - **Auth:** Required (Bearer JWT)
   - **Query Params:** `filename=pothole.mp4`, `contentType=video/mp4`
   - **Response:**
     ```json
     {
       "uploadUrl": "https://community-voice-ingest.s3.amazonaws.com/uploads/raw/...",
       "s3Key": "uploads/raw/2026-09/a3b2-4cd8.mp4",
       "expiresIn": 300
     }
     ```

#### 5.2 External AI & Operational Webhooks
2. **`POST /api/v1/webhooks/s3-processing`**
   - **Auth:** HMAC Signature verification (`X-Hub-Signature-256`)
   - **Payload:** Dispatched automatically upon asynchronous transcoder / AV scanner termination. Updates `MediaAttachment` model data status.

3. **`POST /api/v1/webhooks/auth0`**
   - Synchronizes external identity provider registration vectors to PostgreSQL user accounts instantaneously.

#### 5.3 Mapbox Integration & Geospatial Assets
4. **`GET /api/v1/maps/tiles/:z/:x/:y.pbf`**
   - Dynamic MVT (Mapbox Vector Tile) generation. Utilizes PostGIS `ST_AsMVT` directly inside the database, circumventing server-side parsing overhead for high-performance frontend geometric rendering.

---

### 6. Frontend & Backend Architecture

#### 6.1 Frontend Application Design (Next.js 15 + React 19)
- **Data Fetching Paradigm:** Heavy adoption of **React Server Components (RSC)** for standard lists, markdown reports, and contextual server-side validation.
- **Client Interactions:** Dedicated client components (`"use client"`) handle Mapbox instances, interactive charting via Tremor/Recharts, and optimistic state synchronization for upvotes/comments.
- **State Management Architecture:**
  - **Server State:** Handled directly via Next.js cache layers and standard fetch validation keys (`revalidateTag`).
  - **Client Local State:** Managed cleanly using React 19's native `useActionState` and optimistic UI hooks, reducing external library overhead (e.g., Zustand/Redux) to zero for structural interactions.
  - **Global Context:** Custom React Context providers strictly for tracking theme configurations and authentication states.

#### 6.2 Backend Modular Design (NestJS)
The backend enforces a clean architecture pattern structured using isolated domain modules:

```
[ NestJS Core Container ]
   ├── AuthModule (Guards, JWT, RBAC Validation)
   ├── UserModule (Profile, Core Settings)
   ├── ReportModule (Civic Lifecycle, PostGIS Queries)
   ├── MediaModule (S3 Management, Presigned Generation)
   ├── QueueModule (BullMQ producers & worker managers)
   └── AIModule (LLM Integration, Orchestration Engine)
```

- **Request Lifecycle Hierarchy:**
  `Client Request` ➔ `Global Interceptor (Logging/Tracing)` ➔ `AuthGuard` ➔ `RBAC Guard` ➔ `ValidationPipe (Zod/Class-Validator)` ➔ `Controller / Resolver` ➔ `Service Layer` ➔ `Prisma / DB Transaction`.

---

### 7. Kubernetes Deployment, Docker, & Terraform Infrastructure

#### 7.1 Containerization Layer
Below are optimized, multi-stage, production-ready `Dockerfile` blue-prints for both structural codebases.

##### Backend API `Dockerfile`
```dockerfile
# --- Stage 1: Build Environment ---
FROM node:19-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

# --- Stage 2: Target Runtime ---
FROM node:19-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 4000
CMD ["node", "dist/main.js"]
```

##### Frontend Web `Dockerfile`
```dockerfile
# --- Stage 1: Build Environment ---
FROM node:19-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Stage 2: Target Runtime ---
FROM node:19-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

#### 7.2 Terraform Infrastructure Architecture
Infrastructure is fully declared via structured Terraform modules targeting AWS:

```
terraform/
├── environments/
│   ├── staging/
│   └── production/
└── modules/
    ├── vpc/          # Multi-AZ isolated private subnets
    ├── eks/          # Elastic Kubernetes Service cluster
    ├── rds/          # Aurora PostgreSQL serverless v2 cluster
    ├── elasticache/  # Redis cluster configuration
    └── s3/           # Secure private bucket with lifecycle tracking
```

#### 7.3 Kubernetes Manifest Layout
Applications are scheduled within an Amazon EKS cluster controlled via declarative manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: community-voice-api
  namespace: core
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: cv-api
    spec:
      containers:
      - name: api
        image: <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/cv-api:latest
        resources:
          limits:
            cpu: "1000m"
            memory: "1024Mi"
          requests:
            cpu: "500m"
            memory: "512Mi"
        ports:
        - containerPort: 4000
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 15
```

---

### 8. CI/CD Pipelines

Automated integration and continuous deployment are managed through standard workflows. Below is the production blueprint for **GitHub Actions**.

```yaml
name: CI/CD Production Pipeline

on:
  push:
    branches: [ main ]

jobs:
  audit-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 19
          cache: 'npm'
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Static Analysis & Lint
        run: npm run lint
        
      - name: Security Scan (Audit)
        run: npm audit --audit-level=high
        
      - name: Execute Suite (Unit & Integration)
        run: npm run test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test

  build-and-push:
    needs: audit-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
          
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
        
      - name: Build, Tag, and Push Docker Images
        run: |
          docker build -t ${{ steps.login-ecr.outputs.registry }}/cv-api:${{ github.sha }} -f Dockerfile.api .
          docker push ${{ steps.login-ecr.outputs.registry }}/cv-api:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Update Kubernetes Configuration
        run: |
          aws eks update-kubeconfig --name community-voice-prod --region us-east-1
          kubectl set image deployment/community-voice-api api=${{ secrets.ECR_REGISTRY }}/cv-api:${{ github.sha }} -n core
```

---

### 9. Security Architecture

#### 9.1 Authentication & Authorization Model
- **Protocol:** OpenID Connect (OIDC) managed via Auth0. JWTs contain customizable user role claims (`CITIZEN`, `MODERATOR`, etc.).
- **RBAC Matrix:** Enforced inside NestJS via an administrative reflection decorator.

| Role | Submit Content | Dynamic Surveys | AI Insight Access | Moderate Flagged Queries | System Audit Access |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **CITIZEN** | ✓ | ✓ | ✗ | ✗ | ✗ |
| **MODERATOR** | ✓ | ✓ | ✗ | ✓ | ✗ |
| **MUNICIPAL_ADMIN** | ✓ | ✓ | ✓ | ✓ | ✗ |
| **SUPER_ADMIN** | ✓ | ✓ | ✓ | ✓ | ✓ |

#### 9.2 Encryption Standards
- **Data In-Transit:** Forced HTTPS with strict TLS 1.3 configuration. All internal service-to-service cluster interactions run over an encrypted mTLS sidecar layer (Istio Service Mesh).
- **Data At-Rest:** AES-256 block storage configuration for structural underlying AWS RDS volumes and S3 artifacts.

#### 9.3 PII Isolation Engine
Personal Identifiable Information (PII) is structurally isolated. When a user requests account deletion, a database pipeline sets `isPiiRedacted = true`, replacing name/email vectors with cryptographic placeholder strings, preserving the structural telemetry of historical civic reports and survey metrics for town analytics without violating GDPR/CCPA criteria.

---

### 10. Moderation Architecture

To scale community submissions without compromising platform safety, a dual-layer AI + Human-in-the-loop (HITL) moderation system is established.

```
[ New Report / Comment ]
          │
          ▼
   ┌─────────────┐
   │ AI Guardrail│ ───► Passes Verification ───► Published to Live Feed
   └─────────────┘
          │ (Flagged / Low Confidence)
          ▼
   ┌─────────────┐
   │ Moderation  │ ───► BullMQ Event Enqueued
   │    Queue    │
   └─────────────┘
          │
          ▼
   ┌─────────────┐
   │ Human Admin │ ───► Explicit Dashboard Action (Approve / Reject)
   │  Reviewer   │
   └─────────────┘
```

1. **AI Automated Layer:** The incoming text block or image is immediately analyzed via standard guardrail models to detect hate speech, profanity, or doxxing.
2. **Confidence Bounds:** Items scoring with an AI safety violation probability $> 0.75$ are instantly hidden and systematically mapped to the `ModerationQueue` model with detailed semantic reasoning.
3. **Auditability:** Every manual overwrite or action taken by a human controller increments an immutable row inside the `AuditLog` database structure.

---

### 11. AI Architecture

The system utilizes specialized foundational models to process massive community inputs into strategic civic action variables.

```
       [ Multi-Media Stream Processing Pipeline ]

   ┌───────────────────────────────────────────────────────┐
   │                 S3 Object Landing                     │
   └───────────────────────────────────────────────────────┘
                               │
                               ▼
   ┌───────────────────────────────────────────────────────┐
   │             BullMQ Video Splitting worker             │
   └───────────────────────────────────────────────────────┘
                               │
                               ▼
   ┌───────────────────────────────────────────────────────┐
   │      Gemini Pro Vision Multimodal Frame Extraction    │
   └───────────────────────────────────────────────────────┘
                               │
                               ▼
   ┌───────────────────────────────────────────────────────┐
   │    OpenAI text-embedding-3-large (Clustering Engine)  │
   └───────────────────────────────────────────────────────┘
                               │
                               ▼
   ┌───────────────────────────────────────────────────────┐
   │        Elasticsearch Vector Storage / Analysis        │
   └───────────────────────────────────────────────────────┘
```

#### 11.1 Video Analysis Pipeline
When citizens submit video evidence of infrastructural degradation, a dedicated worker processes the stream:
- **Audio Extraction:** Converted to structured text text blocks using Whisper/Gemini audio parsing.
- **Visual Mapping:** Gemini Pro Vision scans keyframes to corroborate geolocation telemetry data against the visual scenery, identifying potholes, structural damage, or broken utilities automatically.

#### 11.2 Automated Report Deduplication
To prevent municipal overload from hundreds of citizens reporting the exact same highway failure, incoming descriptions are passed to `text-embedding-3-large`. The vector coordinates are queried inside Elasticsearch using Cosine Similarity. If an identical report exists within a $50$-meter geographical radius, the user is automatically asked if they wish to "Subscribe to updates for the existing issue" instead of creating a brand-new ticket.

#### 11.3 AI-Generated Civic Insights
On a weekly basis, a cron schedule aggregates public complaints and survey trends across specific zip codes. It supplies this text context to a large language model to synthesize dense bullet-point operational briefs for the local government council, isolating top public concerns automatically.

---

### 12. File Storage Architecture

Files follow a strictly quarantined, lifecycle-managed path inside AWS S3 or Cloudflare R2 buckets.

```
 s3://community-voice-assets/
   ├── uploads/
   │     └── raw/          <--- Public Upload Drop (Lifecycle: TTL 1 Day)
   ├── permanent/
   │     ├── reports/      <--- Sanitized, processed media files
   │     └── profiles/     <--- Avatars & verified identification maps
   └── archives/           <--- Compressed, cold-storage telemetry
```

#### 12.1 Secure Processing Protocol
1. Client acquires a short-lived presigned upload URL (5-minute expiration window).
2. Client uploads file directly to `uploads/raw/`.
3. An S3 Event Notification triggers an AWS Lambda function running an antivirus daemon (ClamAV).
4. If the asset passes validation, it is compressed, stripped of dangerous metadata, and shifted to `permanent/reports/`. The backend database table is updated with the secure path.

---

### 13. Survey Architecture

The system supports highly dynamic, structural survey logic to gather community opinions on urban changes.

#### 13.1 Dynamic Form Definition Engine
The structure of a survey is saved as a complete JSON schema configuration inside the `Survey.schemaJson` field. Below is a sample architecture defining dynamic logic parsing:

```json
{
  "version": "1.0",
  "steps": [
    {
      "stepId": "demographics",
      "fields": [
        {
          "id": "age_group",
          "type": "SELECT",
          "label": "Select your age bracket",
          "options": ["18-24", "25-45", "46+"],
          "validation": { "required": true }
        }
      ]
    },
    {
      "stepId": "transit_feedback",
      "condition": {
        "field": "age_group",
        "operator": "IN",
        "value": ["18-24", "25-45"]
      },
      "fields": [
        {
          "id": "subway_usage",
          "type": "NUMBER",
          "label": "How many times do you use the subway per week?",
          "validation": { "min": 0, "max": 100 }
        }
      ]
    }
  ]
}
```

#### 13.2 Validation Lifecycle
The backend uses **Ajv** or **Zod** to compile the stored structural JSON schema on the fly. Incoming payloads to `submitSurveyResponse` are evaluated directly against the survey schema rules to ensure data sanitization.

---

### 14. Analytics Architecture

Civic engagement data is processed simultaneously through user analytics tracking and operational metrics collection.

#### 14.1 Clickstream Analytics (PostHog)
PostHog acts as the front-line product engagement interface. It captures user interaction flows anonymously (e.g., duration spent reviewing civic budgets, heat map tool click retention rates) without logging identifying parameters.

#### 14.2 Monitoring & Telemetry Infrastructure
- **Metrics Scraping:** NestJS exposes a protected endpoint `/metrics` emitting native **Prometheus** metrics.
- **BullMQ Monitoring:** Prometheus tracks job delays, failure rates, and concurrency performance across the worker fleet.
- **Visualization:** A comprehensive **Grafana** dashboard integrates Prometheus inputs alongside database engine states to display real-time cluster health matrices.

---

### 15. Data Governance Framework

To maintain civic trust, data usage complies strictly with national standards.

- **Data Retention Windows:** Public reports are kept indefinitely as historic municipal data. Unused draft media records are hard-purged from `uploads/raw/` after 24 hours.
- **Anonymization Pipelines:** Data exported for educational or public data portals undergo automatic scrubbing. Names, precise birthdates, and residential tracking coordinates are aggregated or masked into broader geographical clusters (e.g., zip-code level boundaries).
- **Access Control Isolation:** Only staff workers with active `SUPER_ADMIN` assignments can access unaltered backend server log databases containing origin IP tracking footprints.

---

### 16. MVP Development Plan

The system implementation is scheduled across a structured 12-week runway:

```
[Week 1-3: Core Infrastructure Foundations]
  ├── Setup monorepo framework (Turborepo)
  ├── Provision AWS environment using Terraform modules
  └── Establish schema models inside Prisma and Postgres

[Week 4-6: Foundational Feature Realization]
  ├── Integrate Auth0 authentication flows
  ├── Finalize Core Report submission API with PostGIS extensions
  └── Complete dynamic S3 asset loading capabilities

[Week 7-9: AI Integration & Event Pipeline Processing]
  ├── Deploy BullMQ processing nodes
  ├── Orchestrate OpenAI & Gemini automated moderation layers
  └── Implement Mapbox spatial layer rendering

[Week 10-12: Launch Preparation & Hardening]
  ├── Realize full end-to-end testing matrix
  ├── Complete automated performance tuning via query caching
  └── Execute initial production deployment
```

---

### 17. Version 2 & Enterprise Roadmap

Following successful MVP validation, the architecture will scale to integrate enterprise capabilities:
- **Multi-Tenant Municipal Sub-systems:** Dedicated configuration namespaces for individual cities, enabling custom branding, localized reporting laws, and isolated admin workspaces.
- **Offline-First Capabilities:** Service Worker caching structures allowing citizens in remote areas to queue reports locally with visual attachments, synchronizing cleanly when internet connectivity is re-established.
- **Predictive Infrastructure Maintenance:** AI forecasting engines that cross-reference historical civic complaint velocities with weather data to predict upcoming structural issues before failures manifest.

---

### 18. Complete Folder Structure

A monorepo structure handles the codebase to minimize structural drift between the frontend and backend architectures:

```
/community-voice-monorepo
├── .github/
│   └── workflows/              # GitHub Actions definitions
├── apps/
│   ├── web/                    # Next.js 15 web application
│   │   ├── src/
│   │   │   ├── app/            # App Router (Pages, RSCs)
│   │   │   └── components/     # UI Design Atoms & Mapbox views
│   │   └── Dockerfile
│   └── api/                    # NestJS Core Gateway Service
│       ├── src/
│       │   ├── modules/        # Domain-driven backend contexts
│       │   └── main.ts         # Application Entrypoint
│       └── Dockerfile
├── packages/
│   ├── database/               # Prisma Schema & Migration definitions
│   ├── shared-types/           # Common interfaces & validation rules
│   └── tsconfig/               # Shared compiler parameters
├── terraform/                  # Declarative Infrastructure as Code
└── k8s/                        # Production orchestration manifests
```

---

### 19. Testing Strategy

The platform maintains strict quality assurance metrics across three distinct phases:

#### 19.1 Unit Testing (Jest)
Isolated logic components—such as dynamic survey condition check engines or prioritized scoring mathematical functions—are fully tested with zero database mocking requirements.

#### 19.2 Integration Testing (Testcontainers)
Rather than mock system interactions, integration suites spawn lightweight Docker containers during testing loops to evaluate real interactions with PostgreSQL/PostGIS, Redis, and Elasticsearch.

#### 19.3 End-to-End Testing (Playwright)
Playwright boots standalone versions of the Next.js runtime environment, executing programmatic browser instructions to validate user registration flows, multimedia report entry workflows, and administrative control operations.

---

### 20. Deployment Strategy

Production releases employ an **ArgoCD-managed Canary Deployment** methodology:

```
[ New Production Release Triggered ]
                 │
                 ▼
  ┌──────────────────────────────┐
  │  Deploy to 10% Canary Pods  │ ──► Run real user traffic
  └──────────────────────────────┘
                 │
                 ▼
  ┌──────────────────────────────┐
  │ Verify Logs & Error Metrics  │ ──► High Error Count? ──► Auto Rollback
  └──────────────────────────────┘
                 │ (Metrics Normal for 1 Hour)
                 ▼
  ┌──────────────────────────────┐
  │  Gradual Rollout to 100%     │
  └──────────────────────────────┘
```

1. A new container version is initially routed to just 10% of users using weighted routing rules via the Ingress Controller.
2. Production telemetry systems monitor error rates, response latencies, and system exceptions for one hour.
3. If an anomaly is identified, traffic weights are instantly reverted to 0% to protect platform stability. Otherwise, the deployment naturally scales up to 100%.
