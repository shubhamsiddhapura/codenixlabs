import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, Eye, HeartHandshake, Layers, ShieldCheck, Star } from 'lucide-react';

/**
 * The section a first-time visitor needs and the page did not have.
 *
 * The homepage showed services, work and testimonials — all true, all things
 * every agency site shows. What it never said is *why pick these people*. These
 * four are the answers we can actually evidence, which is the only kind worth
 * printing: a shipped free tool, named clients on the record, real delivery
 * dates, and one team for design through to deployment.
 */
const REASONS = [
  {
    icon: <Layers size={22} />,
    title: 'One team, design through deployment',
    body: 'Branding, UI/UX, web, mobile and AI integration under one roof — so nothing gets lost in the handover between a design agency and a dev shop.',
  },
  {
    icon: <Eye size={22} />,
    title: 'We build for AI discovery, not just Google',
    body: 'We shipped a free scanner that tests whether ChatGPT and Claude can actually read a site. Every project we build ships with that groundwork already done.',
  },
  {
    icon: <Clock size={22} />,
    title: 'Delivered on time, often early',
    body: 'Our clients say it unprompted. Agile milestones, weekly demos, and a date we commit to rather than a range we hide behind.',
  },
  {
    icon: <HeartHandshake size={22} />,
    title: 'We stay after launch',
    body: 'Maintenance, security patches and feature work under a support plan sized to you — not a project that ends the day the invoice clears.',
  },
];

const PROOF = [
  { value: '2', label: 'Countries served', detail: 'India & USA' },
  { value: '5.0', label: 'Client rating', detail: 'On the record' },
  { value: '4', label: 'Disciplines', detail: 'Under one roof' },
  { value: '7', label: 'AI readiness checks', detail: 'In our free tool' },
];

export const WhyCodenix: React.FC = () => (
  <section className="relative py-20 overflow-hidden bg-neutral-900">
    <div className="absolute inset-0 opacity-20 bg-glow" aria-hidden="true" />

    <div className="container relative z-10 px-4 mx-auto sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto mb-16 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-white font-orbitron md:text-5xl"
        >
          Why teams choose <span className="text-primary">Codenix Labs</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-5 text-xl text-neutral-300"
        >
          Not the longest list of services — the shortest path from idea to something that works.
        </motion.p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {REASONS.map((reason, index) => (
          <motion.div
            key={reason.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: index * 0.08 }}
            className="p-8 glass rounded-2xl hover-effect"
          >
            <div className="flex items-center justify-center mb-5 rounded-xl h-14 w-14 bg-primary/15 text-primary">
              {reason.icon}
            </div>
            <h3 className="text-xl font-bold text-white font-orbitron">{reason.title}</h3>
            <p className="mt-3 leading-relaxed text-neutral-400">{reason.body}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-12 lg:grid-cols-4">
        {PROOF.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.07 }}
            className="p-6 text-center glass rounded-2xl"
          >
            <p className="text-4xl font-bold text-primary font-orbitron">{item.value}</p>
            <p className="mt-2 text-sm font-semibold text-white">{item.label}</p>
            <p className="mt-1 text-xs text-neutral-500">{item.detail}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="flex flex-col items-center gap-5 p-8 mt-12 border sm:flex-row rounded-2xl border-accent/25 bg-accent/5"
      >
        <ShieldCheck size={40} className="flex-shrink-0 text-accent" aria-hidden="true" />
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-lg font-bold text-white font-orbitron">We show our working</h3>
          <p className="mt-2 leading-relaxed text-neutral-300">
            Our free AI Readiness Checker publishes its scoring weights, its version number, and what it could not verify —
            because a score you cannot audit is a score you should not trust. We build client work the same way.
          </p>
        </div>
        <Link
          to="/ai-readiness"
          className="inline-flex items-center flex-shrink-0 gap-2 px-6 py-3 font-semibold text-white transition-all duration-300 rounded-full whitespace-nowrap bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
        >
          <Star size={16} aria-hidden="true" />
          Try it free
        </Link>
      </motion.div>
    </div>
  </section>
);

export default WhyCodenix;
