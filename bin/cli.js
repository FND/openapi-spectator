#!/usr/bin/env node
import generate from "../src/index.js";

main(...process.argv.slice(2));

async function main(rootDir, configPath) {
	let txt = await generate(rootDir, configPath);
	console.log(txt); // eslint-disable-line no-console
}
