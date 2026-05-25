export default function SkeletonCard() {

  return (
    <div className="bg-[#181818] p-3 md:p-4 rounded-xl animate-pulse">

      {/* IMAGE */}
      <div className="w-full h-40 sm:h-44 md:h-52 bg-[#2a2a2a] rounded-lg"></div>

      {/* TITLE */}
      <div className="h-4 bg-[#2a2a2a] rounded mt-4 w-3/4"></div>

      {/* SUBTITLE */}
      <div className="h-3 bg-[#2a2a2a] rounded mt-2 w-1/2"></div>
    </div>
  );
}