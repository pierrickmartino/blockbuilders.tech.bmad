# Execution-free, zero custody — with a verification-gated signals-only handoff

Blockbuilders **never holds user money and never executes trades**. We deliberately
refuse the execution/automation path that every competitor (3Commas, Composer,
TradingView) takes. The one permitted notch up the autonomy slider is a
**signals-only handoff**: alerts and exports (`#16`, `#17`) — but *only* for a
strategy that has a completed backtest, so every signal inherits the trust of the
engine. We hand off; we never trade.

## Status

accepted

## Why

The product's entire thesis is **trust in the number**: we tell a non-technical user,
honestly, whether their own idea works. The moment we touch money we take on
fiduciary and regulatory liability, and we start betting the business on the AI being
*right* — which, per the march of nines, is reliability earned slowly and expensively.
The augmentation model is the more viable bet precisely because it does not depend on
the AI being right; it depends on the engine being trustworthy and the human staying
in the loop.

## Considered options

- **Full execution / automation (rejected).** Couple backtest to brokerage like
  Composer, or to bots like 3Commas. This is where the obvious revenue and retention
  are — which is exactly the gravitational pull the brainstorm names as the single
  largest strategic risk. It forfeits the trust-as-product angle, takes on regulatory
  exposure, and competes on capability where incumbents are years ahead.
- **Execution-free, zero custody, signals-only handoff (chosen).** Augmentation
  without custody. Opens a retention/revenue door (alerts, export) without the
  fiduciary/regulatory burden or the autonomous-reliability burden.

## Consequences

- Staying execution-free is a philosophical choice with a **revenue cost**. That
  trade-off must be re-decided consciously, not drifted into — watched via the
  iterators-vs-executors split (if renewal concentrates only among would-be-executors,
  revisit this ADR).
- **The residual risk is narrow but real: signals degrading into un-verified tips.**
  Guard the gate, not the gravity — the custody line is bright and permanent, but every
  signal must stay verification-gated. A signal that fires on a strategy without a
  completed backtest is a defect, not a feature.
