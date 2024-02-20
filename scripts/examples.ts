import fs from "fs";

const PORT = 40052;
const TIMEOUT = 10_000;

const dirs = fs.readdirSync("examples");

for (const dir of dirs) {
  if (dir === "with-nextjs" || dir === "with-foundry") continue;

  console.log({ dir });

  const proc = Bun.spawn(["pnpm", "ponder", "start", `--port=${PORT}`], {
    cwd: `examples/${dir}/`,
    stdout: "inherit",
    env: { ...process.env, PONDER_LOG_LEVEL: "warn" },
  });

  const start: number = performance.now();
  let isComplete = false;

  await Promise.race([
    new Promise<void>((resolve) => {
      const interval = setInterval(async () => {
        try {
          const result = await fetch(`http://localhost:${PORT}/health`);

          if (result.status === 200) {
            clearInterval(interval);
            isComplete = true;
            resolve();
          }
        } catch {
          // no-op
        }
      }, 100);
    }),
    new Promise((resolve) => setTimeout(resolve, TIMEOUT)),
  ]);

  const indexTime = performance.now() - start;

  // run some queries

  try {
    const metrics = await fetch(`http://localhost:${PORT}/metrics`);

    // app, version of ponder, timestamp
    // await Bun.write("./metrics", metrics);
  } catch {
    // no op
  }

  proc.kill(1);

  console.log({
    indexTime,
    isComplete,
  });
}
