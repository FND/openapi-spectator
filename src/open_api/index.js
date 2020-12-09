import { INDEX_FILE, dereferenceAll } from "./deref.js";
import { loadYAML } from "../util.js";
import yaml from "js-yaml";
import path from "path";

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
	return resources.reduce((memo, { filepath, data }) => {
		let { uri, descriptor } = resource2path(data);
		if(memo[uri]) {
			throw new Error(`duplicate resource URI: \`${uri}\` in \`${filepath}\``);
		}
		memo[uri] = descriptor;
		return memo;
	}, {});
}

function resource2path({ uri, ...resource }) {
	let params;
	resource = Object.entries(resource).reduce((memo, [key, descriptor]) => {
		if(key === "pathParameters") {
			params = descriptor;
		} else if(key === key.toUpperCase()) { // HTTP method
			let { queryParameters: params, ...desc } = descriptor;
			memo[key.toLowerCase()] = {
				...desc,
				...(params && {
					parameters: serializeParams(params, "query")
				})
			};
		} else {
			throw new Error(`invalid resource property: \`${key}\``);
		}
		return memo;
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

	return {
		uri,
		descriptor: resource
	};
}

async function processYAML(filepath, rootDir) {
	let data = await loadYAML(filepath);
	return dereferenceAll(data, rootDir, transform);
}

function transform(txt, ext) {
	switch(ext) {
	case "yaml":
		return yaml.safeLoad(txt);
	case "json":
		return JSON.parse(txt);
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
