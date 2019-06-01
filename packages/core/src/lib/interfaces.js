import { FetchQInit } from './interfaces.fetchq-init'
import { FetchQQueue } from './interfaces.fetchq-queue'
import { FetchQMaintenance } from './interfaces.fetchq-maintenance'

export * from './interfaces.fetchq-init'
export * from './interfaces.fetchq-queue'
export * from './interfaces.fetchq-maintenance'

export class FetchQDriver extends FetchQInit {
    constructor (config, client) {
        super()
        this.config = config
        this.client = client
        this.queues = {}
        this.mntQueue = null
        this.queueConstructor = FetchQQueue
        this.maintenanceConstructor =  FetchQMaintenance
    }

    async init () {
        // console.log('INIT DRIVER')
        this.maintenance = new this.maintenanceConstructor(this.client)
        await this.maintenance.init()

        return super.init()
    }

    ref = queueName => {
        if (!this.queues[queueName]) {
            this.queues[queueName] = new this.queueConstructor(queueName, this.client)
            return this.queues[queueName]
        }
        return this.queues[queueName]
    }

    async destroy () {
        await Promise.all(Object.values(this.queues).map(queue => queue.destroy()))
        return super.destroy()
    }
}

