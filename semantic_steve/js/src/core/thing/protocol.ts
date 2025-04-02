import { Bot } from "mineflayer";

export interface Thing {
  bot: Bot;

  isInSurroundings(): boolean;
}
