%% midi-tags.ily — MIDI tagging shorthands for notation fragments
%% ================================================================
%%
%% Include this file in any .ly file that produces MIDI output:
%%   \include "midi-tags.ily"
%%
%% These shorthands set custom context properties that the Scheme
%% engraver (midi-logger.ily) reads during compilation. They do NOT
%% affect visual output — only the side-channel MIDI data.
%%
%% Source of truth for CC values: docs/cc_mapping_registry.json
%%
%% ----------------------------------------------------------------
%% NOTATION-TIME PROTOCOL (checklist when writing .ly files):
%%
%%   1. \include "midi-tags.ily" at the top of the file
%%   2. Set initial articulation mode BEFORE the first note
%%      (e.g., \midiPizz if the piece starts pizzicato)
%%   3. Add \midiXxx BEFORE each note where the technique changes
%%   4. MODE PERSISTENCE: The base mode (pizz/arco) persists until
%%      the composer explicitly changes it. Do NOT infer mode changes
%%      from expression markings (e.g., "m.v." does not imply arco).
%%      Only explicit "arco" or "pizz." text resets the base mode.
%%   5. One-shot CC0 pattern (e.g., open string):
%%        \midiPizzOpen
%%        c,16 ^\markup { \teeny "o" }
%%        \midiPizz              % revert to persistent mode
%%   6. Multi-state modifier pattern (e.g., molto vibrato):
%%        \midiMoltoVibPizz      % CC0 depends on current base mode
%%        c'4 "m.v."
%%        \midiPizz              % revert to base mode
%%   7. Glissando pitch bend pattern:
%%        \midiGlissUp           % persistent: all following notes bend up 1 semitone
%%        ds''16\glissando
%%        e''16\glissando
%%        \midiGlissReset        % unset before destination note
%%        g''32
%%   8. One-shot velocity pattern (e.g., sfz):
%%        \midiSfz
%%        <bf fs b,>16\sfz
%%        \midiVelReset
%%   9. Verify: walk through the music — every note should have
%%      an active midiCCZero value.
%%
%% ----------------------------------------------------------------
%% QUICK LOOKUP TABLE:
%%
%%   Notation Symbol        | Shorthand           | Behavior
%%   -----------------------|---------------------|------------------
%%   "pizz." text markup    | \midiPizz           | Persistent
%%   "o" markup (pizz)      | \midiPizzOpen       | One-shot → revert
%%   "o" markup (arco)      | \midiArcoOpen       | One-shot → revert
%%   \snappizzicato         | \midiBartokPizz     | Persistent
%%   "m.v." markup (pizz)   | \midiMoltoVibPizz   | One-shot → revert
%%   "m.v." markup (arco)   | \midiMoltoVibArco   | One-shot → revert
%%   Return to arco         | \midiArco           | Persistent
%%   \glissando (up ≤1 st)  | \midiGlissUp        | Persistent → reset
%%   \glissando (dn ≤1 st)  | \midiGlissDown      | Persistent → reset
%%   (after last gliss)     | \midiGlissReset     | Clears gliss flag
%%   "b.b." / X noteheads   | \midiBB             | One-shot → revert
%%   \sfz dynamic           | \midiSfz            | One-shot → reset
%%   (after sfz note)       | \midiVelReset       | Clears override
%%
%% ----------------------------------------------------------------
%% CONTEXT PROPERTIES USED:
%%
%%   Voice.midiCCZero     — CC0 value (integer, 0–127)
%%                          Persistent: stays until next \set
%%   Voice.midiVelocity   — Velocity override (integer, 0–127)
%%                          One-shot: must \unset after the note
%%   Voice.midiGliss      — Pitch bend glissando (number, semitones)
%%                          +1 = up 1 semitone, -1 = down 1 semitone
%%                          Fractional values OK (e.g. 0.5 = quarter tone)
%%                          Persistent: stays until \unset
%%                          Ramp: 20-step linear bend across note duration
%%                          Synth pitch bend range: ±1 semitone
%%
%% ================================================================


%% === Register custom context properties with LilyPond ===
%% Without this, \set will be silently rejected ("cannot find property type-check")
#(set-object-property! 'midiCCZero 'translation-type? number?)
#(set-object-property! 'midiVelocity 'translation-type? number?)
#(set-object-property! 'midiGliss 'translation-type? number?)


%% === Articulation Modes (persistent — stays until changed) ===
%% These set CC0, which selects the articulation/technique preset
%% in the sample library.

midiArco = { \set Voice.midiCCZero = #89 }
%% CC0=89: Senza vibrato / arco (default sustained articulation)

midiPizz = { \set Voice.midiCCZero = #95 }
%% CC0=95: Pizzicato

midiPizzOpen = { \set Voice.midiCCZero = #71 }
%% CC0=71: Pizzicato open string (one-shot — revert after note)

midiBartokPizz = { \set Voice.midiCCZero = #97 }
%% CC0=97: Bartók (snap) pizzicato


%% === Multi-State Modifiers (one-shot — revert to base mode after note) ===
%% These depend on the current base mode (pizz or arco).
%% Use the correct variant for the current mode.

midiMoltoVibPizz = { \set Voice.midiCCZero = #70 }
%% CC0=70: Molto vibrato in pizzicato context

midiMoltoVibArco = { \set Voice.midiCCZero = #2 }
%% CC0=2: Molto vibrato in arco context

midiArcoOpen = { \set Voice.midiCCZero = #6 }
%% CC0=6: Open string in arco context

midiBB = { \set Voice.midiCCZero = #80 }
%% CC0=80: Behind the bridge (b.b.) pizzicato. One-shot: revert to base mode after note.
%% Consecutive b.b. notes: no revert needed between them; revert after last in group.


%% === Velocity Overrides (one-shot — MUST \unset after the note) ===

midiSfz = { \set Voice.midiVelocity = #127 }
%% Velocity 127: Sforzando — maximum attack

midiVelReset = { \unset Voice.midiVelocity }
%% Clear velocity override — subsequent notes use LilyPond default


%% === Glissando Pitch Bend (persistent — stays until \unset) ===
%% Value is the semitone interval: +1 = up, -1 = down.
%% Fractional values OK (e.g. 0.5 = quarter tone up).
%% Set before the first gliss note; \unset before the destination note.
%% modify_midi.js inserts a 20-step linear pitch bend ramp across each
%% marked note's duration, then resets bend to center before next Note On.
%% Synth pitch bend range assumed: ±1 semitone.

midiGlissUp = { \set Voice.midiGliss = #1 }
%% Glissando up 1 semitone (full pitch bend range)

midiGlissDown = { \set Voice.midiGliss = #-1 }
%% Glissando down 1 semitone (full pitch bend range)

midiGlissReset = { \unset Voice.midiGliss }
%% Clear glissando flag — subsequent notes play at natural pitch
