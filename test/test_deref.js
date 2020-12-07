/* global suite, test */
import { dereferenceAll } from "../src/open_api/deref.js";
import { readFile } from "../src/util.js";
import { FIXTURES_DIR, wait, assertSame, assertDeep } from "./util.js";
import yaml from "js-yaml";

suite("resolving file references");

test("file dereferencing", async () => {
	let res = await dereferenceAll({}, FIXTURES_DIR);
	assertDeep(res, {});

	let obj = {
		foo: {
			bar: {
				baz: "…"
			}
		}
	};
	res = await dereferenceAll(obj, FIXTURES_DIR);
	assertSame(res, obj);
	assertDeep(res, {
		foo: {
			bar: {
				baz: "…"
			}
		}
	});

	obj = {
		foo: "hello world",
		bar: "@lipsum.txt",
		baz: "…"
	};
	res = await dereferenceAll(obj, FIXTURES_DIR);
	assertSame(res, obj);
	assertDeep(res, {
		foo: "hello world",
		bar: "lorem ipsum\ndolor sit amet\n",
		baz: "…"
	});
});

test("directory dereferencing", async () => {
	let obj = {
		paths: "@@resources"
	};
	let res = await dereferenceAll(obj, FIXTURES_DIR);
	assertDeep(Object.keys(res.paths), [
		"/",
		"/admin",
		"/blog",
		"/blog/{slug}"
	]);
	assertSame(res.paths["/"].GET.summary, "front page");
	assertSame(res.paths["/admin"].GET.summary, "administration interface");
	assertSame(res.paths["/blog"].GET.summary, "list blog posts");
	assertSame(res.paths["/blog"].POST.summary, "create blog post");
	assertSame(res.paths["/blog/{slug}"].GET.summary, "show blog post");
});

test("nested dereferencing", async () => {
	let obj = {
		foo: "@lipsum.txt",
		bar: {
			baz: {
				title: "…",
				content: "@empty.txt"
			},
			links: [{
				self: {
					uri: "@dummy.txt"
				},
				canonical: {
					uri: "@dummy.txt"
				}
			}]
		}
	};
	let res = await dereferenceAll(obj, FIXTURES_DIR);
	assertSame(res, obj);
	assertDeep(res, {
		foo: "lorem ipsum\ndolor sit amet\n",
		bar: {
			baz: {
				title: "…",
				content: "\n"
			},
			links: [{
				self: {
					uri: "...\n"
				},
				canonical: {
					uri: "...\n"
				}
			}]
		}
	});
});

test("post-processing", async () => {
	let obj = {
		tags: [{
			name: "foo",
			description: "@lipsum.md"
		}, {
			name: "bar"
		}],
		components: {
			schemas: "@schemas.yaml"
		}
	};
	let res = await dereferenceAll(obj, FIXTURES_DIR, async (txt, ext) => {
		await wait(10);
		return transform(txt, ext);
	});
	assertDeep(res, {
		tags: [{
			name: "foo",
			description: await readFile("lipsum.md", FIXTURES_DIR)
		}, {
			name: "bar"
		}],
		components: {
			schemas: {
				article: {
					type: "object",
					properties: {
						title: { type: "string" },
						date: {
							type: "string",
							format: "date"
						}
					}
				}
			}
		}
	});

	obj = {
		foo: "hello world",
		bar: "@alt/index.yaml"
	};
	res = await dereferenceAll(obj, FIXTURES_DIR, transform);
	assertDeep(res, {
		foo: "hello world",
		bar: {
			title: "sample",
			meta: {
				author: "jdoe",
				version: 3
			},
			items: [{
				id: "abc123",
				details: {
					valid: true
				}
			}, {
				id: "def456",
				details: {
					valid: false,
					errors: [{
						code: "ENOREF",
						message: "invalid reference\n"
					}]
				}
			}]
		}
	});
});

function transform(txt, ext) {
	switch(ext) {
	case "yaml":
		return yaml.safeLoad(txt);
	default:
		return txt;
	}
}
