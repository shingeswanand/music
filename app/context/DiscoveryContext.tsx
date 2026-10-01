"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { requestDiscovery, retryDiscovery } from "../lib/api";
import { CATEGORIES } from "../lib/catalogue";
import { dailyMix, MIXES, mixesFromSongs } from "../lib/discovery";
import type {
  DiscoveryCategory,
  DiscoveryResponse,
  ListeningMix,
  Song,
} from "../lib/types";
import { usePlayer } from "./PlayerContext";

export type DiscoveryResource = {
  data?: DiscoveryResponse;
  loading: boolean;
  checkingLive: boolean;
};

type DiscoveryState = {
  feeds: Partial<Record<DiscoveryCategory, DiscoveryResource>>;
  mixStates: Partial<Record<string, DiscoveryResource>>;
  mixes: ListeningMix[];
  dailySongs: Song[];
  loadCategory: (
    category: DiscoveryCategory,
    refresh?: boolean,
  ) => Promise<DiscoveryResponse>;
  loadMix: (id: string, refresh?: boolean) => Promise<DiscoveryResponse>;
};

const DiscoveryContext = createContext<DiscoveryState | null>(null);
const FRESH_MS = 5 * 60_000;

export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const [resources, setResources] = useState<
    Partial<Record<string, DiscoveryResource>>
  >({});
  const cache = useRef(
    new Map<string, { data: DiscoveryResponse; at: number }>(),
  );
  const requests = useRef(
    new Map<
      string,
      { controller: AbortController; promise: Promise<DiscoveryResponse> }
    >(),
  );
  const { favorites, recentSongs, initializeQueue } = usePlayer();

  const load = useCallback(
    (category: DiscoveryCategory, mixId?: string, refresh = false) => {
      const key = mixId ? `mix:${mixId}` : category;
      const pending = requests.current.get(key);
      if (pending && !pending.controller.signal.aborted && !refresh)
        return pending.promise;
      const saved = cache.current.get(key);
      if (saved && Date.now() - saved.at < FRESH_MS && !refresh)
        return Promise.resolve(saved.data);
      pending?.controller.abort();
      const controller = new AbortController();
      setResources((previous) => ({
        ...previous,
        [key]: { ...previous[key], loading: true, checkingLive: false },
      }));
      const publish = (data: DiscoveryResponse, checkingLive: boolean) => {
        if (
          controller.signal.aborted ||
          requests.current.get(key)?.controller !== controller
        )
          return;
        cache.current.set(key, { data, at: Date.now() });
        setResources((previous) => ({
          ...previous,
          [key]: { data, loading: false, checkingLive },
        }));
        if (key === "For you") initializeQueue(data.songs);
      };
      const promise = (async () => {
        const result = await requestDiscovery(
          category,
          mixId,
          controller.signal,
        );
        publish(result, result.clientFallback === true);
        try {
          const live = await retryDiscovery(result, controller.signal);
          publish(live, false);
          return live;
        } catch (error) {
          if (controller.signal.aborted) throw error;
          publish(result, false);
          return result;
        }
      })().finally(() => {
        if (requests.current.get(key)?.controller === controller)
          requests.current.delete(key);
      });
      requests.current.set(key, { controller, promise });
      return promise;
    },
    [initializeQueue],
  );

  const loadCategory = useCallback(
    (category: DiscoveryCategory, refresh = false) =>
      load(category, undefined, refresh),
    [load],
  );
  const loadMix = useCallback(
    (id: string, refresh = false) => {
      if (!MIXES.some((mix) => mix.id === id))
        return Promise.reject(new Error("This mix is unavailable."));
      return load("For you", id, refresh);
    },
    [load],
  );

  useEffect(() => {
    const active = requests.current;
    void loadCategory("For you").catch(() => undefined);
    return () => {
      active.forEach(({ controller }) => controller.abort());
      active.clear();
    };
  }, [loadCategory]);

  const base = resources["For you"]?.data;
  const mixes = useMemo(
    () =>
      mixesFromSongs(base?.songs ?? []).map((mix) => {
        const data = resources[`mix:${mix.id}`]?.data;
        return data
          ? {
              ...mix,
              songs: data.songs,
              image: data.songs[0]?.image ?? mix.image,
            }
          : mix;
      }),
    [base, resources],
  );
  const dailySongs = useMemo(
    () =>
      dailyMix(
        base?.songs ?? [],
        favorites,
        recentSongs,
        base?.updatedAt.slice(0, 10) ?? "today",
      ),
    [base, favorites, recentSongs],
  );
  const feeds = Object.fromEntries(
    CATEGORIES.map((category) => [category, resources[category]]),
  );
  const mixStates = Object.fromEntries(
    MIXES.map((mix) => [mix.id, resources[`mix:${mix.id}`]]),
  );

  return (
    <DiscoveryContext.Provider
      value={{ feeds, mixStates, mixes, dailySongs, loadCategory, loadMix }}
    >
      {children}
    </DiscoveryContext.Provider>
  );
}

export function useDiscovery() {
  const context = useContext(DiscoveryContext);
  if (!context)
    throw new Error("useDiscovery must be used inside DiscoveryProvider");
  return context;
}
