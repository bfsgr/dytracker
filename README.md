# Dytracker

Dy(namic) tracker is simple library ment to enable diff of objects using a provided blueprint

## Example

```js
import { Dytracker } from 'dytracker'

const tracker = new Dytracker({
  name: true,
  email: true,
  permission: {
    id: true,
  },
  posts: {
    keyname: 'id', // To enable tracking of lists, array elements will need an unique identifier
    tracking: {
      title: true,
    },
  },
})

const user = {
  id: 1, // It is required that the top level object have an unique identifier
  name: 'Jane Doe',
  email: 'jane@example.com',
  permission: {
    id: 1,
    name: 'Admin', // Properties not in the blueprint will simply be ignored
  },
  posts: [
    {
      id: 1,
      title: 'Hi there',
    },
  ],
}

tracker.track(user)

// now lets change `user`
user.name = 'Jane Smith'
user.permission.id = 2
user.posts.push({ id: 2, title: 'Follow me at github!' })

tracker.diff(user)
/*
  {
  name: 'Jane Smith',
  permission: { id: 2 },
  posts: {
    added: [ { id: 2, title: 'Follow me at github!' } ],
    removed: [],
    updated: []
  }
}
*/
```

## Typescript

Dytracker was written in typescript thus, it has first class support for typing. The same example above can be written as:

```ts
import { Dytracker } from 'dytracker'

interface User {
  id: number
  name: string
  email: string
  permission: {
    id: number
    name: string
  },
  posts: Array<{
      id: number
      title: string
  }>
}

/* Providing a generic will enable suggestions for the blueprint object */
const tracker = new Dytracker<User>({
  name: true,
  email: true,
  permission: {
    id: true
  },
  posts: {
    keyname: 'id',
    tracking: {
      title: true
    }
  }
})

const user: User = {
  id: 1,
  name: 'Jane Doe',
  email: 'jane@example.com',
  permission: {
    id: 1
    name: 'Admin'
  },
  posts: [
    {
      id: 1,
      title: 'Hi there'
    }
  ]
}

tracker.track(user)

user.name = 'Jane Smith'
user.permission.id = 2
user.posts.push({ id: 2, title: 'Follow me at github!' })

/*
  The type of the diff return will basically be a Partial of the generic you provided
  with the exception of arrays, which will be objects like { added: T[], updated: T[], removed: T[] }
*/
tracker.diff(user)
/*
  {
  name: 'Jane Smith',
  permission: { id: 2 },
  posts: {
    added: [ { id: 2, title: 'Follow me at github!' } ],
    removed: [],
    updated: []
  }
}
*/

```

## API

### Top level object

Dytracker enables you to monitor changes to any property of an object using the basic, nested or list interfaces.
The top level object can have the folowing options:

#### `_keyname: keyof T`

By default the top level object is tracked using the `id` property. `_keyname` allows you to change the property used to track the object.

```ts
interface Obj {
  key: string
  foo: number
}

const tracker = new Dytracker<Obj>({
  _keyname: 'key',
  foo: true,
})
```

### Basic properties

This is the first building block of Dytracker, it makes all properties that map to primitives selectable with a boolean.

> There are no other options to the basic interface

```ts
interface Obj {
  id: number
  foo: number
}

const tracker = new Dytracker<Obj>({
  foo: true,
})
```

### Nested properties

When you need to track an object nested inside your top level object you are using the nested interface, which is a recursive interface that enables basic and nested types to an object.
Therefore you can select properties of a nested object with a boolean and nested objects with the same API.

#### `_predicate: (a: T, b: T) => boolean`

Somethimes you don't need to monitor properties of a nested object, especially for [value objects](https://martinfowler.com/bliki/ValueObject.html). In that case you can use the `_predicate` to dictate how the dytracker will check for the equality of that object.

##### Caveats:

- Because you define the predicate for equality, the object being checked will be deep cloned using `structuredClone`
- When `_predicate` is provided all other options **will be ignored** e.g. you cannot watch nested properties of an object _you will compare manually_.

```ts
interface Obj {
  id: number
  createdAt: Date
}

const tracker = new Dytracker<Obj>({
  createdAt: {
    _predicate: (a, b) => a.getTime() === b.getTime(),
  },
})
```

### List properties

Dytracker makes it easy to keep track of what was added, updated and removed from a list, this is especially usefull when you have 1-N relationship mapped into your object. To do that, your array needs to consist of objects with a unique identifier property, usually `id`, if you have that, you can make use the list API to track elements of an array and even choose what you want to track in each element.

##### Caveats:

- It's currently not possible to track lists of primitives likes `number` or `string`
- The only supported list is Array


```ts
interface Post {
  id: number
  title: string
}

interface Obj {
  id: number
  posts: Post[]
}

const tracker = new Dytracker<Obj>({
  posts: {
    keyname: 'id',
    tracking: {
      title: true,
    },
  },
})
```
