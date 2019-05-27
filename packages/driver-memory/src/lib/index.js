/**
 * FetchQ in-memory driver
 * register the driver to FetchQ Core and exposes the main APIs.
 */
import { registerDriver } from '@fetchq/core'
import { FetchQDriverMemory } from './driver.memory.class'

registerDriver('memory', FetchQDriverMemory)

// Exposes the FetchQ main API
export { default } from '@fetchq/core'
