import { spawn } from "node:child_process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      env: process.env
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });

    child.on("error", reject);
  });
}

async function main() {
  if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL detected, running Prisma deploy...");
    await run("npm", ["run", "prisma:deploy"]);
  } else {
    console.log("DATABASE_URL is not configured, skipping Prisma deploy and starting in memory fallback mode.");
  }

  await run("npm", ["run", "start"]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
