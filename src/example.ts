import { Dytracker } from './dytracker'

interface User {
  id: number
  name: string
  email: string
  permission: {
    id: number
    name: string
  }
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
    id: true,
  },
  posts: {
    keyname: 'id',
    tracking: {
      title: true,
    },
  },
})

const user: User = {
  id: 1,
  name: 'Jane Doe',
  email: 'jane@example.com',
  permission: {
    id: 1,
    name: 'Admin',
  },
  posts: [
    {
      id: 1,
      title: 'Hi there',
    },
  ],
}

tracker.track(user)

user.name = 'Jane Smith'
user.permission.id = 2
user.posts.push({ id: 2, title: 'Follow me at github!' })

/*
  The type of the diff return will basically be a Partial of the generic you provided
  with the exception of arrays, which will be objects like { added: T[], updated: T[], removed: T[] }
*/
const diff = tracker.diff(user)
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

console.dir(diff, { depth: null })
