# Dytracker

Dy(namic) tracker is simple library ment to keep enable diff of objects using a provided blueprint

## Example

```js
import { Dytracker } from 'dytracker'

const tracker = new Dytracker({
  name: true,
  email: true,
  permission: {
    id: true
  },
  posts: {
    /*
      __list__ is a special property that tells Dytracker
      to track added, updated and removed objects of a nested array
    */
    __list__: {
      title: true
    }
  }
})

const user = {
  id: 1, // It is required that the top level object have an unique identifier
  name: 'Jane Doe',
  email: 'jane@example.com',
  permission: {
    id: 1
    name: 'Admin' // Properties not in the blueprint will simply be ignored
  },
  posts: [
    {
      id: 1,  // To enable tracking of lists, array elements will also need an unique identifier
      title: 'Hi there'
    }
  ]
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
  posts: [
    {
      id: number
      title: string
    }
  ]
}

/* Providing a generic will enable suggestions for the blueprint object */
const tracker = new Dytracker<User>({
  name: true,
  email: true,
  permission: {
    id: true
  },
  posts: {
    __list__: {
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
