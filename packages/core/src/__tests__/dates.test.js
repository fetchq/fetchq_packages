import * as dates from '../lib/dates'

describe('dates', () => {
    describe('addTime()', () => {
        test(`It should add Zero`, () => {
            const d1 = new Date('2018-01-01')
            const d2 = dates.addTime(d1, 0)
            expect(d1).toEqual(d2)
        })

        test(`It should add milliseconds`, () => {
            const d1 = new Date('2018-01-01')
            const d2 = dates.addTime(d1, 10)
            expect(d2 - d1).toBe(10)
        })

        test(`It should add a string based delay`, () => {
            const d1 = new Date('2018-01-01')
            const d2 = dates.addTime(d1, '1s')
            expect(d2 - d1).toBe(1000)
        })

        test(`It should take in a string formatted date`, () => {
            const d1 = dates.addTime('2018-01-01')
            expect(d1).toEqual(new Date('2018-01-01'))
        })

        test(`It should take a date in milliseconds as a date`, () => {
            const d1 = dates.addTime((new Date('2018-01-01')).getTime())
            expect(d1).toEqual(new Date('2018-01-01'))
        })
    })

    describe('parseDate()', () => {
        test(`It should parse an ISO date`, () => {
            const now = new Date()
            expect(dates.parse(now.toISOString())).toEqual(now)
        })

        test(`It should parse from milliseconds`, () => {
            const now = new Date()
            expect(dates.parse(now.getTime())).toEqual(now)
        })

        test(`It should parse from a relative amound of time`, () => {
            const now = new Date()
            const d1 = dates.parse('1s')
            expect(Math.floor((d1 - now) / 10)).toBe(100)
        })

        // there may be a millisecond of difference
        test(`It should accept an empty value`, () => {
            const d1 = Math.floor(dates.parse().getTime() / 10)
            const d2 = Math.floor(Date.now() / 10)
            expect(d1).toBe(d2)
        })
    })
})