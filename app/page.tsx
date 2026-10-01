"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  FiArrowUpRight,
  FiDisc,
  FiHeart,
  FiMusic,
  FiPlay,
  FiPlus,
  FiRadio,
  FiSearch,
  FiShuffle,
  FiStar,
  FiTrash2,
  FiTrendingUp,
  FiWifiOff,
  FiClock,
} from "react-icons/fi";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import HeroBanner from "./components/HeroBanner";
import TrendingSongs from "./components/TrendingSongs";
import RecentlyPlayed from "./components/RecentlyPlayed";
import Albums from "./components/Albums";
import TopArtists from "./components/TopArtists";
import SectionTitle from "./components/SectionTitle";
import SkeletonCard from "./components/SkeletonCard";
import Dialog from "./components/Dialog";
import Artwork from "./components/Artwork";
import { usePlayer } from "./context/PlayerContext";
import {
  CATEGORIES,
  CURATED_PLAYLISTS,
  SONGS,
  getPlaylistSongs,
} from "./lib/catalogue";
import { searchSongs } from "./lib/api";
import type { Category, SearchResponse, Song, View } from "./lib/types";

type SearchState = SearchResponse & { loading: boolean; error?: string };

/** Where the results on screen came from. */
function sourceLabel(source: SearchResponse["source"]) {
  if (source === "youtube") return "Streaming in full from YouTube";
  if (source === "apple") return "Official previews available";
  return "From your handpicked catalogue";
}

