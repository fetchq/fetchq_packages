
import { createDriver } from './drivers'
import { FetchQInit, EVENT_READY, STATUS_INITIALIZING, STATUS_INITIALIZED } from './interfaces'

export class FetchqClient extends FetchQInit {
    constructor (config = {}) {
        super()
        this.name = config.name || 'client-jdoe'
        this.runMaintenance = config.runMaintenance !== false
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
        // console.log(this.name, 'destroy')
        await super.destroy()
        // console.log('client.destroy().driver()', this.name)
        await this.driver.destroy()
        this.driver = null
        // console.log('client--destroyed', this.name)
    }

    ref = queueName => this.driver.ref(queueName)
}
