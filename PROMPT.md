# Multiplayer Ralph PRD System

## Project Context
**Project:** ralph-multiplayer
**Goal:** A multiplayer PRD editor where documents are rendered views of live state, with Ralph agent integration
**Tech Stack:** Bun, TypeScript, Hono, PartyKit, Yjs, Postgres, React, Tailwind

## Core Concept
Documents are not files - they are rendered views of underlying state. Multiple users edit state simultaneously. Ralph agents work on stories and emit progress events. The "document" is always current because it's computed, not stored.

## Stories

```json
{
  "stories": [
    {
      "id": 1,
      "priority": 1,
      "story": "Project scaffolded with monorepo structure",
      "acceptance": [
        "bun install succeeds",
        "packages/api exists with Hono server",
        "packages/web exists with React + Vite",
        "packages/shared exists with types",
        "tsconfig configured for monorepo"
      ],
      "passes": true
    },
    {
      "id": 2,
      "priority": 2,
      "story": "Event store schema and basic CRUD",
      "acceptance": [
        "Postgres schema for: projects, stories, criteria, events",
        "Event table captures all mutations",
        "API endpoints: POST /projects, GET /projects/:id",
        "API endpoints: POST /stories, PATCH /stories/:id",
        "Events table populated on every mutation"
      ],
      "passes": true
    },
    {
      "id": 3,
      "priority": 3,
      "story": "Real-time presence with PartyKit",
      "acceptance": [
        "PartyKit server in packages/party",
        "Users can connect to a project room",
        "Presence shows who is online",
        "Cursor positions broadcast to other users",
        "User join/leave events work"
      ],
      "passes": true
    },
    {
      "id": 4,
      "priority": 4,
      "story": "Collaborative text editing with Yjs",
      "acceptance": [
        "Story descriptions use Yjs Y.Text",
        "Multiple users can edit same description simultaneously",
        "Changes sync in real-time via PartyKit",
        "No conflicts on concurrent edits",
        "Text persists to database on change"
      ],
      "passes": true
    },
    {
      "id": 5,
      "priority": 5,
      "story": "PRD View renders from state",
      "acceptance": [
        "GET /views/prd/:projectId returns markdown",
        "Markdown includes all stories, criteria, status",
        "Web UI renders PRD view in real-time",
        "View updates when any story/criteria changes",
        "Looks like a normal document to users"
      ],
      "passes": true
    },
    {
      "id": 6,
      "priority": 6,
      "story": "Ralph agent integration",
      "acceptance": [
        "POST /agent/start triggers Ralph on a story",
        "Ralph progress events stream to event store",
        "PRD view shows 'Agent working on Story X'",
        "Agent completion updates story status to passed",
        "Agent blocked state captured and displayed"
      ],
      "passes": true
    },
    {
      "id": 7,
      "priority": 7,
      "story": "Board view as alternate rendering",
      "acceptance": [
        "GET /views/board/:projectId returns kanban data",
        "Web UI shows stories in columns by status",
        "Drag-drop changes story status",
        "Same underlying state as PRD view",
        "Real-time updates across all views"
      ],
      "passes": true
    }
  ]
}
```

## Working Rules

### Task Selection
1. Find highest-priority story where `passes: false`
2. Work ONLY on that story
3. Do NOT start next story until current passes

### Code Quality Gates
Before EVERY commit:
```bash
bun run typecheck   # Must pass
bun run test        # Must pass (once tests exist)
```

### Tech Decisions
- Use Bun, NOT Node.js
- Use Hono for API (not Express)
- Use Drizzle ORM for Postgres
- Use PartyKit for real-time (not Socket.io)
- Use Yjs for CRDT text editing
- Use Vite + React for web UI
- Minimal dependencies - simple solutions first

### Progress Tracking
APPEND to `progress.txt`:
```
---
Iteration: [N]
Story: [ID] - [title]
Status: [in_progress | complete | blocked]
Actions: [what you did]
---
```

## Completion

Output `<done>COMPLETE</done>` when:
- [ ] Current story acceptance criteria met
- [ ] All code compiles (bun run typecheck)
- [ ] Tests pass (if they exist)
- [ ] Committed with descriptive message
- [ ] progress.txt updated
- [ ] Story marked with `passes: true` in this file

## If Blocked

After 10 iterations without progress:
1. Document blocker in progress.txt
2. List approaches attempted
3. Output `<done>BLOCKED</done>`

## File Structure Target

```
ralph-multiplayer/
├── packages/
│   ├── api/              # Hono API server
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   ├── db/
│   │   │   └── events/
│   │   └── package.json
│   ├── web/              # React frontend
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   └── views/
│   │   └── package.json
│   ├── party/            # PartyKit server
│   │   ├── src/
│   │   │   └── server.ts
│   │   └── package.json
│   └── shared/           # Shared types
│       ├── src/
│       │   └── types.ts
│       └── package.json
├── package.json          # Workspace root
├── tsconfig.json
├── PROMPT.md
└── progress.txt
```
