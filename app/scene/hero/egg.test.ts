import { ACTIONS, BASE_LOOP } from "./actions";
import {
  applyEgg,
  armEgg,
  disarmEgg,
  EGG,
  eggBusyUntil,
  eggVisit,
  eggWouldComplete,
  initialEgg,
  stepEgg,
} from "./egg";
import { LEAD_FRAMES } from "./reactions";
import { clipEndAbs, stateAt, type Occurrence } from "./schedule";

const L = BASE_LOOP.frames; // 216
const nod = ACTIONS.nod;
const clipFrom = (o: Occurrence) => o.start + o.action.clip.firstFrame;

describe("E2 egg: sequence", () => {
  it("completes on queen poster then speakers within 10 s", () => {
    let e = eggVisit(initialEgg(), "queen-poster", 100).state;
    expect(eggWouldComplete(e, "speakers", 105)).toBe(true);
    const r = eggVisit(e, "speakers", 110);
    expect(r.completed).toBe(true);
    e = r.state;
    expect(e.first).toBeUndefined(); // one completion per poster visit
    expect(eggVisit(e, "speakers", 111).completed).toBe(false);
  });

  it("does not complete late, out of order, or via other hotspots", () => {
    const e = eggVisit(initialEgg(), "queen-poster", 0).state;
    expect(eggVisit(e, "speakers", 10.5).completed).toBe(false);
    expect(eggVisit(initialEgg(), "speakers", 1).completed).toBe(false);
    expect(eggVisit(e, "laptop", 1).completed).toBe(false);
    expect(EGG.sequence).toEqual(["queen-poster", "speakers"]);
  });
});

describe("E2 egg: arming outside the queue", () => {
  it("arms the nod at the next f180 at or after T6's end", () => {
    const e = armEgg(initialEgg(), 10, 0);
    expect(e.armed?.join).toBe(180);
    expect(e.armed?.occ.action).toBe(nod);
    // T6 ends at frame 200: the next usable nod join is the following f180
    expect(armEgg(initialEgg(), 10, 200).armed?.join).toBe(L + 180);
    // a join inside the lead is skipped
    expect(armEgg(initialEgg(), 180 - LEAD_FRAMES + 1, 0).armed?.join).toBe(
      L + 180,
    );
  });

  it("starts playing at its clip start and ends at the clip end", () => {
    let e = armEgg(initialEgg(), 10, 0);
    const occ = e.armed!.occ;
    e = stepEgg(e, clipFrom(occ) - 1, []);
    expect(e.armed).toBeDefined();
    e = stepEgg(e, clipFrom(occ), []);
    expect(e.playing).toBe(occ);
    expect(e.armed).toBeUndefined();
    expect(eggBusyUntil(e, clipFrom(occ))).toBe(clipEndAbs(occ));
    e = stepEgg(e, clipEndAbs(occ), []);
    expect(e.playing).toBeUndefined();
  });

  it("yields to another clip that overlaps it before it commits", () => {
    const e = armEgg(initialEgg(), 10, 0);
    const other: Occurrence = { action: ACTIONS.bounce, cycle: 0, start: 150 };
    expect(stepEgg(e, 20, [other]).armed).toBeUndefined();
    const far: Occurrence = { action: ACTIONS.bounce, cycle: 2, start: 2 * L };
    expect(stepEgg(e, 20, [far]).armed).toBeDefined();
    expect(eggBusyUntil(e, 20)).toBe(0); // not committed: the queue ignores it
  });

  it("is not cut once committed, and suppresses an overlapping rotation clip", () => {
    let e = armEgg(initialEgg(), 10, 0);
    const join = e.armed!.join;
    const occ = e.armed!.occ;
    const commit = clipFrom(occ) - LEAD_FRAMES;
    expect(eggBusyUntil(e, commit - 1)).toBe(0);
    e = stepEgg(e, commit, []);
    expect(eggBusyUntil(e, commit)).toBe(clipEndAbs(occ));
    const other: Occurrence = { action: ACTIONS.bounce, cycle: 0, start: 150 };
    expect(stepEgg(e, commit, [other]).armed).toBeDefined();

    const rotation = {
      ...stateAt(join / BASE_LOOP.fps),
      action: {
        occurrence: other,
        frame: join - other.start,
        clipFrame: 5,
        phase: "core" as const,
      },
    };
    const s = applyEgg(rotation, e);
    expect(s.action?.occurrence).toBe(occ);
    expect(s.action?.clipFrame).toBe(join - occ.start - nod.clip.firstFrame);
  });

  it("drops out when the rotation already plays the same nod", () => {
    const e = armEgg(initialEgg(), 10, 0);
    expect(stepEgg(e, 20, [{ ...e.armed!.occ }]).armed).toBeUndefined();
  });

  it("is disarmed by leaving, hiding or freezing, but a playing nod finishes", () => {
    const seq = eggVisit(initialEgg(), "queen-poster", 0).state;
    expect(disarmEgg(seq).first).toBeUndefined();
    expect(disarmEgg(armEgg(initialEgg(), 10, 0)).armed).toBeUndefined();
    const playing = { playing: armEgg(initialEgg(), 10, 0).armed!.occ };
    expect(disarmEgg(playing)).toBe(playing);
  });

  it("leaves the schedule alone when nothing is armed", () => {
    const s = stateAt(3);
    expect(applyEgg(s, initialEgg())).toBe(s);
  });
});
