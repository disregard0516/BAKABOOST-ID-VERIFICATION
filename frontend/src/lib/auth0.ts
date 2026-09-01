import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  authorizationParameters: {
    audience: "https://api.bakaboost.com/admin",
    scope: "openid profile email",
  },
});