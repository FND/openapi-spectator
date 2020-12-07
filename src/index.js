#!/usr/bin/env node
import Document from "./open_api/index.js";
import yaml from "js-yaml";

main(...process.argv.slice(2));

async function main(rootDir) {
	let doc = new Document(rootDir);
	console.log(yaml.safeDump(await doc.data, { // eslint-disable-line no-console
		// TODO: configurable
		indent: 4,
		noArrayIndent: true
	}).trim());
}
