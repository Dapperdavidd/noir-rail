# 10 · The terminal

The front end (`web/`) is the **settlement terminal** — a dense, calm dashboard where shielded
positions resolve into focus and a single action (shield or settle) is always one keystroke away.
Its art direction is **Obsidian Clearing**.

## Obsidian Clearing

The name holds the product in two words. *Obsidian* is the dark, dense, volcanic-glass surface the
interface is cut from. The *clearing* is the small patch of light you — and only you — are allowed
to see into.

**The emotional target is composed control.** Opening NoirRail should feel like sitting at a quiet,
well-lit desk in a dark room: the noise of the chain falls away and your positions resolve. A
shielded value should feel *protected*, not missing. Revealing one should feel like a deliberate,
weighty act — never an accident.

**Design principles**

1. **Dark canvas, light information.** The field is obsidian; light is spent only where meaning
   lives, so the eye goes straight to value.
2. **Shielded vs revealed grammar.** A consistent visual language separates hidden value (cyan,
   dotted) from disclosed value (full ink).
3. **Numerics are sacred.** Every figure is tabular mono — money lines up, scans, and never jitters
   between states.
4. **One accent, like punctuation.** Amber marks value and action, used sparingly so it always
   means something.

**Tokens** — BG `#08090B`, Card `#14171C`, Amber `#E7B25C`, Cyan `#5BD9D2`, Violet `#9A8CF0`, Ink
`#F4F6F8`. 8-pt spacing; radii 6/8/12; ≥4.5:1 contrast. Type: Fraunces (editorial display), Inter
(UI/body), JetBrains Mono (numerics/addresses), Space Grotesk (eyebrows/wordmark).

## What it does

- **Reads live chain state.** Pool balance, commitment count, and the current root are fetched from
  the deployed testnet pool via `@stellar/stellar-sdk` — it is a real client, not a mockup.
- **Manages notes locally.** Notes are generated and stored on-device (encrypted at rest); only the
  public `depositArgs` ever leave for a shield.
- **Proves in the browser.** The withdraw/transfer witness is built by the SDK and proven by
  snarkjs in a Web Worker, off the main thread. Only the public proof + signals are submitted, and
  the wallet signs the settlement transaction.

## Screens & states

The terminal covers the full state matrix the spec calls for: the default portfolio view (shielded
balances as cyan dotted tokens, a position mid-disclosure, one settling with a live proof-progress
ring), the **shield** flow (focused amount field, live commitment preview, weighted irreversible
action), and the **disclosure** console (predicate builder, scoped recipient, success state). Every
interactive element ships its hover / active / focus / loading / disabled states, and the empty and
error states (e.g. "no shielded positions yet", "proof rejected · stale root · rebuild & retry")
are first-class, not afterthoughts.

## Architecture

- **Next.js (App Router), TypeScript strict.** The page is a client component; anything touching
  `crypto`/`localStorage` runs in effects, so SSR/prerender is clean.
- **`lib/stellar.ts`** wraps contract reads and the deposit/withdraw/transfer calls (bytes routed
  through `nativeToScVal` so no global `Buffer` is needed in the browser).
- **`lib/prove.ts`** loads snarkjs lazily and proves in a worker.
- The build runs on the **webpack** compiler (snarkjs/ffjavascript pull in a worker shim Turbopack
  doesn't yet handle); the bundle compiles and the app serves at `localhost:4317`.

---

**Try it:** `pnpm --filter @noir-rail/web dev`, set the deployed pool id in `.env.local`
(`NEXT_PUBLIC_POOL_ID`), and open the terminal to watch live pool state.

**If you change one thing:** keep the shielded/revealed grammar consistent. The product's entire
trust feeling rests on a hidden value looking *deliberately sealed* and a revealed one looking
*deliberately opened* — break that and it reads as a generic dashboard.
