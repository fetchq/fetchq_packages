
import { createDriver } from './drivers'
import { FetchQInit, EVENT_READY, STATUS_INITIALIZING, STATUS_INITIALIZED } from './interfaces'

export class Fetchq extends FetchQInit {
    constructor (config = {}) {
        super()

        // setup driver and pass down events to it
        this.driver = createDriver(config.driver, this)
    }

    async connect () {
        this.status = STATUS_INITIALIZING
        await this.driver.connect()
        this.status = STATUS_INITIALIZED
        this.emit(EVENT_READY)
        console.log('CLIENT CONNECTED')
        return this
    }

    async destroy () {
        super.destroy()
        await this.driver.destroy()
        this.driver = null
        this.status = 0
    }

    // Get or create a reference to a queue
    ref (queue) {
        return this.driver.ref(queue)
    }
}
