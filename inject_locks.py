import re
import os
import sys

def inject_lock(file_path, entity_type, entity_id_expr):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if "useEditLock" not in content:
        import_stmt = 'import { useEditLock } from "@/core/locks/use-edit-lock";\nimport { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";\nimport { AlertCircle, Lock } from "lucide-react";\n'
        import_match = list(re.finditer(r'^import .*;$', content, re.MULTILINE))
        if import_match:
            last_import = import_match[-1]
            pos = last_import.end()
            content = content[:pos] + '\n' + import_stmt + content[pos:]

    is_editing_match = re.search(r'const isEditing = !![a-zA-Z0-9_]+;', content)
    if is_editing_match and "const { hasLock" not in content:
        pos = is_editing_match.end()
        hook_code = f"""
  // Edit Lock Integration
  const {{ hasLock, lockedBy, isLoadingLock }} = useEditLock(
    "{entity_type}",
    isEditing ? {entity_id_expr} : null,
    open && !readOnly
  );
  
  const actuallyReadOnly = readOnly || (!hasLock && isEditing);
"""
        content = content[:pos] + hook_code + content[pos:]
        
        content = content.replace('!open || readOnly', '!open || actuallyReadOnly')
        content = content.replace('open, readOnly', 'open, actuallyReadOnly')
        content = content.replace('{readOnly ?', '{actuallyReadOnly ?')
        content = content.replace('readOnly ? ', 'actuallyReadOnly ? ')
        content = content.replace('readOnly) return;', 'actuallyReadOnly) return;')
        content = content.replace('{readOnly}', '{actuallyReadOnly}')
        content = content.replace('disabled={readOnly', 'disabled={actuallyReadOnly')
        # handle isLoading replacements safely
        content = re.sub(r'disabled=\{(!isValid \|\| )?isLoading\}', r'disabled={\1isLoading || isLoadingLock}', content)
        content = re.sub(r'disabled=\{actuallyReadOnly \|\| isLoading\}', r'disabled={actuallyReadOnly || isLoading || isLoadingLock}', content)

    header_match = re.search(r'(<DrawerDescription>[\s\S]*?</DrawerDescription>\s*)', content)
    if header_match and "<Alert variant=" not in content:
        pos = header_match.end()
        alert_code = f"""{{isEditing && !hasLock && (
            <Alert variant="destructive" className="mt-4 bg-amber-50 border-amber-200 text-amber-800 [&>svg]:text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>This page is locked (Read-Only)</AlertTitle>
              <AlertDescription>
                <strong>{{lockedBy}}</strong> is currently editing this {entity_type}. You cannot make changes until they finish.
              </AlertDescription>
            </Alert>
          )}}
"""
        content = content[:pos] + alert_code + content[pos:]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

FILES = [
    ("src/components/festival/pre-event-works/groups/GroupDialog.tsx", "group", "group?.id"),
    ("src/components/festival/pre-event-works/participants/ParticipantDialog.tsx", "participant", "participant?.id"),
    ("src/components/festival/event-works/stage-management/StageDialog.tsx", "stage", "stage?.id"),
]

for f, t, e in FILES:
    if os.path.exists(f):
        try:
            inject_lock(f, t, e)
            print(f"Updated {f}")
        except Exception as ex:
            print(f"Error on {f}: {ex}")
    else:
        print(f"Not found: {f}")
