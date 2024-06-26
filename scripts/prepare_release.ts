import { build, emptyDir } from "@deno/dnt";

const version = Deno.args[0];

if (version) {
  await Deno.writeTextFile(
    "deno.jsonc",
    (
      await Deno.readTextFile("deno.jsonc")
    ).replace(/"version": ".*"/, `"version": "${version}"`),
  );
}

await emptyDir("./npm");
await build({
  compilerOptions: {
    emitDecoratorMetadata: true,
    noUncheckedIndexedAccess: true,
    skipLibCheck: true,
    sourceMap: true,
    target: "ES2022",
  },
  declaration: "inline",
  declarationMap: true,
  entryPoints: ["./mod.ts", {
    name: "./promise-with-resolvers-polyfill",
    path: "./promise-with-resolvers-polyfill.ts",
  }],
  esModule: false,
  skipNpmInstall: true,
  test: false,
  typeCheck: false,
  outDir: "./npm",
  shims: {},
  package: {
    name: "parallelize-generator-promises",
    version,
    author: "Reda Bacha",
    description: "Runs promises yielded by generators in parallel",
    repository: "https://github.com/redabacha/parallelize-generator-promises",
    license: "MIT",
    exports: {
      ".": {
        default: {
          default: "./script/mod.js",
        },
      },
      "./promise-with-resolvers-polyfill": {
        default: {
          default: "./script/promise-with-resolvers-polyfill.js",
        },
      },
    },
  },
  async postBuild() {
    await Promise.all([
      Deno.copyFile("LICENSE", "npm/LICENSE"),
      Deno.copyFile("README.md", "npm/README.md"),
    ]);
  },
});
