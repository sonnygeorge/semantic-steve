# `skills` Directory

By design:

- Files without a '\_' prefix contain the skill functions that are imported/used by `skills-registry.ts`
  - These functions pre-process the inputs and pass them to their '\_'-prefixed counterparts
- Files with a '\_' prefix implement the logic of each skill.
