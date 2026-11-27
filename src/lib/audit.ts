import { desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db, isDbConnected } from "@/db";
import * as schema from "@/db/schema";
import { verifyAdmin } from "./admin-auth";
import { getLocalStore, updateLocalStore } from "./local-store";

/**
 * Audit log admin: best-effort, TIDAK PERNAH melempar error.
 * Urutan tulis: Supabase (bila terhubung) -> fallback local-store.json.
 * Dibaca kembali di /admin/system via getAuditLogs().
 */

export interface AuditLogData {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  actor?: string | null;
  detail?: string | null;
  createdAt: string;
}

export interface LogAuditInput {
  action: string;
  entity: string;
  entityId?: string;
  detail?: string;
}

const MAX_LOCAL_AUDIT = 500;

async function resolveActor(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}

function readLocalAudits(): AuditLogData[] {
  try {
    const store = getLocalStore();
    return Array.isArray(store?.auditLogs) ? (store.auditLogs as AuditLogData[]) : [];
  } catch {
    return [];
  }
}

function appendLocalAudit(entry: AuditLogData): void {
  try {
    const list = [...readLocalAudits(), entry].slice(-MAX_LOCAL_AUDIT);
    updateLocalStore("auditLogs", list);
  } catch {
    // Audit tidak boleh mengganggu mutasi utama — abaikan diam-diam.
  }
}

/** Catat kejadian admin. Selalu resolve (tidak pernah reject). */
export async function logAudit(input: LogAuditInput): Promise<void> {
  const entry: AuditLogData = {
    id: crypto.randomUUID(),
    action: input.action.slice(0, 60),
    entity: input.entity.slice(0, 40),
    entityId: input.entityId?.slice(0, 120) ?? null,
    actor: await resolveActor(),
    detail: input.detail?.slice(0, 500) ?? null,
    createdAt: new Date().toISOString(),
  };

  if (isDbConnected) {
    try {
      await db.insert(schema.auditLogs).values({
        id: entry.id,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        actor: entry.actor,
        detail: entry.detail,
      });
      return;
    } catch {
      // Lanjut ke fallback file di bawah.
    }
  }
  appendLocalAudit(entry);
}

/** Ambil N audit terbaru (DB dulu, fallback file). Admin-only, tidak pernah throw. */
export async function getAuditLogs(limit = 50): Promise<{ logs: AuditLogData[]; source: string }> {
  await verifyAdmin();
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  if (isDbConnected) {
    try {
      const rows = await db
        .select()
        .from(schema.auditLogs)
        .orderBy(desc(schema.auditLogs.createdAt))
        .limit(safeLimit);
      return {
        logs: rows.map((r) => ({
          id: r.id,
          action: r.action,
          entity: r.entity,
          entityId: r.entityId,
          actor: r.actor,
          detail: r.detail,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        })),
        source: "Supabase PostgreSQL",
      };
    } catch {
      // Fallback ke file di bawah.
    }
  }
  return { logs: readLocalAudits().slice(-safeLimit).reverse(), source: "local-store.json" };
}
