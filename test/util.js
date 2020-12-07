import path from "path";

export { strictEqual as assertSame, deepStrictEqual as assertDeep } from "assert";

export let ROOT_DIR = path.dirname(new URL(import.meta.url).pathname);
export let FIXTURES_DIR = path.resolve(ROOT_DIR, "fixtures");

export function wait(delay) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, delay);
	});
}
