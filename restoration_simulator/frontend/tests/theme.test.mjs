import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useTheme } from "../src/theme.js";
import { clientDefaults } from "../src/contracts.js";

function probe(storage) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  function Appearance() {
    const [preference, , warning] = useTheme();
    return React.createElement("p", null, `${preference}|${warning}`);
  }
  try {
    return renderToStaticMarkup(React.createElement(Appearance));
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
}

test("a missing preference intentionally uses the configured theme", () => {
  assert.equal(
    probe({ getItem: () => null }),
    `<p>${clientDefaults().theme}|</p>`,
  );
});

test("an invalid saved preference produces a visible warning", () => {
  assert.match(
    probe({ getItem: () => "unsupported" }),
    /saved theme is invalid/,
  );
});

test("unavailable browser storage produces a visible warning", () => {
  assert.match(
    probe({
      getItem: () => {
        throw new Error("Storage blocked");
      },
    }),
    /Theme storage is unavailable.*Storage blocked/,
  );
});
