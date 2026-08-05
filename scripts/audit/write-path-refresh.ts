import * as fs from "fs";
import * as path from "path";

// 1. Define paths to scan
const SRC_DIR = path.join(process.cwd(), "src");

const walkDir = (dir: string, fileList: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath, fileList);
    } else {
      if (filePath.endsWith(".actions.ts") || filePath.endsWith("route.ts")) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
};

// 2. Identify mutate indicators
const mutateRegex =
  /(db\.insert|db\.update|db\.delete|\.mutate|Service\.create|Service\.update|Service\.delete|Service\.bulkCreate)/;
const revalidateRegex = /revalidatePath\(/;

console.log("🔍 Scanning for write-path revalidation...");

const files = walkDir(SRC_DIR);
let warnings = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");

  // If file contains mutations
  if (mutateRegex.test(content)) {
    // But does not contain revalidatePath
    if (!revalidateRegex.test(content)) {
      console.warn(`\n⚠️  WARNING: Potential missing revalidatePath in:`);
      console.warn(`   => ${path.relative(process.cwd(), file)}`);
      warnings++;
    }
  }
}

console.log(`\n✅ Scan complete. Found ${warnings} warnings.`);
if (warnings > 0) {
  console.log(
    "Please review the warnings and ensure revalidatePath is called after successful mutations where appropriate.",
  );
}
