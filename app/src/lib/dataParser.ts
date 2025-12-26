import type { Song, DJ } from './types';

export async function parseSongs(): Promise<Map<number, Song>> {
	const response = await fetch('/data/songs.csv');
	const text = await response.text();
	const lines = text.split('\n').slice(1); // Skip header

	const songsMap = new Map<number, Song>();

	for (const line of lines) {
		if (!line.trim()) continue;

		// CSV parsing with proper handling of commas in quotes
		const fields: string[] = [];
		let current = '';
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];

			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === ',' && !inQuotes) {
				fields.push(current);
				current = '';
			} else {
				current += char;
			}
		}
		fields.push(current);

		if (fields.length >= 9) {
			const song: Song = {
				id: parseInt(fields[0]),
				곡명: fields[1],
				아티스트: fields[2],
				아티스트_한글: fields[3],
				작품: fields[4],
				작품_일본어: fields[5],
				크레딧: fields[6],
				정보: fields[7],
				spotify: fields[8]
			};
			songsMap.set(song.id, song);
		}
	}

	return songsMap;
}

export async function parseDJs(): Promise<DJ[]> {
	const response = await fetch('/data/djs.csv');
	const text = await response.text();
	const lines = text.split('\n').slice(1); // Skip header

	const djs: DJ[] = [];

	for (const line of lines) {
		if (!line.trim()) continue;

		const fields = line.split(',');
		if (fields.length >= 6) {
			const dj: DJ = {
				name: fields[0],
				id_1: fields[1] ? parseInt(fields[1]) : null,
				id_2: fields[2] ? parseInt(fields[2]) : null,
				id_3: fields[3] ? parseInt(fields[3]) : null,
				id_4: fields[4] ? parseInt(fields[4]) : null,
				all: fields[5] ? parseInt(fields[5]) : null
			};
			djs.push(dj);
		}
	}

	return djs;
}
