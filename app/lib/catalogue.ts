import type { DiscoveryCategory, Song } from "./types";

export const CATEGORIES: DiscoveryCategory[] = [
  "For you",
  "Hindi",
  "Marathi",
  "Indie",
  "Chill",
  "Party",
];

// Official Apple Music previews. Full recordings stay with the rights holders.
export const SONGS: Song[] = [
  {
    id: "1635014240",
    title: "Kesariya",
    artist: "Arijit Singh · Pritam",
    album: "Brahmāstra",
    image: "/images/kesariya.webp",
    duration: 268,
    categories: ["Hindi", "Chill"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/38/4c/5c/384c5c8f-3ff8-e457-b2f7-3158ce108649/mzaf_12389299033886433185.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/kesariya/1635013814?i=1635014240",
  },
  {
    id: "1690466656",
    title: "Heeriye",
    artist: "Jasleen Royal · Arijit Singh",
    album: "Heeriye",
    image: "/images/heeriye.webp",
    duration: 194,
    categories: ["Hindi", "Indie", "Chill"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/14/9b/ac/149bac62-12f1-2f55-a742-f38429b94c83/mzaf_17225240189976438593.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/heeriye/1690466350?i=1690466656",
  },
  {
    id: "1699783997",
    title: "Apna Bana Le",
    artist: "Arijit Singh · Sachin-Jigar",
    album: "Bhediya",
    image: "/images/apna-bana-le.webp",
    duration: 261,
    categories: ["Hindi", "Chill"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c1/15/dc/c115dca3-0857-630e-0289-ec05e94ff2e8/mzaf_1619083035165552558.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/apna-bana-le/1699783724?i=1699783997",
  },
  {
    id: "1705952066",
    title: "Chaleya",
    artist: "Arijit Singh · Shilpa Rao",
    album: "Jawan",
    image: "/images/chaleya.webp",
    duration: 200,
    categories: ["Hindi", "Party"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/76/05/d9/7605d905-f631-517d-df7f-e162affcd414/mzaf_9976541859961700749.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/chaleya/1705952061?i=1705952066",
  },
  {
    id: "1134725347",
    title: "Tum Se Hi",
    artist: "Mohit Chauhan · Pritam",
    album: "Jab We Met",
    image: "/images/tum-se-hi.webp",
    duration: 321,
    categories: ["Hindi", "Chill"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e7/39/b8/e739b870-54a1-8f33-57d5-3817108b8bd9/mzaf_16925921654959290990.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/tum-se-hi/1134725343?i=1134725347",
  },
  {
    id: "1529522165",
    title: "Sairat Jhala Ji",
    artist: "Ajay Gogavale · Chinmayee Sripada",
    album: "Sairat",
    image: "/images/sairat.webp",
    duration: 369,
    categories: ["Marathi", "Chill"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/07/75/ac/0775acef-1c42-215f-31df-e7239c0fc646/mzaf_13288434132238537631.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/sairat-jhala-ji/1529522162?i=1529522165",
  },
  {
    id: "1660261040",
    title: "Ved Tujha",
    artist: "Ajay-Atul · Ajay Gogavale",
    album: "Ved",
    image: "/images/ved.webp",
    duration: 204,
    categories: ["Marathi", "Chill"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c0/0e/b2/c00eb2cc-9bb8-aec3-75eb-7b3fcd0b6197/mzaf_9438862613206808895.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/ved-tujha/1660261037?i=1660261040",
  },
  {
    id: "1070912815",
    title: "Ilahi",
    artist: "Arijit Singh · Pritam",
    album: "Yeh Jawaani Hai Deewani",
    image: "/images/ilahi.webp",
    duration: 228,
    categories: ["Hindi", "Party"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/75/27/64/75276455-6751-e9d7-1187-b863a2ffefbc/mzaf_4313837125483855343.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/ilahi/1070912669?i=1070912815",
  },
  {
    id: "1688981130",
    title: "Tere Vaaste",
    artist: "Varun Jain · Sachin-Jigar",
    album: "Zara Hatke Zara Bachke",
    image: "/images/tere-vaaste.webp",
    duration: 189,
    categories: ["Hindi", "Party"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/a6/b1/db/a6b1db3b-7353-f705-acd5-ca1d19f5fbba/mzaf_1179784728000321890.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/tere-vaaste/1688981118?i=1688981130",
  },
  {
    id: "1529522163",
    title: "Yad Lagla",
    artist: "Ajay Gogavale · Ajay-Atul",
    album: "Sairat",
    image: "/images/sairat.webp",
    duration: 314,
    categories: ["Marathi", "Chill"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/6a/80/28/6a8028c9-5a7d-749b-0d01-12b8ab54dd83/mzaf_2553266096703403253.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/yad-lagla/1529522162?i=1529522163",
  },
  {
    id: "1529522164",
    title: "Aatach Baya Ka Baavarla",
    artist: "Shreya Ghoshal · Ajay-Atul",
    album: "Sairat",
    image: "/images/sairat.webp",
    duration: 334,
    categories: ["Marathi", "Chill"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b8/77/ba/b877bafe-4ad7-ad73-371e-79f633e70b8f/mzaf_1903232866640609157.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/aatach-baya-ka-baavarla/1529522162?i=1529522164",
  },
  {
    id: "1529522196",
    title: "Zingaat",
    artist: "Ajay Gogavale · Atul Gogavale",
    album: "Sairat",
    image: "/images/sairat.webp",
    duration: 226,
    categories: ["Marathi", "Party"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a0/3b/9a/a03b9a3e-a7fc-9fcd-15ca-463837882493/mzaf_10966597156939340045.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/zingaat/1529522162?i=1529522196",
  },
  {
    id: "1537030272",
    title: "Tu Jaane Na",
    artist: "Atif Aslam · Pritam",
    album: "Ajab Prem Ki Ghazab Kahani",
    image: "/images/tu-jaane-na.webp",
    duration: 341,
    categories: ["Hindi", "Chill"],
    previewUrl:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a9/06/7e/a9067efd-0925-6087-71bd-11155c2d3289/mzaf_15735148284263193215.plus.aac.p.m4a",
    externalUrl:
      "https://music.apple.com/in/album/tu-jaane-na/1537029617?i=1537030272",
  },
];

// Photo overrides for offline artwork only. The displayed artist list is
// derived from the current provider's tracks, never from this lookup table.
export const ARTIST_IMAGES: Record<string, string> = {
  "Arijit Singh": "/images/arijit.webp",
  "Shreya Ghoshal": "/images/shreya.webp",
  "Jasleen Royal": "/images/jasleen.webp",
  "Atif Aslam": "/images/atif.webp",
  Pritam: "/images/pritam.webp",
};

export function searchCatalogue(query: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return SONGS.filter((song) => {
    const text =
      `${song.title} ${song.artist} ${song.album} ${song.categories.join(" ")}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
