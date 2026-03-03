/* eslint-disable @typescript-eslint/no-explicit-any */
import { JavaScriptTypeBuilder } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Request, Response } from "express";
import { UserType } from "./user";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends UserType {}
  }
}

export interface JWTPayload {
  sub: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  roles?: string[];
  [key: string]: unknown;
}

export type Route = {
  method: "get" | "post" | "put" | "delete" | "patch";
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

export type Input = {
  body?: JavaScriptTypeBuilder.TObject;
  query?: JavaScriptTypeBuilder.TObject;
  params?: JavaScriptTypeBuilder.TObject;
  auth?: JavaScriptTypeBuilder.TObject;
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
