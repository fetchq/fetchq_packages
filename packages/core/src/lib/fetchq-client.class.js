
import { createDriver } from './drivers'
import { FetchQInit, EVENT_READY, STATUS_INITIALIZING, STATUS_INITIALIZED } from './interfaces'

export class FetchqClient extends FetchQInit {
    constructor (config = {}) {
        super()
        this.driver = createDriver(config.driver, this)
    }

    async init () {
        this.status = STATUS_INITIALIZING
        await this.driver.init()
        this.status = STATUS_INITIALIZED
        this.emit(EVENT_READY)
        return this
    }

    async destroy () {
        super.destroy()
        await this.driver.destroy()
        this.driver = null
    }

    ref = queueName => this.driver.ref(queueName)
}
