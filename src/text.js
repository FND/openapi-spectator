import { readFile } from "./util.js";
import txtParse from "lampenfieber";
import path from "path";

let DELIMITER = "```";

export async function resolveBlocks(txt, baseDir) {
	if(!txt.includes(DELIMITER)) {
		return txt;
	}

	let segments = txtParse(txt, { delimiter: DELIMITER });
	segments = segments.map(async block => {
		switch(block.type) {
		case "code":
			return renderCode(block, baseDir);
		default: // NB: includes plain strings
			return block;
		}
	});
	segments = await Promise.all(segments);
	return segments.join("\n");
}

function renderCode(block, baseDir) {
	let { filename, format } = block.params;
	if(filename) {
		return resolveEmbed(filename, baseDir);
	}
	return wrap(block.content, format);
}

async function resolveEmbed(filename, baseDir) {
	let content = await readFile(filename, baseDir);

	let ext = path.extname(filename).substr(1) || null;
	switch(ext) {
	case "json": {
		let formatted = JSON.stringify(JSON.parse(content), null, 4);
		return wrap(formatted, ext);
	}
	default:
		return content;
	}
}

function wrap(code, lang) {
	let cls = lang ? ` class="language-${lang}"` : "";
	return `<pre><code${cls}>${code}</code></pre>`;
}