export default function Home() {
  const [history, setHistory] = useState<{ entries: View[]; index: number }>({
    entries: [{ type: "home" }],
    index: 0,
  });
  const view = history.entries[history.index];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("For you");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [deletingPlaylist, setDeletingPlaylist] = useState(false);
  const [searches, setSearches] = useState<Record<string, SearchState>>({});
  const requestRef = useRef(new Map<string, AbortController>());
  const {
    favorites,
    recentSongs,
    playlists,
    playSong,
    setShuffle,
    createPlaylist,
    addToPlaylist,
    deletePlaylist,
    currentSong,
    notify,
  } = usePlayer();

  const navigate = useCallback((next: View) => {
    setHistory((previous) => {
      const current = previous.entries[previous.index];
      if (
        current.type === next.type &&
        current.id === next.id &&
        current.query === next.query
      )
        return previous;
      const entries = [...previous.entries.slice(0, previous.index + 1), next];
      return { entries, index: entries.length - 1 };
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const requests = requestRef.current;
    return () => requests.forEach((controller) => controller.abort());
  }, []);

  const runSearch = async (raw: string) => {
    const term = raw.trim();
    if (!term) return;
    requestRef.current.get(term)?.abort();
    const controller = new AbortController();
    requestRef.current.set(term, controller);
    setQuery(term);
    navigate({ type: "search", query: term });
    setSearches((previous) => ({
      ...previous,
      [term]: { songs: [], source: "catalogue", loading: true },
    }));
    try {
      const result = await searchSongs(term, controller.signal);
      if (
        !controller.signal.aborted &&
        requestRef.current.get(term) === controller
      )
        setSearches((previous) => ({
          ...previous,
          [term]: { ...result, loading: false },
        }));
    } catch (error) {
      if (
        !controller.signal.aborted &&
        requestRef.current.get(term) === controller
      )
        setSearches((previous) => ({
          ...previous,
          [term]: {
            songs: [],
            source: "offline",
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not complete your search.",
          },
        }));
    }
  };

  const filteredSongs =
    category === "For you"
      ? SONGS
      : SONGS.filter((song) => song.categories.includes(category));
  const curatedPlaylist =
    view.type === "playlist"
      ? CURATED_PLAYLISTS.find((playlist) => playlist.id === view.id)
      : undefined;
  const personalPlaylist =
    view.type === "playlist"
      ? playlists.find((playlist) => playlist.id === view.id)
      : undefined;
  const collectionSongs: Song[] =
    view.type === "favorites"
      ? favorites
      : view.type === "recent"
        ? recentSongs
        : curatedPlaylist
          ? getPlaylistSongs(curatedPlaylist)
          : (personalPlaylist?.songs ?? []);
  const search = searches[view.query ?? ""];
  const isCollection = ["favorites", "recent", "playlist"].includes(view.type);

  const headings: Record<
    View["type"],
    { title: string; subtitle: string; kicker: string }
  > = {
    home: {
      title: "Discover your sound.",
      subtitle: "Fresh finds. Familiar favorites. A little more you.",
      kicker: "YOUR DAILY DOSE OF GOOD MUSIC",
    },
    discover: {
      title: "Good music lives here.",
      subtitle: "Follow your curiosity. Find something that feels like you.",
      kicker: "EXPLORE A LITTLE",
    },
    radio: {
      title: "Find your frequency.",
      subtitle: "Handpicked listening sessions. Pick a mood and settle in.",
      kicker: "LET THE MUSIC TAKE OVER",
    },
    favorites: {
      title: "Songs you love.",
      subtitle: "All your heart-approved favorites, in one happy place.",
      kicker: "YOUR PERSONAL COLLECTION",
    },
    recent: {
      title: "Worth another listen.",
      subtitle: "The soundtrack to your lately. Pick up where you left off.",
      kicker: "YOUR LISTENING HISTORY",
    },
    playlist: {
      title: curatedPlaylist?.name ?? personalPlaylist?.name ?? "Your playlist",
      subtitle:
        curatedPlaylist?.description ??
        "Your songs. Your order. Your own little world.",
      kicker: curatedPlaylist
        ? "SMS SELECTS · CURATED WITH CARE"
        : "MADE BY YOU",
    },
    search: {
      title: `Results for “${view.query ?? ""}”`,
      subtitle: "A song, an artist, a new favorite. It all starts here.",
      kicker: "FOLLOW THAT FEELING",
    },
  };
  const heading = headings[view.type];
  const openPlaylist = (id: string) => navigate({ type: "playlist", id });
  const startMix = (songs: Song[], shuffled = false) => {
    if (!songs.length) return;
    setShuffle(shuffled);
    playSong(
      shuffled ? songs[Math.floor(Math.random() * songs.length)] : songs[0],
      songs,
    );
  };
  const submitPlaylist = (event: FormEvent) => {
    event.preventDefault();
    if (!playlistName.trim()) return;
    const id = createPlaylist(playlistName);
    setCreatingPlaylist(false);
    setPlaylistName("");
    openPlaylist(id);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to music
      </a>
      <Sidebar
        view={view}
        onNavigate={navigate}
        onCreatePlaylist={() => setCreatingPlaylist(true)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="main-shell">
        <Header
          query={query}
          onQueryChange={setQuery}
          onSearch={() => void runSearch(query)}
          onNavigate={navigate}
          onBack={() =>
            setHistory((previous) => ({
              ...previous,
              index: Math.max(0, previous.index - 1),
            }))
          }
          onForward={() =>
            setHistory((previous) => ({
              ...previous,
              index: Math.min(previous.entries.length - 1, previous.index + 1),
            }))
          }
          canBack={history.index > 0}
          canForward={history.index < history.entries.length - 1}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="main-content" id="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{heading.kicker}</p>
              <h1>{heading.title}</h1>
              <p className="page-subtitle">{heading.subtitle}</p>
            </div>
            {view.type === "home" && (
              <span className="made-for-you">
                <FiStar />
                Handpicked for you
              </span>
            )}
            {view.type === "search" && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setQuery("");
                  navigate({ type: "home" });
                }}
              >
                Back to discovering
                <FiArrowUpRight />
              </button>
            )}
          </div>

          {(view.type === "home" || view.type === "discover") && (
            <div
              className="category-tabs"
              role="group"
              aria-label="Filter music by mood or language"
            >
              {CATEGORIES.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={category === item ? "selected" : ""}
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item === "For you" && <FiDisc />}
                  {item}
                </button>
              ))}
            </div>
          )}

          {view.type === "home" && (
            <>
              <HeroBanner onExplore={openPlaylist} />
              <section className="music-section">
                <SectionTitle
                  title={
                    category === "For you"
                      ? "On everyone’s repeat"
                      : `${category}, on repeat`
                  }
                  subtitle="The tracks worth coming back to."
                  icon={<FiTrendingUp />}
                  action={() => navigate({ type: "discover" })}
                />
                <TrendingSongs songs={filteredSongs.slice(0, 6)} ranked />
              </section>
              <section className="music-section">
                <SectionTitle
                  title="Made for your mood"
                  subtitle="Whatever the day feels like, there’s a mix for that."
                  action={() => navigate({ type: "radio" })}
                  actionLabel="Find your vibe"
                />
                <Albums onAlbumClick={openPlaylist} />
              </section>
              <section className="music-section">
                <SectionTitle
                  title="Voices you’ll fall for"
                  subtitle="Your favorites. And your soon-to-be favorites."
                  action={() => navigate({ type: "discover" })}
                  actionLabel="Explore artists"
                />
                <TopArtists
                  onArtistClick={(artist) => void runSearch(artist)}
                />
              </section>
              {recentSongs.length > 0 && (
                <section className="music-section">
                  <SectionTitle
                    title="One more time?"
                    subtitle="A few of your recent listens."
                    action={() => navigate({ type: "recent" })}
                  />
                  <RecentlyPlayed songs={recentSongs.slice(0, 4)} />
                </section>
              )}
            </>
          )}

          {view.type === "discover" && (
            <>
              <section className="music-section browse-section">
                <SectionTitle
                  title={
                    category === "For you"
                      ? "The good stuff"
                      : `${category} essentials`
                  }
                  subtitle={`${filteredSongs.length} handpicked tracks to explore.`}
                  action={() => startMix(filteredSongs, true)}
                  actionLabel="Shuffle play"
                />
                <TrendingSongs songs={filteredSongs} />
              </section>
              <section className="music-section">
                <SectionTitle
                  title="Meet your next favorite artist"
                  subtitle="Tap an artist to explore their sound."
                />
                <TopArtists
                  onArtistClick={(artist) => void runSearch(artist)}
                />
              </section>
              <section className="music-section">
                <SectionTitle title="Start with a mood" />
                <Albums onAlbumClick={openPlaylist} />
              </section>
            </>
          )}

          {view.type === "radio" && (
            <>
              <div className="radio-intro">
                <span className="radio-icon">
                  <FiRadio />
                </span>
                <div>
                  <h2>Less scrolling. More listening.</h2>
                  <p>Pick a station. We’ll take care of the next song.</p>
                  <span>Curated sessions · Official track previews</span>
                </div>
              </div>
              <div className="station-grid">
                {CURATED_PLAYLISTS.map((playlist, index) => {
                  const songs = getPlaylistSongs(playlist);
                  return (
                    <button
                      type="button"
                      className="station-card"
                      key={playlist.id}
                      onClick={() => {
                        startMix(songs, true);
                        notify(`${playlist.name} is now playing`);
                      }}
                    >
                      <Artwork src={playlist.image} alt="" />
                      <span className="station-shade" />
                      <span className="station-top">
                        <FiRadio />
                        STATION 0{index + 1}
                      </span>
                      <span className="station-text">
                        <strong>{playlist.name}</strong>
                        <span>{playlist.description}</span>
                        <small>
                          {songs.length} tracks · Press play, stay a while
                        </small>
                      </span>
                      <span className="station-play">
                        <FiPlay />
                      </span>
                    </button>
                  );
                })}
              </div>
              <section className="music-section">
                <SectionTitle
                  title="Or let the day decide"
                  subtitle="A little Hindi. A little Marathi. A little unexpected."
                />
                <button
                  type="button"
                  className="surprise-card"
                  onClick={() => startMix(SONGS, true)}
                >
                  <FiShuffle />
                  <span>
                    <strong>Surprise me</strong>
                    <span>All the good stuff, shuffled just for you.</span>
                  </span>
                  <FiArrowUpRight />
                </button>
              </section>
            </>
          )}

          {view.type === "search" && (
            <section
              className="music-section search-section"
              aria-busy={search?.loading}
            >
              {search?.loading ? (
                <>
                  <SectionTitle title="Finding your next favorite…" />
                  <div
                    className="song-grid"
                    role="status"
                    aria-label="Searching for music"
                  >
                    {Array.from({ length: 6 }, (_, index) => (
                      <SkeletonCard key={index} />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {search &&
                    (search.source === "offline" || search.live === false) && (
                      <div className="offline-note" role="status">
                        <FiWifiOff />
                        <span>
                          {search.error ??
                            "Live search is temporarily unavailable. Your handpicked catalogue is still here."}
                        </span>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => void runSearch(view.query ?? "")}
                        >
                          Try again
                        </button>
                      </div>
                    )}
                  {search?.songs.length ? (
                    <>
                      <SectionTitle
                        title="Found your sound"
                        subtitle={`${search.songs.length} ${
                          search.songs.length === 1 ? "track" : "tracks"
                        } · ${sourceLabel(search.source)}`}
                        action={() => startMix(search.songs)}
                        actionLabel="Play results"
                      />
                      <TrendingSongs songs={search.songs} />
                    </>
                  ) : (
                    <div className="empty-state">
                      <span className="empty-icon">
                        <FiSearch />
                      </span>
                      <h2>
                        {search?.source === "offline"
                          ? "Let’s explore what’s here."
                          : "No tracks found. Yet."}
                      </h2>
                      <p>
                        {search?.source === "offline"
                          ? "Try Kesariya, Arijit Singh, Sairat, or browse our favorite finds."
                          : "Try a different song, artist, or album. Your next favorite is out there."}
                      </p>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => navigate({ type: "discover" })}
                      >
                        Browse music
                        <FiArrowUpRight />
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {isCollection && (
            <>
              <section className="collection-summary">
                <div
                  className={`collection-cover ${view.type === "favorites" ? "favorites-cover" : ""}`}
                >
                  {curatedPlaylist ? (
                    <Artwork src={curatedPlaylist.image} alt="" />
                  ) : personalPlaylist?.songs[0] ? (
                    <Artwork src={personalPlaylist.songs[0].image} alt="" />
                  ) : view.type === "favorites" ? (
                    <FiHeart />
                  ) : view.type === "recent" ? (
                    <FiClock />
                  ) : (
                    <FiMusic />
                  )}
                </div>
                <div className="collection-detail">
                  <span className="eyebrow">
                    {view.type === "recent"
                      ? "YOUR RECENT ROTATION"
                      : "A SOUNDTRACK OF YOUR OWN"}
                  </span>
                  <h2>
                    {collectionSongs.length}{" "}
                    {collectionSongs.length === 1 ? "song" : "songs"}.{" "}
                    {view.type === "favorites" ? "All heart." : "All yours."}
                  </h2>
                  <p>
                    {view.type === "recent"
                      ? "Your last 30 listens, saved on this device."
                      : "Official previews. Full tracks are a click away."}
                  </p>
                  <div className="collection-actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={!collectionSongs.length}
                      onClick={() => startMix(collectionSongs)}
                    >
                      <FiPlay />
                      Play all
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={!collectionSongs.length}
                      onClick={() => startMix(collectionSongs, true)}
                    >
                      <FiShuffle />
                      Shuffle
                    </button>
                    {personalPlaylist && (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Delete this playlist"
                        onClick={() => setDeletingPlaylist(true)}
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </div>
              </section>
              {collectionSongs.length ? (
                <section className="music-section">
                  <SectionTitle
                    title={
                      view.type === "recent"
                        ? "Your latest listens"
                        : "The tracklist"
                    }
                    subtitle="Listen a little closer."
                  />
                  {personalPlaylist ? (
                    <TrendingSongs
                      songs={collectionSongs}
                      playlistId={personalPlaylist.id}
                    />
                  ) : (
                    <RecentlyPlayed songs={collectionSongs} />
                  )}
                </section>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">
                    {view.type === "favorites" ? (
                      <FiHeart />
                    ) : view.type === "recent" ? (
                      <FiDisc />
                    ) : (
                      <FiMusic />
                    )}
                  </span>
                  <h2>
                    {view.type === "favorites"
                      ? "A home for your favorites."
                      : view.type === "recent"
                        ? "Your story starts with a song."
                        : "Every great mix starts somewhere."}
                  </h2>
                  <p>
                    {view.type === "favorites"
                      ? "Tap the heart on any track. We’ll keep it right here for you."
                      : view.type === "recent"
                        ? "Play something you love. Your recent listens will show up here."
                        : "Add songs using a track’s three-dot menu, or start with your current pick."}
                  </p>
                  <div className="empty-actions">
                    {personalPlaylist && (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                          addToPlaylist(personalPlaylist.id, currentSong)
                        }
                      >
                        <FiPlus />
                        Add {currentSong.title}
                      </button>
                    )}
                    <button
                      type="button"
                      className={
                        personalPlaylist ? "secondary-button" : "primary-button"
                      }
                      onClick={() => navigate({ type: "discover" })}
                    >
                      Find your next favorite
                      <FiArrowUpRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <footer className="content-footer">
            <span>
              <FiMusic />
              Made for the moments in between.
            </span>
            <span>Official previews · Your library stays on this device</span>
          </footer>
        </main>
      </div>
      {creatingPlaylist && (
        <Dialog
          label="Create a playlist"
          className="create-dialog"
          onClose={() => setCreatingPlaylist(false)}
        >
          <span className="dialog-art">
            <FiMusic />
          </span>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h2>A mix of your own.</h2>
          <p>For the songs that feel like you.</p>
          <form onSubmit={submitPlaylist}>
            <label htmlFor="playlist-name">Playlist name</label>
            <input
              id="playlist-name"
              placeholder="Late nights, good company..."
              value={playlistName}
              maxLength={60}
              required
              onChange={(event) => setPlaylistName(event.target.value)}
            />
            <button
              type="submit"
              className="primary-button"
              disabled={!playlistName.trim()}
            >
              <FiPlus />
              Create playlist
            </button>
          </form>
        </Dialog>
      )}
      {deletingPlaylist && personalPlaylist && (
        <Dialog
          label="Delete playlist"
          className="create-dialog"
          onClose={() => setDeletingPlaylist(false)}
        >
          <span className="dialog-art">
            <FiTrash2 />
          </span>
          <h2>Delete this playlist?</h2>
          <p>
            “{personalPlaylist.name}” will be removed from this device. Your
            liked songs won’t change.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setDeletingPlaylist(false)}
            >
              Keep it
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                deletePlaylist(personalPlaylist.id);
                setDeletingPlaylist(false);
                navigate({ type: "home" });
              }}
            >
              Delete playlist
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
