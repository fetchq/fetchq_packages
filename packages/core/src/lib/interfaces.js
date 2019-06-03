import { FetchQInit } from './interfaces.fetchq-init'
import { FetchQQueue } from './interfaces.fetchq-queue'
import { FetchQMaintenance } from './interfaces.fetchq-maintenance'

export * from './interfaces.fetchq-init'
export * from './interfaces.fetchq-queue'
export * from './interfaces.fetchq-maintenance'

export class FetchQDriver extends FetchQInit {
    constructor (client, config = {}) {
        super()
        this.client = client
        this.config = config

        this.queues = {}
        this.mntQueue = null
        this.queueConstructor = FetchQQueue
        this.maintenanceConstructor = FetchQMaintenance
        this.maintenanceConfig = {}
    }

    async init () {
        this.maintenance = new this.maintenanceConstructor(this.client, this.maintenanceConfig)
        await this.maintenance.init()

        return super.init()
    }

    ref = queueName => {
        if (!this.queues[queueName]) {
            this.queues[queueName] = new this.queueConstructor(this.client, queueName)
            return this.queues[queueName]
        }
        return this.queues[queueName]
    }

    async destroy () {
        // console.log(this.client.name, 'destroy driver')
        this.maintenance && await this.maintenance.destroy()
        await Promise.all(Object.values(this.queues).map(queue => queue.destroy()))
        return super.destroy()
    }
}

