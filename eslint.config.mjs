import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const nextBaseConfig = nextVitals.find((config) => config.name === "next");
const reactRuleOverrides = Object.fromEntries(
  Object.keys(nextBaseConfig?.rules ?? {})
    .filter((ruleName) => ruleName.startsWith("react/"))
    .map((ruleName) => [ruleName, "off"]),
);

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      ...reactRuleOverrides,
      "react-hooks/immutability": "off",
    },
  },
]);
