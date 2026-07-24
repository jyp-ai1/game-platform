/** @typedef {import('../lib/types.mjs').GameManifest} GameManifest */

/**
 * @param {GameManifest} m
 */
export function scaffoldPackageJson(m) {
  return JSON.stringify(
    {
      name: m.packageName,
      version: "0.0.0",
      private: true,
      main: "./src/index.ts",
      types: "./src/index.ts",
      scripts: { typecheck: "tsc --noEmit" },
      dependencies: {
        "@game-platform/game-sdk": "*",
        "@game-platform/ui": "*",
      },
      peerDependencies: { react: "^19" },
      devDependencies: { "@types/react": "^19", typescript: "^5" },
    },
    null,
    2
  );
}

/**
 * @param {GameManifest} m
 */
export function scaffoldTsConfig() {
  return JSON.stringify(
    {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        lib: ["dom", "dom.iterable", "esnext"],
        jsx: "react-jsx",
      },
      include: ["src"],
    },
    null,
    2
  );
}

/**
 * @param {GameManifest} m
 */
export function scaffoldIndex(m) {
  const base = m.componentExport.replace(/Game$/, "");
  return `export { ${m.componentExport} } from "./${base}";\n`;
}

/**
 * @param {GameManifest} m
 */
export function scaffoldComponent(m) {
  const engineName = m.componentExport.replace(/Game$/, "");
  return `"use client";

import { useGameSDK } from "@game-platform/game-sdk";
import { Button, GameOverOverlay, ScoreBox } from "@game-platform/ui";
import { useReducer } from "react";

import { createInitialState, type ${engineName}State } from "./engine";

const GAME_SLUG = "${m.slug}";

type Action = { type: "restart" };

function reducer(state: ${engineName}State, action: Action): ${engineName}State {
  if (action.type === "restart") return createInitialState();
  return state;
}

export function ${m.componentExport}() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const { reportScore } = useGameSDK();

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <ScoreBox score={state.score} label="점수" />
      <p className="text-sm text-muted-foreground">${m.title} — scaffold (implement engine.ts)</p>
      {state.status === "over" ? (
        <GameOverOverlay
          score={state.score}
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : (
        <Button type="button" onClick={() => reportScore(GAME_SLUG, state.score)}>
          End round (dev)
        </Button>
      )}
    </div>
  );
}
`;
}

/**
 * @param {GameManifest} m
 */
export function scaffoldEngine(m) {
  const engineName = m.componentExport.replace(/Game$/, "");
  return `export type ${engineName}State = {
  score: number;
  status: "playing" | "over";
};

export function createInitialState(): ${engineName}State {
  return { score: 0, status: "playing" };
}
`;
}

/**
 * @param {GameManifest} m
 * @returns {Record<string, string>}
 */
export function scaffoldFiles(m) {
  const base = m.componentExport.replace(/Game$/, "");
  return {
    "package.json": scaffoldPackageJson(m),
    "tsconfig.json": scaffoldTsConfig(m),
    "src/index.ts": scaffoldIndex(m),
    [`src/${base}.tsx`]: scaffoldComponent(m),
    "src/engine.ts": scaffoldEngine(m),
  };
}
