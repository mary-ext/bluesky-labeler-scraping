import '@atcute/bluesky/lexicons';

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { simpleFetchHandler, XRPC } from '@atcute/client';
import type { AppBskyLabelerDefs, At } from '@atcute/client/lexicons';

const chunked = <T>(arr: T[], size: number): T[][] => {
	const chunks: T[][] = [];

	for (let i = 0, il = arr.length; i < il; i += size) {
		chunks.push(arr.slice(i, i + size));
	}

	return chunks;
};

let dids: At.DID[];

await fs.rm('./labelers/', { force: true, recursive: true });

{
	const resp = await fetch('https://blue.mackuba.eu/xrpc/blue.feeds.mod.getLabellers');
	const json = await resp.json();

	// deno-lint-ignore no-explicit-any
	dids = json.labellers.map((labeler: any) => labeler.did);
}

{
	const rpc = new XRPC({
		handler: simpleFetchHandler({ service: 'https://public.api.bsky.app' }),
	});

	await Promise.all(
		chunked(dids, 10).map(async (chunk) => {
			const { data } = await rpc.get('app.bsky.labeler.getServices', {
				params: {
					dids: chunk,
					detailed: true,
				},
			});

			const views = data.views as AppBskyLabelerDefs.LabelerViewDetailed[];

			for (const view of views) {
				const did = view.creator.did;
				const filename = `./labelers/${did.slice(4).replaceAll(':', '/')}.json`;
				const dirname = path.dirname(filename);

				await fs.mkdir(dirname, { recursive: true });
				await fs.writeFile(filename, JSON.stringify(view, null, '\t'));
			}
		}),
	);
}
