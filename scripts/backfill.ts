import type { AppBskyLabelerDefs } from '@atcute/bluesky';
import type {} from '@atcute/atproto';

import { Client, ok, simpleFetchHandler } from '@atcute/client';
import type { Did } from '@atcute/lexicons';
import type { Records } from '@atcute/lexicons/ambient';

import { chunked } from '@mary/async-iterator-fns';

const relay = new Client({
	handler: simpleFetchHandler({ service: 'https://relay1.us-west.bsky.network' }),
});

const appview = new Client({
	handler: simpleFetchHandler({ service: 'https://public.api.bsky.app' }),
});

async function* listReposByCollection(collection: keyof Records): AsyncGenerator<Did> {
	let cursor: string | undefined;
	do {
		const backfills = await ok(relay.get('com.atproto.sync.listReposByCollection', {
			headers: {
				'user-agent': 'github:mary-ext/bluesky-labeler-scraping',
			},
			params: {
				collection: collection,
				cursor: cursor,
				limit: 2_000,
			},
		}));

		cursor = backfills.cursor;

		for (const { did } of backfills.repos) {
			yield did;
		}
	} while (cursor !== undefined);
}

await Deno.remove('labelers/', { recursive: true });
await Deno.mkdir('labelers/plc', { recursive: true });
await Deno.mkdir('labelers/web', { recursive: true });

for await (const chunk of chunked(listReposByCollection('app.bsky.labeler.service'), 10)) {
	const data = await ok(appview.get('app.bsky.labeler.getServices', {
		params: {
			dids: chunk,
			detailed: true,
		},
	}));

	const views = data.views as AppBskyLabelerDefs.LabelerViewDetailed[];

	for (const view of views) {
		const did = view.creator.did;
		const filename = `labelers/${did.slice(4).replaceAll(':', '/')}.json`;

		console.log(`got ${did}`);
		await Deno.writeTextFile(filename, JSON.stringify(view, null, '\t'));
	}
}
