"use strict";

import clear from "rollup-plugin-clear";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import screeps from "rollup-plugin-screeps";
import copy from "rollup-plugin-copy"

let cfg;
const dest = process.env.DEST;
if (!dest) {
  console.log("No destination specified - code will be compiled but not uploaded");
} else if ((cfg = require("./screeps.json")[dest]) == null) {
  throw new Error("Invalid upload destination");
}

export default {
  input: "src/main.ts",
  output: {
    file: "dist/main.js",
    format: "cjs",
    sourcemap: true
  },
  external: ['lodash', 'source-map'],

  plugins: [
    clear({ targets: ["dist"] }),
    resolve(),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" }),
    copy({
      targets: [
        { src: "lib/lodash.min.js", dest: "dist/", rename: "lodash4.js" },
        { src: "lib/source-map.min.js", dest: "dist/", rename: "source-map.js" },
      ]
    }),
    screeps({ config: cfg, dryRun: cfg == null })
  ]
}
