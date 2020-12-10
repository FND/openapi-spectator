/* global suite, test */
import Document, { _transform } from "../src/open_api/index.js";
import { dereferenceAll } from "../src/open_api/deref.js";
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
		"/blog",
		"/blog/{slug}"
	]);
	assertSame(paths["/"].get.summary, "front page");
	assertSame(paths["/admin"].get.summary, "administration interface");
	assertSame(paths["/blog"].get.summary, "list blog posts");
	assertSame(paths["/blog"].get.description, `
lorem ipsum

<pre><code class="language-json">{
    "title": "hello world",
    "date": "1970-12-31"
}</code></pre>

dolor sit amet

<pre><code>GOTO 10</code></pre>

<pre><code class="language-shell">echo "hello world"</code></pre>
	`.trim() + "\n");
	assertDeep(paths["/blog"].get.parameters, [{
		name: "tag",
		description: "one or more tags to filter by",
		in: "query",
		schema: {
			type: "array",
			items: {
				type: "string"
			}
		}
	}]);
	assertSame(paths["/blog"].post.summary, "create blog post");
	assertSame(paths["/blog/{slug}"].get.summary, "show blog post");
	assertDeep(paths["/blog/{slug}"].get.parameters, [{
		name: "slug",
		description: "article identifier",
		in: "path",
		required: true,
		schema: {
			type: "string"
		}
	}, {
		name: "referrer",
		description: "originating URL or service",
		in: "query",
		schema: {
			type: "string"
		}
	}]);
});

test("content transformation", async () => {
	let obj = {
		foo: "<@alt/lipsum.md"
	};
	let res = await dereferenceAll(obj, FIXTURES_DIR, _transform);
	assertDeep(res, {
		foo: `
lorem ipsum

<pre><code class="language-json">{
    "title": "hello world",
    "date": "1970-01-01"
}</code></pre>

dolor sit amet

<pre><code class="language-json">{
    "title": "hello world",
    "date": "1970-12-31"
}</code></pre>
		`.trim() + "\n"
	});
});
