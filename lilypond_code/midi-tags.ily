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
%%   4. One-shot CC0 pattern (e.g., open string):
%%        \midiPizzOpen
%%        c,16 ^\markup { \teeny "o" }
%%        \midiPizz              % revert to persistent mode
%%   5. One-shot velocity pattern (e.g., sfz):
%%        \midiSfz
%%        <bf fs b,>16\sfz
%%        \midiVelReset
%%   6. Verify: walk through the music — every note should have
%%      an active midiCCZero value.
%%
%% ----------------------------------------------------------------
%% QUICK LOOKUP TABLE:
%%
%%   Notation Symbol        | Shorthand         | Behavior
%%   -----------------------|-------------------|------------------
%%   "pizz." text markup    | \midiPizz         | Persistent
%%   "o" markup (open str)  | \midiPizzOpen     | One-shot → revert
%%   \snappizzicato         | \midiBartokPizz   | Persistent
%%   Return to arco         | \midiArco         | Persistent
%%   \sfz dynamic           | \midiSfz          | One-shot → reset
%%   (after sfz note)       | \midiVelReset     | Clears override
%%
%% ----------------------------------------------------------------
%% CONTEXT PROPERTIES USED:
%%
%%   Voice.midiCCZero     — CC0 value (integer, 0–127)
%%                          Persistent: stays until next \set
%%   Voice.midiVelocity   — Velocity override (integer, 0–127)
%%                          One-shot: must \unset after the note
%%
%% ================================================================


%% === Register custom context properties with LilyPond ===
%% Without this, \set will be silently rejected ("cannot find property type-check")
#(set-object-property! 'midiCCZero 'translation-type? number?)
#(set-object-property! 'midiVelocity 'translation-type? number?)


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


%% === Velocity Overrides (one-shot — MUST \unset after the note) ===

midiSfz = { \set Voice.midiVelocity = #127 }
%% Velocity 127: Sforzando — maximum attack

midiVelReset = { \unset Voice.midiVelocity }
%% Clear velocity override — subsequent notes use LilyPond default
