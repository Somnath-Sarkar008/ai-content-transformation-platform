# TransformAI — AI Content Transformation Platform

SIH 2026 prototype for **Gen AI Platform for Automated Content Transformation**.

## Prototype architecture

- **Next.js** frontend with an n8n-inspired visual workflow/input experience.
- **NestJS** backend API.
- **Gemini + AI SDK** for orchestration and grounded transformation.
- Shared Content Intelligence representation so multiple outputs remain consistent.
- Prototype Quality Guardian response with factual-grounding checks.
- **PptxGenJS** for PPTX generation.
- **PDFKit** for PDF generation.
- **docx** for DOCX generation.
- Existing AI SDK demo capabilities retained as design references: streaming agent UI, image/video tools, Tavily search/extract/crawl/map and tool-state rendering.

## Current flow

`Source → Analyze → Orchestrate → Specialized outputs → Verify → Export`

Supported output targets in the prototype UI: LinkedIn, X/thread, Advisory, Executive Summary, Presentation, Infographic and Video Package.

## Run

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
# copy .env.example to .env and set GEMINI_API_KEY
npm run start:dev
```

Frontend defaults to `http://localhost:3001` for the backend. Set `NEXT_PUBLIC_API_URL` if needed.

## Export routes

- `GET /api/export/pptx?title=...`
- `GET /api/export/pdf?title=...`
- `GET /api/export/docx?title=...`

No database is required for this prototype. Persistence, authentication, queues and production storage can be added after the end-to-end demo is stable.
