import { dereferenceAll } from "./deref.js";
import { loadYAML } from "../util.js";
import yaml from "js-yaml";
import path from "path";

export let INDEX_FILE = "index.yaml";

export default class Document {
	constructor(rootDir) {
		this.rootDir = rootDir;

		let index = path.resolve(rootDir, INDEX_FILE);
		let data = processYAML(index, rootDir);
		this.data = data.then(data => { // XXX: awkward due to async and naming
			data.paths = resources2paths(data.paths);
			return data;
		});
	}
}

function resources2paths(resources) {
	return Object.entries(resources).reduce((memo, [uri, resource]) => {
		let params;
		resource = Object.entries(resource).reduce((res, [key, descriptor]) => {
			if(key === "pathParameters") {
				params = descriptor;
			} else if(key === key.toUpperCase()) { // HTTP method
				res[key.toLowerCase()] = descriptor;
			} else {
				throw new Error(`invalid resource property: \`${key}\``);
			}
			return res;
		}, {});

		// inject path parameters
		if(params) {
			params = serializeParams(params, "path", {
				required: true
			});
			Object.entries(resource).forEach(([method, descriptor]) => {
				descriptor.parameters = params.concat(descriptor.parameters || []);
			});
		}

		memo[uri] = resource;
		return memo;
	}, {});
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

function serializeParams(params, type, defaults = {}) {
	return Object.entries(params).map(([name, obj]) => ({
		...defaults,
		...obj,
		name,
		in: type
	}));
}
