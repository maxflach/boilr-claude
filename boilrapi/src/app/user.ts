import { Route } from "../types";
import passport from "passport";
import { Strategy as GitHubStrategy, Profile } from "passport-github2";
import { JWTService } from "../utils/jwt";
import { prisma } from "../services/prisma";
import { UserType } from "../types/user";
import { Prisma } from "@prisma/client";

declare module "express-serve-static-core" {
  // No need to redeclare the User interface as it is equivalent to its supertype
}

export class UserRoutes {
  private jwtService: JWTService;

  constructor(jwtService: JWTService) {
    this.jwtService = jwtService;
    this.setupPassport();
  }

  private async authCheck(provider: string, providerId: string) {
    const auth = await prisma.auth.findUnique({
      where: {
        provider_providerId: { provider, providerId },
      },
      select: { userId: true },
    });
    return auth?.userId || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async validateOAuth(profile: Profile, provider: string, done: any) {
    try {
      // Check if user exists
      const existingUserId = await this.authCheck(provider, profile.id);

      if (existingUserId) {
        // User exists, fetch user data
        const existingUser = await prisma.user.findUnique({
          where: { id: existingUserId },
          include: {
            auth: true,
          },
        });

        if (!existingUser) {
          return done(new Error("User not found"));
        }

        const userObj: Express.User = {
          ...existingUser,
          auth: existingUser.auth || undefined, // Ensure auth is undefined if null
        };
        return done(null, userObj);
      } else {
        // Create new user if doesn't exist
        const userData: Prisma.UserCreateInput = {
          email: profile.emails?.[0]?.value || "no-email@example.com",
          name: profile.displayName || profile.username || null,
          isAdmin: false,
          auth: {
            create: {
              provider: provider,
              providerId: profile.id,
              avatar: profile.photos?.[0]?.value || null,
              hash: null,
            },
          },
        };

        const user = await prisma.user.create({
          data: userData,
          include: {
            auth: true,
          },
        });
        const userObj: Express.User = {
          ...user,
          auth: user.auth || undefined, // Ensure auth is undefined if null
        };
        return done(null, userObj);
      }
    } catch (error) {
      return done(error as Error);
    }
  }

  private setupPassport() {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          callbackURL: "/api/auth/github/callback",
        },
        async (
          accessToken: string,
          refreshToken: string,
          profile: Profile,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          done: (error: any, user?: Express.User) => void
        ) => {
          this.validateOAuth(profile, "github", done);
        }
      )
    );

    passport.serializeUser((user: Express.User, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id },
          include: {
            auth: true,
          },
        });

        if (!user) {
          return done(new Error("User not found"));
        }

        const userObj: UserType = {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          auth: user.auth
            ? {
                id: user.auth.id,
                provider: user.auth.provider,
                providerId: user.auth.providerId,
                avatar: user.auth.avatar,
                hash: user.auth.hash,
              }
            : undefined,
        };

        done(null, userObj);
      } catch (error) {
        done(error as Error);
      }
    });
  }

  getRoutes(): Route[] {
    return [
      {
        method: "get",
        path: "/auth/github",
        handler: (context) => {
          return new Promise((resolve, reject) => {
            passport.authenticate("github", { scope: ["user:email"] })(
              context.req,
              context.res,
              (err: Error | null) => {
                if (err) reject(err);
                else resolve({});
              }
            );
          });
        },
      },
      {
        method: "get",
        path: "/auth/github/callback",
        handler: (context) => {
          return new Promise((resolve, reject) => {
            passport.authenticate(
              "github",
              { session: false },
              (err: Error | null, user?: Express.User) => {
                if (err) {
                  reject(err);
                  return;
                }

                if (!user) {
                  reject(new Error("Authentication failed"));
                  return;
                }

                const token = this.jwtService.generateToken({
                  sub: user.id,
                  email: user.email,
                  name: user.name,
                  isAdmin: user.isAdmin,
                });

                resolve({ token });
              }
            )(context.req, context.res, () => {});
          });
        },
      },
      {
        method: "get",
        path: "/auth/me",
        auth: {
          required: true,
        },
        handler: async ({ user }) => {
          if (!user) {
            throw new Error("User not found");
          }

          const dbUser = await prisma.user.findUnique({
            where: { id: user.sub },
            include: {
              auth: true,
            },
          });

          if (!dbUser) {
            throw new Error("User not found");
          }

          const userObj: UserType = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            isAdmin: dbUser.isAdmin,
            auth: dbUser.auth
              ? {
                  id: dbUser.auth.id,
                  provider: dbUser.auth.provider,
                  providerId: dbUser.auth.providerId,
                  avatar: dbUser.auth.avatar,
                  hash: dbUser.auth.hash,
                }
              : undefined,
          };

          return { user: userObj };
        },
      },
    ];
  }
}
