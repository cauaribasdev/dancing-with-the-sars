export function mergeImageSelection(current: readonly string[], additions: readonly string[], allowed: readonly string[]): string[] {
    const union = [...new Set([...current, ...additions])];
    return union.filter(id => allowed.includes(id)).sort();
}
