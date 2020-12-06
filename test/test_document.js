/* global suite, test */
import Document from "../src/open_api/index.js";
import { FIXTURES_DIR, assertSame, assertDeep } from "./util.js";

suite("OpenAPI");

test("document", async () => {
	let doc = new Document(FIXTURES_DIR);

	let { openapi, info, tags, components, paths } = await doc.data;

	assertSame(doc.rootDir, FIXTURES_DIR);
	assertSame(openapi, "3.0.3");
	assertSame(info.title, "My Service");
	assertDeep(tags, [
		{ name: "foo", description: "lorem ipsum dolor sit amet" },
		{ name: "bar" }
	]);
	assertSame(components.schemas.article.properties.date.format, "date");
	assertDeep(Object.keys(paths), [
		"/",
		"/admin",
		"/blog"
	]);
	assertSame(paths["/"].get.summary, "front page");
	assertSame(paths["/admin"].get.summary, "administration interface");
	assertSame(paths["/blog"].get.summary, "list blog posts");
	assertSame(paths["/blog"].post.summary, "create blog post");
});
