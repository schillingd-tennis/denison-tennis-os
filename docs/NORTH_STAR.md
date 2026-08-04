# Denison Tennis OS — North Star

This document is not technical documentation. It is the guiding philosophy
for Denison Tennis OS. It does not change with every sprint. Future
development — features, refactors, and architectural decisions — should be
weighed against these principles. If a proposed change conflicts with this
document, the document wins unless it is deliberately and explicitly revised.

## Mission

Denison Tennis OS exists to become **the operating system for a collegiate
tennis program.**

The goal is not to build a website.

The goal is not to build a collection of pages.

The goal is to build software that helps coaches make better decisions,
save time, and centralize every aspect of running a championship tennis
program.

## Core Philosophy

Everything revolves around **objects.**

Examples:

- People
- Practices
- Matches
- Trips
- Documents
- Research
- Equipment
- Facilities
- Events
- Tasks

Each object exists once. Every screen is simply another view of the same
underlying object — a directory row, a card, a workspace header, and a
search result are all different windows onto the same record, never copies
of it.

## People

People are the foundation of the OS.

Examples:

- Players
- Recruits
- Parents
- Guardians
- Coaches
- Staff
- Faculty
- Donors
- Alumni

A person should only exist once. Roles may change over time — a recruit
becomes a player, a player becomes an alumnus, a parent may also be a
donor — but the underlying person record persists. Relationships connect
people together rather than duplicating their information.

## One Source of Truth

Every piece of information has exactly one owner. No duplicated data.
Every module references shared records rather than storing its own copy of
someone else's data.

## Modules

Current roadmap:

- Home
- Team
- Recruiting
- Operations
- Research Lab
- Knowledge
- Settings

Additional modules may be added later.

## Framework Before Modules

Reusable framework components are built before module-specific UI.

Examples:

- Application Shell
- Page Header
- Workspace
- Search
- Filter Bar
- DataTable
- Cards
- Status Badges
- Buttons
- Notes
- Timeline

Every module should inherit these components rather than reinventing them.

## Workspaces

Every major object should have a Workspace.

Examples:

- Player Workspace
- Recruit Workspace
- Match Workspace
- Trip Workspace
- Practice Workspace
- Document Workspace

The Workspace is the operational home for an object. Directories are
lightweight browsing tools. Workspaces contain operational detail.

## Directories

Directories exist for finding objects quickly. They should support:

- Search
- Sorting
- Filtering
- Saved Views
- Cards
- List

Future:

- Bulk Actions
- Column Chooser
- Export

## Data

The application should never depend directly on a database. Modules
communicate with repositories. Repositories communicate with data sources.

Current data sources may include:

- Demo Data
- Airtable
- Coda

Future:

- Supabase
- PostgreSQL

The UI should not care where data originates.

## Design

Design goals:

- Clean
- Calm
- Fast
- Professional
- Minimal
- Readable
- Consistent

Inspired by:

- Apple
- Linear
- Raycast
- Arc Browser

Avoid visual clutter. Avoid unnecessary animation. Whitespace is a feature.

## Coaching Philosophy

The software should reduce administrative work. Every screen should answer
coaching questions quickly. The OS should optimize for:

- Decision making
- Speed of capture
- Organization
- Communication
- Development

Not data entry.

## Mobile

Desktop and mobile are equally important. No feature should be
desktop-only unless absolutely necessary.

## AI

AI should assist the coach. AI should never hide information. AI should
explain. AI should summarize. AI should recommend. The coach always
remains in control.

## Long-Term Vision

Denison Tennis OS should become a complete operating system capable of
supporting every aspect of running a collegiate tennis program. The
architecture should support growth for the next decade.

## Development Principles

- Prefer reusable components.
- Prefer composition over duplication.
- Prefer clarity over cleverness.
- Build framework first. Modules second.
- Data before presentation.
- Never duplicate information.
- Keep the codebase understandable.
- When uncertain, choose the solution that will still make sense five
  years from now.
