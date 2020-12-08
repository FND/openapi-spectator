import { INDEX_FILE } from "./index.js"; // XXX: awkward
import { getFiles, loadYAML, readFile } from "../util.js";
import glob from "fast-glob";
import sortPaths from "path-sort";
import path from "path";

// XXX: prefixes are simplistic and thus prone to false positive
let FILE_PREFIX = "<@";
let DIR_PREFIX = "<@@";
let OBJ_PROTO = Object.prototype;

// XXX: inefficient because asynchronous operations are serialized (i.e.
//      effectively blocking further traversal, preventing parallelization)
export async function dereferenceAll(obj, baseDir, transform) {
	let ops = Object.entries(obj).map(async ([key, value]) => {
		if(!value) {
			return;
		}
		if(Array.isArray(value)) {
			let ops = value.map(v => dereferenceAll(v, baseDir, transform));
			await Promise.all(ops);
		}

		let type = typeof value;
		if(type === "object" && Object.getPrototypeOf(obj) === OBJ_PROTO) {
			// plain object; recursive traversal
			await dereferenceAll(value, baseDir, transform);
		} else if(type === "string") {
			if(value.startsWith(DIR_PREFIX)) {
				let dirName = value.substr(DIR_PREFIX.length);
				// eslint-disable-next-line no-var
				obj[key] = await resolveDirectory(dirName, baseDir, transform);
			} else if(value.startsWith(FILE_PREFIX)) {
				let filename = value.substr(FILE_PREFIX.length);
				if(glob.isDynamicPattern(filename)) {
					// FIXME: inelegant due to redundanies; requires consolidation
					let files = await glob(filename, {
						cwd: baseDir
					});
					files = files.map(async filename => {
						let res = await resolveFile(filename, baseDir, transform);
						return dereferenceAll(res,
								determineDirectory(filename, baseDir), transform);
					});
					let data = await Promise.all(files);
					obj[key] = Object.assign(...data); // FIXME: assumes object res;
					return;
				}

				let res = await resolveFile(filename, baseDir, transform);
				// resolve rescursively -- XXX: inelegant due to redundant type checking
				if(Array.isArray(res)) {
					res = res.map(v => dereferenceAll(v,
							determineDirectory(filename, baseDir), transform));
					res = await Promise.all(res);
				} else if(res !== null && typeof res === "object" &&
						Object.getPrototypeOf(obj) === OBJ_PROTO) {
					res = await dereferenceAll(res,
							determineDirectory(filename, baseDir), transform);
				}
				obj[key] = res;
			}
		}
	});
	await Promise.all(ops);
	return obj;
}

// FIXME:: special-casing for OpenAPI `paths` should be moved into `Document`
async function resolveDirectory(dirName, baseDir, transform) {
	let dir = path.resolve(baseDir, dirName);
	let files = [];
	for await (let file of getFiles(dir)) {
		if(file.name === INDEX_FILE) {
			files.push(file.path);
		}
	}
	let resources = sortPaths(files, path.sep).
		map(async filepath => {
			let data = await loadYAML(filepath);
			data = await dereferenceAll(data, path.dirname(filepath), transform);
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

async function resolveFile(filename, baseDir, transform) {
	let res = readFile(filename, baseDir);
	if(transform) {
		let ext = path.extname(filename).substr(1) || null;
		res = transform(await res, ext);
	}
	return res;
}

function determineDirectory(filename, baseDir) {
	let filepath = path.resolve(baseDir, filename);
	return path.dirname(filepath);
}
