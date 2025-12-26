export interface Song {
	id: number;
	곡명: string;
	아티스트: string;
	아티스트_한글: string;
	작품: string;
	작품_일본어: string;
	크레딧: string;
	정보: string;
	spotify: string;
}

export interface DJ {
	name: string;
	id_1: number | null;
	id_2: number | null;
	id_3: number | null;
	id_4: number | null;
	all: number | null;
}

export interface Award {
	quarter: '1분기' | '2분기' | '3분기' | '4분기' | '올해의 애니송';
	dj: string;
	song: Song;
}
