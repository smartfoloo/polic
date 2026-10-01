// Code checks on a draft against its source text: only the ones code does exactly.
// Facts, direction of changes, tone and names are checked by the AI checker (npm run verify).
// Both only raise flags for a person to look at; they never change a draft.

export const COPY_RUN = 25; // characters copied verbatim from the source that trigger a flag
// `why` is left out: it is the proposer's own reason, attributed to them, so close wording is fine.
const COPY_FIELDS = /** @type {const} */ (['name', 'summary', 'changes', 'who']);

/**
 * @param {any} bill
 * @param {string} source the text the draft was written from (cache/text/<id>.txt)
 * @returns {string[]} flags; empty means nothing to look at
 */
export function checkDraft(bill, source) {
	const flags = [];
	const text = COPY_FIELDS.map((k) => [bill[k] ?? ''].flat().join('\n')).join('\n');

	// Long verbatim runs from the source (repeating the official title is fine).
	const flat = text.replace(/\s+/g, '');
	const src = source.replace(/\s+/g, '');
	const title = bill.official.replace(/\s+/g, '');
	for (let i = 0; i + COPY_RUN <= flat.length; i++) {
		if (!src.includes(flat.slice(i, i + COPY_RUN)) || title.includes(flat.slice(i, i + COPY_RUN))) continue;
		let end = i + COPY_RUN;
		while (end < flat.length && src.includes(flat.slice(i, end + 1))) end++;
		flags.push(`copied from the source (${end - i} chars): 「${flat.slice(i, end)}」`);
		i = end;
	}

	// Empty 「」 means a comparison table lost its contents in PDF extraction: old and new values
	// can end up swapped or look like additions (shibuya-r8-3-47). Neither code nor AI can tell.
	if (/「\s*」/.test(source)) flags.push('source has a garbled before/after table: check the direction of changes against the PDF');

	// The reason is the proposer's, so it must be attributed to them.
	if (bill.why && !/と、(?:[^、。]*(?:区|都|市|府|県|町|村|知事|区長|市長|町長|村長)|提出した議員)は説明しています。$/.test(bill.why.trim())) {
		flags.push('reason is not attributed (should end 「…と、区は説明しています。」, 「…と、市は説明しています。」, 「…と、都知事は説明しています。」 or 「…と、提出した議員は説明しています。」)');
	}

	if ([...(bill.name ?? '')].length > 30) flags.push(`headline is ${[...bill.name].length} characters (aim for about 25)`);

	return flags;
}
