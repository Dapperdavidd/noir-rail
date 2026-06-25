// Route-level loading UI for the control room. Next renders this in a Suspense
// boundary while the /app segment (snarkjs, three, stellar-sdk) streams in — so
// it's what shows the instant a visitor clicks "Launch". Fullscreen + fixed so
// it cleanly covers the shell during the handoff.
export default function AppLoading() {
  return (
    <div className="nr-launch" role="status" aria-live="polite">
      <div className="nr-launch-inner">
        <div className="nr-launch-core">
          <span className="ring r1" aria-hidden />
          <span className="ring r2" aria-hidden />
          <span className="ring r3" aria-hidden />
          <span className="mark" aria-hidden>N</span>
        </div>
        <div className="nr-launch-wm">
          Noir<em>Rail</em>
        </div>
        <div className="nr-launch-sub">Initializing shielded terminal</div>
        <ul className="nr-launch-log">
          <li>Establishing testnet session</li>
          <li>Loading proving keys · Groth16 / BLS12-381</li>
          <li>Syncing Merkle frontier · depth 14</li>
        </ul>
      </div>
    </div>
  );
}
