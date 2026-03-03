import jwt from "jsonwebtoken";
import { JWTConfig, JWTPayload } from "../types";

export class JWTService {
  private config: JWTConfig;

  constructor(config: JWTConfig) {
    this.config = config;
  }

  generateToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
    return jwt.sign(
      payload,
      this.config.secret as jwt.Secret,
      {
        expiresIn: this.config.expiresIn,
      } as jwt.SignOptions
    );
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.config.secret as jwt.Secret) as JWTPayload;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  extractTokenFromHeader(header: string): string {
    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
      throw new Error("Invalid authorization header");
    }
    return token;
  }
}
