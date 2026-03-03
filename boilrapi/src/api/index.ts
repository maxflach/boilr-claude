/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response, Express } from "express";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import cors from "cors";
import { Config, Route, JWTPayload } from "../types";
import pino from "pino";
import { JWTService } from "../utils/jwt";
import swaggerUi from "swagger-ui-express";

class ValidationError extends Error {
  details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
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
    this.limit = config.api.limit || "50mb";
    if (config.api.jwt) {
      this.jwtService = new JWTService(config.api.jwt);
    }
  }

  addEndpoint = (routeObj: Route): void => {
    // generate type compiler from typebox
    const { input } = routeObj;
    const validators: {
      query?: ReturnType<typeof TypeCompiler.Compile>;
      body?: ReturnType<typeof TypeCompiler.Compile>;
      params?: ReturnType<typeof TypeCompiler.Compile>;
    } = {};
    if (input && input.query) {
      validators.query = TypeCompiler.Compile(input.query);
    }
    if (input && input.body) {
      validators.body = TypeCompiler.Compile(input.body);
    }
    if (input && input.params) {
      validators.params = TypeCompiler.Compile(input.params);
    }

    this.endpoints.push({ ...routeObj, validators });
  };

  generateOpenApiDefinition = () => {
    const paths: Record<string, any> = {};

    this.endpoints.forEach((route) => {
      const { method, path, input, auth } = route;

      // Convert path parameters to OpenAPI format
      const openApiPath = path.replace(/:([^/]+)/g, "{$1}");

      if (!paths[openApiPath]) {
        paths[openApiPath] = {};
      }

      const operation: any = {
        summary: `${method.toUpperCase()} ${path}`,
        operationId: `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
        tags: ["API"],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "Response data",
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    details: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          "401": {
            description: "Authentication error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      };

      // Add security if auth is required
      if (auth?.required) {
        operation.security = [{ bearerAuth: [] }];
      }

      // Add parameters from input
      const parameters: any[] = [];

      if (input?.params) {
        const paramProperties = input.params.properties || {};
        Object.entries(paramProperties).forEach(
          ([name, schema]: [string, any]) => {
            parameters.push({
              name,
              in: "path",
              required: input.params.required?.includes(name) || false,
              schema: this.convertTypeBoxToOpenApi(schema),
            });
          }
        );
      }

      if (input?.query) {
        const queryProperties = input.query.properties || {};
        Object.entries(queryProperties).forEach(
          ([name, schema]: [string, any]) => {
            parameters.push({
              name,
              in: "query",
              required: input.query.required?.includes(name) || false,
              schema: this.convertTypeBoxToOpenApi(schema),
            });
          }
        );
      }

      if (parameters.length > 0) {
        operation.parameters = parameters;
      }

      // Add request body if needed
      if (input?.body) {
        operation.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: this.convertTypeBoxToOpenApi(input.body),
            },
          },
        };
      }

      paths[openApiPath][method] = operation;
    });

    return {
      openapi: "3.0.0",
      info: {
        title: "Boilr API",
        version: "1.0.0",
        description: "API generated from Boilr routes",
      },
      servers: [
        {
          url: "/api",
          description: "API server",
        },
      ],
      paths,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    };
  };

  private convertTypeBoxToOpenApi(schema: any): any {
    if (!schema) return { type: "object" };

    // Handle basic types
    if (schema.type === "string") {
      return { type: "string" };
    }

    if (schema.type === "number") {
      return { type: "number" };
    }

    if (schema.type === "integer") {
      return { type: "integer" };
    }

    if (schema.type === "boolean") {
      return { type: "boolean" };
    }

    if (schema.type === "array") {
      return {
        type: "array",
        items: this.convertTypeBoxToOpenApi(schema.items),
      };
    }

    if (schema.type === "object") {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      if (schema.properties) {
        Object.entries(schema.properties).forEach(
          ([key, value]: [string, any]) => {
            properties[key] = this.convertTypeBoxToOpenApi(value);
          }
        );
      }

      if (schema.required) {
        required.push(...schema.required);
      }

      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    // Default fallback
    return { type: "object" };
  }

  private validateAuth(route: Route, req: Request): JWTPayload | undefined {
    // If no auth config, no authentication needed
    if (!route.auth) {
      return undefined;
    }

    // If auth is not required and not optional, no authentication needed
    if (!route.auth.required && !route.auth.optional) {
      return undefined;
    }

    // If no JWT service configured and auth is required, throw error
    if (!this.jwtService && route.auth.required) {
      throw new AuthError("JWT service not configured");
    }

    const authHeader = req.headers.authorization;

    // If no auth header and auth is required, throw error
    if (!authHeader && route.auth.required) {
      throw new AuthError("No authorization header");
    }

    // If no auth header and auth is optional, return undefined
    if (!authHeader && route.auth.optional) {
      return undefined;
    }

    // If we have an auth header, try to validate it
    if (authHeader) {
      const token = this.jwtService!.extractTokenFromHeader(authHeader);
      const payload = this.jwtService!.verifyToken(token);

      // If roles are specified, check them
      if (route.auth.roles && route.auth.roles.length > 0) {
        const hasRequiredRole = route.auth.roles.some((role) =>
          payload.roles?.includes(role)
        );
        if (!hasRequiredRole) {
          throw new AuthError("Insufficient permissions");
        }
      }

      return payload;
    }

    return undefined;
  }

  express() {
    const app: Express = express();
    app.use(
      cors({
        origin: this.cors_origin,
        methods: "GET,OPTIONS,PUT,PATCH,POST,DELETE",
        allowedHeaders:
          "Accept,Accept-Encoding,Content-Length,Content-Type,Host,Origin,Authorization",
        exposedHeaders: "Content-Length,Content-Type,Content-Disposition",
        credentials: true,
      })
    );
    app.use(express.json({ limit: this.limit }));
    app.use(express.urlencoded({ limit: this.limit, extended: true }));

    // Add OpenAPI documentation endpoints
    const openApiSpec = this.generateOpenApiDefinition();
    app.get("/openapi.json", (req: Request, res: Response) => {
      res.json(openApiSpec);
    });

    // Add Swagger UI endpoint
    app.use(
      "/doc",
      swaggerUi.serve,
      swaggerUi.setup(openApiSpec, {
        explorer: true,
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Boilr API Documentation",
      })
    );

    this.endpoints.forEach((route) => {
      const { method, path, handler, middleware = [] } = route;
      pino().info(`Adding route: ${method.toUpperCase()} ${path}`);

      // Create route handler array with middleware
      const handlers = [
        ...middleware,
        async (req: Request, res: Response) => {
          try {
            // Validate input if defined use TypeCompiler from typebox to validate input.query
            const { validators } = route;
            if (validators) {
              if (validators.query) {
                const queryValidationResult = validators.query.Check(req.query);
                if (!queryValidationResult) {
                  throw new ValidationError("Invalid query", [
                    ...validators.query.Errors(req.query),
                  ]);
                }
              }
              if (validators.body) {
                const bodyValidationResult = validators.body.Check(req.body);
                if (!bodyValidationResult) {
                  throw new ValidationError("Invalid body", [
                    ...validators.body.Errors(req.body),
                  ]);
                }
              }
              if (validators.params) {
                const paramsValidationResult = validators.params.Check(
                  req.params
                );
                if (!paramsValidationResult) {
                  throw new ValidationError("Invalid params", [
                    ...validators.params.Errors(req.params),
                  ]);
                }
              }
            }

            // Validate authentication if required
            const user = this.validateAuth(route, req);

            const result = await handler({
              req,
              res,
              query: req.query,
              body: req.body,
              params: req.params,
              user,
            });

            // Only send response if not already sent (e.g., by streaming)
            if (!res.headersSent) {
              res.status(200).json(result);
            }
          } catch (error) {
            if (error instanceof ValidationError) {
              res
                .status(400)
                .json({ error: error.message, details: error.details });
            } else if (error instanceof AuthError) {
              res.status(401).json({ error: error.message });
            } else {
              res.status(500).json({ error: "Internal Server Error" });
            }
          }
        },
      ];

      app[method](path, ...handlers);
    });

    return app;
  }
}
