<script lang="ts">
  import { onMount } from "svelte";
  import { parseSongs, parseDJs } from "$lib/dataParser";
  import type { Song, DJ } from "$lib/types";

  let songs: Map<number, Song> = new Map();
  let djs: DJ[] = [];
  let loading = true;
  let selectedQuarter: "id_1" | "id_2" | "id_3" | "id_4" | "all" = "id_1";

  const quarterNames = {
    id_1: "1분기",
    id_2: "2분기",
    id_3: "3분기",
    id_4: "4분기",
    all: "올해의 애니송",
  };

  onMount(async () => {
    try {
      songs = await parseSongs();
      djs = await parseDJs();
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
  ): Array<{ song: Song; djs: string[] }> {
    const songMap = new Map<number, string[]>();

    // Group DJs by song ID
    for (const dj of djs) {
      const songId = dj[quarter];
      if (songId !== null) {
        if (!songMap.has(songId)) {
          songMap.set(songId, []);
        }
        songMap.get(songId)!.push(dj.name);
      }
    }

    // Convert to array with song details
    const result: Array<{ song: Song; djs: string[] }> = [];
    for (const [songId, djNames] of songMap.entries()) {
      const song = songs.get(songId);
      if (song) {
        result.push({ song, djs: djNames });
      }
    }

    // Shuffle array using Fisher-Yates algorithm
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }
</script>

<svelte:head>
  <title>2025 아로아로 BEST 애니송 어워드</title>
  <script type="module" crossorigin src="https://glass.danilofiumi.com/web-comps/boundle.js"></script>
</svelte:head>

<main>
  <div class="container">
    <header>
      <h1>🎵 2025 아로아로 BEST 애니송 🎵</h1>
      <p class="subtitle">아로아로 디제이들이 선정한 최고의 애니메이션 음악</p>
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
          <p>2025년 아로아로 BEST 애니송 전곡 듣기</p>
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

      <nav class="quarter-nav">
        {#each Object.entries(quarterNames) as [key, label]}
          <button
            class="quarter-btn"
            class:active={selectedQuarter === key}
            onclick={() => (selectedQuarter = key as typeof selectedQuarter)}
          >
            {label}
          </button>
        {/each}
      </nav>

      <section class="awards-section">
        <h2>{quarterNames[selectedQuarter]}</h2>

        <div class="awards-list">
          {#each groupSongsByDJ(selectedQuarter) as { song, djs }}
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
                    {#each djs as djName}
                      <span class="dj-badge">{djName}</span>
                    {/each}
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
                  </div>
                </div>
              </div>
            </article>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    background: linear-gradient(to bottom, #0f0c29, #302b63, #24243e);
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }

  :global(body::before) {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: radial-gradient(2px 2px at 20px 30px, white, transparent),
      radial-gradient(2px 2px at 60px 70px, white, transparent),
      radial-gradient(1px 1px at 50px 50px, white, transparent),
      radial-gradient(1px 1px at 130px 80px, white, transparent),
      radial-gradient(2px 2px at 90px 10px, white, transparent),
      radial-gradient(1px 1px at 10px 90px, white, transparent),
      radial-gradient(1px 1px at 150px 40px, white, transparent),
      radial-gradient(2px 2px at 180px 120px, white, transparent);
    background-repeat: repeat;
    background-size: 200px 200px;
    opacity: 0.4;
    pointer-events: none;
    z-index: 0;
  }

  :global(body::after) {
    content: "";
    position: fixed;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
        circle at 20% 50%,
        rgba(120, 119, 198, 0.3),
        transparent 25%
      ),
      radial-gradient(
        circle at 80% 80%,
        rgba(138, 43, 226, 0.2),
        transparent 25%
      ),
      radial-gradient(circle at 40% 20%, rgba(75, 0, 130, 0.2), transparent 25%);
    animation: drift 30s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
  }

  @keyframes drift {
    0%,
    100% {
      transform: translate(0, 0) rotate(0deg);
    }
    33% {
      transform: translate(10px, -10px) rotate(5deg);
    }
    66% {
      transform: translate(-5px, 5px) rotate(-5deg);
    }
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
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
    backdrop-filter: blur(16px) saturate(180%);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  }

  .quarter-nav {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    justify-content: center;
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
    backdrop-filter: blur(16px) saturate(180%);
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
    box-shadow: 0 8px 32px 0 rgba(255, 255, 255, 0.2),
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
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
    transition: all 0.3s ease;
    backdrop-filter: blur(20px) saturate(180%);
  }

  .award-card:hover {
    background: rgba(255, 255, 255, 0.18);
    border-color: rgba(255, 255, 255, 0.35);
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

  @media (max-width: 968px) {
    .card-layout {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .player-section {
      max-width: 100%;
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

    .quarter-btn {
      font-size: 0.9rem;
      padding: 0.6rem 1.2rem;
    }

    .awards-section {
      padding: 1rem;
    }

    .award-card {
      padding: 1rem;
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
  }
</style>
