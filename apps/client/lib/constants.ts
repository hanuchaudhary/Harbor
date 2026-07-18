import {
  ROLE,
  PROJECT_STATUS,
  TASK_STATUS,
  PRIORITY,
} from "@/types/types";
import { TaskStatus as TaskStatusEnum } from "@/generated/prisma/enums";

export const AVATARS: { name: string; url: string }[] = [
  {
    name: "Foxy",
    url: "https://i.pinimg.com/1200x/8d/fa/ce/8dface608d4fa503439246e4399818dc.jpg",
  },
  {
    name: "Froggy",
    url: "https://i.pinimg.com/736x/e2/9f/e7/e29fe7edd0e086e0e36e894bfe390e05.jpg",
  },
  {
    name: "Penguin",
    url: "https://i.pinimg.com/736x/09/0b/bc/090bbcffd9c72bc9dbcc34506b7cdcc4.jpg",
  },
  {
    name: "Puppy",
    url: "https://i.pinimg.com/474x/64/d8/43/64d8437e21236d3750e5b7e877b8b54a.jpg",
  },
  {
    name: "Kitty",
    url: "https://i.pinimg.com/736x/53/58/37/535837a68e8a8d1bc85c5e3eb7f94b8e.jpg",
  },
  {
    name: "Alien",
    url: "https://i.pinimg.com/736x/9e/a1/46/9ea146e468ba6f7d07fcf9be57e53458.jpg",
  },
  {
    name: "Crocodile",
    url: "https://i.pinimg.com/736x/ae/b6/77/aeb6771c02eb6e5398cac13395dd1894.jpg",
  },
  {
    name: "Monkey",
    url: "https://i.pinimg.com/736x/3d/18/e8/3d18e839d820aa030a3093a2cbfbf1bc.jpg",
  },
  {
    name: "Goldy",
    url: "https://i.pinimg.com/1200x/e2/cc/a1/e2cca1c0ff942763d6d9514e1e26f175.jpg",
  },
  {
    name: "Dragon",
    url: "https://i.pinimg.com/736x/fa/11/d0/fa11d05275ba52485c2f964eef620f52.jpg",
  },
  {
    name: "Bully",
    url: "https://i.pinimg.com/736x/63/fa/8e/63fa8e15492f006ae407f2eb82f56b81.jpg",
  },
  {
    name: "Piggy",
    url: "https://i.pinimg.com/736x/1b/d7/99/1bd799fd700b43ab245e223948fdc90c.jpg",
  },
];

export type BadgeVariant =
  | "default"
  | "purple"
  | "red"
  | "blue"
  | "emerald"
  | "indigo"
  | "yellow"
  | "orange"
  | "stone"
  | "neutral"
  | "cyan"
  | "fuchsia";

export const roleVariant: Record<ROLE, BadgeVariant> = {
  PARTNER: "purple",
  ADMIN: "red",
  PROJECT_MANAGER: "blue",
  DEVELOPER: "emerald",
  CLIENT: "indigo",
  ACCOUNTANT: "emerald",
};

export const TASK_STATUS_LABEL: Record<TASK_STATUS, string> = {
  DISCUSSION: "In Discussion",
  IN_PLANNING: "Planning",
  TODO: "To Do",
  DESIGN: "In Design",
  DEVELOPMENT: "In Development",
  REVIEW: "In Review",
  CLIENT_REVIEW: "Awaiting Your Review",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
};

export const TASK_STATUS_VARIANT: Record<TASK_STATUS, BadgeVariant> = {
  DISCUSSION: "neutral",
  IN_PLANNING: "blue",
  TODO: "default",
  DESIGN: "indigo",
  DEVELOPMENT: "cyan",
  REVIEW: "yellow",
  CLIENT_REVIEW: "orange",
  ON_HOLD: "stone",
  COMPLETED: "emerald",
};

export const PRIORITY_LABEL: Record<PRIORITY, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const PRIORITY_VARIANT: Record<PRIORITY, BadgeVariant> = {
  LOW: "neutral",
  MEDIUM: "blue",
  HIGH: "yellow",
  CRITICAL: "red",
};

export const PROJECT_STATUS_VARIANT: Record<
  PROJECT_STATUS,
  "emerald" | "blue" | "yellow" | "red"
> = {
  ACTIVE: "emerald",
  ON_HOLD: "blue",
  COMPLETED: "yellow",
  ARCHIVED: "blue",
};

export const PROJECT_STATUS_LABEL: Record<PROJECT_STATUS, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/admin": "Admin Dashboard",
  "/analytics": "Analytics",
  "/admin/users": "Users Management",
  "/admin/invites": "Invites Management",
  "/projects": "Projects",
  "/projects/new": "Create Project",
  "/tracker": "Task Tracker",
  "/office": "Office",
  "/profile": "Profile",
  "/register": "Register",
  "/onboarding": "Onboarding",
  "/signin": "Sign In",
  "/forgot": "Forgot Password",
  "/reset": "Reset Password",
  "/accept-invite": "Accept Invite",
  "/channels": "Channels",
  "/notifications": "Notifications",
};

