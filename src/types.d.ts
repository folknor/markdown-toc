// Type declarations for dependencies without TypeScript support

declare module "diacritics-map" {
	const diacritics: Record<string, string>;
	export default diacritics;
}

declare module "remarkable" {
	class Remarkable {
		constructor(options?: unknown);
		use(plugin: unknown): this;
		render(content: string): unknown;
		renderer: {
			render: (tokens: unknown[]) => unknown;
		};
	}

	export { Remarkable };
}

declare module "minimist" {
	function minimist(args: string[], options?: unknown): unknown;
	export = minimist;
}

declare module "concat-stream" {
	function concatStream(
		callback: (data: unknown) => void,
	): NodeJS.ReadWriteStream;
	export = concatStream;
}
