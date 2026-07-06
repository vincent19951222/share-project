# Task 3 Report: Convert Legacy Tickets To Coins

## Outcome

Task completed: added an idempotent legacy ticket conversion script plus a focused regression test.

## Files

- Added `__tests__/legacy-ticket-conversion-script.test.ts`
- Added `scripts/convert-supply-tickets-to-coins.ts`

## What Changed

- Added `convertSupplyTicketsToCoins({ apply })` with the required `1 ticket = 50 coins` rule.
- Dry-run mode computes totals without mutating users.
- Apply mode converts every user with `ticketBalance > 0`, increments `coins`, and resets `ticketBalance` to `0`.
- The script exposes a CLI entry point for:
  - `npx tsx scripts/convert-supply-tickets-to-coins.ts --dry-run`
  - `npx tsx scripts/convert-supply-tickets-to-coins.ts --apply`

## Verification

- `npm test -- __tests__/legacy-ticket-conversion-script.test.ts`
  - Passed: 2 tests
- `npx tsx scripts/convert-supply-tickets-to-coins.ts --dry-run`
  - Passed and printed:
    - `mode: "dry-run"`
    - `convertedUserCount: 6`
    - `ticketCount: 81`
    - `coinGrantTotal: 4050`

## Notes

- The implementation is idempotent because apply mode only updates users whose `ticketBalance` is still present at update time, and repeated runs see no remaining legacy tickets after conversion.
