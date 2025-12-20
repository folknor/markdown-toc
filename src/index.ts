/*!
 * markdown-toc <https://github.com/jonschlinkert/markdown-toc>
 *
 * Copyright © 2013-2023, Jon Schlinkert.
 * Released under the MIT License.
 */

import { marked, type Token, type Tokens } from "marked";
import insert from "./lib/insert.js";
import utils, {
	type HeadingToken,
	type TOCOptions,
	type TOCResult,
} from "./lib/utils.js";

/**
 * Adapter to work with marked tokens and provide TOC generation.
 */
class MarkedAdapter {
	private options: TOCOptions;
	private seen: Record<string, number> = {};
	private headings: HeadingToken[] = [];

	constructor(options: TOCOptions = {}) {
		this.options = {
			firsth1: true,
			maxdepth: 6,
			linkify: true,
			...options,
		};
	}

	public parse(content: string): TOCResult {
		// Step 1: Lexical analysis with marked
		const tokens = marked.lexer(content);

		// Step 2: Extract and process headings
		this.extractHeadings(tokens);
		this.processHeadings();

		// Step 3: Generate TOC content
		const tocContent = this.generateTOCContent();

		// Step 4: Generate JSON output
		const jsonOutput = this.generateJSONOutput();

		return {
			content: tocContent,
			json: jsonOutput,
			highest: this.getHighestLevel(),
			tokens: tokens, // Raw tokens for debugging/compatibility
		};
	}

	private extractHeadings(tokens: Token[]): void {
		for (const token of tokens) {
			if (token.type === "heading") {
				this.processHeadingToken(token);
			}
		}
	}

	private processHeadingToken(token: Token, depth: number = 0): void {
		// Skip headings beyond maxdepth
		if (depth > (this.options.maxdepth || 6)) {
			return;
		}

		// Only process heading tokens
		if (token.type !== "heading") {
			return;
		}

		// Get the heading depth (1-6 for h1-h6)
		const headingDepth = (token as Tokens.Heading).depth;

		// Extract text content from token
		const text = this.getTokenText(token);

		// Generate slug
		const slug = utils.slugify(text, this.options);

		// Track seen count for duplicate headings
		if (!this.seen[text]) {
			this.seen[text] = 0;
		} else {
			this.seen[text]++;
		}

		// Create heading token
		const heading: HeadingToken = {
			content: text,
			slug,
			lvl: headingDepth,
			i: this.headings.length,
			seen: this.seen[text],
		};

		this.headings.push(heading);

		// Process child tokens if they exist
		if ("tokens" in token && token.tokens) {
			for (const childToken of token.tokens) {
				this.processHeadingToken(childToken, headingDepth);
			}
		}
	}

	private getTokenText(token: Token): string {
		// Handle heading tokens
		if (token.type === "heading") {
			return (token as Tokens.Heading).text;
		}

		// Handle text tokens
		if (token.type === "text") {
			return (token as Tokens.Text).text;
		}

		// Handle link tokens
		if (token.type === "link") {
			return this.getTokenTextFromLink(token as Tokens.Link);
		}

		// Handle formatting tokens (strong, em, codespan)
		if (
			token.type === "strong" ||
			token.type === "em" ||
			token.type === "codespan"
		) {
			return this.getTokenTextFromFormatted(
				token as Tokens.Strong | Tokens.Em | Tokens.Codespan,
			);
		}

		// Handle image tokens (skip them)
		if (token.type === "image") {
			return "";
		}

		// Handle generic tokens with text property
		if ("text" in token && typeof token.text === "string") {
			return token.text;
		}

		// Handle tokens with nested tokens
		if ("tokens" in token && Array.isArray(token.tokens)) {
			let text = "";
			for (const child of token.tokens) {
				text += this.getTokenText(child);
			}
			return text;
		}

		// Fallback for unknown token types
		return "";
	}

	private getTokenTextFromLink(linkToken: Tokens.Link): string {
		// Try to get text from link token
		if (linkToken.text) {
			return linkToken.text;
		}

		// If no text, try to extract from child tokens
		if (linkToken.tokens) {
			let text = "";
			for (const child of linkToken.tokens) {
				text += this.getTokenText(child);
			}
			return text;
		}

		return linkToken.href; // Fallback to href
	}

