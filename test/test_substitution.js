/* global suite, test */
import { substitute } from "../src/substitution.js";
import { FIXTURES_DIR, assertSame } from "./util.js";
import path from "path";

suite("placeholders");

test("substitution", async () => {
	let config = path.resolve(FIXTURES_DIR, "config.js");
	let str = await substitute(`
lorem <$HOST$> ipsum
dolor sit<$PORT$>amet
	`, config);
	assertSame(str, `
lorem http://example.org ipsum
dolor sit8080amet
	`);
});
