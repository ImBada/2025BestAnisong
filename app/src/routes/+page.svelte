<script lang="ts">
  import { onMount } from "svelte";
  import { parseSongs, parseDJs } from "$lib/dataParser";
  import type { Song, DJ } from "$lib/types";
  import { base } from "$app/paths";

  let songs: Map<number, Song> = new Map();
  let djs: DJ[] = [];
  let shuffledDJs: DJ[] = [];
  let loading = true;
  let selectedQuarter: "id_1" | "id_2" | "id_3" | "id_4" | "all" = "id_1";
  let selectedDJ: string | null = null;

  const quarterNames = {
    id_1: "1분기",
    id_2: "2분기",
    id_3: "3분기",
    id_4: "4분기",
    all: "올해의 애니송",
  };

  function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function getRandomDJNames(): string {
    const djNames = djs.map((dj) => dj.name);
    const shuffled = shuffleArray(djNames);
    return shuffled.join(" • ");
  }

  onMount(async () => {
    try {
      songs = await parseSongs();
      djs = await parseDJs();
      shuffledDJs = shuffleArray(djs);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      loading = false;
    }
  });

  function getSongForDJ(dj: DJ, quarter: typeof selectedQuarter): Song | null {
    const songId = dj[quarter];
    if (songId === null) return null;
    return songs.get(songId) || null;
  }

  function getSpotifyTrackId(spotifyUrl: string): string | null {
    const match = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  function getSpotifyEmbedUrl(spotifyUrl: string): string | null {
    const trackId = getSpotifyTrackId(spotifyUrl);
    return trackId ? `https://open.spotify.com/embed/track/${trackId}` : null;
  }

  function groupSongsByDJ(
    quarter: typeof selectedQuarter
  ): Array<{
    song: Song;
    djs: string[];
    quarterPicks?: Map<string, string[]>;
  }> {
    const songMap = new Map<number, string[]>();

    // Track which quarters the selected DJ picked each song
    const djQuartersMap = new Map<
      number,
      Array<"id_1" | "id_2" | "id_3" | "id_4" | "all">
    >();

    // If a specific DJ is selected, show all their picks across all quarters including "all"
    if (selectedDJ) {
      const selectedDJData = djs.find((dj) => dj.name === selectedDJ);
      if (selectedDJData) {
        const quarters: Array<"id_1" | "id_2" | "id_3" | "id_4" | "all"> = [
          "id_1",
          "id_2",
          "id_3",
          "id_4",
          "all",
        ];
        for (const q of quarters) {
          const songId = selectedDJData[q];
          if (songId !== null) {
            if (!songMap.has(songId)) {
              songMap.set(songId, []);
            }
            songMap.get(songId)!.push(selectedDJData.name);

            // Track which quarter this DJ selected this song
            if (!djQuartersMap.has(songId)) {
              djQuartersMap.set(songId, []);
            }
            djQuartersMap.get(songId)!.push(q);
          }
        }
      }
    } else {
      // Normal grouping by quarter
      for (const dj of djs) {
        const songId = dj[quarter];
        if (songId !== null) {
          if (!songMap.has(songId)) {
            songMap.set(songId, []);
          }
          songMap.get(songId)!.push(dj.name);
        }
      }
    }

    // Convert to array with song details
    const result: Array<{
      song: Song;
      djs: string[];
      quarterPicks?: Map<string, string[]>;
    }> = [];
    for (const [songId, djNames] of songMap.entries()) {
      const song = songs.get(songId);
      if (song) {
        const entry: {
          song: Song;
          djs: string[];
          quarterPicks?: Map<string, string[]>;
        } = {
          song,
          djs: djNames,
        };

        // Show quarter info when viewing a specific DJ's picks or "all" category
        if (selectedDJ) {
          // DJ별 화면: 해당 DJ가 선정한 분기만 표시
          const selectedDJQuarters = djQuartersMap.get(songId);
          if (selectedDJQuarters) {
            const quarterPicks = new Map<string, string[]>();

            // 모든 분기를 확인하면서 다른 DJ들 찾기
            const quarters: Array<"id_1" | "id_2" | "id_3" | "id_4" | "all"> = [
              "id_1",
              "id_2",
              "id_3",
              "id_4",
              "all",
            ];
            for (const q of quarters) {
              const djsForQuarter: string[] = [];
              for (const dj of djs) {
                if (dj[q] === songId) {
                  djsForQuarter.push(dj.name);
                }
              }
              if (djsForQuarter.length > 0) {
                quarterPicks.set(quarterNames[q], djsForQuarter);
              }
            }

            if (quarterPicks.size > 0) {
              entry.quarterPicks = quarterPicks;
            }
          }
        } else if (quarter === "all") {
          // 올해의 애니송 화면: 모든 분기 정보 표시
          const quarterPicks = new Map<string, string[]>();
          const quarters: Array<"id_1" | "id_2" | "id_3" | "id_4" | "all"> = [
            "id_1",
            "id_2",
            "id_3",
            "id_4",
            "all",
          ];

          for (const q of quarters) {
            const djsForQuarter: string[] = [];
            for (const dj of djs) {
              if (dj[q] === songId) {
                djsForQuarter.push(dj.name);
              }
            }
            if (djsForQuarter.length > 0) {
              quarterPicks.set(quarterNames[q], djsForQuarter);
            }
          }

          if (quarterPicks.size > 0) {
            entry.quarterPicks = quarterPicks;
          }
        }

        result.push(entry);
      }
    }

    // Shuffle array using Fisher-Yates algorithm (except when viewing specific DJ)
    if (!selectedDJ) {
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
    }

    return result;
  }
</script>

<svelte:head>
  <title>2025 아로아로 BEST 애니송 어워드</title>
</svelte:head>

<main style="background-image: url('{base}/data/bg.jpeg')">
  <div
    class="character-image"
    style="background-image: url('{base}/data/standing.png')"
  ></div>
  <div class="container">
    <header>
      <h1>2025 아로아로 BEST 애니송</h1>
      <p class="subtitle">
        아로아로 카운트다운 2026에 참여한 DJ/VJ들이 선정한 올해의 애니메이션
        노래
      </p>
    </header>

    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>로딩 중...</p>
      </div>
    {:else}
      <!-- Playlist Widget -->
      <section class="playlist-section">
        <div class="playlist-header">
          <h2>🎧 전체 플레이리스트</h2>
          <p>선정된 모든 노래가 담긴 플레이리스트입니다.</p>
        </div>
        <div class="playlist-widget">
          <iframe
            style="border-radius:12px"
            src="https://open.spotify.com/embed/playlist/3tPsSZWG5wDViZWG59JVBj?utm_source=generator"
            width="100%"
            height="152"
            frameborder="0"
            allowfullscreen=""
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="2025 아로아로 BEST 애니송 전체 플레이리스트"
          ></iframe>
        </div>
      </section>

      <div class="quarter-nav-wrapper">
        <nav class="quarter-nav">
          {#each Object.entries(quarterNames) as [key, label]}
            <button
              class="quarter-btn"
              class:active={selectedQuarter === key && selectedDJ === null}
              onclick={() => {
                selectedQuarter = key as typeof selectedQuarter;
                selectedDJ = null;
              }}
            >
              {label}
            </button>
          {/each}
        </nav>
      </div>

      <nav class="dj-nav">
        {#each shuffledDJs as dj}
          <button
            class="dj-btn"
            class:active={selectedDJ === dj.name}
            onclick={() => {
              if (selectedDJ === dj.name) {
                selectedDJ = null;
              } else {
                selectedDJ = dj.name;
              }
            }}
          >
            {dj.name}
          </button>
        {/each}
      </nav>

      <section class="awards-section">
        <h2>
          {selectedDJ
            ? `${selectedDJ}의 선정곡`
            : quarterNames[selectedQuarter]}
        </h2>

        <div class="awards-list">
          {#each groupSongsByDJ(selectedQuarter) as { song, djs, quarterPicks }}
            <article class="award-card">
              <div class="card-layout">
                <!-- Left: Spotify Player -->
                <div class="player-section">
                  {#if song.spotify}
                    {@const embedUrl = getSpotifyEmbedUrl(song.spotify)}
                    {#if embedUrl}
                      <iframe
                        src={embedUrl}
                        width="100%"
                        height="232"
                        frameborder="0"
                        allowtransparency="true"
                        allow="encrypted-media"
                        title="{song.곡명} Spotify Player"
                      ></iframe>
                    {/if}
                  {/if}
                </div>

                <!-- Right: Song Info -->
                <div class="info-section">
                  <div class="dj-badges">
                    {#if selectedDJ && quarterPicks}
                      <!-- DJ별 화면: 해당 DJ가 선정한 분기만 표시 -->
                      {#each Array.from(quarterPicks.entries()) as [quarterName, quarterDJs]}
                        {#if quarterDJs.includes(selectedDJ)}
                          <span class="dj-badge quarter-badge"
                            >{quarterName}</span
                          >
                        {/if}
                      {/each}
                    {:else}
                      {#each djs as djName}
                        <span class="dj-badge">{djName}</span>
                      {/each}
                    {/if}
                  </div>

                  <h3 class="song-title">{song.곡명}</h3>

                  <div class="song-details">
                    <div class="info-row">
                      <span class="label">아티스트</span>
                      <span class="value">
                        {song.아티스트}
                        {#if song.아티스트_한글}
                          <br />
                          <span class="korean">{song.아티스트_한글}</span>
                        {/if}
                      </span>
                    </div>

                    <div class="info-row">
                      <span class="label">작품</span>
                      <span class="value work-info">
                        <span class="work-title">
                          {song.작품}
                          {#if song.작품_일본어}
                            <br />
                            <span class="japanese">{song.작품_일본어}</span>
                          {/if}
                        </span>
                        <span class="tag">{song.정보}</span>
                      </span>
                    </div>

                    <div class="info-row">
                      <span class="label">크레딧</span>
                      <span class="value credit">{song.크레딧}</span>
                    </div>

                    {#if quarterPicks && quarterPicks.size > 0}
                      {#if selectedDJ}
                        <!-- DJ별 화면: 해당 DJ가 선정한 분기 표시 및 다른 선정자 -->
                        {@const djPickedQuarters = Array.from(
                          quarterPicks.entries()
                        )
                          .filter(([quarterName, quarterDJs]) =>
                            quarterDJs.includes(selectedDJ)
                          )
                          .map(([quarterName]) => quarterName)}
                        {@const allOtherDJs = Array.from(
                          quarterPicks.entries()
                        ).flatMap(([quarterName, quarterDJs]) =>
                          quarterDJs
                            .filter((dj) => dj !== selectedDJ)
                            .map((dj) => `${dj} (${quarterName})`)
                        )}
                        {#if allOtherDJs.length > 0}
                          <div class="info-row">
                            <span class="label">다른 선정자</span>
                            <span class="value quarter-picks">
                              {allOtherDJs.join(", ")}
                            </span>
                          </div>
                        {/if}
                      {:else}
                        <!-- 분기별/올해의 애니송 화면: "올해의 애니송" 화면에서 "올해의 애니송 선정" 항목 숨김 -->
                        {#each Array.from(quarterPicks.entries()) as [quarterName, quarterDJs]}
                          {#if !(selectedQuarter === "all" && quarterName === "올해의 애니송")}
                            <div class="info-row">
                              <span class="label">{`${quarterName} 선정`}</span>
                              <span class="value quarter-picks">
                                {quarterDJs.join(", ")}
                              </span>
                            </div>
                          {/if}
                        {/each}
                      {/if}
                    {/if}
                  </div>
                </div>
              </div>
            </article>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Credits Section -->
    <footer class="credits-section">
      <div class="credits-content">
        <a
          href="https://x.com/ANISONGSLIDE/status/1995063714995966253"
          target="_blank"
          rel="noopener noreferrer"
          class="poster-image"
        >
          <img
            src="{base}/data/poster.jpeg"
            alt="2025 아로아로 BEST 애니송 포스터"
          />
        </a>
        <div class="credits-text">
          <h3>Credits</h3>
          <p class="event-title">아로아로 카운트다운 2025-2026 ✧</p>
          <p class="event-date">2025년 12월 31일 (수) 밤</p>
          <p class="event-location">합정 아로아로홀</p>
          {#if djs.length > 0}
            <p class="dj-list">{getRandomDJNames()}</p>
          {/if}
          <a
            href="https://x.com/hashtag/%EC%95%84%EB%A1%9C%EC%95%84%EB%A1%9C%EC%B9%B4%EC%9A%B4%ED%8A%B8%EB%8B%A4%EC%9A%B4"
            target="_blank"
            rel="noopener noreferrer"
            class="hashtag-link"
          >
            <p class="hashtag">#아로아로카운트다운</p>
          </a>
        </div>
      </div>
    </footer>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
    background-color: #000000;
  }

  main {
    background-color: #000000;
    background-size: 100% auto;
    background-position: center top;
    background-repeat: no-repeat;
    background-attachment: fixed;
    min-height: 100vh;
    position: relative;
  }

  main::before {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    pointer-events: none;
    z-index: 0;
  }

  .character-image {
    position: fixed;
    bottom: 0;
    right: 2rem;
    width: 400px;
    height: 600px;
    background-size: contain;
    background-position: bottom right;
    background-repeat: no-repeat;
    pointer-events: none;
    z-index: 1;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    position: relative;
    z-index: 2;
  }

  header {
    text-align: center;
    color: white;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 3rem;
    margin: 0 0 0.5rem 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .subtitle {
    font-size: 1.2rem;
    opacity: 0.9;
    margin: 0;
  }

  .loading {
    text-align: center;
    color: white;
    padding: 4rem 0;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    margin: 0 auto 1rem;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .playlist-section {
    padding: 1.5rem 0;
    margin-bottom: 1.5rem;
  }

  .playlist-header {
    text-align: center;
    margin-bottom: 1rem;
  }

  .playlist-header h2 {
    color: white;
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 700;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .playlist-header p {
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
    font-size: 0.95rem;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
  }

  .playlist-widget {
    max-width: 600px;
    margin: 0 auto;
    border-radius: 16px;
    overflow: hidden;
    padding: 4px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(20px) saturate(180%);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  }

  .quarter-nav-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .quarter-nav {
    display: inline-flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 25px;
    backdrop-filter: blur(20px) saturate(180%);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  }

  .dj-nav {
    display: flex;
    gap: 0.3rem;
    margin-bottom: 2rem;
    margin-top: 1rem;
    flex-wrap: nowrap;
    justify-content: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dj-btn {
    padding: 0.3rem 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.7rem;
    font-weight: 500;
    transition: all 0.3s ease;
    backdrop-filter: blur(20px) saturate(180%);
    box-shadow: 0 4px 16px 0 rgba(31, 38, 135, 0.1);
    white-space: nowrap;
    flex: 1 1 auto;
    min-width: 0;
    text-align: center;
  }

  .dj-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.25);
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px 0 rgba(31, 38, 135, 0.2);
  }

  .dj-btn.active {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    color: white;
    box-shadow:
      0 4px 16px 0 rgba(255, 255, 255, 0.15),
      inset 0 0 10px rgba(255, 255, 255, 0.08);
  }

  .quarter-btn {
    padding: 0.75rem 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border-radius: 25px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: all 0.3s ease;
    backdrop-filter: blur(20px) saturate(180%);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  }

  .quarter-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.25);
  }

  .quarter-btn.active {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
    color: white;
    box-shadow:
      0 8px 32px 0 rgba(255, 255, 255, 0.2),
      inset 0 0 20px rgba(255, 255, 255, 0.1);
  }

  .awards-section {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px;
    padding: 1.5rem;
    backdrop-filter: blur(20px) saturate(180%);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
  }

  .awards-section h2 {
    text-align: center;
    color: white;
    margin: 0 0 1.5rem 0;
    font-size: 1.75rem;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .awards-list {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .award-card {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
    transition: all 0.3s ease;
    backdrop-filter: blur(20px) saturate(180%);
  }

  .award-card:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 12px 48px 0 rgba(31, 38, 135, 0.3);
    transform: translateY(-2px);
  }

  .card-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .player-section {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .player-section iframe {
    display: block;
    border-radius: 12px;
  }

  .info-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .dj-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .dj-badge {
    display: inline-block;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 700;
    font-size: 0.9rem;
    backdrop-filter: blur(8px) saturate(180%);
    box-shadow: 0 4px 16px 0 rgba(255, 255, 255, 0.1);
  }

  .quarter-badge {
    background: rgba(100, 150, 255, 0.25);
    border: 1px solid rgba(100, 150, 255, 0.4);
    color: rgba(200, 220, 255, 1);
  }

  .song-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .song-title {
    font-size: 1.4rem;
    color: white;
    margin: 0 0 0.5rem 0;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .info-row {
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: 1rem;
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
  }

  .label {
    color: rgba(255, 255, 255, 0.7);
    font-weight: 600;
  }

  .value {
    color: white;
    line-height: 1.5;
  }

  .korean {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
  }

  .japanese {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.85rem;
    font-style: italic;
  }

  .credit {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .quarter-picks {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.85);
  }

  .tag {
    display: inline-block;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.85rem;
    backdrop-filter: blur(8px);
  }

  .work-info {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .work-title {
    flex: 1;
  }

  .work-info .tag {
    flex-shrink: 0;
    align-self: flex-start;
  }

  .credits-section {
    margin-top: 4rem;
    padding: 3rem 1rem;
  }

  .credits-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px;
    backdrop-filter: blur(20px) saturate(180%);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
  }

  .poster-image {
    width: 150px;
    flex-shrink: 0;
  }

  .poster-image img {
    width: 100%;
    height: auto;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .credits-text {
    color: white;
    text-align: left;
  }

  .credits-text h3 {
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
    color: white;
  }

  .credits-text p {
    margin: 0.25rem 0;
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.9);
  }

  .credits-text .event-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.5rem;
  }

  .credits-text .event-date {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.85);
    font-weight: 500;
  }

  .credits-text .event-location {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.75);
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  }

  .credits-text .dj-list {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.6;
    margin-top: 0.75rem;
    font-weight: 500;
  }

  .credits-text .hashtag {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 0.75rem;
    font-weight: 400;
    font-style: italic;
  }

  .credits-text .credit-small {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 0.5rem;
  }

  @media (max-width: 968px) {
    .card-layout {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .player-section {
      max-width: 100%;
    }
  }

  @media (max-width: 1000px) {
    .dj-nav {
      flex-wrap: wrap;
      gap: 0.3rem;
    }

    .dj-btn {
      flex: 0 1 auto;
      font-size: 0.75rem;
      padding: 0.35rem 0.6rem;
    }
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
    }

    .playlist-section {
      padding: 1rem 0;
    }

    .playlist-header h2 {
      font-size: 1.3rem;
    }

    .playlist-header p {
      font-size: 0.85rem;
    }

    .quarter-nav {
      justify-content: center;
    }

    .quarter-btn {
      font-size: 0.9rem;
      padding: 0.6rem 1.2rem;
    }

    .dj-nav {
      padding: 0.4rem;
    }

    .awards-section {
      padding: 1rem;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(20px) saturate(180%);
    }

    .award-card {
      padding: 1rem;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(20px) saturate(180%);
    }

    .info-row {
      grid-template-columns: 70px 1fr;
    }

    .song-title {
      font-size: 1.2rem;
    }

    .card-layout {
      gap: 1rem;
    }

    .credits-content {
      flex-direction: column;
      text-align: center;
    }

    .credits-text {
      text-align: center;
    }

    .poster-image {
      width: 120px;
    }
  }
</style>
