/**
 * Public surface for the Greenroom branded email layer.
 *
 * Application code should only import from this module. The internal
 * layout (`./components`, `./kinds`, `./render`, `./send`) is an
 * implementation detail that may move between PRs.
 */

export type {
	EmailContext,
	EmailKind,
	EmailTheme,
	SendEmailOpts,
	SendEmailResult,
} from "./types";
export { sendEmail } from "./send";
export { renderEmail } from "./render";
export { resolveTheme } from "./render";
