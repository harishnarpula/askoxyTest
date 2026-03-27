export function mergeUseCases(vectorResults: any[], localData: any) {
  const safe = (arr: any) => (Array.isArray(arr) ? arr : []);

  const allLocal = [
    ...safe(localData.CAS),
    ...safe(localData.FMS),
    ...safe(localData.COLLECTIONS)
  ];

  const localMap = new Map(
    allLocal.map((uc: any) => [uc.name?.toLowerCase(), uc])
  );

  const merged: any[] = [];

  for (const vc of vectorResults) {
    const key = vc.name?.toLowerCase();

    if (key && localMap.has(key)) {
      merged.push({
        ...localMap.get(key),
        _source: "local+vector" 
      });
    } else {
      merged.push({
        ...vc,
        _source: "vector_only"
      });
    }
  }

  return merged;
}