	private getTokenTextFromFormatted(
		token: Tokens.Strong | Tokens.Em | Tokens.Codespan,
	): string {
		// Try to get text directly
		if (token.text) {
			return token.text;
		}

		// Try to extract from child tokens (only strong and em have tokens)
		if ("tokens" in token && token.tokens) {
			let text = "";
			for (const child of token.tokens) {
				text += this.getTokenText(child);
			}
			return text;
		}

		return "";
	}

	private processHeadings(): void {
		// Apply firsth1 option
		if (!this.options.firsth1) {
			this.headings = this.headings.slice(1);
		}

		// Apply filter function if provided
		if (typeof this.options.filter === "function") {
			this.headings = this.headings.filter((heading) => {
				return this.options.filter?.(heading.content, heading, this.headings);
			});
		}
	}

	private generateTOCContent(): string {
		const lines: string[] = [];
		const bullets = Array.isArray(this.options.bullets)
			? this.options.bullets
			: this.options.chars || ["-", "*", "+"];

		const indent = this.options.indent || "  ";

		for (const heading of this.headings) {
			// Skip headings beyond maxdepth (already filtered, but double-check)
			if (heading.lvl > (this.options.maxdepth || 6)) {
				continue;
			}

			// Determine bullet character based on depth
			const bulletIndex = Math.min(heading.lvl - 1, bullets.length - 1);
			const bullet = bullets[bulletIndex] || "-";

			// Calculate indentation level
			const highestLevel = this.getHighestLevel();
			const indentLevel = Math.max(0, heading.lvl - highestLevel);
			const indentation = indent.repeat(indentLevel);

			if (this.options.linkify !== false) {
				// Generate linked TOC entry
				const linkText =
					this.options.titleize !== false
						? this.titleize(heading.content)
						: heading.content;

				lines.push(`${indentation}${bullet} [${linkText}](#${heading.slug})`);
			} else {
				// Generate plain TOC entry
				lines.push(`${indentation}${bullet} ${heading.content}`);
			}
		}

		// Add append text if provided
		if (this.options.append) {
			lines.push(this.options.append);
		}

		return lines.join("\n");
	}

	private generateJSONOutput(): HeadingToken[] {
		return this.headings.map((heading) => ({
			content: heading.content,
			slug: heading.slug,
			lvl: heading.lvl,
			i: heading.i,
			seen: heading.seen,
		}));
	}

	private getHighestLevel(): number {
		if (this.headings.length === 0) return 0;
		return Math.min(...this.headings.map((h) => h.lvl));
	}

	private titleize(str: string): string {
		if (typeof this.options.titleize === "function") {
			return this.options.titleize(str, this.options);
		}

		// Default titleize behavior
		let result = str;

		// Strip HTML tags if not disabled
		if (this.options.stripHeadingTags !== false) {
			result = result.replace(/<\/?[^>]+>/g, "");
		}

		// Clean up whitespace
		result = result.replace(/[ \t]+/g, " ").trim();

		return result;
	}
}

/**
 * Main parsing function using marked
 */
function parseWithFallback(
	content: string,
	options: TOCOptions,
): TOCResult {
	try {
		const adapter = new MarkedAdapter(options);
		return adapter.parse(content);
	} catch (error) {
		console.warn("Marked parsing failed.:", error);
		// Fallback to basic TOC generation or throw error
		throw error;
	}
}

/**
 * Generate a markdown table of contents. This is the main function
 * that does all of the work with marked.
 *
 * @param str - String of markdown
 * @param options - TOC generation options
 * @returns Markdown-formatted table of contents
 */
export default function toc(str: string, options: TOCOptions = {}): TOCResult {
	// Use the marked implementation
	return parseWithFallback(str, options);
}

/**
 * Expose insert method
 */
toc.insert = insert;

/**
 * Generate a markdown table of contents plugin for marked.
 */

// Expose utility functions for advanced usage
toc.utils = utils;

export { toc, insert, utils };
export type { TOCOptions, TOCResult, HeadingToken };
