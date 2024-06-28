import { AppBskyLabelerDefs } from 'jsr:@mary/bluesky-client@0.5.11/lexicons';

const views: AppBskyLabelerDefs.LabelerView[] = JSON.parse(await Deno.readTextFile('./labelers.json'));

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
		body += `<a href=https://bsky.app/profile/${profile.did}><b>${escape(displayName, false)}</b></a>`;
		if (description) {
			body += `<br>${description}`;
		}

		table += `| ${body} | ${likeCount} |\n`;
	}

	// Read existing Markdown file, check if it's equivalent
	let shouldWrite = true;

	try {
		const source = await Deno.readTextFile('./README.md');

		if (TABLE_RE.exec(source)?.[0] === table) {
			shouldWrite = false;
		}
		// deno-lint-ignore no-empty
	} catch {}

	// Write the markdown file
	if (shouldWrite) {
		const final = template
			.replace('{{time}}', new Date().toISOString())
			.replace(TABLE_RE, table);

		await Deno.writeTextFile('./README.md', final);
		console.log(`wrote to readme`);
	} else {
		console.log(`writing skipped`);
	}
}

function escape(str: string, attr: boolean) {
	let escaped = '';
	let last = 0;

	for (let idx = 0, len = str.length; idx < len; idx++) {
		const char = str.charCodeAt(idx);

		if (char === 38 || (attr ? char === 34 : char === 60)) {
			escaped += str.substring(last, idx) + ('&#' + char + ';');
			last = idx + 1;
		}
	}

	return escaped + str.substring(last);
}
