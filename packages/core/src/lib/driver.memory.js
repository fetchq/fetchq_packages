import { FetchQDriver, STATUS_INITIALIZING } from './interfaces'
import { MemoryQueue } from './driver.memory.queue'
import { MemoryMaintenance } from './driver.memory'
import { pause } from './driver.memory.utils'

export * from './driver.memory.queue'
export * from './driver.memory.maintenance'

export class MemoryDriver extends  FetchQDriver {
    constructor (config, client) {
        super(config, client)
        this.queueConstructor = MemoryQueue
        this.maintenanceConstructor = MemoryMaintenance
    }

    // Postgres: it should establish connection with the database
    async init () {
        // console.log('INIT MEMOERY DRIVER')
        this.status = STATUS_INITIALIZING
        await pause()

        return super.init()
    }
}
