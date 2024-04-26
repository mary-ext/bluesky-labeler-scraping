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

	views = viewChunks.flat(1).sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
}

{
	await Promise.all([
		Deno.writeTextFile('./labelers.min.json', JSON.stringify(views)),
		Deno.writeTextFile('./labelers.json', JSON.stringify(views, null, '\t')),
	]);
}
