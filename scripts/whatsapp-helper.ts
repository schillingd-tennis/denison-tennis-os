import { runWhatsAppHelper } from "../src/features/interactions/whatsappSync/helperMain";

void runWhatsAppHelper(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  },
);
