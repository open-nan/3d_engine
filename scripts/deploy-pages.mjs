import { mkdtemp, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const worktree = await mkdtemp(join(tmpdir(), "3d-engine-pages-"));
const commitMessage = "Deploy GitHub Pages";

try {
  await run("git", ["init"], worktree);
  await run("git", ["checkout", "-b", "gh-pages"], worktree);
  await cp(dist, worktree, { recursive: true });
  await run("git", ["add", "-A"], worktree);
  await run("git", ["commit", "-m", commitMessage], worktree);
  await run("git", ["remote", "add", "origin", "git@github.com:open-nan/3d_engine.git"], worktree);
  await run("git", ["push", "-f", "origin", "gh-pages"], worktree);
  console.log("GitHub Pages deployed to gh-pages.");
} finally {
  await rm(worktree, { recursive: true, force: true });
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}
