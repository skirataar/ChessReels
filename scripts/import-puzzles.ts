import fs from "node:fs";
import path from "node:path";
import csv from "csv-parser";
import prisma from "../lib/prisma";

const BATCH_SIZE = 10_000;

interface CsvPuzzleRow {
  PuzzleId?: string;
  puzzleId?: string;
  id?: string;
  FEN?: string;
  fen?: string;
  Moves?: string;
  moves?: string;
  Rating?: string;
  rating?: string;
  RatingDeviation?: string;
  ratingDeviation?: string;
  Popularity?: string;
  popularity?: string;
  NbPlays?: string;
  nbPlays?: string;
  Themes?: string;
  themes?: string;
  GameUrl?: string;
  gameUrl?: string;
  OpeningTags?: string;
  openingTags?: string;
  [key: string]: string | undefined;
}

interface PuzzleRecord {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  ratingDeviation: number;
  popularity: number;
  nbPlays: number;
  themes: string;
  gameUrl: string;
  openingTags: string | null;
}

function parseRow(row: CsvPuzzleRow): PuzzleRecord | null {
  const id = row.PuzzleId ?? row.puzzleId ?? row.id;
  const fen = row.FEN ?? row.fen;
  const moves = row.Moves ?? row.moves;
  const ratingRaw = row.Rating ?? row.rating;

  if (!id || !fen || !moves || ratingRaw === undefined) {
    return null;
  }

  const rating = Number.parseInt(ratingRaw, 10);
  const ratingDeviation = Number.parseInt(
    row.RatingDeviation ?? row.ratingDeviation ?? "0",
    10
  );
  const popularity = Number.parseInt(
    row.Popularity ?? row.popularity ?? "0",
    10
  );
  const nbPlays = Number.parseInt(row.NbPlays ?? row.nbPlays ?? "0", 10);
  const themes = row.Themes ?? row.themes ?? "";
  const gameUrl = row.GameUrl ?? row.gameUrl ?? "";
  const rawOpeningTags = row.OpeningTags ?? row.openingTags;
  const openingTags =
    rawOpeningTags && rawOpeningTags.trim().length > 0
      ? rawOpeningTags.trim()
      : null;

  return {
    id: id.trim(),
    fen: fen.trim(),
    moves: moves.trim(),
    rating: Number.isNaN(rating) ? 0 : rating,
    ratingDeviation: Number.isNaN(ratingDeviation) ? 0 : ratingDeviation,
    popularity: Number.isNaN(popularity) ? 0 : popularity,
    nbPlays: Number.isNaN(nbPlays) ? 0 : nbPlays,
    themes: themes.trim(),
    gameUrl: gameUrl.trim(),
    openingTags,
  };
}

async function main() {
  const filePathArg = process.argv[2] ?? "lichess_db_puzzle.csv";
  const resolvedPath = path.isAbsolute(filePathArg)
    ? filePathArg
    : path.resolve(process.cwd(), filePathArg);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`CSV file not found at: ${resolvedPath}`);
    console.error(
      `Please provide the correct path, e.g.: npx tsx scripts/import-puzzles.ts /path/to/lichess_db_puzzle.csv`
    );
    process.exit(1);
  }

  console.log(`Starting puzzle import from: ${resolvedPath}`);
  console.log(`Batch size: ${BATCH_SIZE.toLocaleString()} rows per transaction`);

  const startTime = Date.now();
  let batch: PuzzleRecord[] = [];
  let totalInserted = 0;
  let totalSkipped = 0;

  try {
    const fileStream = fs.createReadStream(resolvedPath);
    const parser = fileStream.pipe(csv());

    for await (const row of parser) {
      const parsedRow = parseRow(row as CsvPuzzleRow);
      if (!parsedRow) {
        totalSkipped++;
        continue;
      }

      batch.push(parsedRow);

      if (batch.length >= BATCH_SIZE) {
        await prisma.puzzle.createMany({
          data: batch,
          skipDuplicates: true,
        });

        totalInserted += batch.length;
        console.log(`Inserted ${totalInserted.toLocaleString()} puzzles...`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await prisma.puzzle.createMany({
        data: batch,
        skipDuplicates: true,
      });

      totalInserted += batch.length;
      console.log(`Inserted ${totalInserted.toLocaleString()} puzzles...`);
      batch = [];
    }

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Import completed successfully!`);
    console.log(`Total inserted: ${totalInserted.toLocaleString()}`);
    if (totalSkipped > 0) {
      console.log(`Total skipped (malformed): ${totalSkipped.toLocaleString()}`);
    }
    console.log(`Elapsed time: ${elapsedSeconds} seconds`);
  } catch (error) {
    console.error("Error during puzzle import:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
