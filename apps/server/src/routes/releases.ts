import { PLATFORMS } from "@contextjule/core/downloads";
import prisma from "@contextjule/db";
import { Hono } from "hono";
import { z } from "zod";

import { requireAdmin } from "../lib/admin";
import { badRequest, notFound } from "../lib/http";

/**
 * Releases.
 *
 * This closes a loop that was previously open: the release workflow uploads
 * installers to R2 and writes the updater manifest, but nothing told the API a
 * build existed — so `/api/downloads/latest` and every emailed download link
 * resolved to "there is no published build yet", permanently.
 *
 * CI calls POST /api/releases at the end of a successful build. Publishing is
 * idempotent on (version, channel), so a re-run of the same workflow updates
 * the artifacts rather than creating a second row.
 */
export const releaseRoutes = new Hono();

const artifactSchema = z.object({
  platform: z.enum(PLATFORMS),
  arch: z.string().trim().min(1).max(32).default("x64"),
  filename: z.string().trim().min(1).max(200),
  /** Key in object storage. Never a public URL — links are signed on demand. */
  storageKey: z.string().trim().min(1).max(500),
  sizeBytes: z.number().int().positive().optional(),
  sha256: z.string().trim().length(64).optional(),
  /** Tauri updater signature, when the artifact feeds the updater. */
  signature: z.string().trim().max(2000).optional(),
});

const publishSchema = z.object({
  version: z.string().trim().min(1).max(40),
  channel: z.enum(["stable", "beta"]).default("stable"),
  notes: z.string().max(10_000).optional(),
  /** Stage a build without announcing it by passing false. */
  publish: z.boolean().default(true),
  artifacts: z.array(artifactSchema).min(1),
});

releaseRoutes.post("/", requireAdmin, async (c) => {
  const parsed = publishSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    throw badRequest("invalid_release", parsed.error.issues[0]?.message ?? "Malformed release.");
  }
  const { version, channel, notes, publish, artifacts } = parsed.data;

  const release = await prisma.release.upsert({
    where: { version_channel: { version, channel } },
    create: {
      version,
      channel,
      notes: notes ?? null,
      publishedAt: publish ? new Date() : null,
    },
    update: {
      notes: notes ?? undefined,
      // Re-running a workflow must not un-publish something already live.
      publishedAt: publish ? new Date() : undefined,
      yanked: false,
    },
  });

  for (const artifact of artifacts) {
    await prisma.releaseArtifact.upsert({
      where: {
        releaseId_platform_arch: {
          releaseId: release.id,
          platform: artifact.platform,
          arch: artifact.arch,
        },
      },
      create: { releaseId: release.id, ...artifact },
      update: { ...artifact },
    });
  }

  return c.json({ id: release.id, version, channel, published: Boolean(release.publishedAt) });
});

/** Pull a build after the fact — a bad signing key, a broken installer. */
releaseRoutes.post("/:version/yank", requireAdmin, async (c) => {
  const channel = c.req.query("channel") === "beta" ? "beta" : "stable";
  const release = await prisma.release.findUnique({
    where: { version_channel: { version: c.req.param("version"), channel } },
  });
  if (!release) throw notFound("unknown_release", "No such release.");

  await prisma.release.update({ where: { id: release.id }, data: { yanked: true } });
  return c.json({ yanked: true });
});

/** What the site's download page renders. Public. */
releaseRoutes.get("/latest", async (c) => {
  const channel = c.req.query("channel") === "beta" ? "beta" : "stable";
  const release = await prisma.release.findFirst({
    where: { channel, yanked: false, publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    include: { artifacts: true },
  });

  if (!release) return c.json({ release: null });

  return c.json({
    release: {
      version: release.version,
      channel: release.channel,
      notes: release.notes,
      publishedAt: release.publishedAt,
      artifacts: release.artifacts.map((artifact) => ({
        platform: artifact.platform,
        arch: artifact.arch,
        filename: artifact.filename,
        sizeBytes: artifact.sizeBytes,
        sha256: artifact.sha256,
      })),
    },
  });
});
