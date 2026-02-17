# Project: Timesheeter

## Overview

Team-based timesheet management application with rule sharing capabilities. Allows teams to create and share timesheet rules, manage team memberships, and track user activity.

## Tech Stack

- **Language:** TypeScript
- **Framework:** Next.js 15.4.5 (App Router)
- **Database:** PostgreSQL (Yandex Cloud)
- **ORM:** Prisma 6.13.0
- **State Management:** Redux Toolkit
- **UI Library:** Ant Design 5
- **Testing:** Jest
- **Documentation:** Storybook

## Core Features

- User authentication and team management
- Timesheet rules creation and sharing
- Team-based rule access control
- User activity tracking (login history, created rules/teams)

## Architecture Notes

- App Router pattern with src/app directory
- Feature-based directory structure (src/features/)
- Entity-based data models (src/entities/)
- Component library with Storybook docs
- Prisma migrations for database schema

## Non-Functional Requirements

- Environment-based configuration (.env)
- Type-safe database queries via Prisma
- Component isolation with Storybook
- ESLint + Prettier for code quality

## Database Schema

- User: Authentication and profile data
- UserExtras: Extended user information (department, division, photo)
- Team: Team entity with members
- Rule: Timesheet rules with conditions (JSON)

## Integrations

- OpenReplay: User session tracking
- EWS (Exchange Web Services): Calendar integration
