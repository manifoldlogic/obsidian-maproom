import { execFile } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Notice } from "obsidian";

export interface VaultContext {
	vaultPath: string;
	maproomBinaryPath: string;
	gitRoot: string | null;
	isGitRepo: boolean;
	repoName: string | null;
	databasePath: string | null;
	databaseExists: boolean;
	maproomAvailable: boolean;
	maproomVersion: string | null;
}

function execFileAsync(
	file: string,
	args: string[],
	options?: { cwd?: string; timeout?: number },
): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		execFile(file, args, { ...options }, (err, stdout, stderr) => {
			if (err) { reject(err as Error); return; }
			resolve({ stdout, stderr });
		});
	});
}

export async function detectVaultContext(
	vaultPath: string,
	maproomBinaryPath: string,
): Promise<VaultContext> {
	const context: VaultContext = {
		vaultPath,
		maproomBinaryPath,
		gitRoot: null,
		isGitRepo: false,
		repoName: null,
		databasePath: null,
		databaseExists: false,
		maproomAvailable: false,
		maproomVersion: null,
	};

	// Steps 1 & 2: Run git and binary probes concurrently
	const gitProbe = (async () => {
		try {
			const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], { cwd: vaultPath, timeout: 5000 });
			context.gitRoot = stdout.trim();
			context.isGitRepo = true;
			context.repoName = path.basename(context.gitRoot);
		} catch (error: unknown) {
			console.warn("[maproom] Git detection failed", error);
			context.isGitRepo = false;
			context.gitRoot = null;
			context.repoName = null;
		}
	})();

	const maproomProbe = (async () => {
		if (maproomBinaryPath.trim() === "") {
			console.warn("[maproom] Binary path is empty; skipping binary detection");
			context.maproomAvailable = false;
			context.maproomVersion = null;
			return;
		}
		try {
			const { stdout } = await execFileAsync(maproomBinaryPath, ["--version"], { timeout: 5000 });
			context.maproomAvailable = true;
			context.maproomVersion = stdout.trimStart().split("\n")[0]!.trim();
		} catch (error: unknown) {
			console.warn("[maproom] Maproom binary detection failed", error);
			context.maproomAvailable = false;
			context.maproomVersion = null;
		}
	})();

	await Promise.all([gitProbe, maproomProbe]);

	// Step 3: Database detection
	if (context.isGitRepo) {
		context.databasePath = path.join(os.homedir(), ".maproom", context.repoName!, "maproom.db");
		context.databaseExists = fs.existsSync(context.databasePath);
	} else {
		context.databasePath = null;
		context.databaseExists = false;
	}

	return context;
}

/* eslint-disable obsidianmd/ui/sentence-case -- Notice text contains proper nouns (Maproom, Settings) */
export function showPrerequisiteNotices(context: VaultContext): void {
	if (!context.isGitRepo) {
		new Notice("Maproom: This vault is not a git repository. Maproom requires a git-tracked vault.", 15000);
	}

	if (!context.maproomAvailable) {
		if (context.maproomBinaryPath.trim() === "") {
			new Notice("Maproom: Binary path is empty. Please configure a path in Settings.", 15000);
		} else {
			new Notice(`Maproom: Binary not found at \`${context.maproomBinaryPath}\`. Install Maproom or update the binary path in Settings.`, 15000);
		}
	}

	if (context.isGitRepo && context.maproomAvailable && !context.databaseExists) {
		new Notice(`Maproom: Database not found at \`${context.databasePath}\`. Has this vault been indexed? Run \`maproom\` in your vault directory to create the index.`, 15000);
	}
}
/* eslint-enable obsidianmd/ui/sentence-case */
