import { AgentContext } from "../types/context";

function isInvalid(uc: any) {
  const text = JSON.stringify(uc).toLowerCase();

  return (
    text.includes("bank officer") ||
    text.includes("branch manager") ||
    text.includes("customer visits branch") ||
    text.includes("cbs") ||
    text.includes("los system")
  );
}
export async function domainGuardAgent(
  ctx: AgentContext,
  send?: (event: string, data: any) => void,
) {
  if (ctx.domain === "NBFC-P2P") {
    const original = ctx.useCases || [];

    send?.("domain-guard-start", {
      total: original.length,
    });

    const filtered = original.filter((uc) => !isInvalid(uc));
    const removed = original.length - filtered.length;

    if (!filtered.length) {
      console.warn("⚠️ DomainGuard: All use cases filtered! Keeping original.");
      return ctx;
    }

    if (removed > 0) {
      const removedItems = original
        .filter((uc) => isInvalid(uc))
        .map((uc) => uc.name);

      console.log("🛡️ Removed invalid use cases:", removedItems);

      send?.("domain-guard-removed", {
        items: removedItems,
      });
    }

    ctx.useCases = filtered;

    console.log(
      `🛡️ Domain Guard removed ${removed} invalid use cases (remaining: ${filtered.length})`,
    );

    send?.("domain-guard-complete", {
      removed,
      remaining: filtered.length,
    });
  }

  return ctx;
}
