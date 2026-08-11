import { buscarAuditoria } from "@/lib/admin.functions";
import type { Auditoria } from "@/types/database.types";

export const AuditService = {
  listar(limite = 200): Promise<Auditoria[]> {
    return buscarAuditoria({ data: { limite } });
  },
} as const;
