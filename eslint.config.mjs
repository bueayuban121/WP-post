import nextPlugin from "eslint-config-next";

const config = [
  ...nextPlugin,
  {
    ignores: [".next/**", "node_modules/**", "src/generated/prisma/**"]
  }
];

export default config;
