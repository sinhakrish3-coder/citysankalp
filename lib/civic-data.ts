// ---------- Civic Feed ----------

export type FeedPostBeforeAfter = {
  id: string
  type: "before-after"
  author: string
  handle: string
  avatar: string
  timeAgo: string
  title: string
  body: string
  beforeImage: string
  afterImage: string
  likes: number
  comments: number
}

export type FeedPostUpdate = {
  id: string
  type: "update"
  author: string
  handle: string
  avatar: string
  timeAgo: string
  body: string
  image: string
  imageAlt: string
  likes: number
  comments: number
}

export type FeedPost = FeedPostBeforeAfter | FeedPostUpdate

export const feedPosts: FeedPost[] = [
  {
    id: "f1",
    type: "before-after",
    author: "Green Streets Collective",
    handle: "@greenstreets",
    avatar: "/avatars/ngo1.png",
    timeAgo: "2h",
    title: "MG Road footpath fully restored",
    body: "What was a flooded, broken stretch is now a clean walkway. 248 citizens amplified this — thank you for the pressure that made it happen.",
    beforeImage: "/feed/footpath-before.png",
    afterImage: "/feed/footpath-after.png",
    likes: 1240,
    comments: 86,
  },
  {
    id: "f2",
    type: "update",
    author: "Saaf Sheher Foundation",
    handle: "@saafsheher",
    avatar: "/avatars/ngo2.png",
    timeAgo: "5h",
    body: "Day 3 of the Lakshmi Market clean-up drive. 40 volunteers, 2 tonnes of waste segregated, and new compost bins installed. Ongoing through the weekend.",
    image: "/feed/cleanup-drive.png",
    imageAlt: "Volunteers in green vests cleaning a market street",
    likes: 932,
    comments: 54,
  },
  {
    id: "f3",
    type: "before-after",
    author: "Ward 12 Residents",
    handle: "@ward12",
    avatar: "/avatars/ngo3.png",
    timeAgo: "1d",
    title: "Children's park swings repaired & repainted",
    body: "Rusted, unsafe equipment replaced with the help of the local NGO and CSR funding. The park is open and safe again.",
    beforeImage: "/feed/park-before.png",
    afterImage: "/feed/park-after.png",
    likes: 2103,
    comments: 142,
  },
]

// ---------- Rewards & CSR ----------

export type Competition = {
  id: string
  title: string
  sponsor: string
  image: string
  points: number
  participants: number
  daysLeft: number
}

export const competitions: Competition[] = [
  {
    id: "c1",
    title: "Green Earth Cleanliness Drive",
    sponsor: "Verdant Co.",
    image: "/rewards/comp-cleanliness.png",
    points: 500,
    participants: 1820,
    daysLeft: 6,
  },
  {
    id: "c2",
    title: "Pothole-Free Streets Challenge",
    sponsor: "Asphalt Motors",
    image: "/rewards/comp-roads.png",
    points: 350,
    participants: 940,
    daysLeft: 12,
  },
]

export type Reward = {
  id: string
  name: string
  cost: number
  icon: "coffee" | "ticket" | "leaf" | "gift" | "shirt"
}

export const rewards: Reward[] = [
  { id: "r1", name: "Free Metro Day Pass", cost: 200, icon: "ticket" },
  { id: "r2", name: "Café Reward Voucher", cost: 350, icon: "coffee" },
  { id: "r3", name: "Plant a Tree in Your Name", cost: 150, icon: "leaf" },
  { id: "r4", name: "CitySankalp Tote Bag", cost: 500, icon: "gift" },
  { id: "r5", name: "Volunteer Tee", cost: 650, icon: "shirt" },
]

// ---------- Profile ----------

export const profile = {
  name: "Aarav Mehta",
  handle: "@aarav.builds",
  avatar: "/avatars/user.png",
  tier: "Level 4 · Trusted Citizen",
  meritScore: 2840,
  nextTierAt: 3500,
  stats: {
    reported: 38,
    amplified: 214,
    resolved: 17,
  },
}
