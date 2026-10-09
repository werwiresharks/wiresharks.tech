export type ProductId = "wireshark" | "sidekick" | "munki" | "everyway";
type Source = { label: string; href: string };
export type Product = {
  id: ProductId;
  name: string;
  category: string;
  tagline: string;
  summary: string;
  purpose: string;
  status: string;
  system: string;
  story: { visualLabel: string };
  facts: { title: string; text: string; source?: string }[];
  links: Source[];
  researchBrief?: { title: string; summary: string; href: string; pages: number };
  image?: { src: string; alt: string; caption: string };
};
const portfolio = "https://tarushv.com/resume.html";
export const products: Product[] = [
  {
    id: "wireshark",
    story: {
      visualLabel: "01 / A physical connection",
    },
    name: "Wireshark",
    category: "Flagship fiber-optic drone",
    tagline: "A different kind of connection.",
    summary:
      "Our flagship drone, connecting command and flight through fiber optics.",
    purpose:
      "Wireshark is our flagship hardware project, co-developed to explore a fiber-optic command and data connection in environments where conventional radio links face challenges. Physical engineering and software come together in one tightly coupled system.",
    status: "Research & development",
    system: "Hardware / C++ / Fiber optics",
    researchBrief: {
      title: "Fiber-Optic Communication for Small Drones",
      summary:
        "Read our proposed command-and-telemetry system, research questions, and development plan, including how we will investigate fiber recovery and reuse.",
      href: "/research/fiber-optic-drone-communication.pdf",
      pages: 2,
    },
    facts: [
      {
        title: "Connected by fiber",
        text: "A fiber-optic link carries command and data between the drone and its operator.",
        source: portfolio + "#fiber-optic-drone",
      },
      {
        title: "Built across disciplines",
        text: "C++ software development alongside fiber deployment, retraction, and reliability testing.",
        source: portfolio + "#fiber-optic-drone",
      },
      {
        title: "Challenging environments",
        text: "Intended for enclosed spaces, underground sites, and environments with heavy electromagnetic interference.",
        source: portfolio + "#fiber-optic-drone",
      },
    ],
    links: [
      { label: "Project background", href: portfolio + "#fiber-optic-drone" },
    ],
  },
  {
    id: "sidekick",
    story: {
      visualLabel: "02 / Intelligence, close to home",
    },
    name: "Sidekick",
    category: "Local intelligence",
    tagline: "Your Mac. Your context.",
    summary: "A native macOS voice assistant with a local-first AI pipeline.",
    purpose:
      "Sidekick brings voice interaction and local models into a native SwiftUI experience for Apple Silicon Macs. Its documented default pipeline uses local transcription and answers. An optional cloud transcription mode is available in the source; no public app release is currently listed.",
    status: "Development project",
    system: "SwiftUI / Local AI",
    facts: [
      {
        title: "A natural conversation",
        text: "A configurable wake phrase, local Parakeet transcription, and spoken responses support voice interaction.",
        source:
          "https://github.com/get-sidekick/sidekick/blob/main/SwiftApp/README.md",
      },
      {
        title: "Native and local",
        text: "SwiftUI on macOS 14+ and Apple Silicon, with local Phi-4 Mini answers through Ollama. Optional Wispr Flow transcription sends speech to a cloud service.",
        source:
          "https://github.com/get-sidekick/sidekick/blob/main/SwiftApp/README.md",
      },
      {
        title: "Context stays close",
        text: "Transcript retrieval and session state stay in memory, keeping conversational context on your Mac.",
        source:
          "https://github.com/get-sidekick/sidekick/blob/main/SwiftApp/README.md",
      },
    ],
    links: [
      {
        label: "Source code",
        href: "https://github.com/get-sidekick/sidekick",
      },
      { label: "Project background", href: portfolio + "#sidekick" },
    ],
  },
  {
    id: "munki",
    story: {
      visualLabel: "03 / Make room for curiosity",
    },
    name: "Munki",
    category: "AI & learning",
    tagline: "Curiosity, with company.",
    summary:
      "An AI learning app that turns review into an active conversation.",
    purpose:
      "Munki brings flashcards, guided lessons, and an interactive study canvas into one learning experience. Practice recalling an idea, work it through, then explain it back to Munki. The app is an unpublished development project.",
    status: "In development · unpublished",
    system: "Lessons / Spaced review",
    image: {
      src: "/assets/munki/munki-feed-desktop.png",
      alt: "Munki development app showing a physics flashcard, spaced review controls, and study navigation",
      caption: "Munki · actual development preview",
    },
    facts: [
      {
        title: "Recall, then revisit",
        text: "A flashcard feed with flip-to-reveal cards, deck filtering, grading, and spaced review intervals.",
      },
      {
        title: "Space to work it through",
        text: "Guided lessons combine concept bites, decision drills, worked problems, and a drawing board.",
      },
      {
        title: "Teach to understand",
        text: "Teach Munki evaluates a learner’s explanation and responds with a follow-up question. Practice explaining an idea in your own words.",
      },
    ],
    links: [],
  },
  {
    id: "everyway",
    story: {
      visualLabel: "04 / A way around the unexpected",
    },
    name: "EveryWay",
    category: "Accessible navigation",
    tagline: "A changing world. A clearer way.",
    summary:
      "Connecting physical spaces and live digital maps to make navigation more accessible.",
    purpose:
      "A route is only useful if it reflects the world around it. EveryWay connects sensor-observed changes to a shared digital twin, so an obstruction can become a new accessible route.",
    status: "HackGT 13 demonstration",
    system: "ESP32-C3 / Digital twin",
    image: {
      src: "/assets/everyway/digital-twin.jpeg",
      alt: "EveryWay digital twin showing an obstacle and the route through a miniature venue",
      caption: "EveryWay digital twin · project demonstration",
    },
    facts: [
      {
        title: "Sense the change",
        text: "An ESP32-C3 and time-of-flight sensor detect obstructions in a miniature physical environment.",
        source: "https://devpost.com/software/everyway",
      },
      {
        title: "Share the world state",
        text: "Sensor updates flow into shared world state, a 3D digital twin, and an operator dashboard.",
        source: "https://devpost.com/software/everyway",
      },
      {
        title: "Find another way",
        text: "Accessible rerouting synchronizes with mobile navigation as the demonstration environment changes.",
        source: "https://devpost.com/software/everyway",
      },
    ],
    links: [
      {
        label: "Watch the demo",
        href: "https://www.youtube.com/watch?v=v-77jqpUDio",
      },
      {
        label: "Explore the project",
        href: "https://devpost.com/software/everyway",
      },
      { label: "Source code", href: "https://github.com/useEveryWay" },
    ],
  },
];