export const getRouteLabel = (pathname: string): string => {
  if (ROUTE_LABELS[pathname]) {
    return ROUTE_LABELS[pathname];
  }

  if (pathname.startsWith("/projects/") && pathname.includes("/edit")) {
    return "Edit Project";
  }

  if (pathname.startsWith("/projects/")) {
    return "Project Details";
  }

  if (pathname.startsWith("/admin/users/")) {
    return "User Details";
  }

  if (pathname.startsWith("/tracker/") && pathname.includes("/edit")) {
    return "Edit Task";
  }

  if (pathname.startsWith("/tracker/new")) {
    return "Create Task";
  }

  if (pathname.startsWith("/tracker/")) {
    return "Task Details";
  }

  if (pathname.startsWith("/channels/")) {
    return "Channel";
  }

  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length >= 3 &&
    segments[1] === "projects" &&
    segments[3] === "report"
  ) {
    return "Project Report";
  }

  if (segments.length >= 2 && segments[1] === "projects") {
    return "Project Details";
  }

  const knownPrefixes = [
    "dashboard",
    "admin",
    "analytics",
    "projects",
    "tracker",
    "office",
    "profile",
    "register",
    "signin",
    "forgot",
    "reset",
    "accept-invite",
    "channels",
    "notifications",
  ];

  if (segments.length === 1 && !knownPrefixes.includes(segments[0])) {
    return "Dashboard";
  }

  if (segments.length > 0) {
    return segments[segments.length - 1]
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return "Dashboard";
};

export const STATUS_HIERARCHY: Record<TaskStatusEnum, number> = {
  [TaskStatusEnum.DISCUSSION]: 0,
  [TaskStatusEnum.IN_PLANNING]: 1,
  [TaskStatusEnum.TODO]: 2,
  [TaskStatusEnum.DESIGN]: 3,
  [TaskStatusEnum.DEVELOPMENT]: 4,
  [TaskStatusEnum.REVIEW]: 5,
  [TaskStatusEnum.CLIENT_REVIEW]: 6,
  [TaskStatusEnum.ON_HOLD]: 2,
  [TaskStatusEnum.COMPLETED]: 7,
};

export const getStatusLevel = (status: TaskStatusEnum): number => {
  return STATUS_HIERARCHY[status] ?? 0;
};

export const WELCOME_MESSAGES = {
  ADMIN: [
    "The boss is back! Time to make some executive decisions (or just check who's actually working).",
    "Welcome back, Supreme Commander! Your digital kingdom awaits... no pressure!",
    "Look who decided to grace us with their presence! Ready to admin like there's no tomorrow?",
    "The legend returns! Don't worry, nothing burned down while you were gone... mostly.",
    "Ah, the puppet master returns! Time to pull some strings and make magic happen!",
    "Welcome back, Captain! The ship is still afloat, shockingly. Ready to take the helm?",
    "The all-seeing eye has logged in! Big Brother is watching... lovingly, of course.",
  ],
  PROJECT_MANAGER: [
    "The orchestrator is back! Time to turn chaos into... slightly organized chaos!",
    "Welcome back, Master of Meetings! Your calendar is absolutely thrilled to see you.",
    "The project whisperer returns! Ready to herd some cats today?",
    "Look who's here to save the day! Cape optional, coffee mandatory.",
    "Welcome back, Timeline Guardian! Let's see who missed their deadlines this time...",
    "The PM has entered the chat! Prepare for status updates and gentle deadline reminders!",
    "Ah, the great communicator returns! Time to bridge some gaps and crack some whips!",
  ],
  DEVELOPER: [
    "The code wizard is back! May your bugs be few and your coffee be strong.",
    "Welcome back, keyboard warrior! Time to turn caffeine into code!",
    "The problem solver returns! Ready to break things... I mean, fix things?",
    "Look who's back to argue about tabs vs spaces! (We all know which is right...)",
    "Welcome back, digital architect! Let's build something awesome (that hopefully won't need refactoring tomorrow).",
    "The code ninja has logged in! Time to debug like a boss and merge like a champion!",
    "Another day, another commit! Welcome back to the eternal quest for clean code.",
  ],
  CLIENT: [
    "Welcome back, visionary! Your project is looking better than ever, we promise!",
    "The boss is back! Ready to see some amazing progress? (Spoiler: you will be impressed!)",
    "Look who's here! Your team has been working hard to blow your mind. Prepare to be wowed!",
    "Welcome back! Everything is on track, on budget, and looking fantastic! (Okay, 2 out of 3 isn't bad!)",
    "The client has arrived! Time to see your dreams becoming reality, one pixel at a time.",
    "Hey there, partner! Your project is getting some serious love. Ready for a tour?",
    "Welcome back! Your feedback is the secret sauce that makes this all work. Let's cook!",
  ],
};

export const FIRST_TIME_MESSAGES = {
  ADMIN:
    "Your all-in-one command center for managing teams, projects, and keeping the digital ship sailing smoothly. Let's make some magic happen!",
  PROJECT_MANAGER:
    "Your ultimate toolkit for orchestrating projects, managing timelines, and keeping everyone on the same page. Time to coordinate like a pro!",
  DEVELOPER:
    "Your workspace for building, collaborating, and shipping amazing code. Let's turn those ideas into reality, one commit at a time!",
  CLIENT:
    "Your window into project progress, team collaboration, and bringing your vision to life. Welcome to your project's home base!",
  DEFAULT:
    "Your all-in-one CRM platform for seamless project management, team collaboration, and client communication. Sign in to get started!",
};

export function getRandomWelcomeMessage(role: string): string {
  const messages = WELCOME_MESSAGES[role as keyof typeof WELCOME_MESSAGES];
  if (!messages || messages.length === 0) {
    return "Welcome back! Ready to make today awesome?";
  }
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getFirstTimeMessage(role?: string): string {
  if (!role) return FIRST_TIME_MESSAGES.DEFAULT;
  return (
    FIRST_TIME_MESSAGES[role as keyof typeof FIRST_TIME_MESSAGES] ||
    FIRST_TIME_MESSAGES.DEFAULT
  );
}
