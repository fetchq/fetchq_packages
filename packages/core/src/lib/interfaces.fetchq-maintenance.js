import { FetchQInit } from './interfaces.fetchq-init'

// This queue should be much simpler and ger documents from the older move on
// there should be only 3-5 documents per queue so it doesn't need much optimization nor stats
export class  FetchQMaintenance extends FetchQInit {
    constructor (client) {
        super()
        this.name = name
        this.client = client

        this.settings = {}
        this.workers = []
    }

    async init () {
        // console.log('INIT MAINTENANCE')
        return super.init()
    }

    async isReady () {
        await this.client.isReady()
        return super.isReady()
    }

    async push (docs) {
        await this.isReady()
        return { created: 0, skipped: 0 }
    }

}

