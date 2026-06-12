import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "com.warmuptill.advanced-scene-switcher.sdPlugin";

function getVersionFromGit() {
	try {
		const raw = execSync("git describe --tags --long --match \"v*\"", { encoding: "utf8" }).trim();
		const match = raw.match(/^v?(\d+)\.(\d+)\.(\d+)-(\d+)-g[0-9a-f]+$/);
		if (match) {
			return `${match[1]}.${match[2]}.${match[3]}.${match[4]}`;
		}
	} catch {
		try {
			const count = execSync("git rev-list --count HEAD", { encoding: "utf8" }).trim();
			return `0.0.0.${count}`;
		} catch { /* not a git repo */ }
	}
	return "0.0.0.0";
}

const pluginVersion = getVersionFromGit();

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
	input: "src/plugin.ts",
	output: {
		file: `${sdPlugin}/bin/plugin.js`,
		sourcemap: isWatching,
		sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
			return url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href;
		}
	},
	plugins: [
		{
			name: "version-from-git",
			resolveId(id) {
				if (id === "virtual:plugin-version") return "\0virtual:plugin-version";
			},
			load(id) {
				if (id === "\0virtual:plugin-version") return `export const pluginVersion = "${pluginVersion}";`;
			},
			buildStart() {
				const manifestPath = `${sdPlugin}/manifest.json`;
				const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
				if (manifest.Version !== pluginVersion) {
					manifest.Version = pluginVersion;
					fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t") + "\n");
					console.log(`Version set to ${pluginVersion}`);
				}
			},
		},
		{
			name: "watch-externals",
			buildStart: function () {
				this.addWatchFile(`${sdPlugin}/manifest.json`);
			},
		},
		typescript({
			mapRoot: isWatching ? "./" : undefined
		}),
		nodeResolve({
			browser: false,
			exportConditions: ["node"],
			preferBuiltins: true
		}),
		commonjs(),
		!isWatching && terser(),
		{
			name: "emit-module-package-file",
			generateBundle() {
				this.emitFile({ fileName: "package.json", source: `{ "type": "module" }`, type: "asset" });
			}
		}
	]
};

export default config;
