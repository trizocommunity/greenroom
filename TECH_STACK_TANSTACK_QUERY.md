# Walkthrough: React Tanstack Query Setup

I have integrated **React Tanstack Query** (v5) into the application to handle asynchronous state management and data fetching.

## Changes

### 1. Installation
Installed `@tanstack/react-query` to project dependencies.

### 2. Provider Setup
Created `src/components/providers/QueryProvider.tsx` to initialize the `QueryClient`.
- Configured a default `staleTime` of 60 seconds to prevent immediate refetching in an SSR environment.

### 3. Application Wrapping
Updated `src/app/layout.tsx` to wrap the entire application (`<main>` and `<Toaster>`) with `QueryProvider`.

### 4. Component Refactoring
Refactored the following components to use `useMutation` for async state handling:
- `src/components/profile/profile-view.tsx`
- `src/app/(onboarding)/onboarding/page.tsx`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`

- **Before**: Manual `isLoading` state, try/catch blocks for API calls.
- **After**: `useMutation` hook handles `isPending` state, success/error callbacks, and toast notifications cleaner.

## How to Use
For future data fetching, use the `useQuery` hook:
```tsx
const { data, isLoading } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
})
```

For server actions or POST/PUT/DELETE requests, use `useMutation`:
```tsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```
