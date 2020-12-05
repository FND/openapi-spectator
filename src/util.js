import yaml from "js-yaml";
import { promises as fs } from "fs";
import path from "path";

let _readFile = fs.readFile;

export async function loadYAML(filepath) {
	try {
		let data = await _readFile(filepath, "utf8");
		return yaml.safeLoad(data);
	} catch(err) {
		switch(err.code) {
		case "ENOENT":
			throw new Error(`file not found: \`${filepath}\``);
		default:
			throw err;
		}
	}
}

export function readFile(filename, baseDir) {
	let filepath = path.resolve(baseDir, filename);
	return fs.readFile(filepath, "utf8");
}
