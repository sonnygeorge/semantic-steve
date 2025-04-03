import { EnvStateDTO } from "./core/environment/state";

// We receive these from python
export type SkillInvocation = {
  skillName: string;
  args: any[];
};

// We send these to python
export type DataFromMinecraft = {
  envState: EnvStateDTO;
  skillInvocationResults: string | null;
};
