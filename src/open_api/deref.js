import { readFile } from "../util.js";
import path from "path";

let FILE_PREFIX = "@"; // XXX: simplistic and thus prone to false positive
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
		} else if(type === "string" && value.startsWith(FILE_PREFIX)) {
			let filename = value.substr(FILE_PREFIX.length);
			let res = await readFile(filename, baseDir);
			if(processor) {
				let ext = path.extname(filename).substr(1) || null;
				res = processor(res, ext);
			}
			obj[key] = res;
		}
	});
	await Promise.all(ops);
	return obj;
}
