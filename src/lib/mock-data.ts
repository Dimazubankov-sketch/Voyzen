/** Static demo content for the Voyzen prototype (no backend). */

export interface Person {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  online?: boolean;
  bio?: string;
  banner?: string;
  following?: number;
  followers?: number;
  verified?: boolean;
}

/** A non-image attachment (pdf, zip, doc…). */
export interface FileAttachment {
  name: string;
  size: string;
  /** Object URL when the file was picked in this session. */
  url?: string;
}

/** A recorded round video message. */
export interface VideoAttachment {
  url: string;
  /** Seconds. */
  duration: number;
}

/** A recorded voice message. */
export interface AudioAttachment {
  url: string;
  /** Seconds. */
  duration: number;
  /** Normalised 0..1 amplitudes captured while recording, for the waveform. */
  peaks: number[];
}

export interface ChatMessage {
  id: string;
  from: "me" | "them";
  /** Who sent it — group chats show the sender above the bubble. */
  authorId?: string;
  text?: string;
  images?: string[];
  file?: FileAttachment;
  audio?: AudioAttachment;
  video?: VideoAttachment;
  time: string;
  read?: boolean;
  /** The text was changed after sending. */
  edited?: boolean;
  /** Name of the chat this was forwarded from. */
  forwardedFrom?: string;
  /** For disappearing messages — epoch ms when it self-destructs. */
  expiresAt?: number;
  /** The message this one is replying to (author + short preview). */
  replyTo?: { author?: string; text: string };
}

export interface Chat {
  id: string;
  kind: "direct" | "group";
  /** Direct chats only. */
  person?: Person;
  /** Group chats only. */
  name?: string;
  members?: Person[];
  avatar?: string;
  messages: ChatMessage[];
  unread: number;
  /** Pinned to the top of the chat list. */
  pinned?: boolean;
  /** Notifications muted. */
  muted?: boolean;
  /** Removed from the list — history is kept so it can come back. */
  deleted?: boolean;
  /** Id of the message pinned to the top of the conversation. */
  pinnedMessageId?: string;
}

export interface PostComment {
  id: string;
  author: Person;
  text: string;
  time: string;
  /** Epoch ms — drives the "newest first" sort. */
  createdAt: number;
  likes: number;
  liked?: boolean;
  /** Attachments added through the reply composer's "+" menu. */
  images?: string[];
  file?: FileAttachment;
  link?: string;
  /** One level of nesting: replies to this comment. */
  replies?: PostComment[];
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  options: PollOption[];
  /** How the results are drawn. */
  chart: "bars" | "donut";
  /** Which option the signed-in user picked, if any. */
  votedId?: string;
}

export interface Post {
  id: string;
  author: Person;
  /** Human date line, e.g. "Thursday, Jun 12, 5:50 PM". */
  time: string;
  /** Optional "is at <location>" line. */
  location?: string;
  text: string;
  images?: string[];
  poll?: Poll;
  likes: number;
  likers: Person[];
  comments: PostComment[];
  shares: number;
  views: number;
  liked?: boolean;
  /** Reposted by the signed-in user — drives the profile's Reposts tab. */
  reposted?: boolean;
  /** Authored by the signed-in user — drives the profile's Posts tab. */
  mine?: boolean;
  /** A quote-repost embeds the original post here. */
  repostOf?: Post;
  /** Hidden via "Not interested". */
  hidden?: boolean;
  /** Simple tags for the search screen. */
  tags?: string[];
  /** Marked as a paid promotion by its author. */
  ad?: boolean;
}

/** Hours ago, as an epoch timestamp — demo comments need a real ordering. */
const ago = (hours: number) => Date.now() - hours * 3_600_000;

const avatar = (n: number) => `https://i.pravatar.cc/200?img=${n}`;
const photo = (id: number, w = 800, h = 600) => `https://picsum.photos/id/${id}/${w}/${h}`;

const banner = (id: number) => `https://picsum.photos/id/${id}/1200/400`;

