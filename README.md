# Dytracker

Dy(namic) tracker is simple library ment to keep enable diff of objects using a provided schema

### Example

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
    name: 'Admin' // Properties not in the schema will simply be ignored
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

console.dir(tracker.diff(user), {depth: null})

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

it requires that the top level object
have an unique stable identifier, by default Dytracker will look for the ID key

