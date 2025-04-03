export type SkillReturn = {
  resultString: string | null;
  envStateIsHydrated: boolean;
};

export type Skill = (...args: any) => SkillReturn | Promise<SkillReturn>;

export type SkillsRegistry = Record<string, Skill>;
