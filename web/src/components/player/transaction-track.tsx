export function TransactionTrack({
  goal,
  proposed,
  finalized,
  attempted,
}: {
  goal: number;
  proposed: number;
  finalized: number;
  attempted: number;
}) {
  return (
    <section className="track-panel" aria-label="Transaction track">
      <h2 className="sr-only">Transaction track</h2>
      <p className="sr-only">{attempted} attempted, {proposed} proposed, {finalized} finalized, goal {goal}.</p>
      <div className="track-header">
        <span>Transaction track</span>
        <span>{finalized}/{goal} final</span>
      </div>
      <div className="track-grid">
        {Array.from({ length: goal }, (_, index) => {
          const state = index < finalized ? "finalized" : index < proposed ? "pending" : "remaining";
          return <i className={`track-cell ${state}`} key={index} />;
        })}
      </div>
      {attempted > goal && <p className="overdrive">Overdrive +{attempted - goal}</p>}
    </section>
  );
}
