import ms from 'ms'

export const addTime = (date, delay = 0) => {    
    let date_obj = date instanceof Date
        ? date
        : new Date(date)
    
    const delay_ms = typeof delay === 'number'
        ? delay
        : ms(delay)

    return new Date(date_obj.getTime() + delay_ms)
}

export const parse = (date = new Date()) => {
    if (date instanceof Date) {
        return date
    }

    if (typeof date === 'number') {
        return new Date(date)
    }

    const delay = ms(date)
    
    return delay !== undefined
        ? new Date(Date.now() + delay)
        : new Date(date)
}
