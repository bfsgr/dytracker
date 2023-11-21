interface ListTracker<T extends any[] | undefined | null> {
  __list__: T extends any[] ? Blueprint<T>[number] : undefined
}

interface Options<T> {
  __meta__?: Partial<{
    keyname: string
    predicate: (a: T, b: T) => boolean
  }>
}

type Blueprint<T> = {
  [K in keyof T]?: T[K] extends any[] | null | undefined
    ? ListTracker<T[K]>
    : T[K] extends object
      ? Blueprint<T[K]>
      : boolean
} & Options<T>

type Diff<T> = {
  [K in keyof T]?: T[K] extends any[] | null | undefined
    ? { added: T[K]; removed: T[K]; updated: T[K] }
    : T[K] extends object
      ? Diff<T[K]>
      : T[K]
}

export class Dytracker<T extends object> {
  constructor(
    private readonly _schema: Blueprint<T>,
    private readonly _records = new Map<string | number | symbol, unknown>()
  ) {}

  private _walk<S>(schema: Blueprint<S>, obj: S, key: keyof S): unknown {
    if (schema[key] === true) return obj[key]

    if (
      typeof schema[key] === 'object' &&
      Object.hasOwn(schema[key] as object, '__meta__')
    ) {
      return obj[key]
    }

    if (
      typeof schema[key] === 'object' &&
      !Object.hasOwn(schema[key] as object, '__list__') &&
      !Array.isArray(obj[key])
    ) {
      const current: Record<any, any> = {}

      for (const k in schema[key] as any) {
        current[k] = this._walk(schema[key] as any, obj[key] as any, k)
      }

      return current
    }

    if (
      Array.isArray(obj[key]) &&
      typeof schema[key] === 'object' &&
      Object.hasOwn(schema[key] as object, '__list__')
    ) {
      const current = new Map<
        string | number | symbol,
        Record<string | number, any>
      >()

      for (const item of obj[key] as any[]) {
        const currentObj: Record<any, any> = {}

        for (const k in (schema[key] as any).__list__) {
          currentObj[k] = this._walk((schema[key] as any).__list__, item, k)
        }

        current.set(item.id, currentObj)
      }

      return current
    }
  }

  private _check<S>(
    schema: Blueprint<S>,
    tracked: S,
    current: S,
    key: keyof S
  ): unknown {
    if (schema[key] === true) {
      if (tracked[key] !== current[key]) return current[key]
    }

    if (
      typeof schema[key] === 'object' &&
      Object.hasOwn(schema[key] as object, '__meta__')
    ) {
      const options = (schema[key] as Blueprint<S>).__meta__

      if (options?.predicate !== undefined) {
        return !options.predicate(tracked[key] as any, current[key] as any)
          ? current[key]
          : undefined
      } else {
        if (tracked[key] !== current[key]) return current[key]
      }
    }

    if (
      typeof schema[key] === 'object' &&
      !Object.hasOwn(schema[key] as object, '__list__') &&
      !Array.isArray(current[key])
    ) {
      const diff: Record<any, any> = {}

      for (const k in schema[key] as any) {
        const result = this._check(
          schema[key] as any,
          tracked[key] as any,
          current[key] as any,
          k
        )

        if (result !== undefined) {
          diff[k] = result
        }
      }

      return Object.keys(diff).length > 0 ? diff : undefined
    }

    if (
      Array.isArray(current[key]) &&
      typeof schema[key] === 'object' &&
      Object.hasOwn(schema[key] as object, '__list__')
    ) {
      const diff = {
        added: [] as any[],
        removed: [] as any[],
        updated: [] as any[],
      }

      const listEntitiesMap = tracked[key] as Map<
        string,
        Record<string | number, any>
      >

      const currentList = current[key] as any[]

      for (const item of currentList) {
        if (!listEntitiesMap.has(item.id)) {
          diff.added.push(item)
          continue
        }

        const trackedItem = listEntitiesMap.get(item.id)!

        const currentObj: Record<any, any> = {}
        let changeCount = 0

        for (const k in (schema[key] as any).__list__) {
          const found = this._check(
            (schema[key] as any).__list__,
            { id: item.id, ...trackedItem },
            item,
            k
          )

          if (found !== undefined) {
            changeCount += 1
            currentObj[k] = found
          }
        }

        if (changeCount > 0) {
          diff.updated.push({ id: item.id, ...currentObj })
        }
      }

      for (const [id] of listEntitiesMap) {
        if (currentList.find((item) => item.id === id) === undefined) {
          diff.removed.push({ id, ...listEntitiesMap.get(id) })
        }
      }

      return diff
    }
  }

  track(obj: T): void {
    const keyname = this._schema.__meta__?.keyname ?? 'id'

    const id = obj[keyname as keyof T] as PropertyKey

    if (this._records.has(id)) return

    const current: Record<PropertyKey, unknown> = {
      [keyname]: id,
    }

    for (const key in this._schema) {
      current[key] = this._walk(this._schema, obj, key as keyof T)
    }

    this._records.set(id, current)
  }

  diff(obj: T): Diff<T> {
    const keyname = this._schema.__meta__?.keyname ?? 'id'

    const id = obj[keyname as keyof T] as PropertyKey

    if (!this._records.has(id)) return {}

    const tracked: any = this._records.get(id)

    const diff: Record<string, any> = {}

    for (const key in this._schema) {
      const result = this._check(this._schema, tracked, obj, key)

      if (result !== undefined) diff[key] = result
    }

    return diff
  }

  flush(id: string | number): void {
    this._records.delete(id)
  }
}
