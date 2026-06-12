import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	out: "./drizzle",
	schema: "./src/shared/db/schema.ts",
	casing: "snake_case",
});
