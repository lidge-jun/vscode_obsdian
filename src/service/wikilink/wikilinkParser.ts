export interface ParsedWikilink {
    raw: string;
    target: string;
    alias?: string;
    heading?: string;
    blockId?: string;
    embed: boolean;
}

export interface WikilinkMatch extends ParsedWikilink {
    start: number;
    end: number;
}

const WIKILINK_PATTERN = /(!)?\[\[([^\]\r\n]+)\]\]/g;

export function parseWikilinkBody(body: string, embed = false): ParsedWikilink | undefined {
    const trimmed = body.trim();
    if (!trimmed) return undefined;

    const [targetWithFragment, alias] = splitOnce(trimmed, '|');
    const parsedTarget = parseTargetFragment(targetWithFragment.trim());
    if (!parsedTarget.target && !parsedTarget.heading && !parsedTarget.blockId) return undefined;

    return {
        raw: body,
        target: parsedTarget.target,
        alias: alias?.trim() || undefined,
        heading: parsedTarget.heading,
        blockId: parsedTarget.blockId,
        embed,
    };
}

export function findWikilinks(text: string): WikilinkMatch[] {
    const matches: WikilinkMatch[] = [];
    WIKILINK_PATTERN.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = WIKILINK_PATTERN.exec(text)) !== null) {
        const parsed = parseWikilinkBody(match[2], Boolean(match[1]));
        if (!parsed) continue;
        matches.push({
            ...parsed,
            start: match.index,
            end: match.index + match[0].length,
        });
    }

    return matches;
}

export function getWikilinkDisplayText(link: ParsedWikilink): string {
    if (link.alias) return link.alias;
    if (link.heading) return link.heading;
    return link.target.split(/[\\/]/).pop() || link.target;
}

function splitOnce(value: string, separator: string): [string, string | undefined] {
    const index = value.indexOf(separator);
    if (index === -1) return [value, undefined];
    return [value.slice(0, index), value.slice(index + 1)];
}

function parseTargetFragment(value: string): { target: string; heading?: string; blockId?: string } {
    const [targetPart, hashFragment] = splitOnce(value, '#');
    const parsed = parseBlockPart(targetPart.trim());
    if (!hashFragment) return parsed;

    const fragment = hashFragment.trim();
    if (fragment.startsWith('^')) {
        return { ...parsed, blockId: fragment.slice(1).trim() || parsed.blockId };
    }

    const [heading, blockId] = splitOnce(fragment, '^');
    return {
        ...parsed,
        heading: heading.trim() || undefined,
        blockId: blockId?.trim() || parsed.blockId,
    };
}

function parseBlockPart(value: string): { target: string; blockId?: string } {
    const [target, blockId] = splitOnce(value, '^');
    return {
        target: target.trim(),
        blockId: blockId?.trim() || undefined,
    };
}
