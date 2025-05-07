import React, { useMemo } from "react";

interface HoneycombProps {
  /** Optional additional CSS class name to apply to the container. */
  className?: string;
  /** Color of the honeycomb cells. Defaults to '#f3f3f3'. */
  color?: string;
  /**
   * Base size of the component in pixels. This affects the overall dimensions
   * of the honeycomb structure. Defaults to 24.
   */
  size?: number;
  /** Animation duration in seconds. Defaults to 2.1. */
  animationDuration?: number;
}

const Honeycomb: React.FC<HoneycombProps> = ({
  className = "",
  color = "#f3f3f3",
  size = 24,
  animationDuration = 2.1,
}) => {
  // Calculate dimensions based on the 'size' prop
  const mainContainerSize = size;
  const cellBodyHeight = size / 2;
  const cellBodyWidth = size;
  const cellBodyMarginTop = size / 4;
  const pseudoBorderSideWidth = size / 2;
  const pseudoBorderTopBottomHeight = size / 4;
  const pseudoPositionOffset = -(size / 4);

  // Positional offsets for each of the 7 cells, scaled by 'size'
  const offsetOuter = (28 / 24) * size;
  const offsetInnerX = (14 / 24) * size;
  const offsetInnerY = (22 / 24) * size;

  const cellsData = [
    { id: 1, delay: 0, left: -offsetOuter, top: 0 },
    { id: 2, delay: 0.1, left: -offsetInnerX, top: offsetInnerY },
    { id: 3, delay: 0.2, left: offsetInnerX, top: offsetInnerY },
    { id: 4, delay: 0.3, left: offsetOuter, top: 0 },
    { id: 5, delay: 0.4, left: offsetInnerX, top: -offsetInnerY },
    { id: 6, delay: 0.5, left: -offsetInnerX, top: -offsetInnerY },
    { id: 7, delay: 0.6, left: 0, top: 0 }, // Center cell
  ];

  // Generate a unique ID for this component instance to scope CSS rules.
  // This prevents style collisions if multiple instances of the component are on the same page.
  // `useMemo` ensures the ID is generated only once per component instance.
  // React 18+ has `React.useId()` which is preferred for generating unique IDs.
  // For broader compatibility (React <18), Math.random() is a common approach for non-critical unique IDs.
  const instanceId = useMemo(
    () => `honeycomb-instance-${Math.random().toString(36).substring(2, 11)}`,
    []
  );

  // Construct the CSS string. All styles are scoped using the instanceId.
  const dynamicStyles = `
    @keyframes ${instanceId}-animation {
      0%, 20%, 80%, 100% {
        opacity: 0;
        transform: scale(0);
        -webkit-transform: scale(0);
      }
      30%, 70% {
        opacity: 1;
        transform: scale(1);
        -webkit-transform: scale(1);
      }
    }

    .${instanceId}-container {
      height: ${mainContainerSize}px;
      position: relative;
      width: ${mainContainerSize}px;
    }

    .${instanceId}-cell {
      -webkit-animation: ${instanceId}-animation ${animationDuration}s infinite backwards;
      animation: ${instanceId}-animation ${animationDuration}s infinite backwards;
      background: ${color};
      height: ${cellBodyHeight}px;
      margin-top: ${cellBodyMarginTop}px;
      position: absolute;
      width: ${cellBodyWidth}px;
    }

    .${instanceId}-cell::before,
    .${instanceId}-cell::after {
      content: '';
      border-left: ${pseudoBorderSideWidth}px solid transparent;
      border-right: ${pseudoBorderSideWidth}px solid transparent;
      position: absolute;
      left: 0;
      right: 0; /* Added to match original CSS; left:0 on its own should be sufficient for border triangles with fixed parent width */
    }

    .${instanceId}-cell::after {
      top: ${pseudoPositionOffset}px;
      border-bottom: ${pseudoBorderTopBottomHeight}px solid ${color};
    }

    .${instanceId}-cell::before {
      bottom: ${pseudoPositionOffset}px;
      border-top: ${pseudoBorderTopBottomHeight}px solid ${color};
    }

    /* Individual cell positioning and animation delays */
    ${cellsData
      .map(
        (cell) => `
      .${instanceId}-cell-${cell.id} {
        -webkit-animation-delay: ${cell.delay}s;
        animation-delay: ${cell.delay}s;
        left: ${cell.left}px;
        top: ${cell.top}px;
      }
    `
      )
      .join("\n")}
  `;

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      <div className={`${instanceId}-container ${className}`}>
        {cellsData.map((cell) => (
          <div
            key={cell.id}
            className={`${instanceId}-cell ${instanceId}-cell-${cell.id}`}
          />
        ))}
      </div>
    </>
  );
};

export default Honeycomb;
