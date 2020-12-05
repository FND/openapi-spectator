import yaml from "js-yaml";
import { promises as fs } from "fs";

export async function loadYAML(filepath) {
	try {
		let data = await fs.readFile(filepath, "utf8");
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
