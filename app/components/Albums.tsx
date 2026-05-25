const albums = [
  {
    id: 1,
    name: "Marathi Hits",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
  },

  {
    id: 2,
    name: "Bollywood Love",
    image:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
  },

  {
    id: 3,
    name: "Workout Mix",
    image:
      "https://images.unsplash.com/photo-1507838153414-b4b713384a76",
  },
];

export default function Albums() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {albums.map((album) => (
        <div
          key={album.id}
          className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition"
        >
          <img
            src={album.image}
            className="rounded-lg h-56 w-full object-cover"
          />

          <h2 className="mt-4 text-xl font-bold">
            {album.name}
          </h2>
        </div>
      ))}
    </div>
  );
}