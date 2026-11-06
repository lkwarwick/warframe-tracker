import { useEffect, type RefObject } from "react";

export function useSmoothWheelScroll(ref: RefObject<HTMLElement | null>, enabled = true) {
    useEffect(() => {
        const element = ref.current;
        if (!element || !enabled) return;

        let targetPosition: number | null = null;
        let animationFrame: number | null = null;
        let lastFrameTime = 0;
        const previousScrollBehavior = element.style.scrollBehavior;
        element.style.scrollBehavior = "auto";

        const animate = (time: number) => {
            if (targetPosition === null) {
                animationFrame = null;
                return;
            }

            const elapsed = time - lastFrameTime;
            lastFrameTime = time;
            const maxScroll = element.scrollHeight - element.clientHeight;
            targetPosition = Math.max(0, Math.min(targetPosition, maxScroll));
            const distance = targetPosition - element.scrollTop;

            if (Math.abs(distance) < 0.5) {
                element.scrollTop = targetPosition;
                targetPosition = null;
                animationFrame = null;
                lastFrameTime = 0;
                return;
            }

            element.scrollTop += distance * (1 - Math.exp(-elapsed / 65));
            animationFrame = requestAnimationFrame(animate);
        };

        const handleWheel = (event: WheelEvent) => {
            if (event.deltaY === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

            let delta = event.deltaY;
            if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
                delta *= parseFloat(getComputedStyle(element).lineHeight) || 16;
            } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
                delta *= element.clientHeight;
            }

            const maxScroll = element.scrollHeight - element.clientHeight;
            if (maxScroll <= 0) return;

            const currentTarget = targetPosition ?? element.scrollTop;
            const nextTarget = Math.max(0, Math.min(currentTarget + delta, maxScroll));
            const stillMovingTowardBoundary = delta > 0
                ? element.scrollTop < maxScroll
                : element.scrollTop > 0;
            if (nextTarget === currentTarget && !stillMovingTowardBoundary) return;

            event.preventDefault();
            event.stopPropagation();
            targetPosition = nextTarget;
            if (animationFrame === null) {
                lastFrameTime = performance.now();
                animationFrame = requestAnimationFrame(animate);
            }
        };

        element.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            element.removeEventListener("wheel", handleWheel);
            if (animationFrame !== null) cancelAnimationFrame(animationFrame);
            element.style.scrollBehavior = previousScrollBehavior;
        };
    }, [enabled, ref]);
}
