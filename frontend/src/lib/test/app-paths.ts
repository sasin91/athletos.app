/** Identity implementation of SvelteKit's path resolver for server-rendered unit tests. */
export function resolve(path: string): string {
	return path;
}
