export const MAX_CARD_COPIES = 3;

export type CopyLimitValidationReason =
  | "BANLIST_LIMIT"
  | "COPY_LIMIT";

export interface CopyLimitValidationResult {
  valid: boolean;
  reasons: CopyLimitValidationReason[];
}

export function validateCardCopyLimit(
  currentCopies: number,
  copiesToAdd: number,
  allowedCopies: number | undefined
): CopyLimitValidationResult {
  const reasons: CopyLimitValidationReason[] = [];

  const resultingCopies = currentCopies + copiesToAdd;

  if (resultingCopies > MAX_CARD_COPIES) {
    reasons.push("COPY_LIMIT");
  }

  if (
    allowedCopies === undefined ||
    resultingCopies > allowedCopies
  ) {
    reasons.push("BANLIST_LIMIT");
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}