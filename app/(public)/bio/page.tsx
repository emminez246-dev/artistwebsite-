import Navigation from "@/components/Navigation";
import SocialLinks from "@/components/SocialLinks";
import { Music, Award, Mail, Calendar, Globe } from "lucide-react";

const achievements = [
  { year: "2026", title: "Featured in 1hundred", icon: Award },
  { year: "2026", title: "Young Blood Award", icon: Award },
  { year: "2026", title: "Serena Hotel Performance", icon: Calendar },
];

const credits = [
  { category: "Music Production", items: ["All tracks written, produced, and mixed by Skarlee", "Mastering by Professional producers", "Album artwork by Skarlee"] },
  { category: "Visual Content", items: ["Video direction: Etto", "Photography: Skarlee", "Set design: Skarlee"] },
];

export default function BioPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-b from-accent/5 to-background pt-16 pb-12 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent to-accent-dim p-1">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                <Music className="w-12 h-12 text-accent" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-accent mb-2 neon-text">Skarlee</h1>
            <p className="text-lg text-text-dim mb-4">Independent Artist & Visual Creator</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 text-sm font-medium">Musician</span>
              <span className="px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 text-sm font-medium">Producer</span>
              <span className="px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 text-sm font-medium">Visual Artist</span>
            </div>
            {/* Social icons — reusable component */}
            <div className="flex items-center justify-center mt-6">
              <SocialLinks />
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-12">
          {/* Bio */}
          <section>
            <h2 className="text-2xl font-bold text-text mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-accent" />
              </span>
              Biography
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-text-muted leading-relaxed">
                Skarlee is an independent musician and visual artist based in Uganda. 
                With a unique blend of genres and a distinctive visual aesthetic, 
                the artist has been creating and sharing work since 2020. 
                Drawing inspiration from personal experiences and cultural roots, 
                Skarlee crafts soundscapes that resonate with authenticity and raw emotion.
              </p>
              <p className="text-text-muted leading-relaxed mt-4">
                Beyond music, Skarlee is deeply involved in the visual aspect of every project 
                — from album artwork to video direction — ensuring a cohesive artistic vision 
                that spans across multiple creative disciplines.
              </p>
            </div>
          </section>

          {/* Achievements */}
          <section>
            <h2 className="text-2xl font-bold text-text mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-accent" />
              </span>
              Achievements
            </h2>
            <div className="space-y-3">
              {achievements.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-text">{item.title}</p>
                    <p className="text-sm text-text-dim">{item.year}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Credits */}
          <section>
            <h2 className="text-2xl font-bold text-text mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Music className="w-4 h-4 text-accent" />
              </span>
              Credits
            </h2>
            <div className="space-y-6">
              {credits.map((section, i) => (
                <div key={i}>
                  <h3 className="text-lg font-semibold text-text mb-2">{section.category}</h3>
                  <ul className="space-y-2">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-text mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-accent" />
              </span>
              Contact
            </h2>
            <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
              <p className="text-text-muted">
                For bookings, press inquiries, and collaborations:
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="mailto:emminez246@gmail.com" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface text-text hover:bg-card-hover transition-colors text-sm">
                  <Mail className="w-4 h-4 text-accent" /> emminez246@gmail.com
                </a>
              </div>
              {/* Reuse SocialLinks component */}
              <div className="pt-2">
                <SocialLinks />
              </div>
            </div>
          </section>

          <p className="text-center text-xs text-text-dim pt-8">Last updated: 2026</p>
        </div>
      </main>
    </div>
  );
}