"use client";

import {
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

type Props = {
  scrollPrev: () => void;
  scrollNext: () => void;
};

export default function CarouselButtons({
  scrollPrev,
  scrollNext,
}: Props) {

  return (
    <div className="flex items-center gap-3">

      <button
        onClick={scrollPrev}
        className="w-10 h-10 rounded-full bg-[#1e1e1e] hover:bg-[#2a2a2a] transition flex items-center justify-center"
      >
        <FaChevronLeft />
      </button>

      <button
        onClick={scrollNext}
        className="w-10 h-10 rounded-full bg-[#1e1e1e] hover:bg-[#2a2a2a] transition flex items-center justify-center"
      >
        <FaChevronRight />
      </button>
    </div>
  );
}