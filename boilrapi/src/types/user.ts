/* eslint-disable @typescript-eslint/no-namespace */

export type AuthType = {
  id: string;
  provider: string;
  providerId: string;
  avatar: string | null;
  hash: string | null;
};

export type UserType = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  auth?: AuthType;
};

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends UserType {}
  }
}
