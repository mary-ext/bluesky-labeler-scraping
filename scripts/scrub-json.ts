import { glob } from 'node:fs/promises';

for await (const f of glob('./labelers/**/*.json')) {
	const raw = await Deno.readTextFile(f);
	const json = JSON.parse(raw);

	delete json.likeCount;
	delete json['$type'];

	await Deno.writeTextFile(f, JSON.stringify(json, null, 2) + '\n');
}
