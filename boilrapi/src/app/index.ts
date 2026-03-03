import { Type } from "@sinclair/typebox";
import { Request } from "express";
import BoilrApi from "../api";
import { Config, JWTPayload } from "../types";
import { UserRoutes } from "./user";
import { JWTService } from "../utils/jwt";

type handlerProps = {
  req?: Request;
  query?: {
    [key: string]: unknown; // Allows dynamic keys with any value type
  };
  body?: {
    [key: string]: unknown; // Allows dynamic keys with any value type
  };
  params?: {
    [key: string]: unknown; // Allows dynamic keys with any value type
  };
  user?: JWTPayload;
};

export default (config: Config) => {
  // create api endpoint
  const api = new BoilrApi(config);

  // Initialize JWT service
  const jwtConfig = {
    secret: config.api.jwt?.secret || "default-secret",
    expiresIn: config.api.jwt?.expiresIn || "1h",
  };
  const jwtService = new JWTService(jwtConfig);

  // Add user routes
  const userRoutes = new UserRoutes(jwtService);
  userRoutes.getRoutes().forEach((route) => {
    api.addEndpoint(route);
  });

  // Add test endpoints
  api.addEndpoint({
    path: "/test",
    method: "get",
    input: {
      query: Type.Object({ key: Type.String() }),
    },

    handler: async ({ query }: handlerProps) => {
      return { test: "test", query };
    },
  });

  api.addEndpoint({
    path: "/test",
    method: "post",
    input: {
      body: Type.Object({ key: Type.String() }),
    },

    handler: async ({ body }: handlerProps) => {
      return { test: "test", body };
    },
  });

  api.addEndpoint({
    path: "/testLogin",
    method: "get",
    auth: {
      required: true,
    },
    handler: async ({ user }: handlerProps) => {
      return { test: "test", user };
    },
  });

  api.addEndpoint({
    path: "/testLoginAdmin",
    method: "get",
    auth: {
      required: true,
      roles: ["admin"],
    },
    handler: async ({ user }: handlerProps) => {
      return { test: "test", user };
    },
  });

  return api;
};
