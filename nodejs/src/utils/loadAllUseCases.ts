import fs from "fs";
import path from "path";

// 🔥 FLATTEN FUNCTION
function extractUseCases(data: any) {
  if (!data) return [];

  // Case 1: Already array
  if (Array.isArray(data)) return data;

  // Case 2: Your current structure
  if (data.modules && Array.isArray(data.modules)) {
    return data.modules.flatMap((module: any) =>
      module.useCases?.map((uc: any) => ({
        ...uc,
        moduleName: module.moduleName
      })) || []
    );
  }

  return [];
}

export function loadAllUseCases() {
  try {
    const basePath = path.join(process.cwd(), "src/Data/usecases");

    console.log("📂 Loading usecases from:", basePath);

    const casRaw = JSON.parse(
      fs.readFileSync(path.join(basePath, "CAS.json"), "utf-8")
    );

    const fmsRaw = JSON.parse(
      fs.readFileSync(path.join(basePath, "FMS.json"), "utf-8")
    );

    const collectionsRaw = JSON.parse(
      fs.readFileSync(path.join(basePath, "Collections.json"), "utf-8")
    );

    // 🔥 NORMALIZE HERE
    const CAS = extractUseCases(casRaw);
    const FMS = extractUseCases(fmsRaw);
    const COLLECTIONS = extractUseCases(collectionsRaw);

    console.log("📊 CAS:", CAS.length);
    console.log("📊 FMS:", FMS.length);
    console.log("📊 COLLECTIONS:", COLLECTIONS.length);

    return {
      CAS,
      FMS,
      COLLECTIONS
    };

  } catch (error) {
    console.error("❌ loadAllUseCases Error:", error);

    return {
      CAS: [],
      FMS: [],
      COLLECTIONS: []
    };
  }
}