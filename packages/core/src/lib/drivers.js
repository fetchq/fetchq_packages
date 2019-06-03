/**
 * This is a factory of drivers.
 * It is responsible to retrieve a driver by name or throw an error.
 * 
 * In the future I think we will offer the possibility to add drivers
 * from the outside.
 */

import { FetchQDriver } from './interfaces'
import { FetchQDriverNotFoundError, FetchQDuplicateDriverError } from './errors'

const drivers = {}

export const getDriver = (type = 'undefined') => {
    if (!drivers[type]) {
        throw new FetchQDriverNotFoundError(`driver "${type}" not found`)
    }

    return drivers[type]
}

// @TODO: consider to implement "overrideDriver()" for that purpose
export const registerDriver = (type, implementation) => {
    if (drivers[type]) {
        throw new FetchQDuplicateDriverError(`driver "${type}" already defined`)
    }
    drivers[type] = implementation
}

// mostly for testing purpose
export const unregisterDriver = (name) => {
    delete(drivers[name])
}

// Accepts a named type that is matched in the "drivers" dictionary
// or a custom implementation as Class (function)
export const createDriver = (config = {}, client) => {
    const { type, ...driverConfig } = config
    const Driver = typeof type === 'function'
        ? type
        : getDriver(type)

    return new Driver(client, driverConfig)
}
