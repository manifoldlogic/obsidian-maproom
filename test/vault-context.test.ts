import { vi, describe, it, expect } from "vitest";

vi.mock("obsidian", () => ({
	Notice: vi.fn(),
}));

import { getStatusBarText } from "../src/vault-context";
import type { VaultContext } from "../src/vault-context";

function makeVaultContext(overrides: Partial<VaultContext> = {}): VaultContext {
	return {
		vaultPath: "/fake/vault",
		maproomBinaryPath: "/usr/local/bin/maproom",
		gitRoot: "/fake/git/root",
		isGitRepo: true,
		repoName: "test-repo",
		databasePath: "/home/user/.maproom/test-repo/maproom.db",
		databaseExists: true,
		maproomAvailable: true,
		maproomVersion: "1.0.0",
		...overrides,
	};
}

describe("getStatusBarText()", () => {
	it("returns 'Maproom: unavailable' when context is null", () => {
		expect(getStatusBarText(null)).toBe("Maproom: unavailable");
	});

	it("returns 'Maproom: no git repo' when isGitRepo is false", () => {
		expect(getStatusBarText(makeVaultContext({ isGitRepo: false }))).toBe("Maproom: no git repo");
	});

	it("returns 'Maproom: unavailable' when maproomAvailable is false", () => {
		expect(getStatusBarText(makeVaultContext({ maproomAvailable: false }))).toBe("Maproom: unavailable");
	});

	it("returns 'Maproom: unavailable' when databaseExists is false", () => {
		expect(getStatusBarText(makeVaultContext({ databaseExists: false }))).toBe("Maproom: unavailable");
	});

	it("returns 'Maproom: unavailable' when both maproomAvailable and databaseExists are false", () => {
		expect(getStatusBarText(makeVaultContext({ maproomAvailable: false, databaseExists: false }))).toBe("Maproom: unavailable");
	});

	it("returns 'Maproom: ready' when all conditions are met", () => {
		expect(getStatusBarText(makeVaultContext())).toBe("Maproom: ready");
	});
});
