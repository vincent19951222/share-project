import "dotenv/config";
import { pushDailyReminderToWeWork } from "@/lib/wework-webhook";

async function main() {
  const result = await pushDailyReminderToWeWork();

  if (result.status === "failed") {
    console.error(`Daily WeWork reminder failed: ${result.reason}`);
    process.exitCode = 1;
    return;
  }

  if (result.status === "skipped") {
    console.log(`Daily WeWork reminder skipped: ${result.reason}`);
    return;
  }

  console.log("Daily WeWork reminder sent.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Daily WeWork reminder failed.");
  process.exitCode = 1;
});
