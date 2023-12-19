/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import assert from "assert";
import { v4 as uuid } from "uuid";
import { SinonSpiedInstance, restore, spy } from "sinon";
import { IWholeFlatSummary, LatestSummaryId } from "@fluidframework/server-services-client";
import { ISummaryTestMode } from "./utils";
import {
	GitWholeSummaryManager,
	IFileSystemManagerFactory,
	IFileSystemPromises,
	IRepositoryManager,
	IsomorphicGitManagerFactory,
	MemFsManagerFactory,
} from "../utils";
import { NullExternalStorageManager } from "../externalStorageManager";
import {
	sampleChannelSummaryUpload,
	sampleContainerSummaryUpload,
	sampleContainerSummaryResponse,
	sampleInitialSummaryResponse,
	sampleInitialSummaryUpload,
	sampleChannelSummaryResult,
} from "./examples";
import {
	StorageAccessCallCounts,
	checkFullStorageAccessBaselinePerformance,
	checkInitialWriteStorageAccessBaselinePerformance,
} from "./storageAccess";
import { ISummaryWriteFeatureFlags } from "../utils/wholeSummary";

// Github Copilot wizardry.
function permuteFlags(obj: Record<string, boolean>): Record<string, boolean>[] {
	const keys = Object.keys(obj);
	const permutations: Record<string, boolean>[] = [];
	for (let i = 0; i < Math.pow(2, keys.length); i++) {
		const permutation: Record<string, boolean> = {};
		for (let j = 0; j < keys.length; j++) {
			permutation[keys[j]] = (i & (1 << j)) !== 0;
		}
		permutations.push(permutation);
	}
	return permutations;
}

function assertEqualSummaries(
	actual: IWholeFlatSummary,
	expected: IWholeFlatSummary,
	message?: string | Error,
) {
	// We cannot compare the container sha because it is generated by a commit which takes timestamp into account.
	// We also cannot compare the root tree sha because low-io write alters how the root tree is stored.
	assert.strictEqual(
		JSON.stringify(
			{
				...actual,
				id: "test-commit-sha",
				trees: [{ ...actual.trees[0], id: "test-tree-sha" }],
			},
			null,
			2,
		),
		JSON.stringify(
			{
				...expected,
				id: "test-commit-sha",
				trees: [{ ...expected.trees[0], id: "test-tree-sha" }],
			},
			null,
			2,
		),
		message,
	);
}
const testModes = permuteFlags({
	repoPerDocEnabled: false,
	enableLowIoWrite: false,
	enableOptimizedInitialSummary: false,
	enableSlimGitInit: false,
}) as unknown as ISummaryTestMode[];

const getFsManagerFactory = (
	fileSystem: string,
): {
	fsManagerFactory: IFileSystemManagerFactory;
	getFsSpy: () => SinonSpiedInstance<IFileSystemPromises>;
	fsCleanup: () => void;
	fsCheckSizeBytes: () => number;
} => {
	if (fileSystem === "memfs") {
		const memfsManagerFactory = new MemFsManagerFactory();
		return {
			fsManagerFactory: memfsManagerFactory,
			getFsSpy: () => spy(memfsManagerFactory.volume as unknown as IFileSystemPromises),
			fsCheckSizeBytes: () =>
				JSON.stringify(Object.values(memfsManagerFactory.volume.toJSON()).join()).length,
			fsCleanup: () => {
				memfsManagerFactory.volume.reset();
			},
		};
	}
	throw new Error(`Unknown file system ${fileSystem}`);
};

