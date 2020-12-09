import yaml from "js-yaml";
import { promises as fs } from "fs";
import path from "path";

export async function loadYAML(filepath) {
	let data = await readFile(filepath);
	return yaml.safeLoad(data);
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

export async function readFile(filepath, baseDir) {
	if(baseDir) {
		filepath = path.resolve(baseDir, filepath);
	}

	try {
		return fs.readFile(filepath, "utf8");
	} catch(err) {
		switch(err.code) {
		case "ENOENT":
			throw new Error(`file not found: \`${filepath}\``);
		default:
			throw err;
		}
	}
}

class File {
	constructor(filepath) {
		this.path = filepath;
	}

	get name() {
		return path.basename(this.path);
	}
}
