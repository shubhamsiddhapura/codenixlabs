import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/** Elements that should make the cursor swell. Matched with closest(). */
const HOVER_TARGETS = 'a, button, [role="button"], label, summary, .hover-effect';

/**
 * The trailing dot that replaces the system cursor.
 *
 * Hiding the real cursor is a commitment: from that moment the dot is the only
 * thing telling a visitor where they are pointing, so anything that makes it
 * hard to see is not cosmetic. Three things here exist to guarantee it stays
 * visible.
 *
 * It is painted white under `mix-blend-mode: difference`, which renders the
 * inverse of whatever is behind it. Colouring it our primary purple looked
 * right until it crossed a primary-purple button — difference of a colour with
 * itself is black, and black on this background is nothing at all. White cannot
 * collide with a brand colour that way.
 *
 * Position is written only by GSAP, including the centring offset. The centring
 * used to live in CSS as translate(-50%, -50%), which GSAP then overwrote on its
 * first frame, leaving the dot half its own width down and to the right of the
 * real pointer.
 *
 * And the native cursor is only hidden once this component is actually running
 * on a fine pointer — see the `has-custom-cursor` class. A device that never
 * gets the dot keeps its own arrow.
 */
const Cursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    // Touch and pen devices have no persistent pointer to replace. Bail before
    // hiding anything, or they end up with no cursor and no dot.
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const root = document.documentElement;
    root.classList.add('has-custom-cursor');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const follow = reduceMotion ? 0 : 0.15;

    gsap.set(cursor, { xPercent: -50, yPercent: -50, x: -100, y: -100, autoAlpha: 0 });

    let pointerX = -100;
    let pointerY = -100;
    let visible = false;
    let hovering = false;

    const setHover = (next: boolean) => {
      if (next === hovering) return;
      hovering = next;
      gsap.to(cursor, {
        scale: next ? 2 : 1,
        opacity: next ? 0.6 : 1,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    };

    // `target` is not always an Element — over the margin outside the body it is
    // the document itself, which has no closest() and would throw mid-handler,
    // leaving the dot frozen wherever it happened to be.
    const isOverTarget = (node: EventTarget | null): boolean =>
      node instanceof Element && node.closest(HOVER_TARGETS) !== null;

    /** What is under the pointer right now, whatever moved — the mouse or the page. */
    const refreshHover = () => {
      setHover(isOverTarget(document.elementFromPoint(pointerX, pointerY)));
    };

    const handleMouseMove = (event: MouseEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      // Parked off-screen until the first real movement, so the dot never shows
      // up in the top-left corner on load.
      if (!visible) {
        visible = true;
        gsap.set(cursor, { x: pointerX, y: pointerY });
        gsap.to(cursor, { autoAlpha: 1, duration: 0.2 });
      } else {
        gsap.to(cursor, { x: pointerX, y: pointerY, duration: follow, ease: 'power2.out', overwrite: 'auto' });
      }

      // Delegated rather than bound to a fixed list of nodes: this page swaps its
      // whole contents on navigation, and handlers attached once on mount would
      // stop matching anything the moment a route changed.
      setHover(isOverTarget(event.target));
    };

    // Scrolling moves the page under a stationary pointer, so what it is hovering
    // changes without a single mousemove. Without this the dot stays swollen over
    // nothing, or stays small over a button.
    const handleScroll = () => {
      if (visible) refreshHover();
    };

    const handleLeave = () => {
      visible = false;
      gsap.to(cursor, { autoAlpha: 0, duration: 0.2 });
    };

    const handleEnter = (event: MouseEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      gsap.set(cursor, { x: pointerX, y: pointerY });
      visible = true;
      gsap.to(cursor, { autoAlpha: 1, duration: 0.2 });
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseenter', handleEnter);
    document.addEventListener('mouseleave', handleLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleEnter);
      document.removeEventListener('mouseleave', handleLeave);
      window.removeEventListener('scroll', handleScroll);
      gsap.killTweensOf(cursor);
      root.classList.remove('has-custom-cursor');
    };
  }, []);

  return <div ref={cursorRef} className="custom-cursor" aria-hidden="true" />;
};

export default Cursor;
