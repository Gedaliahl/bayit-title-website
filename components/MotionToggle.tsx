/**
 * A switch that stops an animation, for WCAG 2.2.2: anything that moves on its
 * own for more than five seconds beside other content needs one.
 *
 * A checkbox rather than a button, so it holds its own state without
 * JavaScript and a screen reader announces it as on or off. The component it
 * sits in pauses itself with `:has(.motion-toggle input:checked)` in the
 * stylesheet. It is not shown to a reader who has asked for less motion, for
 * whom nothing moves.
 */
export function MotionToggle({ label, className }: { label: string; className?: string }) {
  return (
    <label className={className ? `motion-toggle ${className}` : 'motion-toggle'}>
      <input type="checkbox" aria-label={label} />
      <span className="motion-toggle__pause" aria-hidden="true">
        Pause
      </span>
      <span className="motion-toggle__play" aria-hidden="true">
        Play
      </span>
    </label>
  );
}