export const PEOPLE: Person[] = [
  { id: "p1", name: "Jacquenetta Slowgrave", handle: "jacqs", avatar: avatar(12), online: true, verified: true, bio: "Landscape photographer. Chasing light in the mountains. 🏔️", banner: banner(1018), following: 512, followers: 24800 },
  { id: "p2", name: "Nickola Peever", handle: "nickola", avatar: avatar(33), online: true, bio: "Product designer. Empty states are underrated.", banner: banner(1043), following: 340, followers: 8900 },
  { id: "p3", name: "Farand Hume", handle: "farand", avatar: avatar(15), online: false, bio: "Coffee, code, and long walks.", banner: banner(1039), following: 210, followers: 3400 },
  { id: "p4", name: "Ossie Peasey", handle: "ossie", avatar: avatar(51), online: true, bio: "Engineer @ somewhere. Shipping fast things.", banner: banner(1067), following: 88, followers: 1200 },
  { id: "p5", name: "Hall Negri", handle: "halln", avatar: avatar(45), online: false, bio: "Tea over coffee. Fight me.", banner: banner(1080), following: 156, followers: 640 },
  { id: "p6", name: "Elyssa Segot", handle: "elyssa", avatar: avatar(9), online: true, verified: true, bio: "Writer & sunrise chaser. NYC.", banner: banner(1015), following: 402, followers: 15200 },
  { id: "p7", name: "Gil Wilfing", handle: "gilw", avatar: avatar(60), online: false, bio: "Sends files, occasionally memes.", banner: banner(1074), following: 74, followers: 420 },
  { id: "p8", name: "Ray Hammond", handle: "rayh", avatar: avatar(68), online: true, verified: true, bio: "Traveller. 40 countries and counting. ✈️", banner: banner(1071), following: 640, followers: 48300 },
];

export const CHATS: Chat[] = [
  {
    id: "c1",
    kind: "direct",
    person: PEOPLE[0],
    unread: 1,
    messages: [
      {
        id: "m1",
        from: "them",
        images: [photo(1018), photo(1015), photo(1016), photo(1019)],
        time: "17:23",
      },
      {
        id: "m2",
        from: "me",
        text: "Some shots from my last few trips. Saturday can't come soon enough!",
        time: "17:23",
        read: true,
      },
      { id: "m3", from: "them", text: "Great! Looking forward to it. See you later!", time: "17:23" },
    ],
  },
  {
    id: "g1",
    kind: "group",
    name: "Voyzen Design Team",
    members: [PEOPLE[1], PEOPLE[3], PEOPLE[5], PEOPLE[7]],
    unread: 3,
    messages: [
      { id: "m1", from: "them", authorId: "p2", text: "Pushed the new light-grey palette to main 🎨", time: "14:02" },
      {
        id: "m2",
        from: "them",
        authorId: "p6",
        text: "Looks so much cleaner. Can we bump the accent a touch?",
        time: "14:06",
      },
      { id: "m3", from: "me", text: "Agreed — I'll take a pass this evening.", time: "14:09", read: true },
      {
        id: "m4",
        from: "them",
        authorId: "p8",
        file: { name: "voyzen-tokens-v3.pdf", size: "2.4 MB" },
        time: "14:15",
      },
    ],
  },
  {
    id: "c2",
    kind: "direct",
    person: PEOPLE[1],
    unread: 1,
    messages: [
      { id: "m1", from: "them", text: "Did you see the new Voyzen update?", time: "16:52" },
      { id: "m2", from: "me", text: "Not yet — what changed?", time: "16:55", read: true },
      { id: "m3", from: "them", text: "Sounds perfect! I've been wanting to try it.", time: "16:58" },
    ],
  },
  {
    id: "c3",
    kind: "direct",
    person: PEOPLE[2],
    unread: 0,
    messages: [
      { id: "m1", from: "me", text: "Dinner this weekend?", time: "Yesterday", read: true },
      { id: "m2", from: "them", text: "How about 7 PM at the new Italian place?", time: "Yesterday" },
    ],
  },
  {
    id: "g2",
    kind: "group",
    name: "Weekend Trip 🏔️",
    members: [PEOPLE[0], PEOPLE[2], PEOPLE[4]],
    unread: 0,
    messages: [
      { id: "m1", from: "them", authorId: "p1", text: "Booked the cabin! Two nights.", time: "2 days" },
      { id: "m2", from: "me", text: "Amazing. I'll bring the coffee setup ☕", time: "2 days", read: true },
    ],
  },
  {
    id: "c4",
    kind: "direct",
    person: PEOPLE[3],
    unread: 0,
    messages: [
      { id: "m1", from: "them", text: "Standup moved to 10.", time: "13 days" },
      { id: "m2", from: "me", text: "What time should we meet?", time: "13 days", read: true },
    ],
  },
  {
    id: "c5",
    kind: "direct",
    person: PEOPLE[4],
    unread: 0,
    messages: [
      { id: "m1", from: "me", text: "Running 5 min late!", time: "2 days", read: true },
      { id: "m2", from: "them", text: "No worries at all! I'll grab a table and wait.", time: "2 days" },
    ],
  },
  {
    id: "c6",
    kind: "direct",
    person: PEOPLE[5],
    unread: 0,
    messages: [{ id: "m1", from: "them", text: "She just told me today.", time: "Yesterday" }],
  },
  {
    id: "c7",
    kind: "direct",
    person: PEOPLE[6],
    unread: 0,
    messages: [{ id: "m1", from: "them", text: "Sent the files over 👍", time: "1 day" }],
  },
];

