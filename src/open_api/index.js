import { loadYAML } from "../util.js";
import path from "path";

let INDEX_FILE = "index.yaml";

export default class Document {
	constructor(rootDir) {
		this.rootDir = rootDir;

		let index = path.resolve(rootDir, INDEX_FILE);
		this.data = loadYAML(index); // XXX: awkward due to async and naming
	}
}
