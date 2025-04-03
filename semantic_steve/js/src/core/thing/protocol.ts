import { Bot } from "mineflayer";

export interface Thing {
  bot: Bot;
  name: string;

  isInSurroundings(): boolean;
}
