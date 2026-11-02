import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  }),
  emailAndPassword: { enabled: true },
  plugins: [admin()],
});
