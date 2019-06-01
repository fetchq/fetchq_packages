import { FetchQQueue } from './interfaces'
import { parse as parseDate } from './dates'

export const pause = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

export const docStatus = date =>
    date > new Date()
        ? FetchQQueue.status.PLANNED
        : FetchQQueue.status.PENDING

export const docDefaults = doc => {
    const nextIteration = parseDate(doc.nextIteration)

    return {
        subject: doc.subject || 'jdhoe', // maybe uuid?
        payload: doc.payload || {},
        lastIteration: doc.lastIteration || null,
        status: docStatus(nextIteration),
        attempts: 0,
        iterations: 0,
        nextIteration,
    }
}

// Produces a sorted list of pending documents
export const flatDocs = docs => {
    const list = Object.keys(docs)
        .map(subject => docs[subject])
        .filter(doc => doc.status === FetchQQueue.status.PENDING)

    list.sort((a, b) => a.nextIteration - b.nextIteration)
    return list
}
