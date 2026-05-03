export const FITNESS_PUNCH_TICKET_GRANT_REASON = "FITNESS_PUNCH_GRANTED";
export const FITNESS_PUNCH_TICKET_REVOKE_REASON = "FITNESS_PUNCH_REVOKED";
export const FITNESS_PUNCH_SOURCE_TYPE = "fitness_punch";
export const FITNESS_PUNCH_REVERSAL_SOURCE_TYPE = "fitness_punch_reversal";
export const FITNESS_TICKET_SPENT_MESSAGE =
  "今天打卡送出的健身券已经花掉了，不能撤销打卡。";

export class FitnessTicketAlreadySpentError extends Error {
  constructor() {
    super(FITNESS_TICKET_SPENT_MESSAGE);
    this.name = "FitnessTicketAlreadySpentError";
  }
}

export function shouldGrantFitnessPunchTicket(punch: {
  punched: boolean;
  punchType: string | null;
}) {
  return punch.punched && punch.punchType === "default";
}
