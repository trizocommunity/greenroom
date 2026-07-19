# issue-06: API CRUD Operations Failing Due to Incorrect `festivalId` Source

**Status:** TODO

## TL;DR

POST/PUT/DELETE handlers read `festivalId` from `body.festivalId` instead of `url.searchParams`, causing all non-GET operations to fail with `MISSING_PARAM: "festivalId is required"`. Client consistently sends `festivalId` as URL query param.

---

## Root Cause

The API client (`src/api/client/*.ts`) sends `festivalId` as a URL query parameter:
```
POST /api/v1/groups?festivalId=xxx
```

But some route handlers read it from `body.festivalId`:
```typescript
const festivalId = body.festivalId; // WRONG - body is empty for these requests
```

This works for GET (which doesn't have a body) but fails for POST/PUT/DELETE.

---

## Bug 1: festivalId in Body Instead of URL (5 routes)

| Route | Methods | Current (Wrong) | Should Be |
|-------|---------|-----------------|-----------|
| `src/app/api/v1/groups/route.ts` | POST | `body.festivalId` | `url.searchParams.get("festivalId")` |
| `src/app/api/v1/students/route.ts` | POST | `body.festivalId` | `url.searchParams.get("festivalId")` |
| `src/app/api/v1/programmes/route.ts` | POST | `body.festivalId` | `url.searchParams.get("festivalId")` |
| `src/app/api/v1/judges/route.ts` | POST | `body.festivalId` | `url.searchParams.get("festivalId")` |
| `src/app/api/v1/news/route.ts` | POST, PUT, DELETE | `body.festivalId` | `url.searchParams.get("festivalId")` |

---

## Bug 2: Other IDs in Body Instead of URL (4 routes)

| Route | Methods | Current (Wrong) | Should Be |
|-------|---------|-----------------|-----------|
| `src/app/api/v1/news/route.ts` | PUT, DELETE | `body.postId` | `url.searchParams.get("postId")` |
| `src/app/api/v1/members/route.ts` | DELETE | `body.memberId` | `url.searchParams.get("memberId")` |
| `src/app/api/v1/gallery/route.ts` | DELETE | `body.imageId` | `url.searchParams.get("imageId")` |
| `src/app/api/v1/assignments/route.ts` | DELETE | `body.assignmentId` | `url.searchParams.get("assignmentId")` |

---

## Sub-task Summary

| # | Description | Files |
|---|-------------|-------|
| **06-A** | Fix groups POST | `src/app/api/v1/groups/route.ts` |
| **06-B** | Fix students POST | `src/app/api/v1/students/route.ts` |
| **06-C** | Fix programmes POST | `src/app/api/v1/programmes/route.ts` |
| **06-D** | Fix judges POST | `src/app/api/v1/judges/route.ts` |
| **06-E** | Fix news POST/PUT/DELETE (festivalId + postId) | `src/app/api/v1/news/route.ts` |
| **06-F** | Fix members DELETE (memberId) | `src/app/api/v1/members/route.ts` |
| **06-G** | Fix gallery DELETE (imageId) | `src/app/api/v1/gallery/route.ts` |
| **06-H** | Fix assignments DELETE (assignmentId) | `src/app/api/v1/assignments/route.ts` |

---

## Dependencies

- None
