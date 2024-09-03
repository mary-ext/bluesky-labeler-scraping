import '@atcute/bluesky/lexicons';

import * as fs from 'node:fs';

import type { AppBskyLabelerDefs } from '@atcute/client/lexicons';

const glob = new Bun.Glob('./labelers/**/*.json');
const views = Array.from(glob.scanSync(), (f): AppBskyLabelerDefs.LabelerViewDetailed => {
	return JSON.parse(fs.readFileSync(f, 'utf-8'));
});

{
	const TABLE_RE = /(?<=<!-- table-start -->)[^]*(?=<!-- table-end -->)/;

	const template = `# Bluesky labelers

Last updated {{time}}[^1]

<!-- table-start --><!-- table-end -->

[^1]: Reflecting actual changes, not when the scraper was last run
`;

	let table = `
| Labeler | Likes |
| --- | --- |
`;

	const collator = new Intl.Collator('en-US');
	const sorted = views.toSorted((a, b) => {
		return (
			(b.likeCount ?? 0) - (a.likeCount ?? 0) ||
			collator.compare(a.creator.displayName || a.creator.handle, b.creator.displayName || b.creator.handle)
		);
	});

	for (const view of sorted) {
		const profile = view.creator;

		const displayName = profile.displayName || profile.handle;
		const likeCount = view.likeCount ?? 0;
		const description = (profile.description ?? '')
			.replace(/\n(?:.|\n)+$/, '')
			.trim()
			.replaceAll('\n', '<br>');

		let body = ``;
		body += `<a href=https://bsky.app/profile/${profile.did}><b>${escape(displayName)}</b></a>`;
		body += `<br>${escape(description) || `<i>No description</i>`}`;

		table += `| ${body} | ${likeCount} |\n`;
	}

	// Read existing Markdown file, check if it's equivalent
	let shouldWrite = true;

	try {
		const source = fs.readFileSync('./README.md', 'utf-8');

		if (TABLE_RE.exec(source)?.[0] === table) {
			shouldWrite = false;
		}
		// deno-lint-ignore no-empty
	} catch {}

	// Write the markdown file
	if (shouldWrite) {
		const final = template.replace('{{time}}', new Date().toISOString()).replace(TABLE_RE, table);

		fs.writeFileSync('./README.md', final);
		console.log(`wrote to readme`);
	} else {
		console.log(`writing skipped`);
	}
}

function escape(str: string) {
	return str.replace(/[<&|]/g, (c) => '&#' + c.charCodeAt(0) + ';');
}
