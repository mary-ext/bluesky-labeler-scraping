import { BskyXRPC } from 'jsr:@mary/bluesky-client@0.5.11';
import type { AppBskyLabelerDefs, At } from 'jsr:@mary/bluesky-client@0.5.11/lexicons';

const chunked = <T>(arr: T[], size: number): T[][] => {
	const chunks: T[][] = [];

	for (let i = 0, il = arr.length; i < il; i += size) {
		chunks.push(arr.slice(i, i + size));
	}

	return chunks;
};

let dids: At.DID[];

{
	const resp = await fetch('https://blue.mackuba.eu/labellers/');
	const text = await resp.text();

	dids = Array.from(
		text.matchAll(/class="did".*?(did:[a-z]+:[a-zA-Z0-9._:%-]*[a-zA-Z0-9._-]).*?>/g),
		(v) => v[1] as At.DID,
	);
}

let views: AppBskyLabelerDefs.LabelerView[];

{
	const rpc = new BskyXRPC({ service: 'https://public.api.bsky.app' });

	const viewChunks = await Promise.all(
		chunked(dids, 10).map(async (chunk) => {
			const response = await rpc.get('app.bsky.labeler.getServices', {
				params: {
					dids: chunk,
					detailed: false,
				},
			});

			return response.data.views as AppBskyLabelerDefs.LabelerView[];
		}),
	);

	const collator = new Intl.Collator('en-US');

	views = viewChunks.flat(1).sort((a, b) => collator.compare(a.uri, b.uri));

	// Remap the DID so we can get sorted DID listing as well
	dids = views.map((view) => view.creator.did);
}

{
	await Promise.all([
		Deno.writeTextFile('./labelers.min.json', JSON.stringify(views)),
		Deno.writeTextFile('./labelers.json', JSON.stringify(views, null, '\t')),

		Deno.writeTextFile('./did.min.json', JSON.stringify(dids)),
		Deno.writeTextFile('./did.json', JSON.stringify(dids, null, '\t')),
	]);
}
