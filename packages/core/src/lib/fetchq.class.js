
import { createDriver } from './drivers'

export class Fetchq {
    constructor (config = {}) {
        this.driver = createDriver(config.driver)
        this.status = 0
    }

    async connect () {
        await this.driver.connect()
        this.status = 1
    }

    async destroy () {
        await this.driver.destroy()
        this.driver = null
        this.status = 0
    }

    getStatus () {
        return this.status
    }
}
