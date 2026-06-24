import { ActivityStream } from "@/components/ActivityStream.tsx";

export default function Activity() {
  return (
    <>
      <div className="app-pagehead">
        <h1>Activity</h1>
        <p>
          The settlement stream — shields, transfers, and unshields propagating across the pool.
          The chain reveals only nullifiers, commitments, and roots; never amounts or owners.
        </p>
      </div>
      <div className="app-tile">
        <ActivityStream max={14} />
      </div>
    </>
  );
}
