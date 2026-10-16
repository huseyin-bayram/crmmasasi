import { EVAM_PAGE_TAGS } from "./constants";

export interface PageTagInfo {
  tag: string;
  count: number;
  positions: number[];
}

export interface PageTagAnalysis {
  page1: PageTagInfo;
  page2: PageTagInfo;
  approvePage: PageTagInfo;
  orderValid: boolean;
  allMandatoryPresent: boolean;
}

/**
 * Analyzes the positions, counts, and sequential order of all EVAM Page tags.
 */
export function analyzePageTags(content: string): PageTagAnalysis {
  function getTagInfo(tag: string): PageTagInfo {
    const positions: number[] = [];
    let pos = 0;
    while ((pos = content.indexOf(tag, pos)) !== -1) {
      positions.push(pos);
      pos += tag.length;
    }
    return {
      tag,
      count: positions.length,
      positions,
    };
  }

  const page1 = getTagInfo(EVAM_PAGE_TAGS.page1);
  const page2 = getTagInfo(EVAM_PAGE_TAGS.page2);
  const approvePage = getTagInfo(EVAM_PAGE_TAGS.approvePage);

  const allMandatoryPresent =
    page1.count > 0 && page2.count > 0 && approvePage.count > 0;

  let orderValid = true;
  if (page1.count > 0 && page2.count > 0) {
    if (page1.positions[0] > page2.positions[0]) {
      orderValid = false;
    }
  }
  if (page2.count > 0 && approvePage.count > 0) {
    if (page2.positions[0] > approvePage.positions[0]) {
      orderValid = false;
    }
  }

  return {
    page1,
    page2,
    approvePage,
    orderValid,
    allMandatoryPresent,
  };
}

/**
 * Automatically places <ApprovePage> immediately before the KAPANIŞ section (Rule 16).
 * Idempotent: If <ApprovePage> is already present, does not add another.
 */
export function insertApprovePageTag(content: string): {
  output: string;
  inserted: boolean;
  matchPattern?: string;
} {
  // If already contains <ApprovePage>, do nothing
  if (content.includes(EVAM_PAGE_TAGS.approvePage)) {
    return { output: content, inserted: false };
  }

  // Common patterns for the closing section in Türkiye Finans call scripts
  // e.g. <p><strong>KAPANIŞ;</strong>
  // e.g. <p><strong>KAPANIŞ:</strong>
  // e.g. <p><strong>Kapanış;</strong>
  // e.g. <p>KAPANIŞ
  const closingRegexes = [
    /(<p>(?:<strong>)?(?:KAPANIŞ|Kapanış|KAPANIS|Kapanis)\s*[;:]?)/i,
    /((?:<strong>)?(?:KAPANIŞ|Kapanış|KAPANIS|Kapanis)\s*[;:]?)/i,
  ];

  for (const regex of closingRegexes) {
    const match = content.match(regex);
    if (match && match.index !== undefined) {
      const matchIndex = match.index;
      // If preceded by a paragraph opening, place before <p>
      let insertIndex = matchIndex;
      const precedingChunk = content.slice(Math.max(0, matchIndex - 10), matchIndex);
      const pMatch = precedingChunk.lastIndexOf("<p>");
      if (pMatch !== -1) {
        insertIndex = Math.max(0, matchIndex - 10) + pMatch;
      }

      const output =
        content.slice(0, insertIndex) +
        EVAM_PAGE_TAGS.approvePage +
        content.slice(insertIndex);

      return {
        output,
        inserted: true,
        matchPattern: match[0],
      };
    }
  }

  return { output: content, inserted: false };
}
