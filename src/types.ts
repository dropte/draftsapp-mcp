/**
 * Base callback parameters for x-callback-url
 */
export interface CallbackParams {
  /** URL to call on successful completion */
  'x-success'?: string;
  /** URL to call on error */
  'x-error'?: string;
  /** URL to call on cancellation */
  'x-cancel'?: string;
  /** Override the default return parameter name */
  retParam?: string;
}

/**
 * Parameters for creating a new draft
 */
export interface CreateDraftParams extends CallbackParams {
  /** Initial text content of the draft */
  text?: string;
  /** Content to prepend to the draft */
  prepend?: string;
  /** Content to append to the draft */
  append?: string;
  /** Tag to apply to the draft */
  tag?: string;
  /** Action name to run on the draft after creation */
  action?: string;
  /** Whether to allow the user to modify the draft before running action */
  allowEmpty?: boolean;
}

/**
 * Parameters for getting a draft
 */
export interface GetDraftParams extends CallbackParams {
  /** UUID of the draft to retrieve */
  uuid: string;
}

/**
 * Parameters for searching drafts
 */
export interface SearchParams extends CallbackParams {
  /** Search query */
  query: string;
  /** Tag to filter by */
  tag?: string;
}

/**
 * Parameters for dictation
 */
export interface DictateParams extends CallbackParams {
  /** Locale for dictation (e.g., 'en-US') */
  locale?: string;
}

/**
 * Parameters for arranging text with a template
 */
export interface ArrangeParams extends CallbackParams {
  /** Text to arrange */
  text: string;
  /** Template for arrangement */
  template: string;
}

/**
 * Parameters for opening a draft
 */
export interface OpenDraftParams {
  /** UUID of the draft to open */
  uuid: string;
}

/**
 * Parameters for running an action on a draft
 */
export interface RunActionParams {
  /** Text content to run the action on */
  text?: string;
  /** Action name to run */
  action: string;
  /** Whether to allow empty content */
  allowEmpty?: boolean;
}

/**
 * All possible Drafts actions
 */
export type DraftsAction =
  | 'create'
  | 'get'
  | 'getCurrentDraft'
  | 'search'
  | 'dictate'
  | 'scanDocument'
  | 'arrange'
  | 'open'
  | 'runAction';
