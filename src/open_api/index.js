import { dereferenceAll } from "./deref.js";
import { loadYAML } from "../util.js";
import yaml from "js-yaml";
import path from "path";

export let INDEX_FILE = "index.yaml";

export default class Document {
	constructor(rootDir) {
		this.rootDir = rootDir;

		let filepath = path.resolve(rootDir, INDEX_FILE);
		// XXX: awkward due to async and naming
		this.data = processYAML(filepath, rootDir).then(data => {
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
				let { queryParameters: params, ...desc } = descriptor;
				res[key.toLowerCase()] = {
					...desc,
					...(params && {
						parameters: serializeParams(params, "query")
					})
				};
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

async function processYAML(filepath, rootDir) {
	let data = await loadYAML(filepath);
	return dereferenceAll(data, rootDir, transform);
}

function transform(txt, ext) {
	switch(ext) {
	case "yaml":
		return yaml.safeLoad(txt);
	default:
		return txt;
	}
}

function serializeParams(params, type, defaults = {}) {
	return Object.entries(params).map(([name, obj]) => ({
		...defaults,
		...obj,
		name,
		in: type
	}));
}
