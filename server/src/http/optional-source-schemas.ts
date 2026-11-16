import { z } from 'zod';

const dataSourceSchema = z.enum(['live', 'cache', 'stale']);
const regionSchema = z.object({ id: z.string(), name: z.string() });
const municipalitySchema = z.object({
  code: z.union([z.string(), z.number()]),
  name: z.string(),
});
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}, 'Expected a valid calendar date in YYYY-MM-DD format');
const isoInstantSchema = z.string().datetime({ offset: true });

const positionSchema = z.tuple([z.number(), z.number()]);
const linearRingSchema = z.array(positionSchema);
const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(linearRingSchema),
});
const multiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(linearRingSchema)),
});
const geometrySchema = z.union([polygonSchema, multiPolygonSchema, z.null()]);

const alertSchema = z.object({
  id: z.string(),
  sent: isoInstantSchema,
  event: z.string(),
  severity: z.enum(['minor', 'moderate', 'severe', 'extreme']),
  color: z.string(),
  onset: isoInstantSchema,
  expires: isoInstantSchema,
  status: z.enum(['active', 'expired']),
  headline: z.string(),
  description: z.string(),
  instruction: z.string(),
  url: z.string().url(),
  municipalities: z.array(municipalitySchema),
  municipalityCountTotal: z.number().int().nonnegative(),
  geometry: geometrySchema.optional(),
});

export const alertsResponseSchema = z.object({
  dataSource: dataSourceSchema,
  region: regionSchema,
  updatedAt: isoInstantSchema,
  summary: z.object({
    active: z.number().int().nonnegative(),
    highestSeverity: z.enum(['minor', 'moderate', 'severe', 'extreme']).nullable(),
  }),
  alerts: z.array(alertSchema),
});

const organizationSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  areas: z.array(z.union([z.string(), z.number()])),
  municipality: municipalitySchema,
  lon: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  distanceKm: z.number().nonnegative(),
  url: z.string().url().optional().nullable(),
});

export const organizationsResponseSchema = z.object({
  dataSource: dataSourceSchema.optional(),
  region: regionSchema,
  reference: z.object({
    lon: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
    kind: z.string(),
  }).optional().nullable(),
  total: z.number().int().nonnegative(),
  organizations: z.array(organizationSchema),
  campaigns: z.array(z.object({
    source: z.string(),
    title: z.string(),
    url: z.string().url(),
  })).optional().nullable(),
  campaignsStatus: z.enum(['available', 'empty', 'not_configured', 'unavailable']).optional(),
  snapshotDate: dateSchema.optional().nullable(),
  nextCursor: z.string().optional().nullable(),
  notice: z.string().optional(),
});

const postLinkSchema = z.discriminatedUnion('page', [
  z.object({
    page: z.literal('region'),
    regionId: z.string(),
    tab: z.enum(['overview', 'radar', 'alerts', 'posts', 'help']).optional(),
    day: dateSchema.optional(),
  }),
  z.object({ page: z.literal('compare'), before: z.string(), after: z.string() }),
  z.object({ page: z.literal('story'), storyId: z.string() }),
]);

const postSchema = z.object({
  id: z.string(),
  kind: z.enum(['pass', 'pair', 'story']),
  date: dateSchema,
  title: z.string(),
  text: z.string(),
  link: postLinkSchema,
});

export const postsResponseSchema = z.object({
  dataSource: dataSourceSchema,
  region: regionSchema,
  query: z.object({ start: dateSchema, end: dateSchema, product: z.string(), limit: z.number().int().min(1).max(100) }).optional(),
  total: z.number().int().nonnegative(),
  posts: z.array(postSchema),
  nextCursor: z.string().optional().nullable(),
});

export type AlertsResponse = z.infer<typeof alertsResponseSchema>;
export type OrganizationsResponse = z.infer<typeof organizationsResponseSchema>;
export type PostsResponse = z.infer<typeof postsResponseSchema>;
