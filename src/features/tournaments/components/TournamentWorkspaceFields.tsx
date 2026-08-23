"use client";

import { CalendarDays, Flag, MapPin, NotebookPen, Plane } from "lucide-react";

import {
  WorkspaceAccentHeading,
  WorkspaceFieldGrid,
} from "@/components/adaptive-workspace";

import { TournamentField } from "./TournamentFieldSession";

const GRID_3 = "tournament-field-grid-3 mt-[5px]";
const GRID_2 = "tournament-field-grid-2 mt-[5px]";

export function TournamentOverviewWorkspace() {
  return (
    <div className="min-w-0 space-y-[10px]">
      <section aria-label="Tournament">
        <WorkspaceAccentHeading icon={Flag}>Tournament</WorkspaceAccentHeading>
        <WorkspaceFieldGrid columns={3} className={GRID_3}>
          <TournamentField field="name" label="Tournament name" span />
          <TournamentField field="level" label="Level" />
          <TournamentField field="entryType" label="Open / Closed" />
          <TournamentField field="lifecycleStatus" label="Tournament status" />
          <TournamentField field="surface" label="Surface" />
          <TournamentField field="attended" label="Attended" />
        </WorkspaceFieldGrid>
      </section>
      <div className="border-t border-border/50 pt-[10px]">
        <section aria-label="Dates and location">
          <WorkspaceAccentHeading icon={CalendarDays} tone="info">
            Dates & Location
          </WorkspaceAccentHeading>
          <WorkspaceFieldGrid columns={2} className={GRID_2}>
            <TournamentField field="startDate" label="Start date" />
            <TournamentField field="endDate" label="End date" />
            <TournamentField field="city" label="City" />
            <TournamentField field="state" label="State" />
          </WorkspaceFieldGrid>
        </section>
      </div>
    </div>
  );
}

export function TournamentTravelWorkspace() {
  return (
    <div className="min-w-0 space-y-[10px]">
      <section aria-label="Travel">
        <WorkspaceAccentHeading icon={Plane} tone="research">
          Travel
        </WorkspaceAccentHeading>
        <WorkspaceFieldGrid columns={3} className={GRID_3}>
          <TournamentField field="distanceMiles" label="Distance from Columbus" />
          <TournamentField field="estimatedDriveTime" label="Estimated drive time" />
          <TournamentField field="travelMethod" label="Travel method" />
          <TournamentField field="departureDate" label="Departure" />
          <TournamentField field="returnDate" label="Return" />
          <TournamentField field="distanceExtra" label="Drive notes" span />
        </WorkspaceFieldGrid>
      </section>
      <div className="border-t border-border/50 pt-[10px]">
        <section aria-label="Hotel">
          <WorkspaceAccentHeading icon={MapPin} tone="success">
            Hotel
          </WorkspaceAccentHeading>
          <WorkspaceFieldGrid columns={3} className={GRID_3}>
            <TournamentField field="hotelName" label="Hotel" />
            <TournamentField field="hotelConfirmation" label="Confirmation / reservation" />
            <TournamentField field="hotelCheckIn" label="Check-in" />
            <TournamentField field="hotelAddress" label="Hotel address" span />
            <TournamentField field="hotelCheckOut" label="Check-out" />
          </WorkspaceFieldGrid>
        </section>
      </div>
      <div className="border-t border-border/50 pt-[10px]">
        <section aria-label="Air and car">
          <WorkspaceAccentHeading icon={Plane} tone="info">
            Air / Car
          </WorkspaceAccentHeading>
          <WorkspaceFieldGrid columns={3} className={GRID_3}>
            <TournamentField field="airport" label="Airport" />
            <TournamentField field="rentalCar" label="Rental car" />
            <TournamentField field="flightInfo" label="Flight info" span />
          </WorkspaceFieldGrid>
        </section>
      </div>
    </div>
  );
}

export function TournamentLinksNotesWorkspace() {
  return (
    <div className="min-w-0 space-y-[10px]">
      <section aria-label="Links">
        <WorkspaceAccentHeading icon={NotebookPen} tone="knowledge">
          Links
        </WorkspaceAccentHeading>
        <WorkspaceFieldGrid columns={2} className={GRID_2}>
          <TournamentField field="websiteUrl" label="Tournament website" />
          <TournamentField field="ustaUrl" label="USTA / tournament page" />
          <TournamentField field="drawsUrl" label="Draws" />
          <TournamentField field="scheduleUrl" label="Schedule" />
          <TournamentField field="resultsUrl" label="Results" span />
        </WorkspaceFieldGrid>
      </section>
      <div className="border-t border-border/50 pt-[10px]">
        <section aria-label="Notes">
          <WorkspaceAccentHeading icon={NotebookPen} tone="warning">
            Notes
          </WorkspaceAccentHeading>
          <WorkspaceFieldGrid columns={2} className={GRID_2}>
            <TournamentField field="notes" label="Tournament notes" span />
          </WorkspaceFieldGrid>
        </section>
      </div>
    </div>
  );
}

export function TournamentImportedRecruitsWorkspaceField() {
  return <TournamentField field="recruitsAttendingText" label="Recruits attending (imported)" span />;
}
