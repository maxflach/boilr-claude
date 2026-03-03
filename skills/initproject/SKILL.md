---
name: initproject
description: Scaffold a new full-stack project from scratch. Checks the directory is empty, asks for stack type and project details, scaffolds the project structure, installs dependencies, initializes git with a develop branch, creates a GitHub repo, generates the agent team, and writes the newfeature skill.
argument-hint: ""
---

# Init Project Skill

Scaffolds a new full-stack TypeScript project in the current working directory. Supports two stacks: **Firebase** (Firestore + Functions + Auth + Hosting) and **Node.js + React** (PostgreSQL + Prisma + Express + React). Always uses Vite + React + TailwindCSS v4 + React Query + Jotai + shadcn/ui on the frontend.

Execution mode: **pause at phase boundaries** — present a summary at the end of each major phase and wait for user approval before continuing.

---

## Phase 1: Safety Check

Run `ls -la` in the current working directory (do NOT use the Glob tool — we need to see hidden files and an accurate empty check).

If **any files or directories exist** (beyond a `.git` folder), show the user what was found and warn:

> "This directory is not empty. Initializing here may overwrite or conflict with existing files. Do you want to continue anyway?"

Use `AskUserQuestion`:
- Header: "Directory check"
- Question: "The current directory contains existing files. Continue anyway?"
- Options: "Yes, continue" / "No, abort"

If they say **No** → print "Aborted. Navigate to an empty directory and try again." and stop.

If the directory is empty → proceed immediately to Phase 2.

---

## Phase 2: Stack Selection

Use `AskUserQuestion` (single question):

- Header: "Stack"
- Question: "Which stack should this project use?"
- Options:
  - "Firebase" — "Firestore + Firebase Functions (onCall) + Firebase Auth + Firebase Hosting. Best for real-time apps, rapid prototyping, or teams already on Firebase."
  - "Node.js + React" — "PostgreSQL + Prisma + Express API + React frontend. Frontend on Firebase Hosting, API on Firebase App Hosting. Best for relational data or complex queries."

Store the answer as `STACK` (either `firebase` or `nodejs`).

---

## Phase 3: Project Details

Use `AskUserQuestion` with multiple questions in one call:

**Question 1:**
- Header: "App name"
- Question: "What is the app name? (used for package.json, Firebase project ID, folder name, etc.)"
- Options: *(none — user will type via Other)*
- Use `multiSelect: false`

**Question 2:**
- Header: "Multi-tenant"
- Question: "Is this a multi-tenant application? (data scoped per company/org/tenant)"
- Options:
  - "Yes" — "Data is partitioned by tenant ID. Affects DB schema, auth rules, and agent instructions."
  - "No" — "Single-tenant or user-scoped only."

**Question 3:**
- Header: "Auth provider"
- Question: "How will authentication work?"
- Options:
  - "Firebase Auth" — "Firebase Authentication (email/password, Google OAuth, etc.)"
  - "JWT" — "Custom JWT-based auth (issued by your API)"
  - "None" — "No authentication for now"

Store: `APP_NAME`, `MULTI_TENANT`, `AUTH_PROVIDER`.

**Pause** — show summary of choices and ask "Ready to scaffold? This will create the project structure and install dependencies."

Use `AskUserQuestion`:
- Options: "Yes, scaffold it" / "No, let me reconsider"

If No → go back to Phase 2.

---

## Phase 4: Scaffold Project

### 4a: Create directory structure

Create the following structure depending on the stack. Use the Bash tool to run `mkdir -p` commands.

**Firebase stack:**
```
mkdir -p app/src/components app/src/pages app/src/hooks app/src/store app/src/lib
mkdir -p functions/src/lib
mkdir -p .github/workflows
mkdir -p .claude/agents .claude/skills/newfeature
```

**Node.js + React stack:**
```
mkdir -p app/src/components app/src/pages app/src/hooks app/src/store app/src/lib
mkdir -p api/src/api api/src/app api/src/types api/src/utils api/src/services
mkdir -p api/prisma
mkdir -p .github/workflows
mkdir -p .claude/agents .claude/skills/newfeature
```

### 4b: Write config files

#### Both stacks — `app/` frontend

Write `app/package.json`:
```json
{
  "name": "<APP_NAME>-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "jotai": "^2.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

Write `app/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

Write `app/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Write `app/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Write `app/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

Write `app/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Write `app/src/pages/HomePage.tsx`:
```tsx
export function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <h1 className="text-4xl font-bold text-foreground">Hello from <APP_NAME></h1>
    </main>
  );
}
```

Write `app/src/index.css`:
```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}
```

Write `app/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><APP_NAME></title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Write `app/src/store/uiAtoms.ts`:
```typescript
import { atom } from 'jotai';

// UI state atoms — for local/client state only
// Server state belongs in React Query, not here
export const sidebarOpenAtom = atom(false);
```

Write `app/src/lib/queryClient.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});
```

#### Firebase-specific files

Write `functions/package.json`:
```json
{
  "name": "<APP_NAME>-functions",
  "version": "0.1.0",
  "engines": { "node": "20" },
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^6.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "firebase-functions-test": "^3.0.0"
  },
  "private": true
}
```

Write `functions/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2020",
    "skipLibCheck": true
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

