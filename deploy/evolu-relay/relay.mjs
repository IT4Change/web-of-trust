import { createConsole } from "@evolu/common";
import { createNodeJsRelay } from "@evolu/nodejs";
import { mkdirSync } from "node:fs";

// Ensure the data directory exists (for Docker volume mount)
mkdirSync("data", { recursive: true });
process.chdir("data");

const maxMB = parseInt(process.env.MAX_MB_PER_OWNER || "100", 10);
const maxBytes = maxMB * 1024 * 1024;
const port = parseInt(process.env.PORT || "4000", 10);

const relay = await createNodeJsRelay({
  console: createConsole(),
})({
  port,
  enableLogging: false,

  isOwnerWithinQuota: (_ownerId, requiredBytes) => {
    return requiredBytes <= maxBytes;
  },
});

if (relay.ok) {
  console.log(`Evolu Relay started on port ${port} (quota: ${maxMB} MB/owner)`);
  process.once("SIGINT", relay.value[Symbol.dispose]);
  process.once("SIGTERM", relay.value[Symbol.dispose]);
} else {
  console.error("Failed to start relay:", relay.error);
  process.exit(1);
}
