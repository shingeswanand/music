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
    const filteredSongs = result.items.filter(
  (item) =>
    item.type === "video" &&
    !item.title
      ?.toLowerCase()
      .includes("news") &&
    !item.title
      ?.toLowerCase()
      .includes("trailer")
);

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