import { EnvStateDTO } from "./env-state/env-state";
import { InventoryChangesDTO } from "./types";

// We receive these from python
export type SkillInvocation = {
  skillName: string;
  args: any[];
};

// We send these to python
export type DataFromMinecraft = {
  envState: EnvStateDTO;
  skillInvocationResults?: string;
  inventoryChanges?: InventoryChangesDTO;
};
