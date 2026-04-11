import { vi, describe, it, expect, beforeEach } from "vitest";
import type { ChildProcess } from "child_process";

vi.mock("child_process", () => ({
	execFile: vi.fn(),
}));

import { execFile } from "child_process";
import {
	MaproomService,
	MaproomSearchError,
	type MaproomServiceConfig,
	type SearchResult,
} from "../src/maproom-service";
import type { VaultContext } from "../src/vault-context";

const mockExecFile = vi.mocked(execFile);

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

function makeConfig(overrides: Partial<MaproomServiceConfig> = {}): MaproomServiceConfig {
	return {
		maproomBinaryPath: "/usr/local/bin/maproom",
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("MaproomService", () => {
	describe("isAvailable()", () => {
		it("returns true when all three flags are true", () => {
			const svc = new MaproomService(makeConfig(), makeVaultContext());
			expect(svc.isAvailable()).toBe(true);
		});

		it("returns false when maproomAvailable is false", () => {
			const svc = new MaproomService(
				makeConfig(),
				makeVaultContext({ maproomAvailable: false }),
			);
			expect(svc.isAvailable()).toBe(false);
		});

		it("returns false when isGitRepo is false", () => {
			const svc = new MaproomService(
				makeConfig(),
				makeVaultContext({ isGitRepo: false }),
			);
			expect(svc.isAvailable()).toBe(false);
		});

		it("returns false when databaseExists is false", () => {
			const svc = new MaproomService(
				makeConfig(),
				makeVaultContext({ databaseExists: false }),
			);
			expect(svc.isAvailable()).toBe(false);
		});
	});

	describe("search()", () => {
		const sampleResults: SearchResult[] = [
			{
				filePath: "notes/test.md",
				score: 0.95,
				title: "Test",
				snippet: "match",
			},
		];

		it("returns parsed results on happy path", async () => {
			mockExecFile.mockImplementation((_path, _args, _opts, callback) => {
				const fakeProc = { kill: vi.fn(), pid: 1234 } as unknown as ChildProcess;
				(callback as Function)(null, JSON.stringify(sampleResults), "");
				return fakeProc;
			});

			const svc = new MaproomService(makeConfig(), makeVaultContext());
			const results = await svc.search("test query");

			expect(results).toEqual(sampleResults);
		});

		it("rejects with BINARY_NOT_FOUND when execFile returns ENOENT", async () => {
			mockExecFile.mockImplementation((_path, _args, _opts, callback) => {
				const fakeProc = { kill: vi.fn(), pid: 1234 } as unknown as ChildProcess;
				const err = Object.assign(new Error("ENOENT"), {
					code: "ENOENT",
					killed: false,
				});
				(callback as Function)(err, "", "");
				return fakeProc;
			});

			const svc = new MaproomService(makeConfig(), makeVaultContext());
			await expect(svc.search("test")).rejects.toThrow(MaproomSearchError);
			await expect(svc.search("test")).rejects.toMatchObject({
				code: "BINARY_NOT_FOUND",
			});
		});

		it("rejects with NON_ZERO_EXIT when process exits with non-zero code", async () => {
			mockExecFile.mockImplementation((_path, _args, _opts, callback) => {
				const fakeProc = { kill: vi.fn(), pid: 1234 } as unknown as ChildProcess;
				const err = Object.assign(new Error("Command failed"), {
					code: 1,
					killed: false,
				});
				(callback as Function)(err, "", "some stderr");
				return fakeProc;
			});

			const svc = new MaproomService(makeConfig(), makeVaultContext());
			await expect(svc.search("test")).rejects.toThrow(MaproomSearchError);
			await expect(svc.search("test")).rejects.toMatchObject({
				code: "NON_ZERO_EXIT",
			});
		});

		it("rejects with PARSE_ERROR when stdout is not valid JSON", async () => {
			mockExecFile.mockImplementation((_path, _args, _opts, callback) => {
				const fakeProc = { kill: vi.fn(), pid: 1234 } as unknown as ChildProcess;
				(callback as Function)(null, "not json", "");
				return fakeProc;
			});

			const svc = new MaproomService(makeConfig(), makeVaultContext());
			await expect(svc.search("test")).rejects.toThrow(MaproomSearchError);
			await expect(svc.search("test")).rejects.toMatchObject({
				code: "PARSE_ERROR",
			});
		});

		it("rejects with TIMEOUT when process is killed by timeout", async () => {
			mockExecFile.mockImplementation((_path, _args, _opts, callback) => {
				const fakeProc = { kill: vi.fn(), pid: 1234 } as unknown as ChildProcess;
				const err = Object.assign(new Error("Timed out"), {
					killed: true,
					code: undefined,
				});
				(callback as Function)(err, "", "");
				return fakeProc;
			});

			const svc = new MaproomService(makeConfig(), makeVaultContext());
			await expect(svc.search("test")).rejects.toThrow(MaproomSearchError);
			await expect(svc.search("test")).rejects.toMatchObject({
				code: "TIMEOUT",
			});
		});

		it("rejects first search with CANCELLED when superseded by second search", async () => {
			const sampleJson = JSON.stringify(sampleResults);
			let callCount = 0;

			mockExecFile.mockImplementation((_path, _args, _opts, callback) => {
				callCount++;
				if (callCount === 1) {
					// First call: defer the callback. When kill() is called,
					// fire the callback synchronously with a killed error.
					let storedCallback = callback as Function;
					const fakeProc = {
						kill: vi.fn(() => {
							const err = Object.assign(new Error("Killed"), {
								killed: true,
								code: undefined,
							});
							storedCallback(err, "", "");
						}),
						pid: 1234,
					} as unknown as ChildProcess;
					return fakeProc;
				} else {
					// Second call: resolve immediately with success
					const fakeProc = { kill: vi.fn(), pid: 5678 } as unknown as ChildProcess;
					(callback as Function)(null, sampleJson, "");
					return fakeProc;
				}
			});

			const svc = new MaproomService(makeConfig(), makeVaultContext());

			// Start first search (callback is deferred)
			const firstPromise = svc.search("first query");

			// Start second search — this kills the first process,
			// which synchronously fires the first callback with killed error
			// while searchWasCancelled is still true
			const secondPromise = svc.search("second query");

			// First search should reject with CANCELLED
			await expect(firstPromise).rejects.toThrow(MaproomSearchError);
			await expect(firstPromise).rejects.toMatchObject({
				code: "CANCELLED",
			});

			// Second search should resolve with results
			const results = await secondPromise;
			expect(results).toEqual(sampleResults);
		});
	});

	describe("destroy()", () => {
		it("does not throw when no active process exists", () => {
			const svc = new MaproomService(makeConfig(), makeVaultContext());
			expect(() => svc.destroy()).not.toThrow();
		});
	});
});
