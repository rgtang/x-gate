import {
  runPolicyDecision,
  scenarioToRequirements,
  type PolicyRequirements,
} from "./policy";
import {
  getScenarioById,
  parseCaseFilter,
  SCENARIO_CASES,
  type ExpectedAction,
  type ScenarioCase,
} from "./scenario-cases";

export type { ExpectedAction, ScenarioCase };
export { getScenarioById, parseCaseFilter, SCENARIO_CASES };

export interface ScenarioRunResult {
  caseId: number;
  name: string;
  rule: string;
  expected: ExpectedAction;
  actual: string;
  matched: boolean;
  reason: string;
  httpStatus?: number;
  receiptTx?: string | null;
  elapsedMs: number;
}

export async function runScenario(
  scenarioCase: ScenarioCase,
): Promise<ScenarioRunResult> {
  const req: PolicyRequirements = scenarioToRequirements(scenarioCase);
  const result = await runPolicyDecision(req);

  const actual =
    result.action === "pay"
      ? "pay"
      : result.action === "skip"
        ? "skip"
        : result.action;

  return {
    caseId: scenarioCase.id,
    name: scenarioCase.name,
    rule: scenarioCase.rule,
    expected: scenarioCase.expected,
    actual,
    matched: actual === scenarioCase.expected,
    reason: result.reason,
    httpStatus: result.httpStatus,
    receiptTx: result.receiptTx,
    elapsedMs: result.elapsedMs,
  };
}
