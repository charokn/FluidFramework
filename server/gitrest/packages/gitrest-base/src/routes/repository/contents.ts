/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { handleResponse } from "@fluidframework/server-services-shared";
import { Router } from "express";
import nconf from "nconf";
import {
	checkSoftDeleted,
	getFilesystemManagerFactory,
	getRepoManagerParamsFromRequest,
	IFileSystemManagerFactories,
	IRepositoryManagerFactory,
	logAndThrowApiError,
} from "../../utils";

export function create(
	store: nconf.Provider,
	fileSystemManagerFactories: IFileSystemManagerFactories,
	repoManagerFactory: IRepositoryManagerFactory,
): Router {
	const router: Router = Router();
	const repoPerDocEnabled: boolean = store.get("git:repoPerDocEnabled") ?? false;

	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	router.get("/repos/:owner/:repo/contents/*", async (request, response, next) => {
		const repoManagerParams = getRepoManagerParamsFromRequest(request);
		const resultP = repoManagerFactory
			.open(repoManagerParams)
			.then(async (repoManager) => {
				console.log({message:"repo manager created successfully",repoManagerParams, repoManager, request, response, next,time:new Date().toISOString()})
				const fileSystemManagerFactory = getFilesystemManagerFactory(
					fileSystemManagerFactories,
					repoManagerParams.isEphemeralContainer,
				);
				const fsManager = fileSystemManagerFactory.create(
					repoManagerParams.fileSystemManagerParams,
				);
				await checkSoftDeleted(
					fsManager,
					repoManager.path,
					repoManagerParams,
					repoPerDocEnabled,
				);
				return repoManager.getContent(request.query.ref as string, request.params[0]);
			})
			.catch((error) =>{
				if(error.code === "NotFoundError") {
					console.log('CEDIT_LOGS_GITREST_1 -> contents.ts : NotFoundError: ', error);
				}else if(error.message == "Request failed"){
					console.log('CEDIT_LOGS_GITREST_2 -> contents.ts : Request failed: ', error);
				}
				return logAndThrowApiError(error, request, repoManagerParams)});
		handleResponse(resultP, response);
	});

	return router;
}