/** Title / avatar helpers so screens don't branch on `kind` everywhere. */
export const chatTitle = (c: Chat) => (c.kind === "group" ? c.name! : c.person!.name);
export const chatAvatar = (c: Chat) => (c.kind === "group" ? c.avatar : c.person!.avatar);
export const chatOnline = (c: Chat) => (c.kind === "group" ? undefined : c.person!.online);

export const POSTS: Post[] = [
  {
    id: "t1",
    tags: ["travel", "newyork", "photography"],
    author: PEOPLE[7],
    location: "New-York",
    time: "Thursday, Jun 12, 5:50 PM",
    text: "I'm so glad to share with you guys some photos from my recent trip to the New-York. This city looks amazing, the buildings, nature, people all are beautiful, i highly recommend to visit this cool place! Also i would like to know what is your favorite place here or what you would like to visit? 🥰",
    images: [photo(1071, 800, 700), photo(1076, 800, 700)],
    likes: 245,
    likers: [PEOPLE[0], PEOPLE[5], PEOPLE[2], PEOPLE[1]],
    shares: 0,
    views: 12400,
    comments: [
      {
        id: "cm1",
        author: PEOPLE[5],
        text: "Central Park at sunrise — nothing beats it.",
        time: "12m",
        createdAt: ago(0.2),
        likes: 34,
        replies: [
          {
            id: "cm1r1",
            author: PEOPLE[7],
            text: "Adding it to the list for next time 🙌",
            time: "1h",
            createdAt: ago(1),
            likes: 6,
          },
        ],
      },
      { id: "cm2", author: PEOPLE[1], text: "The skyline shot is unreal 🔥", time: "3h", createdAt: ago(3), likes: 112 },
    ],
  },
  {
    id: "t2",
    tags: ["travel", "mountains", "photography"],
    author: PEOPLE[0],
    location: "Dolomites",
    time: "Wednesday, Jun 11, 9:14 AM",
    text: "Some shots from my last few trips. The mountains never disappoint.",
    images: [photo(1018, 800, 700), photo(1015, 800, 700)],
    likes: 421,
    likers: [PEOPLE[7], PEOPLE[3], PEOPLE[6]],
    shares: 12,
    views: 30200,
    comments: [{ id: "cm1", author: PEOPLE[3], text: "Where is the second one taken?", time: "5h", createdAt: ago(5), likes: 8 }],
  },
  {
    id: "t3",
    tags: ["design", "ux"],
    author: PEOPLE[1],
    time: "Wednesday, Jun 11, 8:02 AM",
    text: "Which one do you reach for first when a screen has no data yet?",
    poll: {
      chart: "bars",
      options: [
        { id: "o1", text: "A good empty state", votes: 412 },
        { id: "o2", text: "Onboarding tooltips", votes: 98 },
        { id: "o3", text: "A demo dataset", votes: 176 },
      ],
    },
    likes: 610,
    likers: [PEOPLE[4], PEOPLE[5]],
    shares: 54,
    views: 88100,
    comments: [],
    liked: true,
    reposted: true,
  },
  {
    id: "t4",
    tags: ["design", "opinion"],
    author: PEOPLE[5],
    time: "Tuesday, Jun 10, 7:30 PM",
    text: "Light grey is the new dark mode. Fight me. 🩶",
    likes: 1503,
    likers: [PEOPLE[0], PEOPLE[1], PEOPLE[2], PEOPLE[7]],
    shares: 88,
    views: 154000,
    comments: [
      { id: "cm1", author: PEOPLE[7], text: "Genuinely agree.", time: "12h", createdAt: ago(12), likes: 51 },
      { id: "cm2", author: PEOPLE[2], text: "My eyes at 2am disagree 😅", time: "10h", createdAt: ago(10), likes: 203 },
    ],
  },
  {
    id: "t5",
    tags: ["engineering", "advice"],
    author: PEOPLE[3],
    time: "Tuesday, Jun 10, 11:11 AM",
    text: "Reminder that the best feature you can ship is a fast one.",
    likes: 288,
    likers: [PEOPLE[6]],
    shares: 40,
    views: 21700,
    comments: [],
  },
];


// A couple of demo reposts so other people's profiles have a populated Reposts tab.
const findPost = (id: string) => POSTS.find((p) => p.id === id)!;
POSTS.push(
  {
    id: "t6",
    author: PEOPLE[7],
    time: "Monday, Jun 9, 6:20 PM",
    text: "This. Every single word. 👇",
    likes: 63,
    likers: [PEOPLE[0], PEOPLE[5]],
    comments: [],
    shares: 4,
    views: 5200,
    repostOf: findPost("t4"),
  },
  {
    id: "t7",
    author: PEOPLE[0],
    time: "Monday, Jun 9, 8:45 AM",
    text: "Reposting for the folks in the back ⛰️",
    likes: 120,
    likers: [PEOPLE[3], PEOPLE[2]],
    comments: [],
    shares: 9,
    views: 8800,
    repostOf: findPost("t5"),
  },
);
