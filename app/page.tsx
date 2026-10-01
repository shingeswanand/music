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
  FiEdit2,
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
import DiscoveryStatus from "./components/DiscoveryStatus";
import DiscoveryTracks from "./components/DiscoveryTracks";
import { useDiscovery } from "./context/DiscoveryContext";
import { useStoredValue } from "./lib/storage";
import { isDiscoveryCategory } from "./lib/discovery";
import { usePlayer } from "./context/PlayerContext";
import { CATEGORIES } from "./lib/catalogue";
import { searchSongs } from "./lib/api";
import {
  collectionSourceLabel,
  sourceLabel,
  type SearchResponse,
  type Song,
  type View,
} from "./lib/types";

type SearchState = SearchResponse & { loading: boolean; error?: string };

export default function Home() {
  const [history, setHistory] = useState<{ entries: View[]; index: number }>({
    entries: [{ type: "home" }],
    index: 0,
  });
  const view = history.entries[history.index];
  const [query, setQuery] = useState("");
  const [storedCategory, setCategory] = useStoredValue<unknown>(
    "sms-category",
    "For you",
  );
  const category = isDiscoveryCategory(storedCategory)
    ? storedCategory
    : "For you";
  const { feeds, mixStates, mixes, loadCategory, loadMix, dailySongs } =
    useDiscovery();
  const discovery = feeds[category];
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(false);
  const mixIntent = useRef(0);
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
    setRepeat,
    createPlaylist,
    renamePlaylist,
    addToPlaylist,
    deletePlaylist,
    currentSong,
    getPlaybackIntent,
    notify,
  } = usePlayer();

  const navigate = useCallback((next: View) => {
    mixIntent.current++;
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

  const filteredSongs = discovery?.data?.songs ?? [];
  const artists = discovery?.data?.artists ?? [];
  const curatedPlaylist =
    view.type === "playlist"
      ? mixes.find((playlist) => playlist.id === view.id)
      : undefined;
  const personalPlaylist =
    view.type === "playlist"
      ? playlists.find((playlist) => playlist.id === view.id)
      : undefined;
  const mixResource = curatedPlaylist
    ? mixStates[curatedPlaylist.id]
    : undefined;
  const collectionSongs: Song[] =
    view.type === "favorites"
      ? favorites
      : view.type === "recent"
        ? recentSongs
        : curatedPlaylist
          ? (mixResource?.data?.songs ?? [])
          : (personalPlaylist?.songs ?? []);
  const search = searches[view.query ?? ""];
  const isCollection = ["favorites", "recent", "playlist"].includes(view.type);
  const collectionLoading = !!curatedPlaylist && !mixResource?.data;

  useEffect(() => {
    if (view.type === "home" || view.type === "discover")
      void loadCategory(category).catch(() => undefined);
  }, [category, view.type, loadCategory]);

  useEffect(() => {
    if (view.type === "playlist" && curatedPlaylist)
      void loadMix(curatedPlaylist.id).catch(() => undefined);
  }, [view.type, curatedPlaylist, loadMix]);

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
      subtitle: "Fresh listening sessions. Pick a mood and settle in.",
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
      kicker: curatedPlaylist ? "FRESH MUSIC FOR YOUR MOMENT" : "MADE BY YOU",
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
  const playMix = async (id: string, station = false) => {
    const intent = ++mixIntent.current;
    const playbackIntent = getPlaybackIntent();
    try {
      const result = await loadMix(id);
      if (
        intent !== mixIntent.current ||
        playbackIntent !== getPlaybackIntent()
      )
        return;
      if (!result.songs.length) {
        notify(
          "No tracks in this mix yet. Try refreshing or choose another mood.",
        );
        return;
      }
      if (station) setRepeat("all");
      startMix(result.songs, station);
      if (station)
        notify(
          `${mixes.find((mix) => mix.id === id)?.name ?? "Your station"} is now playing`,
        );
    } catch {
      if (intent === mixIntent.current)
        notify("Couldn’t load that mix. Please try again.");
    }
  };
  const submitPlaylist = (event: FormEvent) => {
    event.preventDefault();
    if (!playlistName.trim()) return;
    if (editingPlaylist && personalPlaylist) {
      renamePlaylist(personalPlaylist.id, playlistName);
      setEditingPlaylist(false);
    } else {
      const id = createPlaylist(playlistName);
      setCreatingPlaylist(false);
      openPlaylist(id);
    }
    setPlaylistName("");
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
                {favorites.length || recentSongs.length
                  ? "Inspired by your listening"
                  : "Fresh discoveries"}
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
              <DiscoveryStatus
                resource={discovery}
                onRefresh={() =>
                  void loadCategory(category, true).catch(() => undefined)
                }
              />
              <HeroBanner
                onExplore={openPlaylist}
                onPlayMix={(id) => void playMix(id)}
              />
              <section className="music-section">
                <SectionTitle
                  title={
                    category === "For you"
                      ? "Your next rotation"
                      : `${category}, on repeat`
                  }
                  subtitle={
                    discovery?.data
                      ? collectionSourceLabel(filteredSongs)
                      : "Finding the tracks worth coming back to."
                  }
                  icon={<FiTrendingUp />}
                  action={() => navigate({ type: "discover" })}
                />
                <DiscoveryTracks
                  songs={filteredSongs.slice(0, 6)}
                  loading={!discovery?.data}
                  ranked
                />
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
                  artists={artists}
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
              <DiscoveryStatus
                resource={discovery}
                onRefresh={() =>
                  void loadCategory(category, true).catch(() => undefined)
                }
              />
              <section className="music-section browse-section">
                <SectionTitle
                  title={
                    category === "For you"
                      ? "The good stuff"
                      : `${category} essentials`
                  }
                  subtitle={`${filteredSongs.length} tracks to explore · ${discovery?.data ? sourceLabel(discovery.data.source) : "Connecting…"}`}
                  action={() => startMix(filteredSongs, true)}
                  actionLabel="Shuffle play"
                />
                <DiscoveryTracks
                  songs={filteredSongs}
                  loading={!discovery?.data}
                />
              </section>
              <section className="music-section">
                <SectionTitle
                  title="Meet your next favorite artist"
                  subtitle="Tap an artist to explore their sound."
                />
                <TopArtists
                  artists={artists}
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
                  <span>Fresh tracklists · Shuffle and repeat enabled</span>
                </div>
              </div>
              <div className="station-grid">
                {mixes.map((playlist, index) => {
                  const resource = mixStates[playlist.id];
                  return (
                    <button
                      type="button"
                      className="station-card"
                      key={playlist.id}
                      disabled={resource?.loading || resource?.checkingLive}
                      aria-label={`Play ${playlist.name} station`}
                      onClick={() => void playMix(playlist.id, true)}
                    >
                      <Artwork src={playlist.image} alt="" />
                      <span className="station-shade" />
                      <span className="station-top">
                        <FiRadio />
                        STATION {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="station-text">
                        <strong>{playlist.name}</strong>
                        <span>{playlist.description}</span>
                        <small>
                          {resource?.loading || resource?.checkingLive
                            ? "Finding fresh tracks…"
                            : resource?.data
                              ? `${resource.data.songs.length} tracks · ${resource.data.live ? "Live selection" : "Offline picks"}`
                              : "Fresh tracks loaded when you press play"}
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
                  disabled={!dailySongs.length}
                  onClick={() => {
                    setRepeat("all");
                    startMix(dailySongs, true);
                  }}
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
                            "Live search is temporarily unavailable. Your offline catalogue is still here."}
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
                    {collectionLoading ? (
                      "Loading your mix…"
                    ) : (
                      <>
                        {collectionSongs.length}{" "}
                        {collectionSongs.length === 1 ? "song" : "songs"}.{" "}
                        {view.type === "favorites"
                          ? "All heart."
                          : "All yours."}
                      </>
                    )}
                  </h2>
                  <p>
                    {view.type === "recent"
                      ? "Your last 30 listens, saved on this device."
                      : collectionSourceLabel(collectionSongs)}
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
                      <>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="Rename this playlist"
                          onClick={() => {
                            setPlaylistName(personalPlaylist.name);
                            setEditingPlaylist(true);
                          }}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="Delete this playlist"
                          onClick={() => setDeletingPlaylist(true)}
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </section>
              {curatedPlaylist && (
                <DiscoveryStatus
                  resource={mixResource}
                  refreshLabel="Refresh this mix"
                  onRefresh={() =>
                    void loadMix(curatedPlaylist.id, true).catch(
                      () => undefined,
                    )
                  }
                />
              )}
              {collectionLoading ? (
                <section className="music-section">
                  <DiscoveryTracks songs={[]} loading />
                </section>
              ) : collectionSongs.length ? (
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
                    {personalPlaylist && currentSong && (
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
            <span>
              Full YouTube tracks & official previews · Saved on this device
            </span>
          </footer>
        </main>
      </div>
      {(creatingPlaylist || editingPlaylist) && (
        <Dialog
          label={editingPlaylist ? "Rename playlist" : "Create a playlist"}
          className="create-dialog"
          onClose={() => {
            setCreatingPlaylist(false);
            setEditingPlaylist(false);
            setPlaylistName("");
          }}
        >
          <span className="dialog-art">
            <FiMusic />
          </span>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h2>
            {editingPlaylist ? "Give it a new name." : "A mix of your own."}
          </h2>
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
              {editingPlaylist ? "Save name" : "Create playlist"}
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
