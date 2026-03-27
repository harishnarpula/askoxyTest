export function getInternalApis(apis: any[]) {
  return apis?.filter(a => a.type === "internal") || [];
}

export function getExternalApis(apis: any[]) {
  return apis?.filter(a => a.type === "external") || [];
}