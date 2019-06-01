import { FetchQQueue, FetchQMaintenance, STATUS_INITIALIZING } from './interfaces'
import { pause, docDefaults, flatDocs } from './driver.memory.utils'

export class MemoryMaintenance extends FetchQMaintenance {
    async init () {
        // console.log('INIT MEMORY QUEUE', this.name)
        this.status = STATUS_INITIALIZING
        await pause()

        this.docs = {}
        this.list = []

        this.settings.tolerance = 5

        return super.init()
    }

    async push (docs) {
        const res = await super.push()
        let hasPending = false

        docs.forEach(doc => {
            const { subject } = doc

            if (this.docs[subject]) {
                res.skipped++
                return
            }

            this.docs[subject] = docDefaults(doc)
            hasPending = hasPending || this.docs[subject].status === FetchQQueue.status.PENDING
            res.created++
        })

        this.list = flatDocs(this.docs)

        if (hasPending) {
            this.emit('pending')
        }

        return res
    }
}
