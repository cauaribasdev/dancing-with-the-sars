export function demoFeed(feature: string, id: string): object {
  if (feature === 'alerts') {
    return {
      dataSource: 'cache',
      region: { id, name: id },
      updatedAt: null,
      summary: { active: 0, highestSeverity: null },
      alerts: []
    };
  } else if (feature === 'organizations') {
    return {
      region: { id, name: id },
      reference: { lon: 0, lat: 0, kind: 'state' },
      total: 0,
      organizations: [],
      campaigns: [],
      notice: 'Dados sintéticos — não são dados reais'
    };
  } else if (feature === 'posts') {
    return {
      dataSource: 'cache',
      region: { id, name: id },
      posts: [],
      nextCursor: null
    };
  } else {
    throw new Error('Feature desconhecida');
  }
}
