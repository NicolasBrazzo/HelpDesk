import { Fragment, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  FileText,
  LayoutDashboard,
  Lock,
  Settings,
  User,
  Users,
} from "lucide-react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Prism from "../components/Prism";
import { useAuth } from "../context/AuthContext";
import { APP_NAME, APP_LOGO, HOME } from "../constants/app";

gsap.registerPlugin(useGSAP);

// Se l'utente ha chiesto "riduci movimento" il Prism viene congelato
// (timeScale/noise a 0): resta un fotogramma statico invece di animare.
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Voci della sidebar nella finestra dimostrativa (contenuto decorativo).
const MOCK_NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Utenti" },
  { icon: FileText, label: "Report" },
  { icon: Settings, label: "Impostazioni" },
];

// Hero pubblica del template ("/"): i testi vivono in src/constants/app.js
// (HOME); lo stile usa i token shadcn condivisi con il resto del gestionale.
// Le animazioni girano solo se l'utente non ha chiesto "riduci movimento".
export const HomePage = () => {
  const scope = useRef(null);
  const { user } = useAuth();

  const authTo = user ? "/dashboard" : "/login";

  // Titolo spezzato in parole: ogni parola ha una "maschera" per il reveal
  // dal basso durante l'ingresso.
  const titleWords = `${HOME.titleStart} ${HOME.titleAccent}`.split(" ");

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cleanups = [];

        // Le righe del registro partono nascoste: le compila il loop (3).
        gsap.set(".js-row", { autoAlpha: 0 });

        // 1) Ingresso orchestrato: sfondo → topbar → titolo → CTA → finestra
        const intro = gsap.timeline({
          defaults: { ease: "power4.out", duration: 0.9 },
        });
        intro
          .from(".js-prism", { autoAlpha: 0, duration: 1.4, ease: "power2.out" }, 0)
          .from(".js-topbar", { autoAlpha: 0, y: -16, duration: 0.6 }, 0.3)
          .from(".js-eyebrow", { autoAlpha: 0, y: 12, scale: 0.92, duration: 0.5 }, "-=0.35")
          .from(".js-word", { yPercent: 120, rotation: 5, stagger: 0.055 }, "-=0.3")
          .from(".js-sub", { autoAlpha: 0, y: 14, filter: "blur(8px)", duration: 0.7 }, "-=0.4")
          .from(
            ".js-cta-row > *",
            { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.08 },
            "-=0.5"
          )
          .from(
            ".js-foot > *",
            { autoAlpha: 0, y: 8, duration: 0.4, stagger: 0.06 },
            "-=0.4"
          )
          .from(
            ".js-window",
            {
              autoAlpha: 0,
              y: 90,
              rotationX: 16,
              scale: 0.97,
              transformOrigin: "center top",
              duration: 1.2,
              ease: "power3.out",
            },
            "-=0.75"
          )
          .from(".js-glow", { autoAlpha: 0, duration: 1.1 }, "<");

        // 2) I numeri della mini-dashboard contano da zero
        gsap.utils.toArray(".js-stat").forEach((el, i) => {
          const target = Number(el.dataset.value);
          const counter = { v: 0 };
          intro.to(
            counter,
            {
              v: target,
              duration: 1.1,
              ease: "power2.out",
              onUpdate: () => {
                el.textContent = Math.round(counter.v).toLocaleString("it-IT");
              },
            },
            i === 0 ? "-=0.9" : "<0.12"
          );
        });

        // 3) Il registro attività si compila da solo, in loop
        const rows = gsap.utils.toArray(".js-row");
        const loop = gsap.timeline({ repeat: -1, repeatDelay: 1.8, delay: 2.4 });
        rows.forEach((row) => {
          loop
            .fromTo(
              row,
              { autoAlpha: 0, x: 24, y: 0 },
              { autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out" },
              "+=0.4"
            )
            .fromTo(
              row.querySelector(".js-stamp"),
              { scale: 0, rotation: -10 },
              { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2.5)" },
              "-=0.05"
            );
        });
        loop.to(rows, { autoAlpha: 0, y: -10, duration: 0.3, stagger: 0.05 }, "+=2.4");

        // 4) CTA "magnetica": segue leggermente il cursore (gsap.quickTo)
        const cta = scope.current.querySelector(".js-magnet");
        if (cta) {
          const xTo = gsap.quickTo(cta, "x", { duration: 0.35, ease: "power3" });
          const yTo = gsap.quickTo(cta, "y", { duration: 0.35, ease: "power3" });
          const onMove = (e) => {
            const r = cta.getBoundingClientRect();
            xTo((e.clientX - (r.left + r.width / 2)) * 0.25);
            yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
          };
          const onLeave = () => {
            xTo(0);
            yTo(0);
          };
          cta.addEventListener("mousemove", onMove);
          cta.addEventListener("mouseleave", onLeave);
          cleanups.push(() => {
            cta.removeEventListener("mousemove", onMove);
            cta.removeEventListener("mouseleave", onLeave);
          });
        }

        // 5) A ingresso finito, la finestra si inclina seguendo il cursore
        intro.eventCallback("onComplete", () => {
          const win = scope.current?.querySelector(".js-window");
          if (!win) return;
          const rotX = gsap.quickTo(win, "rotationX", { duration: 0.6, ease: "power3" });
          const rotY = gsap.quickTo(win, "rotationY", { duration: 0.6, ease: "power3" });
          const onTilt = (e) => {
            const r = win.getBoundingClientRect();
            rotY(((e.clientX - (r.left + r.width / 2)) / r.width) * 6);
            rotX(((e.clientY - (r.top + r.height / 2)) / r.height) * -5);
          };
          const onTiltLeave = () => {
            rotX(0);
            rotY(0);
          };
          win.addEventListener("mousemove", onTilt);
          win.addEventListener("mouseleave", onTiltLeave);
          cleanups.push(() => {
            win.removeEventListener("mousemove", onTilt);
            win.removeEventListener("mouseleave", onTiltLeave);
          });
        });

        return () => cleanups.forEach((fn) => fn());
      });
    },
    { scope }
  );

  return (
    // La landing gira nel contesto "dark" degli stessi token shadcn del
    // gestionale (nessuna palette a parte): così il Prism WebGL, che rende
    // al meglio su fondo scuro, resta coerente e il testo leggibile.
    <div ref={scope} className="dark relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Sfondo animato: prisma WebGL (React Bits) confinato alla prima
          schermata; non cattura il puntatore così CTA e finestra restano
          interattive. Sospeso quando esce dal viewport per risparmiare GPU. */}
      <div
        aria-hidden="true"
        className="js-prism pointer-events-none absolute inset-x-0 top-0 h-screen"
      >
        <Prism
          animationType="rotate"
          timeScale={prefersReducedMotion ? 0 : 0.4}
          scale={3.2}
          glow={1}
          bloom={1.1}
          noise={prefersReducedMotion ? 0 : 0.35}
          hueShift={0.32}
          colorFrequency={1}
          offset={{ x: 0, y: 90 }}
          suspendWhenOffscreen
        />
      </div>

      {/* Scrim: attenua il prisma dove c'è il testo e sfuma nel fondo pieno
          prima della finestra dimostrativa, mantenendo il contrasto. */}
      <div
        aria-hidden="true"
        className="js-prism pointer-events-none absolute inset-x-0 top-0 h-screen bg-linear-to-b from-background/70 via-background/25 to-background"
      />


      <header className="js-topbar relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary font-data text-xs font-semibold text-primary-foreground">
            {APP_LOGO}
          </span>
          <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to={authTo}>
            {user ? "Dashboard" : HOME.ctaPrimary}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-16 text-center md:pt-24">
        {/* <span className="js-eyebrow inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-xs">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-indigo-500" />
          {HOME.eyebrow}
        </span> */}

        {/* Le regole globali h1 di index.css (35px/700) stanno fuori dai
            layer e vincono sulle utility Tailwind: per questo font-size e
            peso usano il modificatore "!". Font normale (Inter, font-sans). */}
        <h1 className="mx-auto mt-6 max-w-3xl font-sans font-bold! text-[clamp(2.5rem,6vw,4.5rem)]! leading-[1.06] tracking-tight">
          {titleWords.map((word, i) => (
            <Fragment key={i}>
              <span className="mb-[-0.14em] inline-block overflow-hidden pb-[0.14em] align-top">
                <span className="js-word inline-block">{word}</span>
              </span>{" "}
            </Fragment>
          ))}
        </h1>

        <p className="js-sub mx-auto mt-5 max-w-xl text-lg leading-relaxed text-foreground/85 [text-shadow:0_1px_12px_var(--background)]">
          {HOME.subtitle}
        </p>

        <div className="js-cta-row mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="js-magnet h-11 px-6 shadow-md">
            <Link to={authTo}>
              {user ? HOME.ctaLogged : HOME.ctaPrimary}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          {!user && (
            <Button asChild variant="outline" size="lg" className="h-11 px-6">
              <Link to="/register">{HOME.ctaSecondary}</Link>
            </Button>
          )}
        </div>

        <div className="js-foot mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {HOME.features.map((feature) => (
            <span
              key={feature}
              className="flex items-center gap-1.5 text-xs font-medium text-foreground/75"
            >
              <Check aria-hidden="true" className="size-3.5 text-indigo-600" />
              {feature}
            </span>
          ))}
        </div>
      </main>

      {/* Finestra dimostrativa: mini-gestionale con dati finti, nascosta
          agli screen reader. Il wrapper dà la prospettiva per il tilt 3D. */}
      <section
        aria-hidden="true"
        className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-24 pt-14 perspective-[1400px]"
      >
        <div
          aria-hidden="true"
          className="js-glow absolute inset-x-24 top-20 -z-10 h-64 rounded-full bg-indigo-500/15 blur-3xl"
        />
        <div className="js-window overflow-hidden rounded-xl border bg-card text-left shadow-2xl">
          {/* Barra della finestra */}
          <div className="flex items-center gap-3 border-b bg-muted/50 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-red-400/80" />
              <span className="size-2.5 rounded-full bg-yellow-400/80" />
              <span className="size-2.5 rounded-full bg-green-400/80" />
            </div>
            <div className="mx-auto flex items-center gap-1.5 rounded-md border bg-background px-3 py-1 font-data text-[11px] text-muted-foreground">
              <Lock className="size-3" />
              localhost:5173/dashboard
            </div>
            <div className="w-12" />
          </div>

          <div className="grid sm:grid-cols-[170px_1fr]">
            {/* Sidebar finta */}
            <aside className="hidden flex-col gap-1 border-r bg-muted/30 p-3 sm:flex">
              <div className="mb-2 flex items-center gap-2 px-2 py-1.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-data text-[9px] font-semibold text-primary-foreground">
                  {APP_LOGO}
                </span>
                <span className="truncate text-xs font-semibold">{APP_NAME}</span>
              </div>
              {MOCK_NAV.map((item) => (
                <span
                  key={item.label}
                  className={
                    item.active
                      ? "flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-xs font-medium shadow-xs"
                      : "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground"
                  }
                >
                  <item.icon className="size-3.5 shrink-0" />
                  {item.label}
                </span>
              ))}
            </aside>

            {/* Contenuto finto: intestazione, statistiche, registro attività */}
            <div className="min-w-0 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Dashboard</p>
                  <p className="text-[11px] text-muted-foreground">
                    Panoramica delle attività
                  </p>
                </div>
                <span className="flex size-7 items-center justify-center rounded-full bg-muted">
                  <User className="size-3.5 text-muted-foreground" />
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {HOME.stats.map(({ value, label }) => (
                  <div key={label} className="rounded-lg border bg-card p-3 shadow-xs">
                    <p
                      className="js-stat font-data text-lg font-semibold leading-none tracking-tight"
                      data-value={value}
                    >
                      {value.toLocaleString("it-IT")}
                    </p>
                    <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border">
                <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
                  <span className="text-xs font-medium">{HOME.ledger.title}</span>
                  <span className="font-data text-[10px] text-muted-foreground">
                    {HOME.ledger.protocol}
                  </span>
                </div>
                {HOME.ledger.rows.map((row) => (
                  <div
                    key={row.time}
                    className="js-row grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b px-3 py-2.5 last:border-b-0 md:grid-cols-[auto_1fr_auto_auto]"
                  >
                    <span className="font-data text-[11px] text-muted-foreground">{row.time}</span>
                    <span className="truncate text-xs font-medium">{row.text}</span>
                    <Badge variant="muted" className="hidden font-data text-[10px] md:inline-flex">
                      {row.tag}
                    </Badge>
                    <Badge variant="success" className="js-stamp font-data text-[10px] font-semibold">
                      OK
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
