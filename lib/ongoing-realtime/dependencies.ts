/**
 * Dependency intelligence: detects upstream feeder relationships from syntax like:
 * "HF_TASIT_ONB_2026 -> Hedef kitle buradan besleniyor"
 * Pure deterministic pattern matching without AI.
 */

export interface ParsedDependency {
  upstreamScenarioName: string | null;
  rawNote: string | null;
}

/**
 * Searches for explicit upstream feeder notation in a string.
 * Example matches:
 * - "HF_TASIT_ONB_2026 -> Hedef kitle buradan besleniyor"
 * - "ONB_DIGITAL_V1 -> beslenen kitle"
 * - "KREDİ_KARTI_ONB -> ..."
 */
export function parseFeederSyntax(text: string): ParsedDependency {
  if (!text || typeof text !== "string") {
    return { upstreamScenarioName: null, rawNote: null };
  }

  // Look for pattern: <SCENARIO_NAME> -> <EXPLANATION>
  const arrowMatch = text.match(/([A-Za-z0-9_\-.]+)\s*(?:->|→)\s*(.*)/i);
  if (arrowMatch) {
    const candidate = arrowMatch[1].trim();
    const explanation = arrowMatch[2].trim();
    // Validate candidate looks like a scenario or campaign identifier
    if (candidate.length >= 3 && !/^(ve|ile|ise|veya|not)$/i.test(candidate)) {
      return {
        upstreamScenarioName: candidate,
        rawNote: explanation || null,
      };
    }
  }

  return { upstreamScenarioName: null, rawNote: null };
}

/**
 * Parses BURN column value.
 * If it contains a scenario-like identifier, marks it as linked.
 * If it contains an operational note, preserves it as note.
 */
export function parseBurnField(burnVal: string): {
  burnLinkedScenario: string | null;
  burnNote: string | null;
} {
  const trimmed = (burnVal || "").trim();
  if (!trimmed || trimmed === "-") {
    return { burnLinkedScenario: null, burnNote: null };
  }

  // If it's a standalone scenario identifier without spaces: e.g. "BURN_KREDI_KARTI_V2"
  if (/^[A-Za-z0-9_\-.]{4,}$/.test(trimmed)) {
    return { burnLinkedScenario: trimmed, burnNote: null };
  }

  // Otherwise treat as operational note
  return { burnLinkedScenario: null, burnNote: trimmed };
}

/**
 * Builds the graph of upstream, downstream, and sibling relationships.
 */
export function resolveDependencyGraph(
  scenarios: Array<{
    scenarioName: string;
    upstreamScenarioName: string | null;
  }>,
): {
  downstreamMap: Record<string, string[]>;
  siblingMap: Record<string, string[]>;
} {
  const downstreamMap: Record<string, string[]> = {};
  const upstreamGroup: Record<string, string[]> = {};

  for (const s of scenarios) {
    if (s.upstreamScenarioName) {
      const up = s.upstreamScenarioName;
      if (!downstreamMap[up]) {
        downstreamMap[up] = [];
      }
      if (!downstreamMap[up].includes(s.scenarioName)) {
        downstreamMap[up].push(s.scenarioName);
      }

      if (!upstreamGroup[up]) {
        upstreamGroup[up] = [];
      }
      upstreamGroup[up].push(s.scenarioName);
    }
  }

  const siblingMap: Record<string, string[]> = {};
  for (const s of scenarios) {
    if (s.upstreamScenarioName && upstreamGroup[s.upstreamScenarioName]) {
      const siblings = upstreamGroup[s.upstreamScenarioName].filter(
        (name) => name !== s.scenarioName,
      );
      siblingMap[s.scenarioName] = siblings;
    } else {
      siblingMap[s.scenarioName] = [];
    }
  }

  return { downstreamMap, siblingMap };
}
