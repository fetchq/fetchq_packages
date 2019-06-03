import { FetchQQueue, FetchQMaintenance, STATUS_INITIALIZING } from './interfaces'
import { pause, docDefaults, flatDocs } from './driver.memory.utils'
import { parse as parseDate, addTime } from './dates'

export class MemoryMaintenance extends FetchQMaintenance {
    async init () {
        // console.log(this.client.name, 'init maintenance')
        this.status = STATUS_INITIALIZING
        await pause()

        this.docs = {}
        this.list = []

        this.settings.tolerance = 5
        // console.log('***', this.client.driver.config)
        // this.workerSettings.sleep = 25

        return super.init()
    }

    async push (docs) {
        const res = await super.push()

        docs.forEach(doc => {
            const { subject } = doc

            if (this.docs[subject]) {
                res.skipped++
                return
            }

            this.docs[subject] = docDefaults(doc)
            this.docs[subject].status = FetchQQueue.status.PENDING
            res.created++
        })

        this.list = flatDocs(this.docs)

        // console.log(this.client.name, 'PUSH')
        // console.log(this.docs)


        this.emit('pending')

        return res
    }

    async pick ({ limit = 1, lock = '5m' } = {}) {
        await super.pick()

        const docs = this.list
            .filter(doc => doc.status === FetchQQueue.status.PENDING)
            .filter(doc => doc.nextIteration <= Date.now())
            .slice(0, limit)
            .map(doc => {
                doc.nextIteration = addTime(Date.now(), lock)
                doc.status = FetchQQueue.status.ACTIVE
                doc.attempts += 1
                return doc
            })

        this.list = flatDocs(this.docs)
        return docs
    }

    async reschedule (doc, nextIterationPlan) {
        await super.reschedule()

        // console.log(this.client.name, 'reschedule', doc, this.docs)
        const { subject } = doc
        const nextIteration = parseDate(nextIterationPlan)

        this.docs[subject].nextIteration = nextIteration
        this.docs[subject].lastIteration = parseDate()
        this.docs[subject].status = FetchQQueue.status.PENDING
        this.docs[subject].attempts = 0
        this.docs[subject].iterations += 1

        this.list = flatDocs(this.docs)
        return this
    }

    async reject (doc, err, nextIterationPlan) {
        await super.reject()

        const { subject } = doc
        const nextIteration = nextIterationPlan
            ? parseDate(nextIterationPlan)
            : doc.nextIteration

        this.docs[subject].nextIteration = nextIteration
        this.docs[subject].lastIteration = parseDate()
        this.docs[subject].iterations += 1

        this.docs[subject].status = this.docs[subject].attempts >= this.settings.tolerance
            ? FetchQQueue.status.KILLED
            : FetchQQueue.status.PENDING
        
        this.list = flatDocs(this.docs)
        return this
    }
}