const testFileSystems = ["memfs"];
testFileSystems.forEach((fileSystem) => {
	const { fsManagerFactory, fsCleanup, fsCheckSizeBytes, getFsSpy } =
		getFsManagerFactory(fileSystem);
	testModes.forEach((testMode) => {
		describe(`Summaries (${JSON.stringify(testMode)})`, () => {
			const tenantId = "gitrest-summaries-test";
			let documentId: string;
			let repoManager: IRepositoryManager;
			const getWholeSummaryManager = (
				featureFlagOverrides?: Partial<ISummaryWriteFeatureFlags>,
			) => {
				// Always create a new WholeSummaryManager to reset internal caches.
				return new GitWholeSummaryManager(
					documentId,
					repoManager,
					{ documentId, tenantId },
					false /* externalStorageEnabled */,
					{
						enableLowIoWrite: testMode.enableLowIoWrite,
						optimizeForInitialSummary: testMode.enableOptimizedInitialSummary,
						...featureFlagOverrides,
					},
				);
			};
			let fsSpy: SinonSpiedInstance<IFileSystemPromises>;
			const getCurrentStorageAccessCallCounts = (): StorageAccessCallCounts => ({
				readFile: fsSpy.readFile.callCount,
				writeFile: fsSpy.writeFile.callCount,
				mkdir: fsSpy.mkdir.callCount,
				stat: fsSpy.stat.callCount,
			});
			beforeEach(async () => {
				documentId = uuid();
				// Spy on memfs volume to record number of calls to storage.
				fsSpy = getFsSpy();
				const repoManagerFactory = new IsomorphicGitManagerFactory(
					{
						useRepoOwner: true,
						baseDir: `/${uuid()}/tmp`,
					},
					{
						defaultFileSystemManagerFactory: fsManagerFactory,
					},
					new NullExternalStorageManager(),
					testMode.repoPerDocEnabled,
					false /* enableRepositoryManagerMetrics */,
					testMode.enableSlimGitInit,
					undefined /* apiMetricsSamplingPeriod */,
				);
				repoManager = await repoManagerFactory.create({
					repoOwner: tenantId,
					repoName: documentId,
					storageRoutingId: { tenantId, documentId },
				});
			});

			afterEach(() => {
				// Reset storage volume after each test.
				fsCleanup();
				// Reset Sinon spies after each test.
				restore();
			});

			// Test standard summary flow and storage access frequency.
			it("Can create and read an initial summary and a subsequent incremental summary", async () => {
				const initialWriteResponse = await getWholeSummaryManager().writeSummary(
					sampleInitialSummaryUpload,
					true,
				);
				assert.strictEqual(
					initialWriteResponse.isNew,
					true,
					"Initial summary write `isNew` should be `true`.",
				);
				assertEqualSummaries(
					initialWriteResponse.writeSummaryResponse as IWholeFlatSummary,
					sampleInitialSummaryResponse,
					"Initial summary write response should match expected response.",
				);

				if (fileSystem === "memfs") {
					checkInitialWriteStorageAccessBaselinePerformance(
						testMode,
						getCurrentStorageAccessCallCounts(),
					);
				}

				const initialReadResponse =
					await getWholeSummaryManager().readSummary(LatestSummaryId);
				assertEqualSummaries(
					initialReadResponse,
					sampleInitialSummaryResponse,
					"Initial summary read response should match expected response.",
				);

				const channelWriteResponse = await getWholeSummaryManager().writeSummary(
					sampleChannelSummaryUpload,
					false,
				);
				assert.strictEqual(
					channelWriteResponse.isNew,
					false,
					"Channel summary write `isNew` should be `false`.",
				);

				// Latest should still be the initial summary.
				const postChannelReadResponse =
					await getWholeSummaryManager().readSummary(LatestSummaryId);
				assertEqualSummaries(
					postChannelReadResponse,
					sampleInitialSummaryResponse,
					"Channel summary read response should match expected initial container summary response.",
				);

				const containerWriteResponse = await getWholeSummaryManager().writeSummary(
					// Replace the referenced channel summary with the one we just wrote.
					// This matters when low-io write is enabled, because it alters how the tree is stored.
					JSON.parse(
						JSON.stringify(sampleContainerSummaryUpload).replace(
							sampleChannelSummaryResult.id,
							channelWriteResponse.writeSummaryResponse.id,
						),
					),
					false,
				);
				assert.strictEqual(
					containerWriteResponse.isNew,
					false,
					"Container summary write `isNew` should be `false`.",
				);
				assertEqualSummaries(
					containerWriteResponse.writeSummaryResponse as IWholeFlatSummary,
					sampleContainerSummaryResponse,
					"Container summary write response should match expected response.",
				);

				const containerReadResponse =
					await getWholeSummaryManager().readSummary(LatestSummaryId);
				assertEqualSummaries(
					containerReadResponse,
					sampleContainerSummaryResponse,
					"Container summary read response should match expected response.",
				);

				// And we should still be able to read the initial summary when referenced by ID.
				const initialLaterReadResponse = await getWholeSummaryManager().readSummary(
					initialWriteResponse.writeSummaryResponse.id,
				);
				assertEqualSummaries(
					initialLaterReadResponse,
					sampleInitialSummaryResponse,
					"Later initial summary read response should match expected initial summary response.",
				);

				if (fileSystem === "memfs") {
					checkFullStorageAccessBaselinePerformance(
						testMode,
						getCurrentStorageAccessCallCounts(),
					);
					// Tests run against commit 7620034bac63c5e3c4cb85f666a41c46012e8a49 on Dec 13, 2023
					// showed that the final storage size was 13kb, or 23kb for low-io mode where summary blobs are not shared.
					const finalStorageSizeKb = Math.ceil(fsCheckSizeBytes() / 1_024);
					const expectedMaxStorageSizeKb = testMode.enableLowIoWrite ? 23 : 13;
					assert(
						Math.ceil(fsCheckSizeBytes() / 1_024) <= expectedMaxStorageSizeKb,
						`Storage size should be <= ${expectedMaxStorageSizeKb}kb. Got ${finalStorageSizeKb}`,
					);
				}
			});

			// Test cross-compat between low-io and non-low-io write modes for same summary.
			[true, false].forEach((enableLowIoWrite) => {
				it(`Can read from and write to an initial summary stored ${
					enableLowIoWrite ? "with" : "without"
				} low-io write`, async () => {
					await getWholeSummaryManager({
						enableLowIoWrite,
					}).writeSummary(sampleInitialSummaryUpload, true);

					const initialReadResponse =
						await getWholeSummaryManager().readSummary(LatestSummaryId);
					assertEqualSummaries(
						initialReadResponse,
						sampleInitialSummaryResponse,
						"Initial summary read response should match expected response.",
					);
					const channelWriteResponse = await getWholeSummaryManager().writeSummary(
						sampleChannelSummaryUpload,
						false,
					);
					const containerWriteResponse = await getWholeSummaryManager().writeSummary(
						// Replace the referenced channel summary with the one we just wrote.
						// This matters when low-io write is enabled, because it alters how the tree is stored.
						JSON.parse(
							JSON.stringify(sampleContainerSummaryUpload).replace(
								sampleChannelSummaryResult.id,
								channelWriteResponse.writeSummaryResponse.id,
							),
						),
						false,
					);
					assert.strictEqual(
						containerWriteResponse.isNew,
						false,
						"Container summary write `isNew` should be `false`.",
					);
					assertEqualSummaries(
						containerWriteResponse.writeSummaryResponse as IWholeFlatSummary,
						sampleContainerSummaryResponse,
						"Container summary write response should match expected response.",
					);
				});

				it(`Can read an incremental summary stored ${
					enableLowIoWrite ? "with" : "without"
				} low-io write`, async () => {
					await getWholeSummaryManager({
						enableLowIoWrite,
					}).writeSummary(sampleInitialSummaryUpload, true);
					const channelWriteResponse = await getWholeSummaryManager({
						enableLowIoWrite,
					}).writeSummary(sampleChannelSummaryUpload, false);
					const containerWriteResponse = await getWholeSummaryManager({
						enableLowIoWrite,
					}).writeSummary(
						// Replace the referenced channel summary with the one we just wrote.
						// This matters when low-io write is enabled, because it alters how the tree is stored.
						JSON.parse(
							JSON.stringify(sampleContainerSummaryUpload).replace(
								sampleChannelSummaryResult.id,
								channelWriteResponse.writeSummaryResponse.id,
							),
						),
						false,
					);

					const latestContainerReadResponse =
						await getWholeSummaryManager().readSummary(LatestSummaryId);
					assertEqualSummaries(
						latestContainerReadResponse,
						sampleContainerSummaryResponse,
						"Latest container summary read response should match expected response.",
					);

					// And we should still be able to read the initial summary when referenced by ID.
					const shaContainerReadResponse = await getWholeSummaryManager().readSummary(
						containerWriteResponse.writeSummaryResponse.id,
					);
					assertEqualSummaries(
						shaContainerReadResponse,
						sampleContainerSummaryResponse,
						"Sha container summary read response should match expected response.",
					);
				});
			});
		});
	});
});
