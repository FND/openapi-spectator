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

export async function* getFiles(rootDir) {
	let entries = await fs.readdir(rootDir, { withFileTypes: true });
	for(let entry of entries) {
		let filepath = path.resolve(rootDir, entry.name);
		if(entry.isDirectory()) {
			yield* getFiles(filepath);
		} else {
			yield new File(filepath);
		}
	}
}

export function readFile(filename, baseDir) {
	let filepath = path.resolve(baseDir, filename);
	return fs.readFile(filepath, "utf8");
}

class File {
	constructor(filepath) {
		this.path = filepath;
	}

	get name() {
		return path.basename(this.path);
	}
}
