export type IssueCategory =
  | "Road"
  | "Cleanliness"
  | "Water"
  | "Lighting"
  | "Safety"
  | "Parks"

export type IssueStatus =
  | "Open"
  | "Verified"
  | "NGO Claimed"
  | "In Progress"
  | "Gov Jurisdiction"

export type ResponderType = "NGO" | "Company" | "Citizen Group" | "Government"

export type Responder = {
  name: string
  type: ResponderType
  verified: boolean
}

export type Issue = {
  id: string
  title: string
  summary: string
  category: IssueCategory
  status: IssueStatus
  distance: string
  locality: string
  timeAgo: string
  amplifies: number
  thumbnail: string
  thumbnailAlt: string
  reportedBy: string
  reporterVerified: boolean
  /** Locality petition pushing authorities to act */
  petition: {
    signatures: number
    goal: number
  }
  /** Authority-only issues cannot be claimed by NGOs/companies/citizens */
  restricted: boolean
  /** Organisations currently working on (or eligible to claim) the issue */
  responder?: Responder
}

export const categoryStyles: Record<IssueCategory, string> = {
  Road: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  Cleanliness: "bg-lime-500/15 text-lime-400 ring-lime-500/25",
  Water: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
  Lighting: "bg-yellow-500/15 text-yellow-300 ring-yellow-500/25",
  Safety: "bg-rose-500/15 text-rose-400 ring-rose-500/25",
  Parks: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
}

export const statusStyles: Record<IssueStatus, string> = {
  Open: "bg-muted text-muted-foreground ring-border",
  Verified: "bg-primary/15 text-primary ring-primary/30",
  "NGO Claimed": "bg-violet-500/15 text-violet-300 ring-violet-500/25",
  "In Progress": "bg-cyan-500/15 text-cyan-300 ring-cyan-500/25",
  "Gov Jurisdiction": "bg-blue-500/15 text-blue-300 ring-blue-500/25",
}

export const issues: Issue[] = [
  {
    id: "1",
    title: "Open manhole left uncovered near the school gate",
    summary:
      "An uncovered manhole on the main approach to the primary school poses a serious risk to children during the morning rush. Needs an immediate cover and barricade.",
    category: "Safety",
    status: "Verified",
    distance: "0.4 km away",
    locality: "Shivaji Nagar",
    timeAgo: "12m ago",
    amplifies: 312,
    thumbnail: "/issues/manhole.png",
    thumbnailAlt: "Uncovered manhole on a city street",
    reportedBy: "Priya Nair",
    reporterVerified: true,
    petition: { signatures: 286, goal: 500 },
    restricted: false,
  },
  {
    id: "2",
    title: "Massive pothole on MG Road near the metro entrance",
    summary:
      "A deep, water-filled pothole right at the metro exit is causing two-wheeler skids daily. This stretch is a state highway, so only the municipal roads authority is permitted to repair it.",
    category: "Road",
    status: "Gov Jurisdiction",
    distance: "1.2 km away",
    locality: "MG Road",
    timeAgo: "34m ago",
    amplifies: 248,
    thumbnail: "/issues/pothole.png",
    thumbnailAlt: "Large pothole filled with water on a road",
    reportedBy: "Rahul Verma",
    reporterVerified: false,
    petition: { signatures: 412, goal: 500 },
    restricted: true,
    responder: { name: "City Roads Authority", type: "Government", verified: true },
  },
  {
    id: "3",
    title: "Overflowing garbage bins behind the vegetable market",
    summary:
      "Bins haven't been cleared in days; waste is spilling onto the road and attracting strays. A local NGO has stepped in to run a clean-up drive.",
    category: "Cleanliness",
    status: "NGO Claimed",
    distance: "0.8 km away",
    locality: "Lakshmi Market",
    timeAgo: "1h ago",
    amplifies: 187,
    thumbnail: "/issues/garbage.png",
    thumbnailAlt: "Overflowing garbage bins on a street corner",
    reportedBy: "Saaf Sheher Foundation",
    reporterVerified: true,
    petition: { signatures: 154, goal: 250 },
    restricted: false,
    responder: { name: "Saaf Sheher Foundation", type: "NGO", verified: true },
  },
  {
    id: "4",
    title: "Street light out on the entire 4th cross lane",
    summary:
      "The whole lane has been dark for over a week, making it unsafe after sunset. Falls under the electricity board's jurisdiction.",
    category: "Lighting",
    status: "Gov Jurisdiction",
    distance: "2.1 km away",
    locality: "Indira Layout",
    timeAgo: "2h ago",
    amplifies: 132,
    thumbnail: "/issues/streetlight.png",
    thumbnailAlt: "Dark residential street with a broken street light",
    reportedBy: "Meena Iyer",
    reporterVerified: false,
    petition: { signatures: 98, goal: 300 },
    restricted: true,
    responder: { name: "State Electricity Board", type: "Government", verified: true },
  },
  {
    id: "5",
    title: "Water pipeline leak flooding the footpath",
    summary:
      "A burst pipe is wasting water and flooding the footpath by the bus stop. Open for a verified plumber group or the water board to claim.",
    category: "Water",
    status: "Verified",
    distance: "1.7 km away",
    locality: "Gandhi Bazaar",
    timeAgo: "3h ago",
    amplifies: 96,
    thumbnail: "/issues/waterleak.png",
    thumbnailAlt: "Water leaking from a pipe onto a footpath",
    reportedBy: "Arjun Das",
    reporterVerified: true,
    petition: { signatures: 61, goal: 200 },
    restricted: false,
  },
  {
    id: "6",
    title: "Broken swings and rusted railings at the kids' park",
    summary:
      "Play equipment is rusted and unsafe. A CSR-funded NGO is currently restoring and repainting the park.",
    category: "Parks",
    status: "In Progress",
    distance: "2.6 km away",
    locality: "Ward 12",
    timeAgo: "5h ago",
    amplifies: 74,
    thumbnail: "/issues/park.png",
    thumbnailAlt: "Rusted broken swings at a children's park",
    reportedBy: "Ward 12 Residents",
    reporterVerified: true,
    petition: { signatures: 203, goal: 250 },
    restricted: false,
    responder: { name: "Green Streets Collective", type: "NGO", verified: true },
  },
]
