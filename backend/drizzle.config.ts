import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.js", // Path to your Drizzle schema file
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Your postgres connection string
  },
});
