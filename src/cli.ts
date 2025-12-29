#!/usr/bin/env node

/*!
 * markdown-toc <https://github.com/jonschlinkert/markdown-toc>
 *
 * Copyright © 2013-2023, Jon Schlinkert.
 * Released under the MIT License.
 */

import fs from "node:fs";
import toc from "./index.js";
import utils, { type TOCResult } from "./lib/utils.js";

interface CLIArgs {
	_: string[];
	i?: boolean;
	json?: boolean;
	firsth1?: boolean;
	stripHeadingTags?: boolean;
	append?: string;
	bullets?: string | string[];
	indent?: string;
	maxdepth?: number;
	[key: string]: unknown;
}

const args = utils.minimist(process.argv.slice(2), {
	boolean: ["i", "json", "firsth1", "stripHeadingTags"],
	string: ["append", "bullets", "indent"],
	default: {
		firsth1: true,
		stripHeadingTags: true,
	},
}) as CLIArgs;

async function main() {
	// Validation checks
	if (args._.length !== 1) {
		console.error(
			[
				"Usage: markdown-toc [options] <input> ",
				"",
				"  input:        The Markdown file to parse for table of contents,",
				'                or "-" to read from stdin.',
				"",
				"  -i:           Edit the <input> file directly, injecting the TOC at <!-- toc -->",
				"                (Without this flag, the default is to print the TOC to stdout.)",
				"",
				"  --json:       Print the TOC in JSON format",
				"",
				"  --append:     Append a string to the end of the TOC",
				"",
				"  --bullets:    Bullets to use for items in the generated TOC",
				'                (Supports multiple bullets: --bullets "*" --bullets "-" --bullets "+")',
				'                (Default is "*".)',
				"",
				"  --maxdepth:   Use headings whose depth is at most maxdepth",
				"                (Default is 6.)",
				"",
				"  --no-firsth1: Include the first h1-level heading in a file",
				"",
				"  --no-stripHeadingTags: Do not strip extraneous HTML tags from heading",
				"                         text before slugifying",
				"",
				"  --indent:     Provide the indentation to use - defaults to '  '",
				"                (to specify a tab, use the bash-escaped $'\\t')",
			].join("\n"),
		);
		process.exit(1);
	}

	if (args.i && args.json) {
		console.error("markdown-toc: you cannot use both --json and -i");
		process.exit(1);
	}

	if (args.i && args._[0] === "-") {
		console.error('markdown-toc: you cannot use -i with "-" (stdin) for input');
		process.exit(1);
	}

	const input = process.stdin;
	if (args._[0] !== "-") {
		try {
			// Handle file input
			const fileStream = fs.createReadStream(args._[0]);
			const chunks: Buffer[] = [];

			fileStream.on("data", (chunk: Buffer) => {
				chunks.push(chunk);
			});

			fileStream.on("end", () => {
				const fileContent = Buffer.concat(chunks);

				if (args.i) {
					const newMarkdown = toc.insert(fileContent.toString(), args);
					fs.writeFileSync(args._[0], newMarkdown);
				} else {
					const parsed = toc(fileContent.toString(), args);
					output(parsed);
				}
			});
		} catch (err: unknown) {
			console.error(err);
			process.exit(1);
		}
	} else {
		// Handle stdin input
		let stdinData = "";
		process.stdin.on("data", (chunk) => {
			stdinData += chunk;
		});

		process.stdin.on("end", () => {
			if (args.i) {
				console.error("markdown-toc: cannot use -i with stdin input");
				process.exit(1);
			} else {
				const parsed = toc(stdinData, args);
				output(parsed);
			}
		});
	}

	input.on("error", (err: unknown) => {
		console.error(err);
		process.exit(1);
	});
}

function output(parsed: TOCResult) {
	if (args.json) {
		console.log(JSON.stringify(parsed.json, null, "  "));
	} else {
		process.stdout.write(parsed.content);
	}
}

// Start the main function
main().catch((err) => {
	console.error(err);
	process.exit(1);
});