Write `functions/src/index.ts`:
```typescript
import * as admin from 'firebase-admin';

admin.initializeApp();

// Export functions here
// Example: export { myFunction } from './myFunction';
```

Write `firebase.json`:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log", "*.local"]
    }
  ],
  "hosting": {
    "public": "app/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true },
    "singleProjectMode": true
  }
}
```

Write `.firebaserc`:
```json
{
  "projects": {
    "default": "<APP_NAME>"
  }
}
```

Write `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all by default — add specific rules as you build features
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Write `firestore.indexes.json`:
```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

Also add Firebase SDK to frontend dependencies. Update `app/package.json` to add:
```json
"firebase": "^10.0.0"
```

Write `app/src/lib/firebase.ts`:
```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

// TODO: Replace with your Firebase project config
// Get it from Firebase Console → Project Settings → Your apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'europe-west1');
```

Write `app/.env.example`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

#### Node.js + React–specific files

The API uses the **BoilrApi** pattern — a class-based endpoint registry on top of Express that handles TypeBox validation, JWT auth, error handling, and auto-generates an OpenAPI spec. Never write raw Express route handlers; always use `api.addEndpoint(route)`.

The frontend uses **hey-api** to generate a typed client from the OpenAPI spec — no raw fetch calls.

Write `api/package.json`:
```json
{
  "name": "<APP_NAME>-api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "NODE_ENV=production node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "@sinclair/typebox": "^0.32.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "jsonwebtoken": "^9.0.2",
    "pino": "^8.19.0",
    "pino-pretty": "^13.0.0",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.0.0",
    "@types/swagger-ui-express": "^4.1.6",
    "prisma": "^6.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

Write `api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "compileOnSave": true,
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Write `api/src/types/index.ts`:
```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Request, Response } from 'express';

export interface JWTPayload {
  sub: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  roles?: string[];
  [key: string]: unknown;
}

export type Route = {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  input?: {
    query?: any;
    body?: any;
    params?: any;
  };
  auth?: {
    required?: boolean;
    optional?: boolean;
    roles?: string[];
  };
  handler: (args: {
    req: Request;
    res: Response;
    query: any;
    body: any;
    params: any;
    user?: JWTPayload;
  }) => Promise<any>;
  middleware?: any[];
  validators?: {
    query?: ReturnType<typeof TypeCompiler.Compile>;
    body?: ReturnType<typeof TypeCompiler.Compile>;
    params?: ReturnType<typeof TypeCompiler.Compile>;
  };
};

export type Config = {
  port: number;
  api: {
    cors_origin?: string[];
    limit?: string;
    jwt?: {
      secret: string;
      expiresIn: string;
    };
  };
};

export interface JWTConfig {
  secret: string;
  expiresIn: string;
}
```

Write `api/src/api/index.ts` — this is the core BoilrApi class:
```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response, Express } from 'express';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import cors from 'cors';
import { Config, Route, JWTPayload } from '../types';
import pino from 'pino';
import { JWTService } from '../utils/jwt';
import swaggerUi from 'swagger-ui-express';

