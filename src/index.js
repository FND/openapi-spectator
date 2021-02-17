#!/usr/bin/env node
import Document from "./open_api/index.js";
import { substitute } from "./substitution.js";
import yaml from "js-yaml";

main(...process.argv.slice(2));

async function main(rootDir, configPath) {
	let doc = new Document(rootDir);
	let res = yaml.dump(await doc.data, {
		// TODO: configurable
		indent: 4,
		noArrayIndent: true
	}).trim();

	if(configPath) {
		res = await substitute(res, configPath);
	}
	console.log(res); // eslint-disable-line no-console
}
