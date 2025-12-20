/*!
 * markdown-toc <https://github.com/jonschlinkert/markdown-toc>
 *
 * Copyright © 2013-2023, Jon Schlinkert.
 * Released under the MIT License.
 */

import diacritics from "diacritics-map";
import matter from "gray-matter";
import minimist from "minimist";
import stripAnsi from "strip-ansi";

// Type definitions
export interface TOCOptions {
	firsth1?: boolean;
	maxdepth?: number;
	bullets?: string | string[];
	chars?: string | string[];
	indent?: string;
	append?: string;
	filter?: (content: string, token: unknown, tokens: unknown[]) => boolean;
	slugify?: ((str: string, options?: unknown) => string) | false;
	linkify?:
		| ((tok: unknown, text: string, slug: string, opts: unknown) => unknown)
		| boolean;
	titleize?: ((str: string, opts?: unknown) => string) | boolean;
	strip?: string[] | ((str: string, opts?: unknown) => string);
	stripHeadingTags?: boolean;
	num?: number;
	highest?: number;
	[key: string]: unknown; // Allow additional properties for flexibility
}

export interface HeadingToken {
	content: string;
	slug: string;
	lvl: number;
	i: number;
	seen: number;
	[key: string]: unknown;
}

export interface TOCResult {
	content: string;
	json: HeadingToken[];
	highest: number;
	tokens: unknown[];
}

/**
 * Create utils object
 */
/**
 * Custom list-item implementation
 * Creates a function that generates markdown list items with proper indentation
 */
function createListItem(opts: TOCOptions) {
	return (level: number, content: string): string => {
		const indent = opts.indent || "  ";
		const bullets = opts.bullets || opts.chars || ["-", "*", "+"];
		const bullet = bullets[Math.min(level, bullets.length - 1)] || "-";
		return `${indent.repeat(level) + bullet} ${content}`;
	};
}

/**
 * Custom markdown-link implementation
 * Creates markdown links in the format [text](url)
 */
function createMarkdownLink(text: string, href: string): string {
	return `[${text}](${href})`;
}

const utils = {
	matter,
	minimist,
	li: createListItem,
	mdlink: createMarkdownLink,
	stripColor: stripAnsi,
	concat: async (callback: (data: unknown) => void) => {
		// Import concat-stream dynamically to avoid ESM issues
		const { default: concatStream } = await import("concat-stream");
		return concatStream(callback);
	},

	/**
	 * Get the "title" from a markdown link
	 */
	getTitle: (str: string): string => {
		const m = /^\[([^\]]+)\]/.exec(str);
		if (m) return m[1];
		return str;
	},

	/**
	 * Slugify the url part of a markdown link.
	 */
	slugify: (str: string, options: TOCOptions = {}): string => {
		if (options.slugify === false) return str;
		if (typeof options.slugify === "function") {
			return options.slugify(str, options);
		}

		str = utils.getTitle(str);
		str = utils.stripColor(str);
		str = str.toLowerCase();

		// Use native string methods instead of split/join where possible
		str = str.replace(/\s+/g, "-");
		str = str.replace(/\t/g, "--");
		if (options.stripHeadingTags !== false) {
			str = str.replace(/<\/?[^>]+>/g, "");
		}
		str = str.replace(/[|$&`~=\\/@+*!?({[\]})<>=.,;:'"^]/g, "");
		str = str.replace(
			/[。？！，、；：“”【】（）〔〕［］﹃﹄“ ”‘’﹁﹂—…－～《》〈〉「」]/g,
			"",
		);
		str = replaceDiacritics(str);
		if (options.num) {
			str += `-${options.num}`;
		}
		return str;
	},

	/**
	 * Simple object merge (replaces mixin-deep)
	 */
	merge: <T extends object>(...objects: Partial<T>[]): T => {
		return Object.assign({}, ...objects) as T;
	},

	/**
	 * Simple object pick (replaces object.pick)
	 */
	pick: <T extends object, K extends keyof T>(
		obj: T,
		keys: K[],
	): Pick<T, K> => {
		const result: Partial<Pick<T, K>> = {};
		for (const key of keys) {
			if (key in obj) {
				result[key] = obj[key];
			}
		}
		return result as Pick<T, K>;
	},

	/**
	 * Simple string repeat (replaces repeat-string)
	 */
	repeat: (str: string, count: number): string => {
		return str.repeat(count);
	},
};

function replaceDiacritics(str: string): string {
	return str.replace(/[À-ž]/g, (ch) => diacritics[ch] || ch);
}

export default utils;
