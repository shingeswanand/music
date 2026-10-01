"use client";

import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function CarouselButtons({
  scrollPrev,
  scrollNext,
}: {
  scrollPrev: () => void;
  scrollNext: () => void;
}) {
  return (
    <div className="carousel-buttons">
      <button
        type="button"
        className="icon-button"
        onClick={scrollPrev}
        aria-label="Previous items"
      >
        <FiChevronLeft />
      </button>
      <button
        type="button"
        className="icon-button"
        onClick={scrollNext}
        aria-label="Next items"
      >
        <FiChevronRight />
      </button>
    </div>
  );
}
