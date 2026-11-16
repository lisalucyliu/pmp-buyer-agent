let nextId = 1;
export const newId = (prefix) => `${prefix}-${(nextId += 1)}`;
