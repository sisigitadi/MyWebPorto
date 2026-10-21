import { execSync } from 'node:child_process';

const prevSha = process.env.VERCEL_GIT_PREVIOUS_SHA;

// If we are not in Vercel or this is the first deployment on this branch, proceed with build
if (!prevSha) {
  console.log('[vercel-ignore] No previous deployment SHA detected. Proceeding with build.');
  process.exit(1);
}

try {
  // Verify previous SHA exists in git history (handles shallow clone edge cases)
  execSync(`git rev-parse --verify "${prevSha}"`, { stdio: 'ignore' });

  // Check diff excluding markdown, docs, github workflows, and images/mockups
  // git diff --quiet exits with 0 if NO changes found, 1 if changes found
  execSync(
    `git diff --quiet "${prevSha}" HEAD -- . ":(exclude)*.md" ":(exclude)docs" ":(exclude).github"`,
    { stdio: 'ignore' }
  );

  // If git diff exited 0, there are NO code changes
  console.log('[vercel-ignore] Only documentation or excluded files changed. Skipping build.');
  process.exit(0);
} catch {
  // Exit code 1 or error means changes were detected or comparison failed safely -> proceed with build
  console.log('[vercel-ignore] Code changes detected or fallback triggered. Proceeding with build.');
  process.exit(1);
}
