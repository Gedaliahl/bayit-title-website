/**
 * The order of work on a file, so a caller has a name for the step they are
 * asking about. Labelled an example on purpose: it is the sequence, not a
 * schedule, and nothing here promises a date.
 */

const STEPS = [
  {
    title: 'Order opened',
    detail: 'Search and estoppel ordered the same day.',
    state: 'done',
  },
  {
    title: 'Search examined',
    detail: 'Anything on the file explained in writing.',
    state: 'done',
  },
  {
    title: 'Cleared to close',
    detail: 'Payoffs, releases, settlement statement.',
    state: 'now',
  },
  {
    title: 'Signed and recorded',
    detail: 'In office, mobile or remote online notarization.',
    state: 'todo',
  },
] as const;

export function FileTimeline() {
  return (
    <div className="filecard">
      <div className="filecard__head">
        <h2>How your file moves</h2>
        <span className="chip">Example file</span>
      </div>

      {STEPS.map((step, index) => (
        <div key={step.title} className={`filestep filestep--${step.state}`}>
          <div className="filestep__rail">
            <span className="filestep__dot" />
            {index < STEPS.length - 1 ? <span className="filestep__line" /> : null}
          </div>
          <div className="filestep__body">
            <p>
              {step.title}
              {step.state === 'now' ? <span className="filestep__now">In progress</span> : null}
            </p>
            <p>{step.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
