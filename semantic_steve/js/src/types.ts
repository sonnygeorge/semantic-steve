type PrimitiveDataType = null | boolean | number | string;

// Skills

type ValidSkillArgument =
  | PrimitiveDataType
  | PrimitiveDataType[]
  | Record<string, PrimitiveDataType>;

export type SkillReturn = {
  resultString: string | null;
  envStateIsUpToDate: boolean;
};

export type Skill = (...args: any) => SkillReturn | Promise<SkillReturn>;

export type SkillsRegistry = Record<string, Skill>;

// Messages to/from python

export type SkillInvocation = {
  skillName: string;
  kwargs: Record<string, ValidSkillArgument>;
};

export type DataFromMinecraft = {
  envState: string;
  skillInvocationResults: string | null;
  inventoryChangesSinceLastCheck: any; // TODO
};
