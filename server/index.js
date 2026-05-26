const express = require("express");
const cors = require("cors");

const youtubeSearch = require(
  "youtube-search-api"
);

const app = express();

app.use(cors());

const PORT = 5000;

app.get("/search", async (req, res) => {
  try {
    const query = req.query.q;

    const result =
      await youtubeSearch.GetListByKeyword(
        query,
        false,
        10
      );

    // res.json(result.items);
   const filteredSongs =
  result.items.filter((item) => {

    const title =
      item.title?.toLowerCase() || "";

    return (

      // ONLY VIDEOS
      item.type === "video" &&

      // REMOVE BAD CONTENT
      !title.includes("news") &&
      !title.includes("trailer") &&
      !title.includes("teaser") &&
      !title.includes("interview") &&
      !title.includes("podcast") &&
      !title.includes("episode") &&
      !title.includes("shorts") &&
      !title.includes("vlog") &&
      !title.includes("reaction") &&
      !title.includes("movie scene") &&
      !title.includes("review") &&
      !title.includes("comedy") &&
      !title.includes("speech") &&
      !title.includes("dialogue") &&
      !title.includes("bgm") &&

      // MUST CONTAIN MUSIC WORDS
      (
        title.includes("song") ||
        title.includes("music") ||
        title.includes("audio") ||
        title.includes("official") ||
        title.includes("lyrics") ||
        title.includes("video")
      )

      && (
  title.includes("marathi") ||
  title.includes("hindi") ||
  title.includes("bollywood") ||
  title.includes("song") ||
  title.includes("official")
)
    );
  });

res.json(filteredSongs);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Search failed",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});