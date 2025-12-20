/*!
 * markdown-toc <https://github.com/jonschlinkert/markdown-toc>
 *
 * Copyright © 2013-2023, Jon Schlinkert.
 * Released under the MIT License.
 */

import toc from "../index.js";
import utils, { type TOCOptions } from "./utils.js";

/**
 * The basic idea:
 *
 *  1. when front-matter exists, we need to avoid turning its properties into headings.
 *  2. We need to detect toc markers on the page. For now it's a simple HTML code comment
 *     to ensure the markdown is compatible with any parser.
 *
 * @param str - String of markdown
 * @param options - Options for TOC generation
 * @returns The same string with TOC inserted
 */
export default function insert(str: string, options: TOCOptions = {}): string {
	const regex = (options.regex as RegExp) || /(?:<!-- toc(?:\s*stop)? -->)/g;
	const open =
		typeof options.open === "string" ? options.open : "<!-- toc -->\n\n";
	const close =
		typeof options.close === "string" ? options.close : "<!-- tocstop -->";
	let obj: { content: string; data: unknown } | null = null;

	// Preserve trailing newlines
	const newlines = (/\n+$/.exec(str) || [""])[0];

	// Handle front-matter
	if (/^---/.test(str)) {
		obj = utils.matter(str);
		str = obj.content;
	}

	const sections = split(str, regex);
	if (sections.length > 3) {
		throw new Error(
			"markdown-toc only supports one Table of Contents per file.",
		);
	}

	const last = sections[sections.length - 1];

	if (sections.length === 3) {
		sections.splice(1, 1, open + (options.toc || toc(last, options).content));
		sections.splice(2, 0, close);
	}

	if (sections.length === 2) {
		sections.splice(1, 0, `${open + toc(last, options).content}\n\n${close}`);
	}

	const resultString = sections.join("\n\n") + newlines;

	// Restore front-matter if it was found
	if (obj !== null) {
		return utils.matter.stringify(resultString, obj.data as object);
	}

	return resultString;
}

function split(str: string, re: RegExp): string[] {
	return str.split(re).map(trim);
}

function trim(str: string): string {
	return str.trim();
}
