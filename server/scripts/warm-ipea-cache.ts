import { config } from '../src/config';
import { createDiskCache } from '../src/infra/cache/cache';
import { createIpeaCatalog } from '../src/infra/ipea/catalog';

async function main() {
  try {
    const catalog = createIpeaCatalog({
      cache: createDiskCache(config.cacheDir),
      url: config.ipeaCsvUrl,
      timeoutMs: config.ipeaTimeoutMs,
    });
    const result = await catalog.findOrganizations('rs', ['5', '2']);
    console.log(JSON.stringify({
      source: result.source,
      snapshotDate: result.snapshotDate,
      rsSampleCount: result.total,
    }));
  } catch (error) {
    console.error(`IPEA cache warm-up failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

void main();
