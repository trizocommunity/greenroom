const fs = require('fs');
const path = require('path');

// Comprehensive rename: singular Drizzle names vs our plural aliases
// Pattern: { singular as plural } in imports, then use plural alias throughout code
// But db.query.* needs to use the original key name (which matches the table name in schema)

// The real fix: Drizzle schema exports singular table names.
// db.query.*  keys also use those same names.
// So we can't use db.query.festivals — we must use db.query.festival
// And we can't import { festivals } — we must import { festival } (or alias it)

// Strategy: In imports, alias singular to plural (e.g. festival as festivals)
// But in db.query.*, use the SINGULAR (e.g. db.query.festival.findMany)

const dirs = [
  path.join(__dirname, 'src/server/models'),
  path.join(__dirname, 'src/server/services'),
  path.join(__dirname, 'src/server/actions'),
  path.join(__dirname, 'src/server/controllers'),
];

const queryRenames = [
  // db.query.* must use singular
  [/db\.query\.users\./g, 'db.query.user.'],
  [/db\.query\.festivals\./g, 'db.query.festival.'],
  [/db\.query\.programmes\./g, 'db.query.programme.'],
  [/db\.query\.results\./g, 'db.query.result.'],
  [/db\.query\.students\./g, 'db.query.student.'],
  [/db\.query\.groups\./g, 'db.query.group.'],
  [/db\.query\.categories\./g, 'db.query.category.'],
  [/db\.query\.stages\./g, 'db.query.stage.'],
  [/db\.query\.userLoginEvents\./g, 'db.query.userLoginEvent.'],
  [/db\.query\.payments\./g, 'db.query.payment.'],
  [/db\.query\.passwordResetTokens\./g, 'db.query.passwordResetToken.'],
  [/db\.query\.festivalMembers\./g, 'db.query.festivalMember.'],
  [/db\.query\.programmeAssignments\./g, 'db.query.programmeAssignment.'],
  [/db\.query\.expiredFestivalResults\./g, 'db.query.expiredFestivalResult.'],
  [/db\.query\.systemConfigs\./g, 'db.query.systemConfig.'],
  [/db\.query\.userPurchaseSummaries\./g, 'db.query.userPurchaseSummary.'],
];

// Fix import aliases that script incorrectly broke (festival as festivals in a multi-import)
const importRenames = [
  // Multi-import fixes for festival.model.ts etc
  [/import \{\s*\n\s*festival as festivals,/g, 'import {\n  festival as festivals,'],
  [/festival as festivals,\s*\n\s*programme as programmes,/g, 'festival as festivals,\n  programme as programmes,'],
  [/programme as programmes,\s*\n\s*category as categories,/g, 'programme as programmes,\n  category as categories,'],
  [/category as categories,\s*\n\s*group as groups,/g, 'category as categories,\n  group as groups,'],
  [/group as groups,\s*\n\s*festivalMember,/g, 'group as groups,\n  festivalMember,'],
  [/festivalMember,\s*\n\s*student as students,/g, 'festivalMember,\n  student as students,'],
  [/student as students,\s*\n\s*festivalNews,/g, 'student as students,\n  festivalNews,'],
  // Fix db.query category
  [/db\.query\.categories\./g, 'db.query.category.'],
];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
  for (const file of files) {
    const fp = path.join(dir, file);
    let content = fs.readFileSync(fp, 'utf8');
    let changed = false;
    
    for (const [pattern, replacement] of [...queryRenames, ...importRenames]) {
      const next = content.replace(pattern, replacement);
      if (next !== content) {
        content = next;
        changed = true;
      }
    }
    
    if (changed) {
      fs.writeFileSync(fp, content);
      console.log('Fixed:', file);
    }
  }
}
console.log('Done.');
