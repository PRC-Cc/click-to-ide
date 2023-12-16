const typescript = require("rollup-plugin-typescript2");

const pkg = require("./package.json");

module.exports = [
  {
    input: "src/toIDE.ts",
    output: [
      {
        dir: "dist",
        format: "umd",
        name: "toIDE"
      },
    ],
    plugins: [
      typescript({
        tsconfigOverride: {
          exclude: ["src/plugins"],
        },
      }),
    ],
  },
  {
    input: "src/index.ts",
    output: [
      {
        dir: "dist",
        format: "umd",
        name: "ClickToIDE",
      },
    ],
    plugins: [
      typescript({
        tsconfigOverride: {
          exclude: ["src/plugins"],
        },
      }),
    ],
    external: ["react", "react-dom"],
  },
  {
    input: "src/index.ts",
    output: [
      {
        dir: "es",
        format: "es",
        name: "ClickToIDE",
      },
    ],
    plugins: [
      typescript({
        tsconfigOverride: {
          exclude: ["src/plugins"],
        },
      }),
    ],
    external: ["react", "react-dom"],
  },
  {
    input: "src/plugins/index.ts",
    output: [
      {
        dir: "plugins",
        format: "cjs",
      },
    ],
    plugins: [
      typescript({
        tsconfigOverride: {
          include: ["src/plugins"],
        },
      }),
    ],
  },
];
