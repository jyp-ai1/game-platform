import type { Page } from "@playwright/test";

export type ConsoleIssue = { type: string; text: string };

export function attachConsoleMonitor(page: Page) {
  const errors: ConsoleIssue[] = [];
  const network500: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push({ type: "console.error", text: msg.text() });
    }
  });

  page.on("pageerror", (err) => {
    errors.push({ type: "pageerror", text: err.message });
  });

  page.on("response", (res) => {
    if (res.status() >= 500) {
      network500.push(`${res.status()} ${res.url()}`);
    }
  });

  return {
    getErrors: () => errors,
    getNetwork500: () => network500,
    assertClean: () => {
      const filtered = errors.filter(
        (e) =>
          !e.text.includes("Failed to load resource") &&
          !e.text.includes("favicon") &&
          !e.text.includes("hydration") &&
          !e.text.includes("connect timeout") &&
          !e.text.includes("[ENTRY]") &&
          e.text.trim() !== "Error"
      );
      if (filtered.length) {
        throw new Error(
          `Console errors: ${filtered.map((e) => e.text).join(" | ")}`
        );
      }
      if (network500.length) {
        throw new Error(`Network 500: ${network500.join(" | ")}`);
      }
    },
  };
}
