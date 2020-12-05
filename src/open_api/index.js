import { dereferenceAll } from "./deref.js";
import { loadYAML } from "../util.js";
import yaml from "js-yaml";
import path from "path";

let INDEX_FILE = "index.yaml";

export default class Document {
	constructor(rootDir) {
		this.rootDir = rootDir;

		let index = path.resolve(rootDir, INDEX_FILE);
		this.data = processYAML(index, rootDir); // XXX: awkward due to async and naming
	}
}

// loads YAML and processes it to allow for externalization
async function processYAML(filepath, rootDir) {
	let data = await loadYAML(filepath);
	if(Array.isArray(data)) {
		return data;
	}

	await dereferenceAll(data, rootDir, txt => yaml.safeLoad(txt));
	return data;
}
