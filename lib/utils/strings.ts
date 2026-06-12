/**
 * Convert a camel case string to kebab case.
 * @param str The input string.
 * @returns The converted string.
 */
export const camelToKebab = (str: string): string | undefined => {
	if (!str) return str;
	if (str === str.toLowerCase()) return str;
	return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
};
