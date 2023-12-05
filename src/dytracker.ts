type Primitives = string | number | boolean | null | undefined | symbol | bigint

type SupportedLists = any[]

type Basics<T> = {
  [K in keyof T as T[K] extends Primitives ? K : never]?: boolean
}

type Nested<T> = {
  [K in keyof T as T[K] extends object
    ? T[K] extends SupportedLists
      ? never
      : K
    : never]?: (Basics<T[K]> & Nested<T[K]>) | Options<T[K]>
}

type List<T> = {
  [K in keyof T as T[K] extends SupportedLists ? K : never]: {
    keyname: T[K] extends Array<infer R> ? keyof R : never
    tracking: T[K] extends Array<infer R>
      ? Omit<Blueprint<R>, keyof Options<any>>
      : never
  }
}

type Options<T> = {
  _keyname?: keyof T
  _predicate?: (a: T, b: T) => boolean
}

type Blueprint<T> = Basics<T> &
  Nested<T> &
  List<T> &
  Pick<Options<T>, '_keyname'>

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
    private readonly _records = new Map<PropertyKey, unknown>(),
  ) {}

  private _walk<S>(
    schema: Blueprint<S>,
    obj: S,
    key: keyof S & keyof Blueprint<S>,
  ): unknown {
    if (schema[key] === true) return obj[key]

    if (
      typeof schema[key] === 'object' &&
      Object.hasOwn(schema[key] as object, '_predicate')
    ) {
      return structuredClone(obj[key])
    }

    if (
      typeof schema[key] === 'object' &&
      !Object.hasOwn(schema[key] as object, 'keyname') &&
      !Object.hasOwn(schema[key] as object, 'tracking') &&
      !Array.isArray(obj[key])
    ) {
      const current: Record<any, any> = {}

      for (const k in schema[key]) {
        current[k] = this._walk(schema[key] as any, obj[key], k as any)
      }

      return current
    }

    if (
      typeof schema[key] === 'object' &&
      Object.hasOwn(schema[key] as object, 'keyname') &&
      Object.hasOwn(schema[key] as object, 'tracking') &&
      Array.isArray(obj[key])
    ) {
      const current = new Map<
        string | number | symbol,
        Record<string | number, any>
      >()

      for (const item of obj[key] as any[]) {
        const itemId = item[(schema[key] as any).keyname]

        const currentObj: Record<any, any> = {}

        for (const k in (schema[key] as any).tracking) {
          currentObj[k] = this._walk((schema[key] as any).tracking, item, k)
        }

        current.set(itemId, currentObj)
      }

      return current
    }
  }

  private _check<S>(
    schema: Blueprint<S>,
    tracked: S,
    current: S,
    key: keyof S & keyof Blueprint<S>,
  ): unknown {
    if (schema[key] === true) {
      if (tracked[key] !== current[key]) return current[key]
    }

    if (
      typeof schema[key] === 'object' &&
      Object.hasOwn(schema[key] as object, '_predicate')
    ) {
      const predicate = (schema[key] as any)._predicate

      if (predicate !== undefined) {
        return !predicate(tracked[key] as any, current[key] as any)
          ? current[key]
          : undefined
      } else {
        if (tracked[key] !== current[key]) return current[key]
      }
    }

    if (
      typeof schema[key] === 'object' &&
      !Object.hasOwn(schema[key] as object, 'keyname') &&
      !Object.hasOwn(schema[key] as object, 'tracking') &&
      !Array.isArray(current[key])
    ) {
      const diff: Record<any, any> = {}

      for (const k in schema[key] as any) {
        const result = this._check(
          schema[key] as any,
          tracked[key] as any,
          current[key] as any,
          k,
        )

        if (result !== undefined) {
          diff[k] = result
        }
      }

      return Object.keys(diff).length > 0 ? diff : undefined
    }

    if (
      typeof schema[key] === 'object' &&
      Object.hasOwn(schema[key] as object, 'keyname') &&
      Object.hasOwn(schema[key] as object, 'tracking') &&
      Array.isArray(current[key])
    ) {
      const diff = {
        added: [] as any[],
        removed: [] as any[],
        updated: [] as any[],
      }

      const listEntitiesMap = tracked[key] as Map<
        PropertyKey,
        Record<string | number, any>
      >

      const currentList = current[key] as any[]

      const keyname = (schema[key] as any).keyname

      for (const item of currentList) {
        if (!listEntitiesMap.has(item[keyname])) {
          diff.added.push(item)
          continue
        }

        const trackedItem = listEntitiesMap.get(item[keyname])!

        const currentObj: Record<any, any> = {}
        let changeCount = 0

        for (const k in (schema[key] as any).tracking) {
          const found = this._check(
            (schema[key] as any).tracking,
            { id: item[keyname], ...trackedItem },
            item,
            k,
          )

          if (found !== undefined) {
            changeCount += 1
            currentObj[k] = found
          }
        }

        if (changeCount > 0) {
          diff.updated.push({ id: item[keyname], ...currentObj })
        }
      }

      for (const [id] of listEntitiesMap) {
        if (currentList.find((item) => item[keyname] === id) === undefined) {
          diff.removed.push({ [keyname]: id, ...listEntitiesMap.get(id) })
        }
      }

      return diff
    }
  }

  track(obj: T): void {
    const keyname = this._schema._keyname ?? 'id'

    const id = obj[keyname as keyof T] as PropertyKey

    if (this._records.has(id)) return

    const current: Record<PropertyKey, unknown> = {
      [keyname]: id,
    }

    for (const key in this._schema) {
      current[key] = this._walk(this._schema, obj, key as any)
    }

    this._records.set(id, current)
  }

  diff(obj: T): Diff<T> {
    const keyname = this._schema._keyname ?? 'id'

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

  flush(id: PropertyKey): void {
    this._records.delete(id)
  }
}
