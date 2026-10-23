import { RaptorMark } from "./ProductIcons";

/**
 * The raptor® wordmark: the lowercase name with the registered mark, and the
 * claw mark before it when `mark` is set. It is the only place ® appears;
 * headings, buttons and running text write plain "raptor".
 */
export function RaptorWordmark({ mark = false, className = "" }: { mark?: boolean; className?: string }) {
  return (
    <span className={`raptor-wordmark ${className}`}>
      {mark && <RaptorMark className="raptor-wordmark-mark" />}
      raptor
      <span className="raptor-wordmark-reg" aria-hidden="true">
        ®
      </span>
    </span>
  );
}
