import { INDEX_FILE } from "./index.js"; // XXX: awkward
import { getFiles, loadYAML, readFile } from "../util.js";
import sortPaths from "path-sort";
import path from "path";

// XXX: prefixes are simplistic and thus prone to false positive
let FILE_PREFIX = "@";
let DIR_PREFIX = "@@";
let OBJ_PROTO = Object.prototype;

// XXX: inefficient because asynchronous operations are serialized (i.e.
//      effectively blocking further traversal, preventing parallelization)
export async function dereferenceAll(obj, baseDir, processor) {
	let ops = Object.entries(obj).map(async ([key, value]) => {
		if(!value) {
			return;
		}
		if(Array.isArray(value)) {
			let ops = value.map(v => dereferenceAll(v, baseDir, processor));
			await Promise.all(ops);
		}

		let type = typeof value;
		if(type === "object" && Object.getPrototypeOf(obj) === OBJ_PROTO) {
			// plain object; recursive traversal
			await dereferenceAll(value, baseDir, processor);
		} else if(type === "string") {
			if(value.startsWith(DIR_PREFIX)) {
				let dirName = value.substr(DIR_PREFIX.length);
				// eslint-disable-next-line no-var
				obj[key] = await resolveDirectory(dirName, baseDir, processor);
			} else if(value.startsWith(FILE_PREFIX)) {
				let filename = value.substr(FILE_PREFIX.length);
				obj[key] = await resolveFile(filename, baseDir, processor);
			}
		}
	});
	await Promise.all(ops);
	return obj;
}

// FIXME:: special-casing for OpenAPI `paths` should be moved into `Document`
async function resolveDirectory(dirName, baseDir, processor) {
	let dir = path.resolve(baseDir, dirName);
	let files = [];
	let resourceByFile = new Map();
	for await (let file of getFiles(dir)) {
		if(file.name !== INDEX_FILE) {
			continue;
		}

		let filepath = file.path;
		let data = loadYAML(filepath); // TODO: dereference recursively
		resourceByFile.set(filepath, data);
		files.push(filepath);
	}
	let resources = sortPaths(files, path.sep).
		map(async filepath => {
			let data = await resourceByFile.get(filepath);
			return { filepath, data };
		});
	resources = await Promise.all(resources);

	return resources.reduce((memo, { filepath, data }) => {
		let { uri, ...descriptor } = data;
		if(memo[uri]) {
			throw new Error(`duplicate resource URI: \`${uri}\` in \`${filepath}\``);
		}
		memo[uri] = descriptor;
		return memo;
	}, {});
}

async function resolveFile(filename, baseDir, processor) {
	let res = readFile(filename, baseDir);
	if(processor) {
		let ext = path.extname(filename).substr(1) || null;
		res = processor(await res, ext);
		// TODO: dereference recursively
	}
	return res;
}
