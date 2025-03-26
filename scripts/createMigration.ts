import { DateTime } from "luxon";
import { exec, execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// this allows await to be used to wait for a shell command to finish in the background
async function promisifyExec(input: string): Promise<string> {
  const shell = await getAvailableShell();

  return new Promise((resolve, reject) => {
    exec(input, { shell }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }
      resolve(stdout ? stdout : stderr);
    });
  });
}

// find which shells are available
function getAvailableShell(): string {
  const shells = ["zsh", "bash", "sh"];

  for (const shell of shells) {
    try {
      execSync(`command -v ${shell}`, { stdio: "ignore" });

      return shell;
    } catch (error) {
      // Shell not found, continue to next
    }
  }

  throw new Error("No suitable shell found");
}

async function handleOperation() {
  const argsMinusFileName = process.argv.slice(2);

  const migrationName = argsMinusFileName[0];
  await promisifyExec(`db-migrate create ${migrationName}`);

  const pathToMigrationsFolder = path.join(__dirname, "../migrations");
  const files = readdirSync(pathToMigrationsFolder);

  const dateStr = DateTime.now().toFormat("yyyyMMdd");
  const potentialMigrations = files.filter((file) => file.startsWith(dateStr));

  for (const migration of potentialMigrations) {
    const migrationPath = path.join(pathToMigrationsFolder, migration);

    const fileContents = readFileSync(migrationPath, "utf-8");

    const withoutConsoleLog = fileContents.replace(/console.log\(.+\);/g, "");

    writeFileSync(migrationPath, withoutConsoleLog);
  }
}

if (require.main === module) {
  void handleOperation();
}
