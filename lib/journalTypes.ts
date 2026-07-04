import { Orientation } from "./types";

export interface JournalCardRef {
  position: string;
  cardId: number;
  orientation: Orientation;
}

export interface JournalEntryPayload {
  spread: string;
  theme: string;
  question?: string;
  note?: string;
  cards: JournalCardRef[];
}
