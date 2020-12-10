import { loadYAML, getFiles, readFile } from "../util.js";
import glob from "fast-glob";
import sortPaths from "path-sort";
import path from "path";

let { isArray } = Array;

export let INDEX_FILE = "index.yaml"; // XXX: hard-coded
let FILE_PREFIX = "<@";
let DIR_PREFIX = "<@@";
let OBJ_PROTO = Object.prototype;

// `context` consists of `baseDir` and `transform`
// `transform` is an optional function `(content, fileExtension)`
export async function dereferenceAll(value, ...context) {
	return value ? resolveAny(value, ...context) : value;
}

async function resolveAny(value, ...context) {
	if(isArray(value)) {
		let res = value.map(v => dereferenceAll(v, ...context));
		return Promise.all(res);
	}

	let plainObject = typeof value === "object" &&
			Object.getPrototypeOf(value) === OBJ_PROTO;
	return plainObject ? resolveObject(value, ...context) : value;
}

async function resolveObject(obj, ...context) {
	let res = Object.entries(obj).map(async ([key, value]) => {
		let resolve = typeof value === "string" ? resolveString : resolveAny;
		obj[key] = await resolve(value, ...context); // XXX: avoid mutation
	});
	await Promise.all(res);
	return obj;
}

async function resolveString(value, ...context) {
	if(value.startsWith(DIR_PREFIX)) {
		let name = value.substr(DIR_PREFIX.length);
		return resolveDirectory(name, ...context);
	}
	if(value.startsWith(FILE_PREFIX)) {
		let filename = value.substr(FILE_PREFIX.length);
		if(glob.isDynamicPattern(filename)) {
			return resolveGlob(filename, ...context);
		}
		return resolveFile(filename, ...context);
	}
	return value;
}

// NB: not generic; assumes YAML entry points
async function resolveDirectory(name, baseDir, transform) {
	let dir = path.resolve(baseDir, name);
	let files = [];
	for await (let file of getFiles(dir)) {
		if(file.name === INDEX_FILE) {
			files.push(file.path);
		}
	}

	let entries = sortPaths(files, path.sep).map(async filepath => {
		let data = await loadYAML(filepath);
		let dir = path.dirname(filepath);
		data = await dereferenceAll(data, dir, transform);
		return { filepath, data };
	});
	return Promise.all(entries);
}

async function resolveGlob(pattern, ...context) {
	let [baseDir] = context;
	let files = glob.stream(pattern, { cwd: baseDir });

	let res = [];
	for await (let filename of files) {
		let data = resolveFile(filename, ...context);
		res.push(data);
	}
	let data = await Promise.all(res);
	return Object.assign(...data); // FIXME: assumes object
}

async function resolveFile(filename, baseDir, transform) {
	let res = readFile(filename, baseDir);
	if(transform) {
		let dir = path.dirname(filename);
		dir = path.resolve(baseDir, dir);

		let ext = path.extname(filename).substr(1) || null;
		res = transform(await res, ext, dir);

		res = await dereferenceAll(res, dir, transform);
	}
	return res;
}