class ValidationError extends Error {
  details: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export default class BoilrApi {
  endpoints: Array<Route>;
  cors_origin: string[];
  limit: string;
  jwtService?: JWTService;

  constructor(config: Config) {
    this.endpoints = [];
    this.cors_origin = config.api.cors_origin || [];
    this.limit = config.api.limit || '50mb';
    if (config.api.jwt) {
      this.jwtService = new JWTService(config.api.jwt);
    }
  }

  addEndpoint = (routeObj: Route): void => {
    const { input } = routeObj;
    const validators: {
      query?: ReturnType<typeof TypeCompiler.Compile>;
      body?: ReturnType<typeof TypeCompiler.Compile>;
      params?: ReturnType<typeof TypeCompiler.Compile>;
    } = {};
    if (input?.query) validators.query = TypeCompiler.Compile(input.query);
    if (input?.body) validators.body = TypeCompiler.Compile(input.body);
    if (input?.params) validators.params = TypeCompiler.Compile(input.params);
    this.endpoints.push({ ...routeObj, validators });
  };

  generateOpenApiDefinition = () => {
    const paths: Record<string, any> = {};
    this.endpoints.forEach((route) => {
      const { method, path, input, auth } = route;
      const openApiPath = path.replace(/:([^/]+)/g, '{$1}');
      if (!paths[openApiPath]) paths[openApiPath] = {};

      const operation: any = {
        summary: `${method.toUpperCase()} ${path}`,
        operationId: `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
        tags: ['API'],
        responses: {
          '200': { description: 'Successful operation', content: { 'application/json': { schema: { type: 'object' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' }, details: { type: 'array', items: { type: 'string' } } } } } } },
          '401': { description: 'Authentication error', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } } },
          '500': { description: 'Internal server error', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } } },
        },
      };

      if (auth?.required) operation.security = [{ bearerAuth: [] }];

      const parameters: any[] = [];
      if (input?.params) {
        Object.entries(input.params.properties || {}).forEach(([name, schema]: [string, any]) => {
          parameters.push({ name, in: 'path', required: input.params.required?.includes(name) || false, schema: this.convertTypeBoxToOpenApi(schema) });
        });
      }
      if (input?.query) {
        Object.entries(input.query.properties || {}).forEach(([name, schema]: [string, any]) => {
          parameters.push({ name, in: 'query', required: input.query.required?.includes(name) || false, schema: this.convertTypeBoxToOpenApi(schema) });
        });
      }
      if (parameters.length > 0) operation.parameters = parameters;
      if (input?.body) {
        operation.requestBody = { required: true, content: { 'application/json': { schema: this.convertTypeBoxToOpenApi(input.body) } } };
      }
      paths[openApiPath][method] = operation;
    });

    return {
      openapi: '3.0.0',
      info: { title: '<APP_NAME> API', version: '1.0.0', description: 'Auto-generated API documentation' },
      servers: [{ url: '/api', description: 'API server' }],
      paths,
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    };
  };

  private convertTypeBoxToOpenApi(schema: any): any {
    if (!schema) return { type: 'object' };
    if (schema.type === 'string') return { type: 'string' };
    if (schema.type === 'number') return { type: 'number' };
    if (schema.type === 'integer') return { type: 'integer' };
    if (schema.type === 'boolean') return { type: 'boolean' };
    if (schema.type === 'array') return { type: 'array', items: this.convertTypeBoxToOpenApi(schema.items) };
    if (schema.type === 'object') {
      const properties: Record<string, any> = {};
      const required: string[] = [];
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
          properties[key] = this.convertTypeBoxToOpenApi(value);
        });
      }
      if (schema.required) required.push(...schema.required);
      return { type: 'object', properties, required: required.length > 0 ? required : undefined };
    }
    return { type: 'object' };
  }

  private validateAuth(route: Route, req: Request): JWTPayload | undefined {
    if (!route.auth) return undefined;
    if (!route.auth.required && !route.auth.optional) return undefined;
    if (!this.jwtService && route.auth.required) throw new AuthError('JWT service not configured');
    const authHeader = req.headers.authorization;
    if (!authHeader && route.auth.required) throw new AuthError('No authorization header');
    if (!authHeader && route.auth.optional) return undefined;
    if (authHeader) {
      const token = this.jwtService!.extractTokenFromHeader(authHeader);
      const payload = this.jwtService!.verifyToken(token);
      if (route.auth.roles && route.auth.roles.length > 0) {
        const hasRequiredRole = route.auth.roles.some((role) => payload.roles?.includes(role));
        if (!hasRequiredRole) throw new AuthError('Insufficient permissions');
      }
      return payload;
    }
    return undefined;
  }

  express() {
    const app: Express = express();
    app.use(cors({
      origin: this.cors_origin,
      methods: 'GET,OPTIONS,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Accept,Accept-Encoding,Content-Length,Content-Type,Host,Origin,Authorization',
      exposedHeaders: 'Content-Length,Content-Type,Content-Disposition',
      credentials: true,
    }));
    app.use(express.json({ limit: this.limit }));
    app.use(express.urlencoded({ limit: this.limit, extended: true }));

    const openApiSpec = this.generateOpenApiDefinition();
    app.get('/openapi.json', (_req: Request, res: Response) => res.json(openApiSpec));
    app.use('/doc', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: '<APP_NAME> API Documentation',
    }));

    this.endpoints.forEach((route) => {
      const { method, path, handler, middleware = [] } = route;
      pino().info(`Adding route: ${method.toUpperCase()} ${path}`);
      const handlers = [
        ...middleware,
        async (req: Request, res: Response) => {
          try {
            const { validators } = route;
            if (validators) {
              if (validators.query && !validators.query.Check(req.query)) {
                throw new ValidationError('Invalid query', [...validators.query.Errors(req.query)]);
              }
              if (validators.body && !validators.body.Check(req.body)) {
                throw new ValidationError('Invalid body', [...validators.body.Errors(req.body)]);
              }
              if (validators.params && !validators.params.Check(req.params)) {
                throw new ValidationError('Invalid params', [...validators.params.Errors(req.params)]);
              }
            }
            const user = this.validateAuth(route, req);
            const result = await handler({ req, res, query: req.query, body: req.body, params: req.params, user });
            if (!res.headersSent) res.status(200).json(result);
          } catch (error) {
            if (error instanceof ValidationError) {
              res.status(400).json({ error: error.message, details: error.details });
            } else if (error instanceof AuthError) {
              res.status(401).json({ error: error.message });
            } else {
              res.status(500).json({ error: 'Internal Server Error' });
            }
          }
        },
      ];
      app[method](path, ...handlers);
    });

    return app;
  }
}
```

Write `api/src/utils/jwt.ts`:
```typescript
import jwt from 'jsonwebtoken';
import { JWTConfig, JWTPayload } from '../types';

export class JWTService {
  private config: JWTConfig;

  constructor(config: JWTConfig) {
    this.config = config;
  }

  generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.config.secret as jwt.Secret, {
      expiresIn: this.config.expiresIn,
    } as jwt.SignOptions);
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.config.secret as jwt.Secret) as JWTPayload;
    } catch {
      throw new Error('Invalid token');
    }
  }

  extractTokenFromHeader(header: string): string {
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) throw new Error('Invalid authorization header');
    return token;
  }
}
```

Write `api/src/services/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

Write `api/src/app/index.ts` — route registration (add new route classes here):
```typescript
import { config } from 'dotenv';
config();
import BoilrApi from '../api';
import { Config } from '../types';
import { JWTService } from '../utils/jwt';
// import { UserRoutes } from './users';

export default (appConfig: Config) => {
  const api = new BoilrApi(appConfig);

  const jwtService = new JWTService({
    secret: appConfig.api.jwt?.secret || 'fallback-secret',
    expiresIn: appConfig.api.jwt?.expiresIn || '7d',
  });

  // Register route classes here:
  // new UserRoutes(jwtService).getRoutes().forEach(r => api.addEndpoint(r));

  return api;
};
```

Write `api/src/index.ts`:
```typescript
import { config } from 'dotenv';
config();
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import createApi from './app';
import express from 'express';
import { join } from 'path';
import { createServer } from 'http';

const Config = {
  port: Number(process.env.PORT) || 8080,
  api: {
    cors_origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    limit: process.env.API_LIMIT || '50mb',
    jwt: process.env.JWT_SECRET
      ? { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      : undefined,
  },
};

const logger = pino({
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  }),
  level: process.env.LOG_LEVEL || 'info',
});

const run = async () => {
  const prisma = new PrismaClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).prisma = prisma;

  const router = express();
  const server = createServer(router);

  const api = createApi(Config);
  router.use('/api', api.express());

  router.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info({
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${Date.now() - start}ms`,
      }, 'HTTP Request');
    });
    next();
  });

  router.use('/', express.static(join(__dirname, '../public')));

  server.listen(Config.port, () => {
    logger.info(`Server running on http://localhost:${Config.port}`);
    logger.info(`API docs: http://localhost:${Config.port}/api/doc`);
    logger.info(`OpenAPI spec: http://localhost:${Config.port}/api/openapi.json`);
  });
};

run();
```

Write `api/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Add your models here
```

Write `api/.env.example`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/<APP_NAME>
PORT=8080
JWT_SECRET=
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
NODE_ENV=development
```

Write `api/apphosting.yaml` — Firebase App Hosting config for the Node.js API:
```yaml
runConfig:
  runtime: nodejs20
  minInstances: 0

env:
  - variable: NODE_ENV
    value: production
  - variable: PORT
    value: "8080"
  - variable: JWT_EXPIRES_IN
    value: 7d
  - variable: LOG_LEVEL
    value: info
  - variable: DATABASE_URL
    secret: DATABASE_URL
  - variable: JWT_SECRET
    secret: JWT_SECRET
  - variable: CORS_ORIGIN
    secret: CORS_ORIGIN
```

Write `firebase.json` (Node.js + React stack):
```json
{
  "hosting": {
    "public": "app/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

Write `.firebaserc` (Node.js + React stack):
```json
{
  "projects": {
    "default": "<APP_NAME>"
  }
}
```

Also add hey-api to the frontend for client generation. Update `app/package.json` devDependencies to add:
```json
"@hey-api/openapi-ts": "^0.52.0",
"@hey-api/client-fetch": "^0.2.0"
```

Add to `app/package.json` scripts:
```json
"generate:api": "openapi-ts --input http://localhost:8080/api/openapi.json --output src/lib/api --client @hey-api/client-fetch"
```

Write `app/.env.example`:
```
VITE_API_URL=http://localhost:8080
```

#### Both stacks — root files

Write `.gitignore`:
```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
lib/
build/
.firebase/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Firebase
.firebase/

# Prisma
prisma/*.db
```

Write `CLAUDE.md` (project-level conventions):

```markdown
# <APP_NAME> — Project Conventions

## Stack

<!-- Firebase or Node.js + React — filled by initproject -->

## Architecture

- **Frontend:** Vite + React + TypeScript in `app/src/`
- **Backend:** <!-- Firebase Functions in `functions/src/` OR Express API in `api/src/` -->
- **Database:** <!-- Firestore OR PostgreSQL + Prisma -->
- **Auth:** <!-- Firebase Auth OR JWT OR None -->
- **Multi-tenant:** <!-- Yes / No -->

## Frontend Rules (Non-Negotiable)

### ❌ NEVER use `useEffect` for data fetching

This is the most common source of infinite loops, race conditions, and stale data bugs.

```tsx
// ❌ NEVER DO THIS
function UserCard({ userId }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetchUser(userId).then(setUser); // race condition, memory leak
  }, [userId]);
}

// ✅ ALWAYS DO THIS
function UserCard({ userId }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
}
```

`useEffect` is only acceptable for truly imperative DOM side effects (measurements, third-party lib init, focus). Even then, question whether it's really needed.

### ✅ React Query for all server/async state

- Use `useQuery` for reads, `useMutation` for writes
- Query keys follow the pattern: `['resource', id]` or `['resource', 'list', filters]`
- Never use `useEffect + useState` to fetch data

### ✅ Pass IDs as props, not full objects

Components receive IDs (or keys) and load their own data via React Query.

```tsx
// ❌ NEVER — passing full objects (prop drilling, coupling, no cache benefit)
function OrderList({ orders }) {
  return orders.map(o => <OrderRow order={o} />);
}

// ✅ ALWAYS — pass IDs, each component self-loads
function OrderList({ orderIds }) {
  return orderIds.map(id => <OrderRow orderId={id} />);
}

function OrderRow({ orderId }) {
  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
  });
}
```

React Query deduplicates requests by query key — calling the same hook in many components results in only **one** network request.

### ✅ No prop drilling beyond 1 level

Data should not be passed more than one level deep. Beyond that: use a React Query hook (for server data) or a Jotai atom (for UI state).

### ✅ Small, focused components

- Each component does **one thing**
- A component file should rarely exceed ~150 lines
- Extract sub-concerns into child components aggressively

### ✅ Jotai atoms for client-only state

- Atoms live in `src/store/` — one file per domain (`uiAtoms.ts`, `filterAtoms.ts`)
- Only use Jotai for UI state: modal open/close, active tab, filter selections, optimistic UI
- Never put server data in an atom — that belongs in React Query

## Directory Structure

```
app/src/
├── components/    # Shared UI components (small, focused, self-loading)
├── pages/         # Page-level components (route entries)
├── hooks/         # Custom React Query hooks (one hook per resource)
├── store/         # Jotai atoms (client-only state)
└── lib/           # SDK clients, query client, utilities
```

## Naming Conventions

- Components: `PascalCase.tsx`
- Hooks: `use<Resource>.ts` (e.g., `useUser.ts`, `useOrders.ts`)
- Atoms: `<domain>Atoms.ts` (e.g., `uiAtoms.ts`)
- Types: `PascalCase`, co-located with usage or in `types.ts`
- API functions: `camelCase` in `lib/` (e.g., `api.getUser()`)

## Package Manager

- **npm** — always use `npm install`, `npm run dev`, etc.

## Git Workflow

- Default branch: `main` (production)
- Development branch: `develop`
- Feature branches: `feature/<slug>` off `develop`
- Commit style: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
```

#### CI/CD — GitHub Actions workflows

Write `.github/workflows/ci.yml` (both stacks — runs on every PR):
```yaml
name: CI

on:
  pull_request:
    branches: [develop, main]

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: app/package-lock.json

      - name: Install frontend deps
        run: cd app && npm ci

      - name: Type check frontend
        run: cd app && npx tsc --noEmit
```

For **Firebase stack**, add to `ci.yml` jobs:
```yaml
  lint-functions:
    name: Type Check Functions
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: functions/package-lock.json
      - run: cd functions && npm ci
      - run: cd functions && npx tsc --noEmit
```

For **Node.js + React stack**, add to `ci.yml` jobs:
```yaml
  lint-api:
    name: Type Check API
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: api/package-lock.json
      - run: cd api && npm ci
      - run: cd api && npx tsc --noEmit
```

Write `.github/workflows/deploy.yml` — deploys on push to `main`:

**Firebase stack** deploy workflow:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-hosting:
    name: Deploy Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: app/package-lock.json

      - name: Install deps
        run: cd app && npm ci

      - name: Build
        run: cd app && npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: <APP_NAME>

  deploy-functions:
    name: Deploy Functions
    runs-on: ubuntu-latest
    needs: [deploy-hosting]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: functions/package-lock.json
      - run: cd functions && npm ci
      - run: npm install -g firebase-tools
      - run: firebase deploy --only functions --project <APP_NAME>
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

**Node.js + React stack** deploy workflow:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    name: Deploy Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: app/package-lock.json

      - name: Install deps
        run: cd app && npm ci

      - name: Build
        run: cd app && npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: <APP_NAME>

  # Firebase App Hosting deploys the API automatically on push to main
  # (configured when you ran: firebase apphosting:backends:create)
  # No manual deploy step needed for the API.
```

Add the following secrets to the GitHub repo (Settings → Secrets → Actions):
- **Both stacks:** `FIREBASE_SERVICE_ACCOUNT` (download from Firebase Console → Project Settings → Service accounts → Generate new private key)
- **Firebase stack only:** `FIREBASE_TOKEN` (run `firebase login:ci` to get it), plus all `VITE_FIREBASE_*` secrets
- **Node.js stack only:** `VITE_API_URL` (the Firebase App Hosting URL for the API)

### 4c: Install dependencies

Run npm install in each package directory:

```bash
cd app && npm install
```

For Firebase:
```bash
cd ../functions && npm install
```

For Node.js + React:
```bash
cd ../api && npm install
```

Note: `npm install` for `api/` also runs `npx prisma generate` automatically (since it's a postinstall hook in Prisma). If not, run `npm run db:generate` manually after install.

**Pause** — show install summary and ask "Dependencies installed. Ready to initialize git and create the GitHub repo?"

Use `AskUserQuestion`:
- Options: "Yes, continue" / "No, stop here"

---

## Phase 5: Git Init + GitHub

### 5a: Visibility

Use `AskUserQuestion`:
- Header: "GitHub visibility"
- Question: "Should the GitHub repository be private or public?"
- Options: "Private" / "Public"

### 5b: Initialize git

```bash
git init
git checkout -b develop
git add .
git commit -m "chore: initial project scaffold"
```

### 5c: Create GitHub repo and push

```bash
gh repo create <APP_NAME> --<private|public> --source=. --remote=origin --push
```

Print the repo URL after success.

**Pause** — "Git initialized on `develop`, GitHub repo created and pushed. Ready to generate the agent team?"

Use `AskUserQuestion`:
- Options: "Yes, generate agents" / "No, stop here"

---

## Phase 6: Generate Agent Team

Invoke the `create-agents` skill logic directly (do not launch a subprocess — execute the agent generation steps inline):

Since we already know the stack from Phase 2, pre-fill the architecture answers:
- **Firebase stack** → Architecture: "Firebase", Database: "Firestore", Repo: "Monorepo", UI: "shadcn/ui"
- **Node.js + React** → Architecture: "API + Generated Client", Database: "Prisma + PostgreSQL", Repo: "Monorepo", UI: "shadcn/ui". Frontend deploys to Firebase Hosting, API deploys to Firebase App Hosting (`apphosting.yaml` in `api/`)
- Auth: use the `AUTH_PROVIDER` from Phase 3
- Multi-tenant: use `MULTI_TENANT` from Phase 3
- Agent roles: "Full team"

Generate these agent files in `.claude/agents/`:

| File | Role | Model |
|---|---|---|
| `project-manager.md` | Project Manager | Opus |
| `frontend-engineer.md` | Frontend Engineer | Sonnet |
| `backend-engineer.md` | Backend Engineer | Sonnet |
| `database-engineer.md` | Database Engineer | Opus |
| `devops.md` | DevOps | Sonnet |
| `cicd.md` | CI/CD Engineer | Sonnet |
| `code-reviewer.md` | Code Reviewer | Opus |
| `ROUTER.md` | Routing guide | — |

Each agent file must follow the template from `create-agents`. Key requirements:

**Frontend Engineer** must prominently include:
- The useEffect rule (with code examples showing ❌ and ✅)
- ID-based props rule
- No prop drilling rule
- Jotai atoms for client state only

**Code Reviewer** must treat the following as hard-block issues (will reject PRs):
- Any `useEffect` used for data fetching
- Props drilled more than 1 level
- Full objects passed as props instead of IDs
- Hardcoded secrets or credentials
- Unbounded Firestore queries (Firebase) or missing WHERE clauses in queries (Node.js)

**Backend Engineer** must include these rules:
- Always validate all inputs with Zod at the route/function boundary — never trust incoming data
- Always check authorization before any data read or write — never assume the caller is allowed
- Keep route handlers thin — business logic goes in a `services/` layer, not inline in handlers
- Never expose raw database errors or stack traces to clients — catch and return safe error messages
- Never hardcode secrets, connection strings, or API keys — always read from environment variables
- Use explicit TypeScript return types on all route handlers and service functions
- Every endpoint that modifies data must be idempotent or handle duplicate requests safely

**Database Engineer** must include these rules and behaviors:

**Before making ANY schema change, always:**
1. Describe exactly what will change and why
2. Show the migration/rule diff to the user
3. Call `AskUserQuestion` to ask: "Should I apply this change?" — options: "Yes, apply" / "No, adjust first"
4. Only proceed after explicit approval

**Hard rules:**
- Never run `prisma migrate dev` without user approval
- Never modify `firestore.rules` without showing the full before/after diff first
- Never drop a column, rename a field, or change a type without explicitly labeling it as a **destructive/breaking change** in the approval prompt
- For destructive changes, require the user to confirm with a second question: "This change is irreversible. Confirm?"
- Never delete indexes or collections
- Firebase stack: always use region `eur3` for Firestore, `europe-west1` for Functions
- Node.js stack: every migration must have a rollback path documented in the commit message

**CI/CD Engineer (Sonnet)** must include:
- File scope: `.github/workflows/`
- Responsibilities: GitHub Actions workflows for CI (type check, lint on PRs) and CD (deploy on push to `main`)
- Firebase stack: deploys hosting + functions on push to `main`; uses `FirebaseExtended/action-hosting-deploy` for hosting and `firebase deploy --only functions` for functions
- Node.js + React stack: deploys frontend to Firebase Hosting; Firebase App Hosting redeploys API automatically on push (no manual step)
- Never touches application code — only `.github/workflows/` files
- Before changing any workflow: describe the change and confirm with the user (same rule as Database Engineer)
- Hard rules:
  - Never store secrets in workflow files — always use `${{ secrets.SECRET_NAME }}`
  - Always run CI checks (`ci.yml`) on PRs to `develop` AND `main`
  - Deploy workflow only triggers on push to `main`
  - Never skip type checking in CI

**ROUTER.md** must include:
- Agent table with model and domain
- When to use each agent
- File ownership table (with actual project paths)
- Escalation paths

**Pause** — "Agent team generated. Ready to write the newfeature skill?"

Use `AskUserQuestion`:
- Options: "Yes, write it" / "No, stop here"

---

## Phase 7: Write `newfeature` Skill

Write the following content verbatim to `.claude/skills/newfeature/SKILL.md`:

````markdown
---
name: newfeature
description: Build a new feature end-to-end. Asks what to build, loads project context, routes to the Project Manager (Opus) for planning, validates with user, creates a feature branch from develop, orchestrates specialist agents, and runs a code review when done.
argument-hint: "[optional: brief feature description]"
---

# New Feature Skill

Guides the development of a new feature from idea to committed code. The Project Manager (Opus) creates the plan; specialist agents (Frontend, Backend, DB, DevOps) execute it in dependency order; the Code Reviewer validates at the end.

Execution mode: **pause at each phase boundary** — user must approve before moving to the next phase.

---

## Phase 1: Feature Description

Use `AskUserQuestion` with three questions:

**Question 1:**
- Header: "Feature"
- Question: "What feature do you want to build?"
- Options: *(user types via Other)*

**Question 2:**
- Header: "Priority"
- Question: "What is the priority of this feature?"
- Options: "Urgent" / "High" / "Normal" / "Low"

**Question 3:**
- Header: "DB changes"
- Question: "Does this feature require database schema changes?"
- Options: "Yes" / "No" / "Unsure"

Store: `FEATURE_DESC`, `PRIORITY`, `DB_CHANGES`.

---

## Phase 2: Load Project Context

Read the following files to understand the project:

1. `CLAUDE.md` — project conventions, stack, rules
2. `.claude/agents/ROUTER.md` — agent team overview and file ownership
3. `.claude/agents/project-manager.md` — PM's role and escalation rules
4. `.claude/agents/frontend-engineer.md` — frontend patterns and rules
5. `.claude/agents/backend-engineer.md` — backend patterns and rules
6. `.claude/agents/database-engineer.md` — DB patterns (if `DB_CHANGES` is Yes or Unsure)
7. `.claude/agents/devops.md` — deployment config (if relevant)

---

## Phase 3: PM Creates Plan

Invoke the **Project Manager agent** (`project-manager.md`) with the following prompt:

> You are the Project Manager for this project. A new feature has been requested:
>
> **Feature:** `<FEATURE_DESC>`
> **Priority:** `<PRIORITY>`
> **DB schema changes needed:** `<DB_CHANGES>`
>
> Please produce a detailed implementation plan with:
> 1. Feature summary (2–3 sentences)
> 2. Files and areas affected (grouped by domain)
> 3. Task breakdown by domain (frontend / backend / DB / DevOps) in dependency order
> 4. Risks and dependencies
> 5. Suggested git branch name: `feature/<slug>` (slug is 2–4 kebab-case words)
>
> Do NOT write any code. Only plan.

Present the PM's plan clearly in a structured format.

**Pause** — "Here is the Project Manager's plan. Does this look right?"

Use `AskUserQuestion`:
- Header: "Plan validation"
- Question: "Does this plan look right?"
- Options:
  - "Yes, proceed" — "Continue to branch creation and execution"
  - "Adjust scope" — "Go back to PM with feedback"
  - "Cancel" — "Abort the feature"

If "Adjust scope": ask the user for their feedback, send it back to the PM for a revised plan, then present again.
If "Cancel": print "Feature cancelled." and stop.

Store the `BRANCH_NAME` from the PM's plan (e.g., `feature/add-auth`).

---

## Phase 4: Create Git Branch

Run:
```bash
git checkout develop
git pull origin develop
git checkout -b <BRANCH_NAME>
```

Confirm: "Branch `<BRANCH_NAME>` created from `develop`."

---

## Phase 5: DB Phase (if needed)

**Only run this phase if `DB_CHANGES` is "Yes" or "Unsure".**

Invoke the **Database Engineer agent** with the relevant task from the PM's plan.

The Database Engineer **must**:
1. **Plan first** — describe exactly what schema changes are needed and why, without touching any files yet
2. **Show the diff** — present the proposed migration SQL / Prisma schema change / Firestore rules change to the user
3. **Ask for approval** — use `AskUserQuestion` before applying anything:
   - Header: "DB change approval"
   - Question: "Apply this database change?"
   - Options: "Yes, apply" / "No, adjust first" / "Cancel"
4. For **destructive changes** (dropping columns, renaming fields, changing types, removing indexes): add a second confirmation question explicitly labeling it as irreversible
5. Only after approval: apply the change, run the migration, and commit:
   `git add . && git commit -m "feat(db): <description>"`

**Pause** — "Database phase complete. Review the DB changes above."

Use `AskUserQuestion`:
- Options: "Looks good, continue to backend" / "Redo DB phase" / "Cancel feature"

---

## Phase 6: Backend Phase

Invoke the **Backend Engineer agent** with the relevant task from the PM's plan.

The Backend Engineer should:
- Implement API endpoints / Firebase Functions as specified
- Validate inputs with Zod
- Check authorization on every endpoint
- Commit with: `git add . && git commit -m "feat(backend): <description>"`

**Pause** — "Backend phase complete. Review the backend changes above."

Use `AskUserQuestion`:
- Options: "Looks good, continue to frontend" / "Redo backend phase" / "Cancel feature"

---

## Phase 7: Frontend Phase

Invoke the **Frontend Engineer agent** with the relevant task from the PM's plan.

The Frontend Engineer must follow all rules from `CLAUDE.md` without exception:
- React Query for all data fetching — **no useEffect for data**
- Components accept IDs as props, not full objects
- No prop drilling beyond 1 level
- Small components (~150 lines max, single responsibility)
- Jotai atoms for any UI state (modal open/close, filters, active tab)

Commit with: `git add . && git commit -m "feat(frontend): <description>"`

**Pause** — "Frontend phase complete. Review the frontend changes above."

Use `AskUserQuestion`:
- Options: "Looks good, continue to review" / "Redo frontend phase" / "Cancel feature"

---

## Phase 8: DevOps Phase (if needed)

**Only run this phase if the PM's plan includes deployment config changes.**

Invoke the **DevOps agent** with the relevant task.

Commit with: `git add . && git commit -m "chore(devops): <description>"`

**Pause** — "DevOps phase complete."

Use `AskUserQuestion`:
- Options: "Looks good, continue to review" / "Redo DevOps phase" / "Cancel feature"

---

## Phase 9: Code Review

Invoke the **Code Reviewer agent** with the following prompt:

> Review all changes made on branch `<BRANCH_NAME>` for the feature: `<FEATURE_DESC>`.
>
> Run `git diff develop...<BRANCH_NAME>` to see all changes.
>
> **Hard block issues (must fix before this feature can merge):**
> - Any `useEffect` used for data fetching (must use React Query instead)
> - Props drilled more than 1 level deep (must use hooks or atoms)
> - Full objects passed as props instead of IDs
> - Hardcoded secrets, credentials, or API keys
> - Missing input validation on backend endpoints
> - Missing authorization checks on backend endpoints
> - Unbounded Firestore queries / SQL queries without WHERE clauses
>
> **Format your review as:**
> 1. Overall assessment (APPROVED / CHANGES REQUESTED)
> 2. Hard block issues (if any) — must be fixed
> 3. Warnings — should be fixed
> 4. Notes — optional improvements
>
> If CHANGES REQUESTED: list exactly what needs to change and which agent should fix it.

If the reviewer requests changes:
- Route the fix to the appropriate specialist agent
- After fixes are committed, run the Code Reviewer again
- Repeat until APPROVED

**Pause** — "Code review complete."

Use `AskUserQuestion`:
- Options: "Merge to develop" / "Keep working on the branch"

---

## Phase 10: Summary

Print a summary:

```
✅ Feature complete: <FEATURE_DESC>

Branch: <BRANCH_NAME>
Commits:
  [list commits made during this session with git log --oneline develop..<BRANCH_NAME>]

Next steps:
  1. Review the diff: git diff develop...<BRANCH_NAME>
  2. Merge when ready: git checkout develop && git merge --no-ff <BRANCH_NAME>
  3. Push: git push origin develop
  4. Delete branch: git branch -d <BRANCH_NAME>
```

Run `push-status done "<project>" "Feature <FEATURE_DESC> complete on <BRANCH_NAME>"` to notify the agent dashboard.
````

---

## Phase 8: Final Summary

Print a full summary of everything that was created:

```
✅ Project initialized: <APP_NAME>

Stack: <Firebase OR Node.js + React>
Auth: <AUTH_PROVIDER>
Multi-tenant: <MULTI_TENANT>

Files created:
  app/                    Vite + React frontend
  <functions/ OR api/>    <Firebase Functions OR Express API>
  CLAUDE.md               Project conventions
  .gitignore
  <firebase.json + .firebaserc + firestore.rules   (Firebase only)>
  <api/prisma/schema.prisma                        (Node.js only)>

Agents generated:
  .claude/agents/ROUTER.md
  .claude/agents/project-manager.md
  .claude/agents/frontend-engineer.md
  .claude/agents/backend-engineer.md
  .claude/agents/database-engineer.md
  .claude/agents/devops.md
  .claude/agents/code-reviewer.md

Skill written:
  .claude/skills/newfeature/SKILL.md

Git:
  Branch: develop
  GitHub: <repo URL>

Next steps:
  1. <Firebase only> Add Firebase config to app/.env (copy from app/.env.example)
     Then: firebase login && firebase use <APP_NAME>
  2. <Node.js only> Set DATABASE_URL in api/.env, then: cd api && npm run db:migrate
  3. Start dev: cd app && npm run dev
  4. Build features: /newfeature
```

Run `push-status done "<APP_NAME>" "Project scaffold complete — stack: <stack>, agents + newfeature skill ready"`.

---

## Important Notes

- **npm only** — always use `npm install`, never yarn or pnpm
- **Firebase regions** — always `europe-west1` for Functions, `eur3` for Firestore
- **TailwindCSS v4** — uses `@import "tailwindcss"` in CSS (not the v3 config file approach)
- **shadcn/ui** — components are self-contained (no Radix peer dependency required)
- **useEffect rule** — prominently embedded in `CLAUDE.md`, Frontend Engineer agent, and Code Reviewer agent
- **create-agents consistency** — the agent files generated in Phase 6 must be consistent with the `create-agents` skill's output format (model assignments, template structure, ROUTER.md format)
- **Phase pauses** — always pause between phases and get user approval before continuing
