import { motion } from "motion/react";
import { Heart, FolderGit2, Briefcase, Mail, DownloadCloud, ExternalLink } from "lucide-react";
import iconT from "../../media/icon-t.png";

// Bump alongside package.json's "version" (scripts/bump-version.mjs doesn't touch this yet).
const APP_VERSION = "1.0.2";

const links = [
   { label: "GitHub", href: "https://github.com/msilva99/Hiyori", icon: FolderGit2, description: "Source code, issues, and releases." },
   { label: "LinkedIn", href: "https://linkedin.com/in/mariamfsilva", icon: Briefcase, description: "Maria Silva" },
   { label: "Email", href: "mailto:mariamfsilva.dev@gmail.com", icon: Mail, description: "mariamfsilva.dev@gmail.com" },
];

export function About() {
   return (
      <div className="space-y-8 font-sans max-w-3xl mx-auto w-full pb-20">
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
               <img src={iconT} alt="" className="w-full h-full object-cover p-2" />
            </div>
            <div>
               <h1 className="text-4xl font-extrabold text-ink tracking-tight">About Hiyori</h1>
               <p className="text-ink-muted mt-1">Version {APP_VERSION}</p>
            </div>
         </motion.div>

         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-surface border border-border-hiyori rounded-3xl shadow-sm p-6"
         >
            <h2 className="text-lg font-bold text-ink mb-3">What is Hiyori?</h2>
            <p className="text-ink-muted leading-relaxed">
               Hiyori is a self-hosted Japanese study app: spaced-repetition flashcards that grade reading and
               meaning separately, a Test mode for no-stakes retention checks, Routines that chain Study and Test
               into a repeatable session, a daily journal that highlights vocabulary you already know, and kana
               typing drills — all built as a Tauri desktop app with React and TypeScript.
            </p>
         </motion.div>

         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface border border-border-hiyori rounded-3xl shadow-sm p-6"
         >
            <h2 className="text-lg font-bold text-ink mb-3 flex items-center gap-2">
               <Heart className="w-5 h-5 text-brand fill-brand/20" /> Free, with no subscriptions
            </h2>
            <p className="text-ink-muted leading-relaxed">
               Hiyori is free and stays free — no account, no subscription, no usage limits. Your decks, journal
               entries, and study progress are stored locally on your own device and never sent to a server I
               run, so there's nothing to pay for and nothing you depend on staying online. It started as a tool
               I built for my own JLPT studying, and I'd rather share it as-is than put it behind a paywall.
            </p>
         </motion.div>

         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-surface border border-border-hiyori rounded-3xl shadow-sm p-6"
         >
            <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
               <DownloadCloud className="w-5 h-5 text-brand" /> Get the desktop app
            </h2>
            <p className="text-ink-muted leading-relaxed mb-4">
               The desktop app includes everything here plus features that can't run in a browser, like the AI
               tutor and background auto-updates.
            </p>
            <a
               href="https://github.com/msilva99/Hiyori/releases"
               target="_blank"
               rel="noreferrer"
               className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-colors shadow-sm shadow-brand/20"
            >
               Download from GitHub Releases <ExternalLink className="w-4 h-4" />
            </a>
         </motion.div>

         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface border border-border-hiyori rounded-3xl shadow-sm p-6"
         >
            <h2 className="text-lg font-bold text-ink mb-4">Links</h2>
            <div className="space-y-3">
               {links.map((link) => (
                  <a
                     key={link.label}
                     href={link.href}
                     target="_blank"
                     rel="noreferrer"
                     className="flex items-center gap-4 p-3 -mx-3 rounded-xl hover:bg-page transition-colors group"
                  >
                     <div className="w-10 h-10 bg-page rounded-xl flex items-center justify-center text-ink-muted group-hover:text-brand transition-colors shrink-0">
                        <link.icon className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-ink font-medium">{link.label}</p>
                        <p className="text-ink-muted text-sm">{link.description}</p>
                     </div>
                  </a>
               ))}
            </div>
         </motion.div>
      </div>
   );
}
