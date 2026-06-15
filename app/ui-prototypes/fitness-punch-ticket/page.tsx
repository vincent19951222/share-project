"use client";

import { FitnessPunchTicket } from "@/components/ui/FitnessPunchTicket";
import styles from "./FitnessPunchTicketPrototype.module.css";

export default function FitnessPunchTicketPrototypePage() {
  return (
    <main className={styles.prototype}>
      <section className={styles.stage} aria-labelledby="fitness-ticket-title">
        <FitnessPunchTicket />
      </section>
    </main>
  );
}
