/**
 * Implements the basic functionality of FetchQ API in memory, with simple
 * Javascript data structures.
 * 
 * This is good for testing and for super-small apps that do not require any
 * data persistance or horizontal scalability.
 * 
 * NOTE: This is supposed to be a development driver, not meant to be used in
 * a real distributed services scenario.
 */

import { FetchQDriver } from '@fetchq/core'

export class FetchQDriverMemory extends FetchQDriver {}

