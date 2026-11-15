export function orderComposition(ids: readonly string[], passes: readonly {id:string;start:string}[]): string[] {
  const validIds = new Set(passes.map(pass => pass.id));
  const sortedIds = ids
    .filter(id => validIds.has(id))
    .sort((a, b) => {
      const passA = passes.find(pass => pass.id === a);
      const passB = passes.find(pass => pass.id === b);
      if (passA && passB) {
        return new Date(passA.start).getTime() - new Date(passB.start).getTime() || a.localeCompare(b);
      }
      return 0;
    });
  return [...new Set(sortedIds)];
}
