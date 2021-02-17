import Document from "./open_api/index.js";
import { substitute } from "./substitution.js";
import yaml from "js-yaml";

export default async function generate(rootDir, configPath, options = {}) {
	let doc = new Document(rootDir);
	let txt = yaml.dump(await doc.data, {
		indent: 4,
		noArrayIndent: true,
		...options
	}).trim();

	if(configPath) {
		txt = await substitute(txt, configPath);
	}
	return txt;
}
